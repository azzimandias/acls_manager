import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import App from './App.jsx';
import './styles.css';
import './assets/common-theme.css';

const theme = window.getComputedStyle(document.documentElement);
const themeValue = (name) => theme.getPropertyValue(name).trim();

createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={ruRU}
    theme={{
      token: {
        colorPrimary: themeValue('--sk-active-button'),
        colorText: themeValue('--ui-text'),
        colorBgContainer: themeValue('--ui-surface'),
        colorBorder: themeValue('--ui-border'),
        borderRadius: parseFloat(themeValue('--ui-card-radius')),
        fontFamily: themeValue('--ui-font'),
        fontSize: parseFloat(themeValue('--ui-text-size')),
        controlHeight: parseFloat(themeValue('--ui-pagination-size')),
      },
      components: {
        Layout: {
          headerBg: themeValue('--ui-surface'),
          bodyBg: themeValue('--ui-alt-row'),
        },
        Table: {
          borderColor: themeValue('--ui-divider'),
          headerBg: themeValue('--ui-heading-bg'),
          rowHoverBg: themeValue('--ui-hover-row'),
        },
      },
    }}
  >
    <App />
  </ConfigProvider>,
);
