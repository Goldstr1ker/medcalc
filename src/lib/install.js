// Установка приложения: перехват события и состояние.
//
// Главная причина, по которой это отдельный модуль, а не хук внутри компонента:
// браузер бросает beforeinstallprompt сразу после загрузки страницы — раньше,
// чем React успевает отрисоваться. Если вешать слушатель в useEffect, событие
// теряется навсегда (повторно браузер его не бросает). Поэтому initInstallCapture()
// вызывается в main.jsx ДО рендера, а компоненты уже читают готовое состояние.

let deferredPrompt = null;
let installed = false;
let version = 0; // счётчик изменений, чтобы React знал о новом состоянии

const listeners = new Set();

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

/** Вызывается один раз в main.jsx до рендера React. */
export function initInstallCapture() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Отменяем показ браузерного баннера — предлагаем установку сами,
    // в подходящий момент (см. InstallBanner).
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
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

/** Доступна ли установка через нативный диалог браузера. */
export function canPrompt() {
  return deferredPrompt !== null;
}

/** Приложение уже открыто как установленное (или было установлено в этой сессии). */
export function isInstalled() {
  if (installed) return true;
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Показать нативный диалог установки.
 * Возвращает 'accepted' | 'dismissed' | 'unavailable' | 'failed'.
 *
 * Таймаут нужен из-за Яндекс.Браузера: там событие приходит, prompt() не бросает
 * ошибку, но диалог не появляется и userChoice не резолвится никогда. Без таймаута
 * кнопка просто зависала бы навсегда.
 */
export async function promptInstall({ timeoutMs = 2000 } = {}) {
  if (!deferredPrompt) return 'unavailable';

  // Событие одноразовое: повторный prompt() кидает исключение по спецификации,
  // поэтому забираем его сразу, что бы дальше ни случилось.
  const event = deferredPrompt;
  deferredPrompt = null;
  emit();

  try {
    event.prompt();
    const timeout = Symbol('timeout');
    const choice = await Promise.race([
      event.userChoice,
      new Promise((resolve) => setTimeout(() => resolve(timeout), timeoutMs)),
    ]);
    if (choice === timeout) return 'failed';
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'failed';
  }
}

// --- правило показа баннера ---

/** Минимум открытых калькуляторов, после которого предлагаем установку. */
export const MIN_CALCULATORS_OPENED = 2;

/**
 * Показывать ли всплывающий баннер. Вынесено из компонента отдельной чистой
 * функцией, чтобы правило можно было покрыть тестами: условий шесть, и
 * ошибиться в любом из них легко, а проверить глазами все комбинации — нет.
 */
export function shouldShowBanner({
  installed,
  dismissed,
  snoozed,
  phoneViewport,
  calculatorsOpened,
  canPrompt: promptAvailable,
  ios,
  minOpened = MIN_CALCULATORS_OPENED,
}) {
  // Уже установлено, закрыто в этой сессии или отложено — молчим.
  if (installed || dismissed || snoozed) return false;
  // Целевой сценарий — телефон в отделении; на компьютере есть постоянный пункт.
  if (!phoneViewport) return false;
  // Пока человек не поработал с приложением, предложение выглядит рекламой.
  if (calculatorsOpened < minOpened) return false;
  // Показываем, только если есть что предложить: нативный диалог или
  // осмысленная инструкция для iOS. Иначе баннер был бы бесполезным.
  return promptAvailable || ios;
}

// --- платформа ---

export function isIos() {
  const ua = navigator.userAgent || '';
  // iPadOS 13+ представляется как Macintosh, отличаем по наличию тача.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent || '');
}

/** Телефонный размер экрана — баннер показываем только здесь. */
export function isPhoneViewport() {
  return window.innerWidth < 768;
}

/**
 * Семейство браузера — нужно, чтобы показать правильную инструкцию.
 * Порядок проверок важен: Яндекс и Edge содержат в UA слово Chrome.
 */
export function detectBrowser() {
  const ua = navigator.userAgent || '';
  if (/YaBrowser/i.test(ua)) return 'yandex';
  if (/Edg\//i.test(ua)) return 'edge';
  if (/OPR\/|Opera/i.test(ua)) return 'opera';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/Chrome|CriOS/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua)) return 'safari';
  return 'other';
}

export function detectPlatform() {
  if (isIos()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
}
