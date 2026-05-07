import { useEffect, useState } from 'react';
import { Alert, Layout, Spin } from 'antd';
import { AppTopbar } from './components/AppTopbar';
import { fetchSessionInfo } from './api/access';
import { AccessPage } from './pages/AccessPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { SettingsPage } from './pages/SettingsPage';

const { Content } = Layout;

export default function App() {
  const [page, setPage] = useState('access');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadSession = async () => {
      try {
        const data = await fetchSessionInfo();
        if (!ignore) setSession(data);
      } catch (err) {
        if (!ignore) setError(err.message || 'Не удалось получить данные пользователя');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadSession();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Layout className="app-shell">
      <AppTopbar currentPage={page} onPageChange={setPage} user={session?.user} />
      <Content className="app-content">
        {loading ? (
          <div className="center-state">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message="Ошибка загрузки" description={error} />
        ) : page === 'settings' ? (
          <SettingsPage />
        ) : page === 'companies' ? (
          <CompaniesPage />
        ) : (
          <AccessPage session={session} />
        )}
      </Content>
    </Layout>
  );
}
