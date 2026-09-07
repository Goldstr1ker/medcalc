import { useState } from 'react';
import { applyUpdate } from '../lib/sw-update.js';
import { useSwUpdate } from './useSwUpdate.js';

// Плашка «вышла новая версия». Появляется сверху, когда service worker
// скачал новую сборку и ждёт активации. Нажатие — активирует её и
// перезагружает страницу. Пока не нажали, приложение работает на текущей
// версии как ни в чём не бывало.
export default function UpdateBanner() {
  const available = useSwUpdate();
  const [applying, setApplying] = useState(false);

  if (!available) return null;

  return (
    <div className="update-banner" role="status">
      <span className="update-banner__text">Вышла новая версия приложения.</span>
      <button
        className="update-banner__btn"
        disabled={applying}
        onClick={() => {
          setApplying(true);
          applyUpdate();
        }}
      >
        {applying ? 'Обновляю…' : 'Обновить'}
      </button>
    </div>
  );
}
