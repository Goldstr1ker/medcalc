// Покрытие диапазонов примерами.
//
// Требование: у КАЖДОГО диапазона результата должен быть хотя бы один пример,
// который в него попадает.
//
// Чем это отличается от фаззера. Фаззер проверяет, что у любого выпавшего
// диапазона есть текст интерпретации, — но он бьёт случайно и до узкого
// диапазона может ни разу не добраться. Здесь же проверяется другое:
// что автор осознанно проверил поведение шкалы в этом диапазоне и записал
// ожидаемое значение. Диапазон без примера означает, что вывод приложения
// в нём («С4 — резко снижена», «летальность > 80%») никто ни разу не сверял
// с первоисточником — а именно этот текст человек и увидит на экране.
//
// Для динамических диапазонов (пороги зависят от входных данных, напр. пол
// в QTc) набор собирается объединением по всем примерам: чтобы диапазон
// вообще попал в проверку, автор обязан покрыть примером ту ветку,
// в которой этот диапазон возникает.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadCalculators } from '../scripts/lib/load-calculators.mjs';
import { initialUnits, initialValues, toCanonical } from '../src/lib/compute.js';
import { resolveBand, resolveBands } from '../src/lib/bands.js';

const loaded = await loadCalculators();

test('у каждого диапазона есть пример, который в него попадает', async (t) => {
  for (const { file, calc } of loaded) {
    await t.test(`${calc.id} — ${calc.name}`, () => {
      const объявленные = new Map(); // id -> label, для внятного сообщения
      const достигнутые = new Set();

      for (const ex of calc.examples ?? []) {
        const values = { ...initialValues(calc.inputs), ...ex.inputs };
        const units = { ...initialUnits(calc.inputs), ...(ex.units ?? {}) };
        const canonical = toCanonical(calc.inputs, values, units);

        const bands = resolveBands(calc.result, canonical);
        for (const b of bands) if (!объявленные.has(b.id)) объявленные.set(b.id, b.label);

        const result = calc.calculate(canonical);
        const band = resolveBand(result.value, bands);
        if (band) достигнутые.add(band.id);
      }

      const непокрытые = [...объявленные.keys()].filter((id) => !достигнутые.has(id));

      assert.deepEqual(
        непокрытые,
        [],
        `${file}: нет примера, попадающего в диапазон(ы):\n` +
          непокрытые.map((id) => `  · ${id} — «${объявленные.get(id)}»`).join('\n') +
          '\nДобавьте в examples клинически осмысленный случай для каждого.',
      );
    });
  }
});
