// Обновление приложения: отслеживание нового service worker и его применение.
//
// Отдельный модуль, а не хук, по той же причине, что и lib/install.js:
// регистрировать SW нужно один раз при старте, до/вне дерева React, а колбэк
// onNeedRefresh может прийти в любой момент жизни страницы. Компоненты читают
// готовое состояние через подписку (см. components/useSwUpdate.js).
//
// registerType в vite.config — 'prompt': новый SW встаёт в ожидание и не
// активируется сам. applyUpdate() шлёт ему skipWaiting и перезагружает
// страницу. Так пользователь не теряет наполовину введённый расчёт из-за
// внезапной перезагрузки, но и не остаётся на старой сборке молча.

import { registerSW } from 'virtual:pwa-register';
import { shouldCheckForUpdate } from './sw-update-rule.js';

/** Как часто установленное приложение перепроверяет наличие обновления. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // час

let updateAvailable = false;
/** @type {((reloadPage?: boolean) => Promise<void>) | null} */
let updateSW = null;
let version = 0; // счётчик изменений для React

const listeners = new Set();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

/** Вызывается один раз в main.jsx до рендера React. */
export function initSwUpdate() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true;
      emit();
    },
    onRegisterError(error) {
      // Часть окружений (в т.ч. некоторые встроенные браузеры) блокируют
      // service worker целиком. Приложение работает и без него — просто
      // без офлайна и без этой плашки.
      console.warn('Service worker не зарегистрирован:', error);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Приложение, открытое с домашнего экрана, может неделями не
      // перезагружаться — без явной проверки новый SW не подхватится.
      const check = () => {
        if (shouldCheckForUpdate({ online: navigator.onLine, installing: !!registration.installing })) {
          registration.update().catch(() => {});
        }
      };
      setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      // ...и при возвращении на вкладку / восстановлении сети.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('online', check);
    },
  });
}

// --- подписка для React ---

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVersion() {
  return version;
}

// --- состояние ---

export function isUpdateAvailable() {
  return updateAvailable;
}

/**
 * Применить обновление: активировать ожидающий SW и перезагрузить страницу.
 * Возвращает промис, но на практике страница перезагрузится раньше, чем он
 * зарезолвится.
 */
export function applyUpdate() {
  updateAvailable = false;
  emit();
  return updateSW ? updateSW(true) : Promise.resolve();
}
