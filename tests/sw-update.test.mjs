// Правило периодической проверки обновления service worker.
//
// Сам конвейер (registerSW, onNeedRefresh, applyUpdate, перезагрузка) завязан
// на virtual:pwa-register и API браузера — проверяется вручную на живом
// деплое. Здесь — только чистое правило «дёргать ли update() сейчас».

import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldCheckForUpdate } from '../src/lib/sw-update-rule.js';

test('онлайн и ничего не ставится — проверяем', () => {
  assert.equal(shouldCheckForUpdate({ online: true, installing: false }), true);
});

test('офлайн — не проверяем (запрос всё равно не уйдёт)', () => {
  assert.equal(shouldCheckForUpdate({ online: false, installing: false }), false);
});

test('предыдущий апдейт ещё ставится — не мешаем', () => {
  assert.equal(shouldCheckForUpdate({ online: true, installing: true }), false);
});

test('офлайн и апдейт ставится — тем более нет', () => {
  assert.equal(shouldCheckForUpdate({ online: false, installing: true }), false);
});
