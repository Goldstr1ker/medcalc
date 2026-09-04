// Конвейер расчёта: значения формы -> канонические единицы -> calculate() -> диапазон.
//
// Вынесен из CalculatorView намеренно: тесты формул должны гонять РОВНО тот же
// код, который исполняется в приложении. Если бы канонизация единиц осталась
// внутри компонента, тесты проверяли бы её копию — и расхождение между копией
// и оригиналом никто бы не заметил.

import { resolveBand } from './bands.js';

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
 * Незаполненное необязательное числовое поле приходит как null.
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

/** Заполнены ли все обязательные числовые поля. */
export function isReady(inputs, values) {
  return inputs.every((i) => {
    if (i.type !== 'number' || i.optional) return true;
    const v = values[i.id];
    return v !== '' && v != null && !Number.isNaN(Number(v));
  });
}

/**
 * Полный расчёт. Возвращает { result, band }.
 * При исключении в calculate() — { result: { error }, band: null }.
 */
export function compute(calc, values, units) {
  try {
    const result = calc.calculate(toCanonical(calc.inputs, values, units));
    return { result, band: resolveBand(result.value, calc.result.bands) };
  } catch (e) {
    return { result: { error: String(e?.message || e) }, band: null };
  }
}
