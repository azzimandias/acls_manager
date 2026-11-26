import { memo, useEffect, useLayoutEffect, useState } from 'react';
import { Input } from 'antd';

export const UserSearchInput = memo(function UserSearchInput({ id, value, updateSearch }) {
  const [draft, setDraft] = useState(value);

  useLayoutEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft === value) return;
    const timeout = window.setTimeout(() => updateSearch({ q: draft }), 350);
    return () => window.clearTimeout(timeout);
  }, [draft, updateSearch, value]);

  return (
    <Input
      id={id}
      allowClear
      placeholder="Имя пользователя"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
});
