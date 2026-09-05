// Единицы измерения — единственный источник правды.
//
// Раньше наборы единиц копировались в каждый калькулятор: креатинин был описан
// в трёх файлах, альбумин в двух, а билирубин — в двух, причём с ПРОТИВОПОЛОЖНЫМ
// каноном. Это ровно та ошибка, которую копипастят не в ту сторону.
//
// Правило именования: суффикс константы — это каноническая единица, то есть та,
// в которой значение придёт в calculate(). CREATININE_MGDL означает
// «набор единиц для креатинина, calculate() получит мг/дл».
//
// factor — множитель для перевода введённого значения в каноническую единицу.
// У канонической единицы factor всегда 1, и она идёт первой, если это принято
// в отечественной практике (для лабораторных показателей — единицы СИ).

// Коэффициенты пересчёта. Каждое число встречается в проекте ровно один раз.
const UMOL_PER_MGDL_CREATININE = 88.4;
const UMOL_PER_MGDL_BILIRUBIN = 17.1;

/** Креатинин. calculate() получит мг/дл (нужно формулам CKD-EPI, Кокрофт–Голт, MELD). */
export const CREATININE_MGDL = [
  { id: 'umol', label: 'мкмоль/л', factor: 1 / UMOL_PER_MGDL_CREATININE },
  { id: 'mgdl', label: 'мг/дл', factor: 1 },
];

/** Креатинин. calculate() получит мкмоль/л (пороги SOFA заданы в единицах СИ). */
export const CREATININE_UMOL = [
  { id: 'umol', label: 'мкмоль/л', factor: 1 },
  { id: 'mgdl', label: 'мг/дл', factor: UMOL_PER_MGDL_CREATININE },
];

/** Билирубин. calculate() получит мкмоль/л (пороги Чайлд-Пью заданы в СИ). */
export const BILIRUBIN_UMOL = [
  { id: 'umol', label: 'мкмоль/л', factor: 1 },
  { id: 'mgdl', label: 'мг/дл', factor: UMOL_PER_MGDL_BILIRUBIN },
];

/** Билирубин. calculate() получит мг/дл (в таком виде его требует формула MELD). */
export const BILIRUBIN_MGDL = [
  { id: 'umol', label: 'мкмоль/л', factor: 1 / UMOL_PER_MGDL_BILIRUBIN },
  { id: 'mgdl', label: 'мг/дл', factor: 1 },
];

/** Альбумин. calculate() получит г/л. */
export const ALBUMIN_GL = [
  { id: 'gl', label: 'г/л', factor: 1 },
  { id: 'gdl', label: 'г/дл', factor: 10 },
];

/** Глюкоза. calculate() получит ммоль/л. */
export const GLUCOSE_MMOL = [
  { id: 'mmol', label: 'ммоль/л', factor: 1 },
  { id: 'mgdl', label: 'мг/дл', factor: 1 / 18 },
];
