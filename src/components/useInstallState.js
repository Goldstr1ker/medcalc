import { useEffect, useState } from 'react';
import { canPrompt, isInstalled, subscribe } from '../lib/install.js';

// Подписка на состояние установки из lib/install.js.
// Само состояние живёт вне React, потому что событие beforeinstallprompt
// приходит раньше, чем React успевает отрисоваться.
export function useInstallState() {
  const [state, setState] = useState(() => ({
    canPrompt: canPrompt(),
    installed: isInstalled(),
  }));

  useEffect(() => {
    const update = () => setState({ canPrompt: canPrompt(), installed: isInstalled() });
    update(); // событие могло прийти между первым рендером и подпиской
    return subscribe(update);
  }, []);

  return state;
}
