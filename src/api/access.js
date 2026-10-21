import { PROD_AXIOS_INSTANCE } from './axios';
import { HTTP_HOST } from '../config';

export const fetchAccessChanges = async (params, signal) => {
  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const response = await fetch(`${HTTP_HOST}/api/admin/access/data/changes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const messages = {
      401: 'Просмотр истории доступен только администраторам.',
      403: 'Авторизация не пройдена. Войдите в систему повторно.',
      422: 'Некорректные параметры фильтрации.',
    };
    const details = response.status === 422 && data?.errors
      ? Object.values(data.errors).flat().join(' ')
      : '';
    throw new Error([messages[response.status] || 'Не удалось загрузить историю.', details].filter(Boolean).join(' '));
  }
  if (!Array.isArray(data?.data)) throw new Error('Сервер вернул некорректный журнал изменений.');
  return data;
};

export const fetchSessionInfo = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.get('/api/usda');
  return data;
};

export const fetchAccessInfo = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/info');
  return data;
};

export const fetchAccessGroups = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/access/data/getgroups');
  return data;
};

export const fetchDepartments = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/access/data/getdepartments');
  return data;
};

export const fetchUserbaseInfoSelects = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/hr/userbaseinfoselects');
  return data;
};

export const fetchCompanyStaffAccess = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/aclcompanies/data/v2/getstaff');
  return data;
};

const getCsrfToken = () =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1] || '';

export const setCompanyAccess = async ({ user, company, state }) => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/aclcompanies/data/v2/setaccess', {
    user: String(user),
    state: Boolean(state),
    company: String(company),
    _token: decodeURIComponent(getCsrfToken()),
  });
  return data;
};

export const fetchCheckboxMatrix = async ({ company, group }) => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/access/data/checkbox', {
    company,
    group,
  });
  return data;
};

export const updateCheckbox = async ({ resource, userid, checkbox, company }) => {
  const { data } = await PROD_AXIOS_INSTANCE.post(
    '/api/admin/access/data/updatecheckbox',
    new URLSearchParams({
      resource: String(resource),
      userid: String(userid),
      checkbox: checkbox ? 'true' : 'false',
      company: String(company),
    }),
  );
  return data;
};

export const updateBoss = async ({ userId, bossId }) => {
  const formData = new FormData();
  formData.append('select_id', String(bossId));
  formData.append('user_id', String(userId));

  const { data } = await PROD_AXIOS_INSTANCE.post('/admin/access/data/updateboss', formData);
  return data;
};

export const createAccess = async (payload) => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/access/data/create', payload);
  return data;
};

export const updateAccess = async (id, payload) => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/access/data/update', {
    id,
    ...payload,
  });
  return data;
};
