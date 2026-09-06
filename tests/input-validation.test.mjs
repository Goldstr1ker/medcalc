// Тесты проверки вводимых значений.
//
// Поводом послужила настоящая дыра: min/max объявлялись в схеме, попадали
// в HTML-атрибуты — и не проверялись нигде. Возраст 500 при объявленных
// 18–120 доезжал до формулы, а NaN молча уезжал в самый нижний диапазон
// (у СКФ это «терминальная ХБП» с рекомендациями про диализ).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ISSUE,
  boundInUnit,
  compute,
  initialUnits,
  initialValues,
  validateValues,
} from '../src/lib/compute.js';
import { resolveBand } from '../src/lib/bands.js';
import { loadCalculators } from '../scripts/lib/load-calculators.mjs';

// Синтетическое поле с единицами: канон — мг/дл (factor 1),
// по умолчанию показываем мкмоль/л, как у настоящего креатинина.
const ПОЛЕ_С_ЕДИНИЦАМИ = {
  id: 'scr',
  label: 'Креатинин',
  type: 'number',
  min: 0.05,
  max: 25,
  units: [
    { id: 'umol', label: 'мкмоль/л', factor: 1 / 88.4 },
    { id: 'mgdl', label: 'мг/дл', factor: 1 },
  ],
};

const ПРОСТОЕ_ПОЛЕ = { id: 'age', label: 'Возраст', type: 'number', min: 18, max: 120 };

test('пустое обязательное поле — не готово, но это не «ошибка значения»', () => {
  const { ready, issues } = validateValues([ПРОСТОЕ_ПОЛЕ], { age: '' }, {});
  assert.equal(ready, false);
  assert.equal(issues.age.kind, ISSUE.EMPTY);
});

test('пустое необязательное поле не мешает расчёту', () => {
  const поле = { ...ПРОСТОЕ_ПОЛЕ, optional: true };
  assert.equal(validateValues([поле], { age: '' }, {}).ready, true);
});

test('1e400 превращается в Infinity и отбраковывается', () => {
  const { ready, issues } = validateValues([ПРОСТОЕ_ПОЛЕ], { age: '1e400' }, {});
  assert.equal(ready, false);
  assert.equal(issues.age.kind, ISSUE.NOT_A_NUMBER);
});

test('нечисловой ввод отбраковывается', () => {
  assert.equal(validateValues([ПРОСТОЕ_ПОЛЕ], { age: 'абв' }, {}).issues.age.kind, ISSUE.NOT_A_NUMBER);
});

test('выход за min и за max различаются и несут границу', () => {
  const ниже = validateValues([ПРОСТОЕ_ПОЛЕ], { age: 5 }, {}).issues.age;
  assert.equal(ниже.kind, ISSUE.BELOW_MIN);
  assert.equal(ниже.limit, 18);

  const выше = validateValues([ПРОСТОЕ_ПОЛЕ], { age: 500 }, {}).issues.age;
  assert.equal(выше.kind, ISSUE.ABOVE_MAX);
  assert.equal(выше.limit, 120);
});

test('границы сверяются с КАНОНИЧЕСКИМ значением, а не с введённым', () => {
  const inputs = [ПОЛЕ_С_ЕДИНИЦАМИ];
  // 180 мкмоль/л = 2,04 мг/дл — в пределах [0,05; 25] мг/дл.
  assert.equal(validateValues(inputs, { scr: 180 }, { scr: 'umol' }).ready, true);
  // То же число, но введённое как мг/дл, — уже выше потолка.
  assert.equal(
    validateValues(inputs, { scr: 180 }, { scr: 'mgdl' }).issues.scr.kind,
    ISSUE.ABOVE_MAX,
  );
});

test('ровно граница, переведённая в другую единицу, принимается', () => {
  // 0,05 мг/дл показывается как 4,42 мкмоль/л; перевод обратно даёт
  // 0,049999999999999996 — без допуска поле отвергало бы собственную подсказку.
  const вМкмоль = boundInUnit(ПОЛЕ_С_ЕДИНИЦАМИ, ПОЛЕ_С_ЕДИНИЦАМИ.min, 'umol');
  assert.equal(
    validateValues([ПОЛЕ_С_ЕДИНИЦАМИ], { scr: вМкмоль }, { scr: 'umol' }).ready,
    true,
  );
});

test('допуск не пропускает значения, выходящие за границу по существу', () => {
  assert.equal(validateValues([ПРОСТОЕ_ПОЛЕ], { age: 17.9 }, {}).issues.age.kind, ISSUE.BELOW_MIN);
  assert.equal(validateValues([ПРОСТОЕ_ПОЛЕ], { age: 120.1 }, {}).issues.age.kind, ISSUE.ABOVE_MAX);
});

test('boundInUnit переводит границу в выбранную единицу для подписи и HTML', () => {
  // Потолок 25 мг/дл в мкмоль/л — это 25 × 88,4 = 2210.
  assert.equal(Math.round(boundInUnit(ПОЛЕ_С_ЕДИНИЦАМИ, 25, 'umol')), 2210);
  assert.equal(boundInUnit(ПОЛЕ_С_ЕДИНИЦАМИ, 25, 'mgdl'), 25);
  assert.equal(boundInUnit(ПРОСТОЕ_ПОЛЕ, undefined, undefined), undefined);
});

test('resolveBand не принимает NaN и Infinity за «ниже шкалы»', () => {
  const bands = [
    { id: 'high', min: 90, label: 'высоко' },
    { id: 'low', min: 0, label: 'низко' },
  ];
  // Настоящее значение ниже нижнего порога — по-прежнему нижний диапазон.
  assert.equal(resolveBand(-5, bands).id, 'low');
  // А вот не-число диапазона не имеет вовсе.
  assert.equal(resolveBand(NaN, bands), null);
  assert.equal(resolveBand(Infinity, bands), null);
});

test('compute отдаёт ошибку, если calculate() вернул не конечное число', () => {
  const calc = {
    id: 'фиктивный',
    inputs: [ПРОСТОЕ_ПОЛЕ],
    calculate: () => ({ value: NaN }),
    result: { bands: [{ id: 'low', min: 0, label: 'низко' }] },
  };
  const { result, band } = compute(calc, { age: 50 }, {});
  assert.equal(band, null, 'диапазон не должен подбираться для NaN');
  assert.ok(result.error, 'должна быть внятная ошибка');
});

test('compute перехватывает исключение внутри calculate()', () => {
  const calc = {
    id: 'падучий',
    inputs: [ПРОСТОЕ_ПОЛЕ],
    calculate: () => {
      throw new Error('деление на ноль');
    },
    result: { bands: [{ id: 'low', min: 0, label: 'низко' }] },
  };
  const { result } = compute(calc, { age: 50 }, {});
  assert.match(result.error, /деление на ноль/);
});

// --- проверка на настоящем каталоге ---

const loaded = await loadCalculators();

test('на объявленных границах min/max каждый калькулятор даёт конечное число', async (t) => {
  for (const { calc } of loaded) {
    for (const край of ['min', 'max']) {
      await t.test(`${calc.id} — все поля на ${край}`, () => {
        const values = { ...initialValues(calc.inputs) };
        const units = initialUnits(calc.inputs);
        let применимо = false;

        for (const input of calc.inputs) {
          if ((input.type ?? 'number') !== 'number') continue;
          if (input[край] === undefined) continue;
          // Границы канонические — переводим в единицу по умолчанию,
          // потому что values хранятся в выбранной пользователем единице.
          values[input.id] = boundInUnit(input, input[край], units[input.id]);
          применимо = true;
        }
        if (!применимо) return;

        const { ready, issues } = validateValues(calc.inputs, values, units);
        assert.ok(ready, `собственные границы не проходят проверку: ${JSON.stringify(issues)}`);

        const { result, band } = compute(calc, values, units);
        assert.ok(
          Number.isFinite(result?.value),
          `на границе ${край} результат = ${result?.value ?? result?.error}`,
        );
        assert.ok(band, `на границе ${край} значение не попало ни в один диапазон`);
      });
    }
  }
});
