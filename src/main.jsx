import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initInstallCapture } from './lib/install.js';
import './styles.css';

// ДО рендера React: браузер бросает beforeinstallprompt сразу после загрузки
// страницы, и если ждать монтирования компонента — событие теряется навсегда.
initInstallCapture();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
