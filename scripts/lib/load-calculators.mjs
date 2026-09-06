// Загрузка калькуляторов вне Vite.
//
// В приложении калькуляторы собирает import.meta.glob (это работает только внутри
// Vite). Скриптам и тестам нужен обычный способ — просто обойти файлы и
// импортировать их как ES-модули. Это возможно, потому что файлы калькуляторов
// намеренно не зависят ни от React, ни от Vite: только данные и чистые функции.

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
export const REPO_ROOT = resolve(HERE, '../..');
const CALC_DIR = join(REPO_ROOT, 'src/calculators');

// Файлы и папки с префиксом `_` — общие хелперы для калькуляторов
// (напр. `src/calculators/_shared/scores.js`). Они не экспортируют калькулятор
// и в обход не попадают. Та же оговорка — в import.meta.glob внутри registry.js
// и в pattern сборщика индекса, все три должны совпадать.
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    if (entry.startsWith('_')) return [];
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

/** Пути ко всем файлам калькуляторов, отсортированные. */
export function calculatorFiles() {
  return walk(CALC_DIR).sort();
}

/** [{ file, calc }] — относительный путь и сам объект калькулятора. */
export async function loadCalculators() {
  const out = [];
  for (const path of calculatorFiles()) {
    const mod = await import(pathToFileURL(path).href);
    out.push({
      file: relative(REPO_ROOT, path).replace(/\\/g, '/'),
      calc: mod.default,
    });
  }
  return out;
}
