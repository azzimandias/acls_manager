import axios from 'axios';
import { HTTP_HOST } from '../config';

axios.defaults.withCredentials = true;

export const PROD_AXIOS_INSTANCE = axios.create({
  baseURL: HTTP_HOST,
  timeout: 300000,
  validateStatus(status) {
    return status >= 200 && status < 300;
  },
});

const handleAuthError = (status) => {
  if ([401, 403, 419].includes(status)) {
    console.log('Auth/session error:', status);

    document.cookie.split(';').forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });

    window.location.href = `${HTTP_HOST}/login`;
  }
};

PROD_AXIOS_INSTANCE.interceptors.response.use(
  (response) => {
    handleAuthError(response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      handleAuthError(error.response.status);
    } else {
      console.log('Network / CORS error', error);
    }

    return Promise.reject(error);
  },
);

PROD_AXIOS_INSTANCE.interceptors.request.use((config) => {
  const xsrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
  }

  return config;
});
