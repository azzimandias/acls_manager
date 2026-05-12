import { memo, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Input, Select, Skeleton, Space, Table, Tooltip, message } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchCompanyStaffAccess, fetchDepartments, setCompanyAccess } from '../api/access';
import { TableHeaderText } from '../components/TableHeaderText';
import { buildDepartmentRows, normalizeDepartments } from '../utils/normalizers';

const EMPLOYEE_COLUMN_WIDTH = 170;
const COMPANY_COLUMN_WIDTH = 82;

const UserSearchInput = memo(function UserSearchInput({ onDebouncedChange }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDebouncedChange(value);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [onDebouncedChange, value]);

  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="Пользователь"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
});

const getDetailedName = (user) => [user.surname, user.name, user.secondname].filter(Boolean).join(' ') || user.fullName;

const normalizeStaffUsers = (data) => {
  const source = Array.isArray(data?.users) ? data.users : Array.isArray(data?.data?.users) ? data.data.users : [];

  return source.map((user) => ({
    id: Number(user.id),
    fullName: user.fullname || getDetailedName(user) || `ID ${user.id}`,
    surname: user.surname || '',
    name: user.name || '',
    secondname: user.secondname || '',
    occupy: user.occupy || '',
    departmentId: Number(user.id_departament ?? user.id_department ?? user.department_id),
    department: user.department || user.dept_name || '',
    phone: user.phone || '',
    email: user.email || '',
    accesses: Array.isArray(user.accesses) ? user.accesses : [],
  }));
};

const normalizeCompanies = (users) => {
  const map = new Map();

  users.forEach((user) => {
    user.accesses.forEach((company) => {
      if (!map.has(Number(company.id))) {
        map.set(Number(company.id), {
          id: Number(company.id),
          name: company.name || `ID ${company.id}`,
        });
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.id - b.id);
};

const normalizeCompanyMatrix = (users) =>
  users.reduce((matrix, user) => {
    user.accesses.forEach((company) => {
      matrix[company.id] = {
        ...(matrix[company.id] || {}),
        [user.id]: company.access ? 1 : 0,
      };
    });

    return matrix;
  }, {});

export function CompaniesPage() {
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  const hasActiveFilters = Boolean(userSearch.trim() || departmentFilter);
  const isFilterButtonActive = filtersVisible || hasActiveFilters;
  const tableWidth = EMPLOYEE_COLUMN_WIDTH + companies.length * COMPANY_COLUMN_WIDTH;

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const [staffData, departmentsData] = await Promise.all([fetchCompanyStaffAccess(), fetchDepartments()]);
        const normalizedUsers = normalizeStaffUsers(staffData);

        if (ignore) return;

        setUsers(normalizedUsers);
        setCompanies(normalizeCompanies(normalizedUsers));
        setMatrix(normalizeCompanyMatrix(normalizedUsers));
        setDepartments(normalizeDepartments(departmentsData));
      } catch (err) {
        if (!ignore) setError(err.message || 'Не удалось загрузить доступы к компаниям');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.fullName.toLowerCase().includes(search) ||
        getDetailedName(user).toLowerCase().includes(search) ||
        String(user.id).includes(search);
      const matchesDepartment =
        !departmentFilter || String(user.departmentId) === String(departmentFilter);

      return matchesSearch && matchesDepartment;
    });
  }, [departmentFilter, userSearch, users]);

  const tableRows = useMemo(() => buildDepartmentRows(filteredUsers, departments), [departments, filteredUsers]);

  const handleCompanyChange = async (userId, companyId, checked) => {
    const key = `${companyId}:${userId}`;
    const previous = matrix?.[companyId]?.[userId] || 0;

    setSavingKey(key);
    setMatrix((current) => ({
      ...current,
      [companyId]: {
        ...(current?.[companyId] || {}),
        [userId]: checked ? 1 : 0,
      },
    }));

    try {
      const result = await setCompanyAccess({
        user: userId,
        company: companyId,
        state: checked,
      });

      if (result?.status !== 0) {
        throw new Error(result?.message || 'Бекенд не подтвердил изменение');
      }
    } catch (err) {
      setMatrix((current) => ({
        ...current,
        [companyId]: {
          ...(current?.[companyId] || {}),
          [userId]: previous,
        },
      }));
      message.error(err.message || 'Не удалось сохранить доступ к компании');
    } finally {
      setSavingKey('');
    }
  };

  const columns = [
    {
      title: 'Сотрудник',
      dataIndex: 'fullName',
      key: 'fullName',
      fixed: 'left',
      width: EMPLOYEE_COLUMN_WIDTH,
      render: (name, record) => {
        if (record.rowType === 'department') {
          return <span className="department-row-title">{name}</span>;
        }

        return (
          <Tooltip
            title={
              <div className="access-tooltip">
                <div>{getDetailedName(record)}</div>
                <div>ID: {record.id}</div>
                {record.occupy ? <div>Должность: {record.occupy}</div> : null}
                {record.department ? <div>Отдел: {record.department}</div> : null}
                {record.phone ? <div>Телефон: {record.phone}</div> : null}
                {record.email ? <div>Email: {record.email}</div> : null}
              </div>
            }
            placement="topLeft"
          >
            <span className="employee-name">{name}</span>
          </Tooltip>
        );
      },
    },
    ...companies.map((company) => ({
      title: (
        <Tooltip title={`ID: ${company.id}`} placement="top">
          <div className="access-column-title">
            <span>
              <TableHeaderText>{company.name}</TableHeaderText>
            </span>
          </div>
        </Tooltip>
      ),
      dataIndex: String(company.id),
      key: String(company.id),
      width: COMPANY_COLUMN_WIDTH,
      align: 'center',
      onCell: () => ({ className: 'access-checkbox-cell' }),
      render: (_, record) => {
        if (record.rowType === 'department') return null;

        const checked = Boolean(matrix?.[company.id]?.[record.id]);
        const key = `${company.id}:${record.id}`;

        return (
          <Tooltip
            title={
              <div className="access-tooltip">
                <div>{getDetailedName(record)}</div>
                <div>Компания: {company.name}</div>
              </div>
            }
            placement="top"
          >
            <Checkbox
              checked={checked}
              disabled={savingKey === key}
              onChange={(event) => handleCompanyChange(record.id, company.id, event.target.checked)}
            />
          </Tooltip>
        );
      },
    })),
  ];

  return (
    <div className="access-layout">
      <aside className={`access-sider ${filtersVisible ? '' : 'access-sider_hidden'}`}>
        <Space direction="vertical" size={12} className="access-filters">
          <div className="access-filters__title">
            <FilterOutlined />
            <span>Фильтры</span>
          </div>
          <UserSearchInput onDebouncedChange={setUserSearch} />
          <Select
            allowClear
            showSearch
            placeholder="Отдел"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            optionFilterProp="label"
            options={departments.map((department) => ({
              value: department.id,
              label: department.name,
            }))}
          />
        </Space>
      </aside>

      <Space direction="vertical" size={18} className="page access-page">
        <div className="access-toolbar">
          <div className="access-toolbar__left">
            <Button
              type={isFilterButtonActive ? 'primary' : 'default'}
              size="small"
              icon={<FilterOutlined />}
              onClick={() => setFiltersVisible((current) => !current)}
              title={filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
              className={`access-filter-button ${isFilterButtonActive ? 'access-filter-button_active' : ''}`}
            >
              Фильтры
            </Button>
            <div className="access-toolbar__divider" />
          </div>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {loading ? (
          <div className="access-table-skeleton">
            <Skeleton active title={false} paragraph={{ rows: 14, width: '100%' }} />
          </div>
        ) : (
          <Table
            bordered
            size="small"
            className="access-matrix"
            style={{ '--access-table-width': `${tableWidth}px` }}
            rowKey={(record) => record.id}
            columns={columns}
            dataSource={tableRows}
            rowClassName={(record) => (record.rowType === 'department' ? 'department-row' : '')}
            scroll={{ x: tableWidth, y: '100%' }}
            tableLayout="fixed"
            pagination={false}
            locale={{
              emptyText: 'Нет данных по доступам к компаниям',
            }}
          />
        )}
      </Space>
    </div>
  );
}
