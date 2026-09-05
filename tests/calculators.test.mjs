// Тесты формул: гоняют examples из каждого калькулятора.
//
// Ключевой момент — тесты используют РОВНО тот же конвейер, что и приложение
// (src/lib/compute.js): парсинг значений, перевод единиц, calculate(),
// определение диапазона. Никакой копии логики здесь нет, иначе тесты
// проверяли бы не то, что видит пользователь.
//
// Сравнение идёт по ОКРУГЛЁННОМУ значению — то есть по числу, которое реально
// появится на экране, а не по сырому результату с плавающей точкой.
//
// Запуск: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadCalculators } from '../scripts/lib/load-calculators.mjs';
import { initialUnits, initialValues, isReady, resolveText, toCanonical } from '../src/lib/compute.js';
import { resolveBand, resolveBands } from '../src/lib/bands.js';
import { round } from '../src/lib/format.js';

const loaded = await loadCalculators();

for (const { file, calc } of loaded) {
  test(`${calc.id} — ${calc.name}`, async (t) => {
    assert.ok(calc.examples?.length, `${file}: нет examples`);

    for (const [i, ex] of calc.examples.entries()) {
      await t.test(ex.note || `пример ${i + 1}`, () => {
        // Незаданные поля берутся по умолчанию — примеры описывают только то,
        // что отличается от значений формы «из коробки».
        const values = { ...initialValues(calc.inputs), ...ex.inputs };
        const units = { ...initialUnits(calc.inputs), ...(ex.units ?? {}) };

        assert.ok(
          isReady(calc.inputs, values),
          'пример не заполняет все обязательные числовые поля',
        );

        const canonical = toCanonical(calc.inputs, values, units);
        const result = calc.calculate(canonical);
        assert.ok(
          Number.isFinite(result?.value),
          `calculate() вернул не число: ${JSON.stringify(result?.value)}`,
        );

        // Диапазоны могут зависеть от введённых значений (напр. пол у QTc).
        const bandList = resolveBands(calc.result, canonical);
        assert.ok(bandList?.length, 'result.bands не дал ни одного диапазона');

        const band = resolveBand(result.value, bandList);
        assert.ok(band, `значение ${result.value} не попало ни в один диапазон`);

        // Тексты-функции не должны падать и обязаны возвращать непустую строку.
        const ctx = { result, band, inputs: canonical };
        const text = resolveText(calc.interpretation?.[band.id], ctx);
        assert.ok(
          typeof text === 'string' && text.trim(),
          `interpretation["${band.id}"] не дал текста`,
        );
        const guidance = resolveText(calc.guidance?.[band.id], ctx);
        if (guidance) {
          assert.ok(guidance.source, `guidance["${band.id}"]: нет source`);
          assert.ok(guidance.points?.length, `guidance["${band.id}"]: пустой points`);
        }

        if (ex.expect.value !== undefined) {
          const shown = round(result.value, result.decimals ?? 0);
          assert.equal(
            shown,
            ex.expect.value,
            `на экране будет ${shown}, ожидалось ${ex.expect.value} (точное значение ${result.value})`,
          );
        }

        if (ex.expect.band !== undefined) {
          assert.equal(
            band.id,
            ex.expect.band,
            `диапазон "${band.id}" (${band.label}), ожидался "${ex.expect.band}"`,
          );
        }

        if (ex.expect.details !== undefined) {
          const got = (result.details ?? []).map((d) => round(d.value, d.decimals ?? 0));
          assert.deepEqual(
            got,
            ex.expect.details,
            `доп. значения ${JSON.stringify(got)}, ожидались ${JSON.stringify(ex.expect.details)}`,
          );
        }
      });
    }
  });
}
