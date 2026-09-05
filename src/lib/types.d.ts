// Форма калькулятора — типы для проверки схемы в редакторе и в CI.
//
// Зачем, если есть валидатор. Валидатор (scripts/validate-calculators.mjs)
// ловит ошибки при сборке и умеет то, чего типы не умеют: покрытие диапазонов
// текстами, совпадение id band'ов с ключами interpretation, принадлежность
// раздела перечню из systems.js, прогон examples через calculate(). Но узнаёшь
// ты об этом через минуту после того, как написал файл.
//
// Типы ловят другой класс ошибок и мгновенно, прямо при наборе: опечатка в
// имени поля (`decimal` вместо `decimals`), не тот тип (`min: '18'`), забытое
// обязательное поле, calculate(), вернувший не то. Это дополняющие проверки,
// а не замена одной другой.
//
// Файл типовой, в бандл не попадает. Подключается к калькулятору строкой
//   /** @type {import('../../lib/types.js').Calculator} */
// перед `export default`.

export type BandColor = 'green' | 'lime' | 'yellow' | 'orange' | 'red' | 'darkred' | 'slate';

/** Диапазон результата. min — нижняя граница включительно, верхняя = min следующего. */
export interface Band {
  id: string;
  label: string;
  min: number;
  color?: BandColor;
  /** Необязательная приписка к подписи диапазона, напр. «≈2,2% инсульта в год». */
  risk?: string;
}

/** Единица измерения. factor — множитель перевода в каноническую единицу. */
export interface Unit {
  id: string;
  label: string;
  factor: number;
}

interface InputBase {
  id: string;
  label: string;
  /** Группировка полей для длинных шкал. Поля одной группы должны идти подряд. */
  group?: string;
}

export interface NumberInput extends InputBase {
  type?: 'number';
  /** Единица одной строкой, когда выбора нет (напр. 'лет', 'мм рт. ст.'). */
  unit?: string;
  /** Набор единиц с переключателем. Берётся из lib/units.js, не пишется инлайном. */
  units?: readonly Unit[];
  min?: number;
  max?: number;
}

export interface SelectInput extends InputBase {
  type: 'select';
  options: readonly string[];
}

export interface BooleanInput extends InputBase {
  type: 'boolean';
}

export type CalculatorInput = NumberInput | SelectInput | BooleanInput;

/** Значения после toCanonical(): числа распарсены, единицы переведены. */
export type CanonicalValues = Record<string, number | string | boolean | null>;

/** Строка разбора баллов («за что балл»), рисуется со знаком «+». */
export interface BreakdownRow {
  label: string;
  points: number;
}

/** Дополнительная вычисленная величина сверх основного результата. */
export interface DetailRow {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  color?: BandColor;
}

export interface CalcResult {
  value: number;
  /** Не нужен для result.type: 'score'. */
  unit?: string;
  decimals?: number;
  breakdown?: BreakdownRow[];
  details?: DetailRow[];
}

/**
 * Контекст, который получает текст-функция в interpretation/guidance.
 * inputs здесь широкий по той же причине, что и параметр calculate():
 * набор полей свой у каждого калькулятора, а тексты подставляют введённые
 * числа (`${inputs.weight}`) — строгий тип заставлял бы приводить их в каждой.
 */
export interface TextContext {
  result: CalcResult;
  band: Band;
  inputs: Record<string, any>;
}

export interface Guidance {
  source: string;
  points: string[];
}

/** Значение, которое можно задать либо готовым, либо функцией от контекста. */
export type Resolvable<T> = T | ((ctx: TextContext) => T);

export interface ResultSpec {
  type: 'gauge' | 'score' | 'value';
  /** Обязательны для type: 'gauge' — границы шкалы-полоски. */
  min?: number;
  max?: number;
  /** Функцией — когда пороги зависят от пациента (напр. пол у QTc). */
  bands: Band[] | ((inputs: CanonicalValues) => Band[]);
}

export interface Example {
  note?: string;
  /** Только поля, отличные от значений по умолчанию. */
  inputs: Record<string, number | string | boolean>;
  /** id единицы для полей с переключателем; по умолчанию первая. */
  units?: Record<string, string>;
  expect: {
    /** ОКРУГЛЁННОЕ значение — то, что появится на экране. */
    value?: number;
    band?: string;
    details?: number[];
  };
}

export interface Calculator {
  id: string;
  name: string;
  shortName?: string;
  /**
   * Только из SYSTEMS в lib/systems.js. Здесь тип широкий: значения перечня —
   * обычные строки, литеральный union из них не вывести без TS-синтаксиса
   * в самом systems.js. Принадлежность перечню проверяет валидатор.
   */
  system: string;
  tags?: string[];
  description: string;
  inputs: CalculatorInput[];
  /**
   * Получает канонические значения. Параметр намеренно широкий: набор полей
   * свой у каждого калькулятора, и строгий тип заставлял бы приводить типы
   * в каждой формуле. Проверяется здесь возвращаемая форма — там и ошибки.
   */
  calculate(values: Record<string, any>): CalcResult;
  result: ResultSpec;
  /** Обязателен для КАЖДОГО band'а — это проверяет валидатор. */
  interpretation: Record<string, Resolvable<string>>;
  guidance?: Record<string, Resolvable<Guidance>>;
  caveats?: string[];
  /** Обязательны: без них формула ничем не защищена от регрессий. */
  examples: Example[];
  references: string[];
  /** Формат ГГГГ-ММ-ДД. */
  updated: string;
  version: number;
}
