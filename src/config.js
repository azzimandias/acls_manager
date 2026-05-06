const hasProtocol = (value) => value.startsWith('http://') || value.startsWith('https://');

const trimTrailingSlash = (value) => value.replace(/\/$/, '');

const normalizeHost = (host) => {
  const trimmedHost = String(host || '').trim();

  if (!trimmedHost) {
    return window.location.origin;
  }

  if (trimmedHost === 'localhost') {
    return window.location.origin;
  }

  if (hasProtocol(trimmedHost)) {
    return trimTrailingSlash(trimmedHost);
  }

  return `http://${trimmedHost.replace(/^\/+|\/+$/g, '')}`;
};

const normalizeHomeUrl = (url) => {
  const trimmedUrl = String(url || '').trim();

  if (!trimmedUrl) {
    return '/';
  }

  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  if (hasProtocol(trimmedUrl)) {
    return trimmedUrl;
  }

  return `http://${trimmedUrl}`;
};

export const HTTP_HOST = normalizeHost(import.meta.env.VITE_HTTP_HOST);
export const HOME_URL = normalizeHomeUrl(import.meta.env.VITE_HOME_URL || HTTP_HOST);
