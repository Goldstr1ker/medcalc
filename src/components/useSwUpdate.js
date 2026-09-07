import { useEffect, useState } from 'react';
import { isUpdateAvailable, subscribe } from '../lib/sw-update.js';

// Подписка на «доступно обновление» из lib/sw-update.js. Состояние живёт вне
// React, потому что новый service worker может появиться в любой момент, а
// регистрируется он один раз при старте — до дерева компонентов.
export function useSwUpdate() {
  const [available, setAvailable] = useState(isUpdateAvailable);

  useEffect(() => {
    const update = () => setAvailable(isUpdateAvailable());
    update(); // между первым рендером и подпиской SW уже мог обновиться
    return subscribe(update);
  }, []);

  return available;
}
