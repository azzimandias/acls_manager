import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={ruRU}
    theme={{
      token: {
        colorPrimary: '#1f6feb',
        borderRadius: 6,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
      components: {
        Layout: {
          headerBg: '#ffffff',
          bodyBg: '#f5f7fb',
        },
      },
    }}
  >
    <App />
  </ConfigProvider>,
);
