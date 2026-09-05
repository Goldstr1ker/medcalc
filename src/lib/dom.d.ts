// Части DOM, которых нет в стандартных типах TypeScript.
//
// Файл без import/export — значит, объявления глобальные и подхватываются
// автоматически. Нужен только для проверки типов, в бандл не попадает.

/**
 * Событие предложения установки PWA. В стандарт не входит (есть в Chromium,
 * нет в Safari и Firefox), поэтому в lib.dom.d.ts его нет.
 * https://wicg.github.io/manifest-incubations/#beforeinstallpromptevent-interface
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

interface Navigator {
  /** Только Safari на iOS: приложение открыто с домашнего экрана. */
  readonly standalone?: boolean;
}
