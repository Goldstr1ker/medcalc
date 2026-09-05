// Тесты правила показа баннера установки.
//
// Условий шесть, комбинаций много, а последствия ошибки — либо навязчивый
// баннер, либо баннер, которого никто никогда не увидит (именно это и было
// в первой версии). Проверять руками все сочетания нереально.

import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowBanner, MIN_CALCULATORS_OPENED } from '../src/lib/install.js';

// Базовый набор: всё сложилось, баннер должен показаться.
const OK = {
  installed: false,
  dismissed: false,
  snoozed: false,
  phoneViewport: true,
  calculatorsOpened: MIN_CALCULATORS_OPENED,
  canPrompt: true,
  ios: false,
};

const show = (overrides) => shouldShowBanner({ ...OK, ...overrides });

test('базовый случай: телефон, событие поймано, два калькулятора — показываем', () => {
  assert.equal(show({}), true);
});

test('не показываем, если приложение уже установлено', () => {
  assert.equal(show({ installed: true }), false);
});

test('не показываем после закрытия и после отложения', () => {
  assert.equal(show({ dismissed: true }), false);
  assert.equal(show({ snoozed: true }), false);
});

test('на компьютере баннера нет — там постоянный пункт на главной', () => {
  assert.equal(show({ phoneViewport: false }), false);
  // Даже на iOS-планшете с широким экраном баннер не всплывает.
  assert.equal(show({ phoneViewport: false, ios: true, canPrompt: false }), false);
});

test('до порога открытых калькуляторов молчим', () => {
  assert.equal(show({ calculatorsOpened: 0 }), false);
  assert.equal(show({ calculatorsOpened: MIN_CALCULATORS_OPENED - 1 }), false);
  assert.equal(show({ calculatorsOpened: MIN_CALCULATORS_OPENED }), true);
  assert.equal(show({ calculatorsOpened: MIN_CALCULATORS_OPENED + 5 }), true);
});

test('без нативного диалога и вне iOS баннер бесполезен — не показываем', () => {
  // Это случай Firefox и Яндекс.Браузера: предложить нечего, кроме инструкции,
  // которая и так доступна в постоянном пункте на главной.
  assert.equal(show({ canPrompt: false, ios: false }), false);
});

test('на iOS показываем без нативного события — там его не бывает', () => {
  assert.equal(show({ canPrompt: false, ios: true }), true);
});

test('«установлено» перевешивает всё остальное', () => {
  assert.equal(show({ installed: true, ios: true, calculatorsOpened: 99 }), false);
});
