import { useEffect, useState } from 'react';

// Подсказка «установить как приложение».
// Android/Chrome: перехватываем beforeinstallprompt и показываем кнопку «Установить».
// iOS/Safari: нативной установки нет — показываем инструкцию (Поделиться → на экран «Домой»).

const DISMISS_KEY = 'medcalc.installHintDismissed';

function isIos() {
  const ua = navigator.userAgent || '';
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallHint() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if (isIos()) setShowIos(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIos) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* приватный режим */
    }
    setDismissed(true);
  };

  return (
    <div className="install-hint">
      <button className="install-hint__close" onClick={close} aria-label="Закрыть">
        ×
      </button>
      {deferredPrompt ? (
        <>
          <span>Установить МедКалк как приложение — работает офлайн.</span>
          <button
            className="install-hint__btn"
            onClick={async () => {
              deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }}
          >
            Установить
          </button>
        </>
      ) : (
        <span>
          Установить как приложение: нажмите <b>«Поделиться»</b> в Safari, затем{' '}
          <b>«На экран „Домой“»</b>. Дальше работает офлайн.
        </span>
      )}
    </div>
  );
}
