// Виртуальный модуль vite-plugin-pwa. Объявляем локально, а не тянем
// `vite-plugin-pwa/client` через "types", чтобы tsconfig оставался с "types": []
// и проверял ровно наш код. В бандл файл не попадает — только для tsc.

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: unknown) => void;
  }

  /**
   * Регистрирует service worker и возвращает функцию обновления:
   * updateSW(true) активирует ожидающий SW и перезагружает страницу.
   */
  export function registerSW(
    options?: RegisterSWOptions,
  ): (reloadPage?: boolean) => Promise<void>;
}
