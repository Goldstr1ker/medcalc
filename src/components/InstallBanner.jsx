import { useEffect, useState } from 'react';
import { isIos, isPhoneViewport, promptInstall, shouldShowBanner } from '../lib/install.js';
import { distinctCalculatorsOpened, isInstallBannerSnoozed, snoozeInstallBanner } from '../lib/storage.js';
import { useInstallState } from './useInstallState.js';
import InstallInstructions from './InstallInstructions.jsx';

export default function InstallBanner() {
  const { canPrompt, installed } = useInstallState();
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Число открытых калькуляторов меняется при переходах — пересчитываем на
  // смене маршрута, а не читаем localStorage на каждый рендер.
  const [opened, setOpened] = useState(() => distinctCalculatorsOpened());
  useEffect(() => {
    const update = () => setOpened(distinctCalculatorsOpened());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  // iOS-инструкция вместо кнопки: нативного диалога установки там нет.
  const iosMode = isIos();
  const visible = shouldShowBanner({
    installed,
    dismissed,
    snoozed: isInstallBannerSnoozed(),
    phoneViewport: isPhoneViewport(),
    calculatorsOpened: opened,
    canPrompt,
    ios: iosMode,
  });

  // Пока баннер виден, добавляем отступ снизу — иначе он перекрывает результат.
  useEffect(() => {
    document.body.classList.toggle('has-install-banner', visible);
    return () => document.body.classList.remove('has-install-banner');
  }, [visible]);

  if (!visible) return null;

  function close() {
    snoozeInstallBanner();
    setDismissed(true);
  }

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDismissed(true);
      return;
    }
    // Диалог не открылся — показываем ручную инструкцию прямо в баннере.
    setShowSteps(true);
  }

  return (
    <div className="install-banner">
      <button className="install-banner__close" onClick={close} aria-label="Закрыть">
        ×
      </button>

      {iosMode || showSteps ? (
        <InstallInstructions />
      ) : (
        <>
          <span className="install-banner__text">
            Установить МедКалк на телефон — будет работать без интернета.
          </span>
          <button className="install-banner__btn" onClick={handleInstall}>
            Установить
          </button>
        </>
      )}
    </div>
  );
}
