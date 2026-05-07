import { Avatar, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import {
  BankOutlined,
  HomeOutlined,
  LoginOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { HOME_URL, HTTP_HOST } from '../config';

const { Header } = Layout;

export function AppTopbar({ currentPage, onPageChange, user }) {
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
    <Header className="topbar">
      <div className="topbar__left">
        <a className="home-link" href={HOME_URL} title="На главную">
          <HomeOutlined />
        </a>
        <Menu
          mode="horizontal"
          selectedKeys={[currentPage]}
          onClick={({ key }) => onPageChange(key)}
          className="topbar__menu"
          items={[
            { key: 'access', icon: <SafetyCertificateOutlined />, label: 'Доступы' },
            { key: 'companies', icon: <BankOutlined />, label: 'Компании' },
            { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
          ]}
        />
      </div>

      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['hover']}>
        <Space size={10} className="topbar__user">
          <Avatar size={26} icon={<UserOutlined />} style={{ backgroundColor: '#1f6feb' }} />
          <Space size={4} className="topbar__name-group">
            <Typography.Text strong className="topbar__surname">
              {user?.surname || ''}
            </Typography.Text>
            <Typography.Text strong className="topbar__name">
              {user?.name || ''}
            </Typography.Text>
          </Space>
        </Space>
      </Dropdown>
    </Header>
  );
}
