import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Alert, Button, Checkbox, Radio, Select, Table, Tooltip, message } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import {
  fetchAccessGroups,
  fetchAccessInfo,
  fetchCheckboxMatrix,
  fetchDepartments,
  fetchUserbaseInfoSelects,
  updateBoss,
  updateCheckbox,
} from '../api/access';
import { FiltersPanel } from '../components/FiltersPanel';
import { TableHeaderText } from '../components/TableHeaderText';
import { TableSkeleton } from '../components/TableSkeleton';
import { UserSearchInput } from '../components/UserSearchInput';
import { parsePositiveInteger } from '../routing';
import {
  buildDepartmentRows,
  filterAccessesByGroup,
  normalizeAccessGroups,
  normalizeAccessMatrix,
  normalizeAccesses,
  normalizeDepartments,
  normalizeUsers,
} from '../utils/normalizers';

const DEFAULT_GROUP_ID = 1;
const EMPLOYEE_COLUMN_WIDTH = 170;
const ACCESS_COLUMN_WIDTH = 82;
const BOSS_COLUMN_WIDTH = 190;

const COLOR_FIELDS = [
  'color',
  'colour',
  'brandColor',
  'brand_color',
  'corporateColor',
  'corporate_color',
  'mainColor',
  'main_color',
  'hexColor',
  'hex_color',
];

const normalizeColor = (value) => {
  const color = String(value || '').trim();

  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) return color;
  if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;

  return '';
};

const getCompanyColor = (company) => {
  for (const field of COLOR_FIELDS) {
    const color = normalizeColor(company?.[field]);
    if (color) return color;
  }

  return '';
};

const getContrastColor = (color) => {
  const normalized = normalizeColor(color);
  if (!normalized) return '#1d2433';

  const hex = normalized.length === 4
    ? normalized.slice(1).split('').map((char) => char + char).join('')
    : normalized.slice(1);
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 150 ? '#1d2433' : '#ffffff';
};

const isSkudGroup = (group) => {
  const value = `${group?.label || ''} ${group?.name || ''}`.toLowerCase();
  return value.includes('скуд') || value.includes('skud');
};

const normalizeBossOptions = (data) => {
  const bosses = Array.isArray(data?.content?.bosses)
    ? data.content.bosses
    : Array.isArray(data?.bosses)
      ? data.bosses
      : [];

  return bosses
    .map((boss) => ({
      value: Number(boss.id),
      label: String(boss.name || `ID ${boss.id}`).trim(),
    }))
    .filter((boss) => Number.isFinite(boss.value))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru') || a.value - b.value);
};

export function AccessPage({ session, searchParams, updateSearch }) {
  const companies = useMemo(
    () =>
      [...(session?.companies || [])]
        .filter((company) => Number(company.id) !== 1)
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [session?.companies],
  );
  const activeCompany = session?.user?.active_company ?? session?.user?.id_company ?? companies[0]?.id;
  const requestedCompanyId = parsePositiveInteger(searchParams.get('company'));
  const companyId = companies.find((company) => Number(company.id) === requestedCompanyId)?.id ?? activeCompany;
  const [accessGroups, setAccessGroups] = useState([]);
  const requestedGroup = parsePositiveInteger(searchParams.get('group')) ?? DEFAULT_GROUP_ID;
  const selectedGroup = accessGroups.find((item) => item.id === requestedGroup) ?? accessGroups[0];
  const group = selectedGroup?.id ?? requestedGroup;
  const [departments, setDepartments] = useState([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [infoData, setInfoData] = useState(null);
  const [checkboxData, setCheckboxData] = useState(null);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [savingBossUserId, setSavingBossUserId] = useState(null);
  const [bossOptions, setBossOptions] = useState([]);
  const [bossesLoading, setBossesLoading] = useState(false);
  const [bossByUser, setBossByUser] = useState({});
  const [error, setError] = useState('');
  const userSearch = searchParams.get('q') ?? '';
  const departmentFilter = parsePositiveInteger(searchParams.get('department'));
  const showAllUsers = searchParams.get('all') === '1';
  const showFiredUsers = searchParams.get('fired') === '1';
  const [filtersVisible, setFiltersVisible] = useState(
    () => Boolean(userSearch || departmentFilter || showAllUsers || showFiredUsers),
  );
  const [filtersUpdating, startFilterTransition] = useTransition();

  const handleUserVisibilityChange = (key, checked) => {
    startFilterTransition(() => updateSearch({ [key]: checked ? '1' : undefined }));
  };
  const hoverStyleRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    const loadInitialData = async () => {
      try {
        const [info, groupsData, departmentsData] = await Promise.all([
          fetchAccessInfo(),
          fetchAccessGroups(),
          fetchDepartments(),
        ]);
        if (ignore) return;

        setInfoData(info);
        setAccessGroups(normalizeAccessGroups(groupsData));
        setDepartments(normalizeDepartments(departmentsData));
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

  const isSkudSelected = isSkudGroup(selectedGroup);

  useEffect(() => {
    if (!isSkudSelected || bossOptions.length) return;
    let ignore = false;

    const loadBosses = async () => {
      setBossesLoading(true);
      try {
        const data = await fetchUserbaseInfoSelects();
        if (!ignore) {
          setBossOptions(normalizeBossOptions(data));
        }
      } catch (err) {
        if (!ignore) message.error(err.message || 'Не удалось загрузить список руководителей');
      } finally {
        if (!ignore) setBossesLoading(false);
      }
    };

    loadBosses();
    return () => {
      ignore = true;
    };
  }, [bossOptions.length, isSkudSelected]);

  const accesses = useMemo(() => {
    const fromCheckbox = normalizeAccesses(checkboxData);
    const fromInfo = normalizeAccesses(infoData);
    const selectedCompany = companies.find((company) => Number(company.id) === Number(companyId));
    const fallback = normalizeAccesses(selectedCompany?.places || []);
    return filterAccessesByGroup(fromCheckbox.length ? fromCheckbox : fromInfo.length ? fromInfo : fallback, group)
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0) || Number(a.id) - Number(b.id));
  }, [checkboxData, companies, companyId, group, infoData]);
  const selectedCompany = useMemo(
    () => companies.find((company) => Number(company.id) === Number(companyId)),
    [companies, companyId],
  );
  const companyColor = getCompanyColor(selectedCompany);
  const companyTextColor = getContrastColor(companyColor);

  const users = useMemo(() => normalizeUsers(checkboxData || infoData, matrix), [checkboxData, infoData, matrix]);
  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const matchesCompany =
        showAllUsers ||
        user.companyIds?.some((userCompanyId) => Number(userCompanyId) === Number(companyId));
      const matchesSearch =
        !search ||
        user.fullName.toLowerCase().includes(search) ||
        String(user.id).includes(search);
      const matchesDepartment =
        !departmentFilter || String(user.departmentId) === String(departmentFilter);

      return (showFiredUsers || !user.isFired) && matchesCompany && matchesSearch && matchesDepartment;
    });
  }, [companyId, departmentFilter, showAllUsers, showFiredUsers, userSearch, users]);
  const tableRows = useMemo(() => buildDepartmentRows(filteredUsers, departments), [departments, filteredUsers]);
  const employeeColumnWidth = showFiredUsers ? 240 : EMPLOYEE_COLUMN_WIDTH;
  const tableWidth = employeeColumnWidth + accesses.length * ACCESS_COLUMN_WIDTH + (isSkudSelected ? BOSS_COLUMN_WIDTH : 0);

  const setHoveredAccess = (accessId) => {
    if (!hoverStyleRef.current) return;

    if (!accessId) {
      hoverStyleRef.current.textContent = '';
      return;
    }

    hoverStyleRef.current.textContent = `
      html[data-page-theme="main"] .access-matrix .ant-table-thead > tr > th[data-access-id="${accessId}"] {
        background: var(--ui-heading-divider);
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

  const handleBossChange = async (userId, bossId) => {
    const previous = bossByUser[userId];

    setSavingBossUserId(userId);
    setBossByUser((current) => ({
      ...current,
      [userId]: bossId,
    }));

    try {
      const result = await updateBoss({ userId, bossId });

      if (result?.success === false || result?.status === false) {
        throw new Error(result?.message || 'Бекенд не подтвердил изменение руководителя');
      }
    } catch (err) {
      setBossByUser((current) => {
        const next = { ...current };

        if (previous === undefined) {
          delete next[userId];
        } else {
          next[userId] = previous;
        }

        return next;
      });
      message.error(err.message || 'Не удалось сохранить руководителя');
    } finally {
      setSavingBossUserId(null);
    }
  };

  const columns = [
    {
      title: 'Сотрудник',
      dataIndex: 'fullName',
      key: 'fullName',
      className: 'employee-column',
      fixed: 'left',
      width: employeeColumnWidth,
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
                {record.isFired ? <div>Статус: Уволен</div> : null}
                {record.occupy ? <div>Должность: {record.occupy}</div> : null}
                {record.department ? <div>Отдел: {record.department}</div> : null}
                {record.phone ? <div>Телефон: {record.phone}</div> : null}
                {record.email ? <div>Email: {record.email}</div> : null}
              </div>
            }
            placement="topLeft"
          >
            <span className="employee-cell">
              <span className="employee-name">{name}</span>
              {record.isFired ? <span className="employee-fired-label">Уволен</span> : null}
            </span>
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
            <span>
              <TableHeaderText>{access.accessname || access.name}</TableHeaderText>
            </span>
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
    ...(isSkudSelected
      ? [
          {
            title: 'Руководитель',
            key: 'boss',
            width: BOSS_COLUMN_WIDTH,
            render: (_, record) => {
              if (record.rowType === 'department') {
                return null;
              }

              const normalizedBossId = Number(record.bossId);
              const value = bossByUser[record.id] ?? (Number.isFinite(normalizedBossId) ? normalizedBossId : undefined);

              return (
                <Select
                  showSearch
                  size="small"
                  value={value}
                  loading={bossesLoading}
                  disabled={bossesLoading || savingBossUserId === record.id}
                  options={bossOptions}
                  optionFilterProp="label"
                  placeholder="Руководитель"
                  className="boss-select"
                  onChange={(bossId) => handleBossChange(record.id, bossId)}
                />
              );
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <style ref={hoverStyleRef} />
      <section className="access-workspace">
        <div className="access-toolbar ui-pagebar ui-pagebar--filters">
          <div className="access-toolbar__left">
            <Button
              type={filtersVisible ? 'primary' : 'default'}
              size="small"
              icon={<FilterOutlined />}
              onClick={() => setFiltersVisible((current) => !current)}
              title={filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
              aria-label="Фильтры"
              aria-expanded={filtersVisible}
              aria-controls="access-filters"
              className="access-filter-button"
            >
              <span className="access-filter-button__label">Фильтры</span>
            </Button>
            <Radio.Group
              aria-label="Группы прав"
              optionType="button"
              value={String(group)}
              onChange={(event) => updateSearch({ group: event.target.value })}
              options={accessGroups.map((item) => ({ value: String(item.id), label: item.label }))}
              className="access-group-radio"
            />
          </div>
          <Select
            value={companyId}
            onChange={(value) => updateSearch({ company: value })}
            className={`company-select ${companyColor ? 'company-select_colored' : ''}`}
            style={{
              '--company-color': companyColor,
              '--company-text-color': companyTextColor,
            }}
            options={companies.map((company) => ({
              value: company.id,
              label: company.name,
            }))}
          />
        </div>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <div className="access-layout">
          <FiltersPanel id="access-filters" title="Фильтры доступов" visible={filtersVisible}>
            <div className="access-filter-field">
              <label htmlFor="access-filter-user">Пользователь</label>
              <UserSearchInput id="access-filter-user" value={userSearch} updateSearch={updateSearch} />
            </div>
            <div className="access-filter-field">
              <label htmlFor="access-filter-department">Отдел</label>
              <Select
                id="access-filter-department"
                allowClear
                showSearch
                placeholder="Отдел, где работает сотрудник"
                value={departmentFilter}
                onChange={(value) => updateSearch({ department: value })}
                optionFilterProp="label"
                options={departments.map((department) => ({
                  value: department.id,
                  label: department.name,
                }))}
              />
            </div>
            <Checkbox
              checked={showAllUsers}
              disabled={filtersUpdating}
              onChange={(event) => handleUserVisibilityChange('all', event.target.checked)}
            >
              Показать всех
            </Checkbox>
            <Checkbox
              checked={showFiredUsers}
              disabled={filtersUpdating}
              onChange={(event) => handleUserVisibilityChange('fired', event.target.checked)}
            >
              Показать уволенных
            </Checkbox>
          </FiltersPanel>
          <div className="page-table">
            {loading || (!groupsLoaded && !error) ? (
              <TableSkeleton columns={columns} matrixColumnWidth={ACCESS_COLUMN_WIDTH} />
            ) : (
              <Table
                bordered
                size="small"
                className="access-matrix"
                loading={{ spinning: filtersUpdating, tip: 'Обновление списка…' }}
                style={{ '--access-table-width': `${tableWidth}px` }}
                rowKey={(record) => record.id}
                columns={columns}
                dataSource={tableRows}
                rowClassName={(record) => (record.rowType === 'department' ? 'department-row' : '')}
                scroll={{ x: tableWidth, y: '100%' }}
                tableLayout="fixed"
                pagination={false}
                locale={{
                  emptyText: 'Нет данных для выбранной компании и группы',
                }}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
