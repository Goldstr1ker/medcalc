// Тесты выбора инструкции по установке.
//
// Ветвление по User-Agent — самое ошибкоопасное место: у Яндекс.Браузера и Edge
// в UA присутствует слово Chrome, а iPadOS 13+ вообще представляется как Macintosh
// и отличается от настольного Safari только числом точек касания.
// Проверять это глазами в одном браузере бессмысленно, поэтому подменяем navigator.

import test from 'node:test';
import assert from 'node:assert/strict';

import { detectBrowser, detectPlatform } from '../src/lib/install.js';
import { getInstallInstructions } from '../src/lib/install-instructions.js';

function withNavigator(userAgent, maxTouchPoints, fn) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent, maxTouchPoints },
    configurable: true,
    writable: true,
  });
  try {
    return fn();
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  }
}

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
  ipadSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  androidYandex:
    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.11.1.90.00 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  desktopYandex:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 YaBrowser/23.11.0.0 Safari/537.36',
  desktopEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
};

test('определение браузера: Яндекс и Edge не принимаются за Chrome', () => {
  // В UA обоих есть слово Chrome — порядок проверок в detectBrowser критичен.
  withNavigator(UA.desktopYandex, 0, () => assert.equal(detectBrowser(), 'yandex'));
  withNavigator(UA.androidYandex, 5, () => assert.equal(detectBrowser(), 'yandex'));
  withNavigator(UA.desktopEdge, 0, () => assert.equal(detectBrowser(), 'edge'));
  withNavigator(UA.desktopChrome, 0, () => assert.equal(detectBrowser(), 'chrome'));
  withNavigator(UA.desktopFirefox, 0, () => assert.equal(detectBrowser(), 'firefox'));
});

test('определение платформы: iPad отличается от Mac только тачем', () => {
  // iPadOS 13+ представляется как Macintosh. Единственное надёжное отличие —
  // maxTouchPoints. Если перепутать, пользователь iPad получит инструкцию для Mac.
  withNavigator(UA.ipadSafari, 5, () => assert.equal(detectPlatform(), 'ios'));
  withNavigator(UA.macSafari, 0, () => assert.equal(detectPlatform(), 'desktop'));
  withNavigator(UA.iphoneSafari, 5, () => assert.equal(detectPlatform(), 'ios'));
  withNavigator(UA.androidChrome, 5, () => assert.equal(detectPlatform(), 'android'));
  withNavigator(UA.desktopChrome, 0, () => assert.equal(detectPlatform(), 'desktop'));
});

test('Safari на iPhone — инструкция про «На экран „Домой“»', () => {
  withNavigator(UA.iphoneSafari, 5, () => {
    const { title, steps } = getInstallInstructions();
    assert.match(title, /iPhone/);
    assert.ok(steps.join(' ').includes('Домой'), 'нет шага про экран «Домой»');
  });
});

test('Chrome на iPhone — честно говорим, что нужен Safari', () => {
  withNavigator(UA.iphoneChrome, 5, () => {
    const { steps, note } = getInstallInstructions();
    assert.ok(steps.join(' ').includes('Safari'), 'не сказано про Safari');
    assert.ok(note, 'нет пояснения про ограничение iOS');
  });
});

test('iPad получает инструкцию для iOS, а не для Mac', () => {
  withNavigator(UA.ipadSafari, 5, () => {
    assert.match(getInstallInstructions().title, /iPhone|iPad/);
  });
  withNavigator(UA.macSafari, 0, () => {
    assert.match(getInstallInstructions().title, /Mac/);
  });
});

test('Firefox на компьютере — не выдумываем инструкцию, а признаём ограничение', () => {
  withNavigator(UA.desktopFirefox, 0, () => {
    const { steps, note } = getInstallInstructions();
    assert.ok(steps.join(' ').includes('не умеет'), 'должно быть сказано, что установка недоступна');
    assert.ok(note?.includes('Chrome'), 'нет подсказки, чем заменить');
  });
});

test('Яндекс.Браузер: разные инструкции для телефона и компьютера', () => {
  const android = withNavigator(UA.androidYandex, 5, getInstallInstructions);
  const desktop = withNavigator(UA.desktopYandex, 0, getInstallInstructions);
  assert.match(android.title, /Android/);
  assert.match(desktop.title, /компьютере/);
  assert.ok(desktop.note, 'для десктопа нужно предупреждение о нестабильности');
});

test('Chromium на компьютере — про значок в адресной строке', () => {
  withNavigator(UA.desktopChrome, 0, () => {
    const { title, steps } = getInstallInstructions();
    assert.match(title, /Chrome/);
    assert.ok(steps.join(' ').includes('адресной строки'));
  });
  withNavigator(UA.desktopEdge, 0, () => {
    assert.match(getInstallInstructions().title, /Edge/);
  });
});

test('у каждой инструкции есть заголовок и хотя бы один шаг', () => {
  for (const [name, ua] of Object.entries(UA)) {
    const touch = /iphone|ipad|android/i.test(name) ? 5 : 0;
    withNavigator(ua, touch, () => {
      const { title, steps } = getInstallInstructions();
      assert.ok(title, `${name}: нет заголовка`);
      assert.ok(steps?.length, `${name}: нет шагов`);
    });
  }
});
