import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

type ThemeSetting = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const resolveTheme = (setting: ThemeSetting) =>
  setting === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : setting;

const applyTheme = (setting: ThemeSetting) => {
  const resolved = resolveTheme(setting);
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (color) meta.setAttribute('content', color);
  }
};

const stored = localStorage.getItem(THEME_KEY);
const initialSetting: ThemeSetting =
  stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
applyTheme(initialSetting);

mediaQuery.addEventListener('change', () => {
  const current = localStorage.getItem(THEME_KEY) ?? 'system';
  if (current === 'system') {
    applyTheme('system');
  }
});

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
