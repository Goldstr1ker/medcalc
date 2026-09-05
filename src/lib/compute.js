// Конвейер расчёта: значения формы -> канонические единицы -> calculate() -> диапазон.
//
// Вынесен из CalculatorView намеренно: тесты формул должны гонять РОВНО тот же
// код, который исполняется в приложении. Если бы канонизация единиц осталась
// внутри компонента, тесты проверяли бы её копию — и расхождение между копией
// и оригиналом никто бы не заметил.

import { resolveBand, resolveBands } from './bands.js';

/** Значение поля по умолчанию. */
export function initialValue(input) {
  if (input.type === 'select') return input.options[0];
  if (input.type === 'boolean') return false;
  return '';
}

/** Начальное состояние всех полей калькулятора. */
export function initialValues(inputs) {
  return Object.fromEntries(inputs.map((i) => [i.id, initialValue(i)]));
}

/** Начально выбранные единицы измерения (первая в списке = каноническая). */
export function initialUnits(inputs) {
  return Object.fromEntries(inputs.filter((i) => i.units).map((i) => [i.id, i.units[0].id]));
}

/**
 * Приводит значения формы к каноническому виду для calculate():
 * числа парсятся из строк, единицы переводятся по factor.
 * Пустое числовое поле даёт null, но в calculate() не попадёт — isReady
 * не пустит расчёт, пока все числовые поля не заполнены.
 */
export function toCanonical(inputs, values, units) {
  const out = {};
  for (const input of inputs) {
    let v = values[input.id];
    if (input.type === 'number') {
      v = v === '' || v == null ? null : Number(v);
      if (v != null && input.units) {
        const u = input.units.find((x) => x.id === units[input.id]);
        v = v * (u?.factor ?? 1);
      }
    }
    out[input.id] = v;
  }
  return out;
}

/** Заполнены ли все числовые поля. */
export function isReady(inputs, values) {
  return inputs.every((i) => {
    if (i.type !== 'number') return true;
    const v = values[i.id];
    return v !== '' && v != null && !Number.isNaN(Number(v));
  });
}

/**
 * Тексты интерпретации и рекомендаций могут быть не строкой, а функцией
 * от контекста — чтобы подставлять вычисленные числа. Например, у формулы
 * Паркленда полезно назвать целевой диурез именно для этой массы тела,
 * а не абстрактные «0,5 мл/кг/ч».
 *
 * @param value строка/объект или функция (ctx) => то же самое
 * @param ctx   контекст с полями result, band, inputs
 */
export function resolveText(value, ctx) {
  return typeof value === 'function' ? value(ctx) : value;
}

/**
 * Полный расчёт. Возвращает { result, band, bands, inputs }.
 * При исключении в calculate() — { result: { error }, band: null }.
 *
 * bands и inputs возвращаются наружу, потому что нужны дальше: bands —
 * для отрисовки шкалы, inputs — для подстановки чисел в тексты.
 */
export function compute(calc, values, units) {
  try {
    const inputs = toCanonical(calc.inputs, values, units);
    const result = calc.calculate(inputs);
    const bands = resolveBands(calc.result, inputs);
    return { result, band: resolveBand(result.value, bands), bands, inputs };
  } catch (e) {
    // В консоль пишем всегда: наружу уходит только текст сообщения, а понять,
    // где именно упала формула, можно лишь по стеку.
    console.error('Ошибка в calculate() калькулятора', calc?.id, e);
    const error = e instanceof Error ? e.message : String(e);
    return { result: { error }, band: null, bands: [], inputs: null };
  }
}
