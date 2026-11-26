import { Dropdown, Layout, Menu } from 'antd';
import {
  BankOutlined,
  HomeOutlined,
  HistoryOutlined,
  LoginOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { HOME_URL, HTTP_HOST } from '../config';
import { pagePath } from '../routing';

const { Header } = Layout;
const pages = [
  { key: 'access', icon: <SafetyCertificateOutlined />, label: 'Доступы' },
  { key: 'companies', icon: <BankOutlined />, label: 'Компании' },
  { key: 'history', icon: <HistoryOutlined />, label: 'История' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
];

export function AppTopbar({ currentPage, onPageChange, user }) {
  const surnameInitial = (user?.surname || '').trim().charAt(0).toUpperCase();
  const fullName = [user?.surname, user?.name].filter(Boolean).join(' ');
  const userMenuItems = [
    {
      key: 'status',
      label: 'Статус: Онлайн',
    },
    {
      key: `${HTTP_HOST}/logout`,
      icon: <LoginOutlined />,
      label: <a href={`${HTTP_HOST}/logout`}>Выйти</a>,
    },
  ];

  return (
    <Header className="topbar ui-topmenu ui-topmenu-sticky">
      <div className="ui-topmenu-brand">
        <a href={HOME_URL} aria-label="Домой" title="Домой">
          <HomeOutlined />
        </a>
        <strong title="Менеджер доступов">МЕНЕДЖЕР ДОСТУПОВ</strong>
      </div>

      <Menu
        mode="horizontal"
        selectedKeys={[currentPage]}
        onClick={({ key, domEvent }) => {
          if (domEvent.ctrlKey || domEvent.metaKey || domEvent.shiftKey || domEvent.altKey) return;
          domEvent.preventDefault();
          onPageChange(key);
        }}
        className="topbar__menu"
        items={pages.map(({ key, icon, label }) => ({
          key,
          icon,
          label: (
            <a
              href={key === currentPage ? window.location.href : pagePath(key)}
              aria-current={key === currentPage ? 'page' : undefined}
            >
              {label}
            </a>
          ),
        }))}
      />

      <div className="ui-topmenu-actions">
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['hover', 'click']}>
          <button type="button" className="ui-topmenu-user" aria-label={fullName || 'Пользователь'}>
            <span className="ui-topmenu-initial" aria-hidden="true">
              {surnameInitial || '?'}
            </span>
            <span className="topbar__user-name">{fullName || 'Пользователь'}</span>
          </button>
        </Dropdown>
      </div>
    </Header>
  );
}
