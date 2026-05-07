import { PROD_AXIOS_INSTANCE } from './axios';

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

export const fetchCompanyStaffAccess = async () => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/aclcompanies/data/getstaff');
  return data;
};

const getCsrfToken = () =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1] || '';

export const setCompanyAccess = async ({ user, company, state }) => {
  const { data } = await PROD_AXIOS_INSTANCE.post('/api/admin/aclcompanies/data/setaccess', {
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
