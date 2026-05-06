import { Avatar, Layout, Menu, Space, Typography } from 'antd';
import { HomeOutlined, SettingOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { HOME_URL } from '../config';

const { Header } = Layout;

export function AppTopbar({ currentPage, onPageChange, user }) {
  const initials = [user?.surname?.[0], user?.name?.[0]].filter(Boolean).join('').toUpperCase();

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
            { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
          ]}
        />
      </div>

      <Space size={10} className="topbar__user">
        <Avatar size={26} icon={initials ? null : <UserOutlined />} style={{ backgroundColor: '#1f6feb' }}>
          {initials}
        </Avatar>
        <Typography.Text strong className="topbar__surname">
          {user?.surname || ''}
        </Typography.Text>
        <Typography.Text strong className="topbar__name">
          {user?.name || ''}
        </Typography.Text>
      </Space>
    </Header>
  );
}
