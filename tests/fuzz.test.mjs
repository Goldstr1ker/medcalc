// Фаззинг калькуляторов: случайные, но допустимые входные данные.
//
// Инвариант, который здесь проверяется:
//
//   при ЛЮБЫХ значениях внутри объявленных min/max формула обязана вернуть
//   конечное число, это число обязано попасть в диапазон, а у диапазона
//   обязан найтись текст интерпретации.
//
// Обратный инвариант — что за границами расчёт вообще не запускается —
// проверяется отдельным блоком ниже.
//
// Зачем это поверх examples: примеры пишет человек, и он подставляет туда
// клинически осмысленные значения. Ломается же формула обычно на том, о чём
// автор не подумал: ровно на границе, на нуле внутри диапазона, на сочетании
// «низкий рост + большая масса», на неканонической единице измерения.
//
// ДЕТЕРМИНИРОВАННОСТЬ. Тест, который падает раз в сто запусков и не
// воспроизводится, хуже отсутствующего. Поэтому генератор псевдослучайный
// с фиксированным зерном: при падении печатается полный набор входных данных
// и зерно, а `FUZZ_SEED=… npm test` повторяет прогон один в один.
// Глубже прогнать локально: FUZZ_RUNS=5000 npm test
//
// ЧЕГО ЭТОТ ФАЗЗЕР НЕ ЛОВИТ. Он прицельно бьёт по границам ПОЛЕЙ ВВОДА
// (min/max) и равномерно по диапазону между ними. Пороги ВНУТРИ формулы —
// например `if (creatinine >= 110)` в SOFA — попадают под обстрел только
// случайно: попасть ровно в 110 равномерным перебором маловероятно.
// Ошибку вида «>= вместо >» в таком пороге поймает только пример,
// написанный ровно на границе. Это отдельная задача, здесь она не решена.

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadCalculators } from '../scripts/lib/load-calculators.mjs';
import {
  ISSUE,
  boundInUnit,
  compute,
  initialUnits,
  initialValues,
  resolveText,
  validateValues,
} from '../src/lib/compute.js';

const SEED = Number(process.env.FUZZ_SEED ?? 20260907);
const RUNS = Number(process.env.FUZZ_RUNS ?? 200);

/** mulberry32 — компактный ГПСЧ с воспроизводимой последовательностью. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/**
 * Значение для числового поля в ВЫБРАННОЙ единице.
 * Равномерное случайное — слабый фаззер: ломается обычно край, а не середина,
 * поэтому границы и ноль подмешиваются намеренно.
 */
function pickNumber(rng, lo, hi) {
  const roll = rng();
  const span = hi - lo;
  if (roll < 0.12) return lo; // ровно нижняя граница
  if (roll < 0.24) return hi; // ровно верхняя
  if (roll < 0.3) return lo + span * 1e-6; // впритык к нижней
  if (roll < 0.36) return hi - span * 1e-6; // впритык к верхней
  if (roll < 0.42 && lo <= 0 && hi >= 0) return 0; // ноль, если он допустим
  if (roll < 0.55) return lo + span * rng() * 0.02; // хвост у нижней границы
  return lo + span * rng(); // равномерно по диапазону
}

/** Полный случайный набор значений и единиц для калькулятора. */
function makeCase(calc, rng) {
  const values = { ...initialValues(calc.inputs) };
  const units = { ...initialUnits(calc.inputs) };

  for (const input of calc.inputs) {
    const type = input.type ?? 'number';

    if (type === 'select') {
      values[input.id] = pick(rng, input.options);
      continue;
    }
    if (type === 'boolean') {
      values[input.id] = rng() < 0.5;
      continue;
    }

    // Единицу выбираем случайно — конверсия единиц отдельный источник ошибок.
    if (input.units) units[input.id] = pick(rng, input.units).id;

    // Необязательное поле иногда оставляем пустым.
    if (input.optional && rng() < 0.25) {
      values[input.id] = '';
      continue;
    }

    // Границы канонические, а values живут в выбранной единице — генерируем
    // сразу в ней, иначе на краях вылезала бы ошибка округления.
    const lo = boundInUnit(input, input.min, units[input.id]);
    const hi = boundInUnit(input, input.max, units[input.id]);
    values[input.id] = pickNumber(rng, lo, hi);
  }

  return { values, units };
}

const описание = (calc, { values, units }, прогон) =>
  `${calc.id}, прогон ${прогон}, зерно ${SEED}\n` +
  `  значения: ${JSON.stringify(values)}\n` +
  `  единицы:  ${JSON.stringify(units)}\n` +
  `  повторить: FUZZ_SEED=${SEED} npm test`;

const loaded = await loadCalculators();

test(`фаззинг: ${RUNS} прогонов на калькулятор, зерно ${SEED}`, async (t) => {
  for (const { calc } of loaded) {
    await t.test(calc.id, () => {
      // Своё зерно на калькулятор, чтобы добавление новой шкалы не сдвигало
      // последовательность у всех остальных и не «чинило»/«ломало» их случайно.
      const rng = makeRng(SEED + [...calc.id].reduce((n, c) => n + c.charCodeAt(0), 0));

      for (let i = 0; i < RUNS; i++) {
        const кейс = makeCase(calc, rng);
        const где = () => описание(calc, кейс, i);

        // 1. Сгенерированное внутри границ обязано проходить проверку.
        //    Если не проходит — значит границы противоречивы.
        const { ready, issues } = validateValues(calc.inputs, кейс.values, кейс.units);
        assert.ok(ready, `значение внутри границ не прошло проверку: ${JSON.stringify(issues)}\n${где()}`);

        // 2. Формула не падает и даёт конечное число.
        const { result, band, bands, inputs } = compute(calc, кейс.values, кейс.units);
        assert.ok(!result?.error, `calculate() упал: ${result?.error}\n${где()}`);
        assert.ok(Number.isFinite(result?.value), `результат не конечное число: ${result?.value}\n${где()}`);

        // 3. Число попало в диапазон.
        assert.ok(band, `значение ${result.value} не попало ни в один диапазон\n${где()}`);
        assert.ok(bands?.length, `пустой набор диапазонов\n${где()}`);

        // 4. У диапазона есть текст. Ловит диапазоны, до которых не добирается
        //    ни один пример — особенно у динамических bands (пороги по полу).
        // inputs обязательны: тексты-функции читают из них значения
        // (порог QTc зависит от пола, диурез в Паркленде — от массы).
        const ctx = { result, band, inputs };
        const текст = resolveText(calc.interpretation?.[band.id], ctx);
        assert.ok(
          typeof текст === 'string' && текст.trim(),
          `диапазон "${band.id}" без interpretation\n${где()}`,
        );

        // 5. Рекомендации, если есть, не пустые.
        const guidance = resolveText(calc.guidance?.[band.id], ctx);
        if (guidance) {
          assert.ok(guidance.source, `guidance["${band.id}"] без source\n${где()}`);
          assert.ok(guidance.points?.length, `guidance["${band.id}"] без points\n${где()}`);
        }

        // 6. Подшкалы в details тоже должны быть числами.
        for (const d of result.details ?? []) {
          assert.ok(
            Number.isFinite(d.value),
            `details["${d.label}"] = ${d.value}\n${где()}`,
          );
        }
      }
    });
  }
});

test('за пределами границ расчёт не запускается', async (t) => {
  for (const { calc } of loaded) {
    await t.test(calc.id, () => {
      for (const input of calc.inputs) {
        if ((input.type ?? 'number') !== 'number') continue;

        const values = { ...initialValues(calc.inputs) };
        const units = initialUnits(calc.inputs);

        // Остальные числовые поля заполняем допустимой серединой,
        // чтобы проверяемое поле было единственной причиной отказа.
        for (const other of calc.inputs) {
          if ((other.type ?? 'number') !== 'number' || other.id === input.id) continue;
          const lo = boundInUnit(other, other.min, units[other.id]);
          const hi = boundInUnit(other, other.max, units[other.id]);
          values[other.id] = (lo + hi) / 2;
        }

        const lo = boundInUnit(input, input.min, units[input.id]);
        const hi = boundInUnit(input, input.max, units[input.id]);
        const шаг = Math.max(Math.abs(hi - lo) * 0.01, 1);

        const ниже = validateValues(calc.inputs, { ...values, [input.id]: lo - шаг }, units);
        assert.equal(
          ниже.issues[input.id]?.kind,
          ISSUE.BELOW_MIN,
          `${calc.id}/${input.id}: значение ниже min не отбраковано`,
        );

        const выше = validateValues(calc.inputs, { ...values, [input.id]: hi + шаг }, units);
        assert.equal(
          выше.issues[input.id]?.kind,
          ISSUE.ABOVE_MAX,
          `${calc.id}/${input.id}: значение выше max не отбраковано`,
        );
      }
    });
  }
});
