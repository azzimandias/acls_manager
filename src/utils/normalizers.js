export const getFullName = (user) =>
  [user?.surname, user?.name, user?.secondname].filter(Boolean).join(' ') || 'Пользователь';

const pickArray = (data, keys) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  return [];
};

const normalizeText = (value) => String(value || '').replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ').trim();

const normalizeCompanyIds = (user) => {
  const ids = [
    user.id_company,
    user.company_id,
    user.company,
    user.active_company,
    user.idCompany,
    user.companyId,
  ];

  [user.companies, user.company_ids, user.companyIds].forEach((companies) => {
    if (!Array.isArray(companies)) return;

    companies.forEach((company) => {
      ids.push(typeof company === 'object' ? company.id : company);
    });
  });

  if (user.company && typeof user.company === 'object') {
    ids.push(user.company.id);
  }

  return [...new Set(ids.map(Number).filter(Number.isFinite))];
};

const normalizeBossId = (user) => {
  const bossId = Number(user.id_boss ?? user.boss_id ?? user.chief_id ?? user.manager_id ?? user.boss);
  return Number.isFinite(bossId) && bossId > 0 ? bossId : undefined;
};

export const normalizeAccesses = (data) => {
  const source = pickArray(data, ['accesses', 'resources', 'places', 'data', 'items', 'acls']);

  return source
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id),
      name: normalizeText(item.name),
      label: normalizeText(item.label || item.title || item.description),
      accessgroup: item.accessgroup ?? item.group ?? item.group_id ?? '',
      accessname: normalizeText(item.accessname || item.short_name || item.title || item.name),
      position: Number(item.position ?? 0),
      group: normalizeText(item.group_key || item.groupName || item.group || item.code),
    }))
    .filter((item) => Number.isFinite(item.id))
    .sort((a, b) => a.position - b.position || a.id - b.id);
};

export const normalizeAccessGroups = (data) => {
  const source = Array.isArray(data?.data?.groups)
    ? data.data.groups
    : pickArray(data, ['groups', 'accessgroups', 'data', 'items']);

  return source
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id),
      name: item.name || item.key || item.code || '',
      label: item.title || item.label || item.accessname || item.name || `ID ${item.id}`,
      position: Number(item.ordered ?? item.position ?? item.place ?? item.id ?? 0),
    }))
    .filter((item) => Number.isFinite(item.id))
    .sort((a, b) => a.position - b.position || a.id - b.id);
};

export const normalizeDepartments = (data) => {
  const source = pickArray(data, ['departments', 'departaments', 'data', 'items']);

  return source
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: Number(item.id),
      name: item.title || item.name || item.label || `ID ${item.id}`,
      position: Number(item.ordered ?? item.position ?? item.place ?? item.id ?? 0),
    }))
    .filter((item) => Number.isFinite(item.id))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'ru') || a.id - b.id);
};

export const normalizeUsers = (infoData, matrix) => {
  const source = pickArray(infoData, ['users', 'staff', 'employees', 'userlist']);
  const map = new Map();

  for (const user of source) {
    if (!user?.id) continue;
    map.set(String(user.id), {
      id: Number(user.id),
      fullName:
        user.fullname ||
        user.fullName ||
        getFullName(user) ||
        user.name ||
        `ID ${user.id}`,
      occupy: user.occupy || user.position || user.dept_name || user.department || '',
      departmentId: Number(user.id_departament ?? user.id_department ?? user.department_id),
      department: user.dept_name || user.department || user.departament || '',
      surname: user.surname || '',
      name: user.name || '',
      secondname: user.secondname || '',
      phone: user.phone || '',
      email: user.email || '',
      companyIds: normalizeCompanyIds(user),
      bossId: normalizeBossId(user),
    });
  }

  Object.values(matrix || {}).forEach((resourceMap) => {
    Object.keys(resourceMap || {}).forEach((userId) => {
      if (!map.has(String(userId))) {
        map.set(String(userId), {
          id: Number(userId),
          fullName: `ID ${userId}`,
          occupy: '',
          departmentId: Number.NaN,
          department: '',
          companyIds: [],
          bossId: undefined,
        });
      }
    });
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      a.department.localeCompare(b.department, 'ru') ||
      a.fullName.localeCompare(b.fullName, 'ru') ||
      a.id - b.id,
  );
};

export const buildDepartmentRows = (users, departments) => {
  const departmentById = new Map(departments.map((department) => [Number(department.id), department]));
  const orderById = new Map(departments.map((department, index) => [Number(department.id), index]));
  const groups = new Map();

  users.forEach((user) => {
    const hasDepartmentId = Number.isFinite(user.departmentId);
    const fallbackKey = user.department || 'without-department';
    const key = hasDepartmentId ? `id:${user.departmentId}` : `name:${fallbackKey}`;
    const department = hasDepartmentId ? departmentById.get(user.departmentId) : null;
    const title = department?.name || user.department || 'Без отдела';
    const order = hasDepartmentId ? (orderById.get(user.departmentId) ?? departments.length) : departments.length;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title,
        order,
        users: [],
      });
    }

    groups.get(key).users.push(user);
  });

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'))
    .flatMap((group) => [
      {
        id: `department:${group.key}`,
        rowType: 'department',
        fullName: group.title,
      },
      ...group.users.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru') || a.id - b.id),
    ]);
};

export const normalizeAccessMatrix = (data) => {
  const users = pickArray(data, ['users']);

  if (users.length) {
    return users.reduce((matrix, user) => {
      Object.entries(user.props_id || {}).forEach(([resourceId, checked]) => {
        matrix[resourceId] = {
          ...(matrix[resourceId] || {}),
          [user.id]: checked ? 1 : 0,
        };
      });

      return matrix;
    }, {});
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data.data && typeof data.data === 'object' ? data.data : data;
  }

  return {};
};

export const getAccessGroupValue = (access) =>
  access.group || access.group_key || access.groupName || access.name || '';

export const filterAccessesByGroup = (accesses, group) => {
  const groupId = Number(group);
  const filtered = accesses.filter((access) => {
    if (Number.isFinite(groupId)) {
      return Number(access.accessgroup) === groupId;
    }

    const value = String(getAccessGroupValue(access)).toLowerCase();
    return value === group || value.includes(group);
  });

  return filtered.length ? filtered : accesses;
};
