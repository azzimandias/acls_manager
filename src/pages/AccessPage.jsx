import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Input, Radio, Select, Skeleton, Space, Table, Tooltip, message } from 'antd';
import { FilterOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchAccessGroups, fetchAccessInfo, fetchCheckboxMatrix, fetchDepartments, updateCheckbox } from '../api/access';
import {
  buildDepartmentRows,
  filterAccessesByGroup,
  normalizeAccessGroups,
  normalizeAccessMatrix,
  normalizeAccesses,
  normalizeDepartments,
  normalizeUsers,
} from '../utils/normalizers';

const DEFAULT_GROUP_ID = '1';
const EMPLOYEE_COLUMN_WIDTH = 200;
const ACCESS_COLUMN_WIDTH = 112;

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

export function AccessPage({ session }) {
  const companies = useMemo(
    () =>
      [...(session?.companies || [])]
        .filter((company) => Number(company.id) !== 1)
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [session?.companies],
  );
  const activeCompany = session?.user?.active_company ?? session?.user?.id_company ?? companies[0]?.id;
  const [companyId, setCompanyId] = useState(activeCompany);
  const [group, setGroup] = useState(DEFAULT_GROUP_ID);
  const [accessGroups, setAccessGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [infoData, setInfoData] = useState(null);
  const [checkboxData, setCheckboxData] = useState(null);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(null);
  const hoverStyleRef = useRef(null);
  const hasActiveFilters = Boolean(userSearch.trim() || departmentFilter);
  const isFilterButtonActive = filtersVisible || hasActiveFilters;

  useEffect(() => {
    setCompanyId(activeCompany);
  }, [activeCompany]);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      try {
        const [info, groupsData, departmentsData] = await Promise.all([
          fetchAccessInfo(),
          fetchAccessGroups(),
          fetchDepartments(),
        ]);
        const normalizedGroups = normalizeAccessGroups(groupsData);

        if (ignore) return;

        setInfoData(info);
        setAccessGroups(normalizedGroups);
        setDepartments(normalizeDepartments(departmentsData));
        setGroup((currentGroup) => {
          const hasCurrentGroup = normalizedGroups.some((item) => String(item.id) === String(currentGroup));
          return hasCurrentGroup || !normalizedGroups.length ? String(currentGroup) : String(normalizedGroups[0].id);
        });
        setGroupsLoaded(true);
      } catch (err) {
        if (!ignore) setError(err.message || 'Не удалось загрузить справочники доступов');
      }
    };

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!companyId || !groupsLoaded) return;
    let ignore = false;

    const loadMatrix = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCheckboxMatrix({ company: companyId, group: Number(group) });
        if (!ignore) {
          setCheckboxData(data);
          setMatrix(normalizeAccessMatrix(data));
        }
      } catch (err) {
        if (!ignore) setError(err.message || 'Не удалось загрузить матрицу доступов');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadMatrix();
    return () => {
      ignore = true;
    };
  }, [companyId, group, groupsLoaded]);

  const accesses = useMemo(() => {
    const fromCheckbox = normalizeAccesses(checkboxData);
    const fromInfo = normalizeAccesses(infoData);
    const selectedCompany = companies.find((company) => Number(company.id) === Number(companyId));
    const fallback = normalizeAccesses(selectedCompany?.places || []);
    return filterAccessesByGroup(fromCheckbox.length ? fromCheckbox : fromInfo.length ? fromInfo : fallback, group);
  }, [checkboxData, companies, companyId, group, infoData]);

  const users = useMemo(() => normalizeUsers(checkboxData || infoData, matrix), [checkboxData, infoData, matrix]);
  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.fullName.toLowerCase().includes(search) ||
        String(user.id).includes(search);
      const matchesDepartment =
        !departmentFilter || String(user.departmentId) === String(departmentFilter);

      return matchesSearch && matchesDepartment;
    });
  }, [departmentFilter, userSearch, users]);
  const tableRows = useMemo(() => buildDepartmentRows(filteredUsers, departments), [departments, filteredUsers]);
  const tableWidth = EMPLOYEE_COLUMN_WIDTH + accesses.length * ACCESS_COLUMN_WIDTH;

  const setHoveredAccess = (accessId) => {
    if (!hoverStyleRef.current) return;

    if (!accessId) {
      hoverStyleRef.current.textContent = '';
      return;
    }

    hoverStyleRef.current.textContent = `
      .access-matrix .ant-table-thead > tr > th[data-access-id="${accessId}"] {
        background: #6686a7 !important;
      }
    `;
  };

  const handleCheckboxChange = async (resource, userId, checked) => {
    const key = `${resource}:${userId}`;
    const previous = matrix?.[resource]?.[userId] || 0;

    setSavingKey(key);
    setMatrix((current) => ({
      ...current,
      [resource]: {
        ...(current?.[resource] || {}),
        [userId]: checked ? 1 : 0,
      },
    }));

    try {
      const result = await updateCheckbox({
        resource,
        userid: userId,
        checkbox: checked,
        company: companyId,
      });

      if (result?.success === false) {
        throw new Error(result?.message || 'Бекенд не подтвердил изменение');
      }
    } catch (err) {
      setMatrix((current) => ({
        ...current,
        [resource]: {
          ...(current?.[resource] || {}),
          [userId]: previous,
        },
      }));
      message.error(err.message || 'Не удалось сохранить доступ');
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
                <div>{[record.surname, record.name, record.secondname].filter(Boolean).join(' ') || record.fullName}</div>
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
    ...accesses.map((access) => ({
      title: (
        <Tooltip
          title={
            <div className="access-tooltip">
              <div>{access.accessname || access.name}</div>
              <div>ID: {access.id}</div>
              {access.label ? <div>{access.label}</div> : null}
            </div>
          }
          placement="top"
        >
          <div className="access-column-title">
            <span>{access.accessname || access.name}</span>
          </div>
        </Tooltip>
      ),
      dataIndex: String(access.id),
      key: String(access.id),
      width: ACCESS_COLUMN_WIDTH,
      align: 'center',
      onHeaderCell: () => ({
        'data-access-id': access.id,
        onMouseEnter: () => setHoveredAccess(access.id),
        onMouseLeave: () => setHoveredAccess(null),
      }),
      onCell: () => ({
        'data-access-id': access.id,
        className: 'access-checkbox-cell',
        onMouseEnter: () => setHoveredAccess(access.id),
        onMouseLeave: () => setHoveredAccess(null),
      }),
      render: (_, record) => {
        if (record.rowType === 'department') {
          return null;
        }

        const checked = Boolean(matrix?.[access.id]?.[record.id]);
        const key = `${access.id}:${record.id}`;

        return (
          <Tooltip
            title={
              <div className="access-tooltip">
                <div>{record.fullName}</div>
                <div>
                  {access.accessname || access.name}
                  {access.label ? `: ${access.label}` : ''}
                </div>
              </div>
            }
            placement="top"
          >
            <Checkbox
              checked={checked}
              disabled={savingKey === key}
              onChange={(event) => handleCheckboxChange(access.id, record.id, event.target.checked)}
            />
          </Tooltip>
        );
      },
    })),
  ];

  return (
    <>
      <style ref={hoverStyleRef} />
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
                icon={filtersVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                onClick={() => setFiltersVisible((current) => !current)}
                title={filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
                className={isFilterButtonActive ? 'access-filter-button_active' : ''}
              />
              <div className="access-toolbar__divider" />
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={String(group)}
                onChange={(event) => setGroup(event.target.value)}
                options={accessGroups.map((item) => ({ value: String(item.id), label: item.label }))}
                className="access-group-radio"
              />
            </div>
            <div className="access-toolbar__company">
              <Select
                value={companyId}
                onChange={setCompanyId}
                className="company-select"
                options={companies.map((company) => ({
                  value: company.id,
                  label: company.name,
                }))}
              />
            </div>
          </div>

          {error ? <Alert type="error" showIcon message={error} /> : null}

          {loading || !groupsLoaded ? (
            <div className="access-table-skeleton">
              <Skeleton active title={false} paragraph={{ rows: 14, width: '100%' }} />
            </div>
          ) : (
            <Table
              bordered
              size="middle"
              className="access-matrix"
              style={{ '--access-table-width': `${tableWidth}px` }}
              rowKey={(record) => record.id}
              columns={columns}
              dataSource={tableRows}
              rowClassName={(record) => (record.rowType === 'department' ? 'department-row' : '')}
              scroll={{ x: tableWidth, y: 'calc(100vh - 205px)' }}
              tableLayout="fixed"
              pagination={false}
              locale={{
                emptyText: 'Нет данных для выбранной компании и группы',
              }}
            />
          )}
        </Space>
      </div>
    </>
  );
}
