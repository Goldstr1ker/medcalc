import { useState } from 'react';
import { promptInstall } from '../lib/install.js';
import { useInstallState } from './useInstallState.js';
import InstallInstructions from './InstallInstructions.jsx';

// Постоянный пункт «Установить приложение» внизу главной.
//
// В отличие от баннера, показывается ВСЕГДА и на всех платформах: это
// единственный надёжный путь для браузеров, где beforeinstallprompt не работает
// (Firefox, Яндекс на компьютере, Safari), и для тех, кто закрыл баннер
// и захотел вернуться к установке.
export default function InstallSection() {
  const { canPrompt, installed } = useInstallState();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  // Уже установлено — предлагать нечего.
  if (installed) return null;

  async function handleInstall() {
    const outcome = await promptInstall();
    // Диалог не открылся (частый случай в Яндекс.Браузере) — не оставляем
    // человека с мёртвой кнопкой, показываем ручную инструкцию.
    if (outcome === 'failed' || outcome === 'unavailable') {
      setFailed(true);
      setOpen(true);
    }
  }

  const showButton = canPrompt && !failed;

  return (
    <section className="install-section">
      <h2 className="section-title">Приложение на телефон</h2>
      <div className="install-section__card">
        <p className="install-section__lead">
          МедКалк можно установить на телефон или компьютер — он открывается с
          домашнего экрана и работает без интернета.
        </p>

        {showButton ? (
          <button className="btn-primary" onClick={handleInstall}>
            Установить
          </button>
        ) : null}

        <button className="install-section__toggle" onClick={() => setOpen((v) => !v)}>
          {open ? 'Скрыть инструкцию' : 'Как установить вручную'}
        </button>

        {failed ? (
          <p className="install-section__failed">
            Браузер не открыл окно установки. Установите вручную:
          </p>
        ) : null}

        {open ? <InstallInstructions /> : null}
      </div>
    </section>
  );
}
