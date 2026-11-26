import { useCallback, useEffect, useState } from 'react';

const PAGES = ['access', 'companies', 'history', 'settings'];

export const pagePath = (page) => `${import.meta.env.BASE_URL}${page}`;

export function parsePositiveInteger(value) {
  const number = /^\d+$/.test(value ?? '') ? Number(value) : 0;
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

const readLocation = () => new window.URL(window.location.href);

export function useAppLocation() {
  const [location, setLocation] = useState(readLocation);
  const page = PAGES.find((name) => pagePath(name) === location.pathname.replace(/\/$/, '')) ?? 'access';

  useEffect(() => {
    const onPopState = () => setLocation(readLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const writeLocation = useCallback((url, replace = false) => {
    if (url.href === window.location.href) return;

    if (replace) {
      window.history.replaceState(window.history.state, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
    setLocation(url);
  }, []);

  const navigate = (nextPage) => {
    if (nextPage !== page) writeLocation(new window.URL(pagePath(nextPage), location));
  };

  const { pathname } = location;
  const updateSearch = useCallback((changes, { replace = false } = {}) => {
    const url = readLocation();
    if (url.pathname !== pathname) return;

    for (const [key, value] of Object.entries(changes)) {
      const values = (Array.isArray(value) ? value : [value])
        .filter((item) => item != null && item !== '')
        .map(String);
      const previous = url.searchParams.getAll(key);
      if (values.length === previous.length && values.every((item, index) => item === previous[index])) continue;

      url.searchParams.delete(key);
      values.forEach((item) => url.searchParams.append(key, item));
    }
    writeLocation(url, replace);
  }, [pathname, writeLocation]);

  return { page, searchParams: location.searchParams, navigate, updateSearch };
}
