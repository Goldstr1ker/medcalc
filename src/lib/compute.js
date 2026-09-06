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

/** Множитель перевода выбранной единицы в каноническую. */
function unitFactor(input, unitId) {
  if (!input.units) return 1;
  return input.units.find((x) => x.id === unitId)?.factor ?? 1;
}

/** Одно числовое поле формы -> каноническое число. null — пусто, NaN — не число. */
function canonicalizeNumber(input, raw, unitId) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return n * unitFactor(input, unitId);
}

/**
 * Переводит каноническую границу min/max обратно в выбранную единицу.
 *
 * Границы в схеме задаются в КАНОНИЧЕСКОЙ единице (иначе `max: 80` у глюкозы
 * был бы бессмыслицей: 80 ммоль/л — разумный потолок, 80 мг/дл — нижняя
 * граница нормы). Но показать пользователю и отдать в HTML-атрибут нужно
 * границу в той единице, которую он выбрал.
 */
export function boundInUnit(input, bound, unitId) {
  if (bound === undefined || bound === null) return undefined;
  const f = unitFactor(input, unitId);
  return f === 0 ? bound : bound / f;
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
    const v = values[input.id];
    out[input.id] =
      (input.type ?? 'number') === 'number'
        ? canonicalizeNumber(input, v, units?.[input.id])
        : v;
  }
  return out;
}

// Допуск при сравнении с границей.
//
// Границы канонические, а вводит пользователь в выбранной единице. Перевод
// туда-обратно даёт ошибку округления: min 0,05 мг/дл показывается как
// 4,42 мкмоль/л, а обратно превращается в 0,049999999999999996 — то есть
// «меньше минимума». Без допуска поле отвергало бы ровно то значение,
// которое само же и подсказывает в атрибуте min.
const REL_EPS = 1e-9;
const допуск = (limit) => Math.max(Math.abs(limit), 1) * REL_EPS;
const меньшеГраницы = (v, limit) => v < limit - допуск(limit);
const большеГраницы = (v, limit) => v > limit + допуск(limit);

/** Виды проблем с введённым значением. */
export const ISSUE = {
  EMPTY: 'empty',
  NOT_A_NUMBER: 'notANumber',
  BELOW_MIN: 'belowMin',
  ABOVE_MAX: 'aboveMax',
};

/**
 * Проверяет введённые значения. Возвращает { ready, issues, canonical }.
 *
 * Зачем отдельно от isReady: раньше проверялось только «поле не пустое и
 * парсится в число», а объявленные в схеме min/max не проверялись нигде —
 * ни здесь, ни в calculate(). Возраст 500 при объявленных 18–120 спокойно
 * доезжал до формулы и давал уверенную клиническую трактовку.
 *
 * Границы сверяются с КАНОНИЧЕСКИМ значением (после перевода единиц).
 */
export function validateValues(inputs, values, units) {
  const issues = {};
  const canonical = {};

  for (const input of inputs) {
    const type = input.type ?? 'number';
    if (type !== 'number') {
      canonical[input.id] = values[input.id];
      continue;
    }

    const v = canonicalizeNumber(input, values[input.id], units?.[input.id]);
    canonical[input.id] = v;

    if (v === null) {
      if (!input.optional) issues[input.id] = { kind: ISSUE.EMPTY };
      continue;
    }
    if (!Number.isFinite(v)) {
      // Сюда попадает и «1e400» -> Infinity, и любой нечисловой ввод.
      issues[input.id] = { kind: ISSUE.NOT_A_NUMBER };
      continue;
    }
    if (input.min !== undefined && меньшеГраницы(v, input.min)) {
      issues[input.id] = { kind: ISSUE.BELOW_MIN, limit: input.min };
      continue;
    }
    if (input.max !== undefined && большеГраницы(v, input.max)) {
      issues[input.id] = { kind: ISSUE.ABOVE_MAX, limit: input.max };
    }
  }

  return { ready: Object.keys(issues).length === 0, issues, canonical };
}

/**
 * Заполнены и допустимы ли все обязательные поля.
 * Тонкая обёртка над validateValues — оставлена ради читаемости вызовов.
 */
export function isReady(inputs, values, units) {
  return validateValues(inputs, values, units).ready;
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

    // Не-число дальше не пускаем. Раньше NaN уходил в resolveBand, тот не
    // находил совпадения и по правилу «ниже шкалы» отдавал САМЫЙ НИЖНИЙ
    // диапазон — у СКФ это «терминальная ХБП». То есть на мусорном вводе
    // пользователь видел прочерк вместо числа и уверенную трактовку рядом.
    if (!Number.isFinite(result?.value)) {
      return {
        result: { error: 'расчёт не дал конечного числа — проверьте введённые значения' },
        band: null,
        bands: [],
        inputs,
      };
    }

    const bands = resolveBands(calc.result, inputs);
    return { result, band: resolveBand(result.value, bands), bands, inputs };
  } catch (e) {
    // В консоль пишем всегда: наружу уходит только текст сообщения, а понять,
    // где именно упала формула, можно лишь по стеку.
    console.error('Ошибка в calculate() калькулятора', calc?.id, e);
    const error = e instanceof Error && e.message ? e.message : String(e);
    return { result: { error }, band: null, bands: [], inputs: null };
  }
}
