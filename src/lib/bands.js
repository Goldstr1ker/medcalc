// Диапазоны результата ("bands").
//
// Каждый band: { id, label, min, color, risk? }.
//   min  — нижняя граница диапазона (включительно). Верхняя = min следующего band'а.
//   color — ключ из COLORS.
//   risk  — необязательная строка (напр. "≈2,2% инсульта в год") для шкал-счётчиков.
//
// Band'ы можно передавать в любом порядке — функции ниже сортируют сами.

export const COLORS = {
  green: '#16a34a',
  lime: '#65a30d',
  yellow: '#ca8a04',
  orange: '#ea580c',
  red: '#dc2626',
  darkred: '#991b1b',
  slate: '#475569',
};

/**
 * Приводит result.bands к массиву.
 *
 * Диапазоны можно задавать функцией от введённых значений — это нужно там,
 * где норма зависит от пациента, а не только от результата. Пример: у QTc
 * порог патологии у женщин на 10 мс выше, чем у мужчин. Раньше схема этого
 * не позволяла, и приходилось брать один усреднённый порог с оговоркой.
 *
 * @param spec   объект result калькулятора
 * @param inputs канонические значения (после перевода единиц)
 */
export function resolveBands(spec, inputs) {
  return typeof spec.bands === 'function' ? spec.bands(inputs) : spec.bands;
}

// Band, в который попадает значение: самый верхний, у которого min <= value.
//
// Один линейный проход без копирования и сортировки: функция вызывается
// на каждый рендер калькулятора, а диапазонов всего несколько — сортировать
// их заново каждый раз было чистой тратой.
export function resolveBand(value, bands) {
  /** @type {import('./types.js').Band | null} */
  let match = null;
  /** @type {import('./types.js').Band | null} */
  let lowest = null;
  for (const b of bands) {
    if (lowest === null || b.min < lowest.min) lowest = b;
    if (value >= b.min && (match === null || b.min > match.min)) match = b;
  }
  // Значение ниже самого нижнего порога — отдаём нижний диапазон,
  // чтобы результат не оказался вовсе без трактовки.
  return match ?? lowest;
}

// Для шкалы-полоски: к каждому band'у добавляет [from, to] в пределах [scaleMin, scaleMax].
export function bandRanges(bands, scaleMin, scaleMax) {
  const asc = [...bands].sort((a, b) => a.min - b.min);
  return asc.map((b, i) => ({
    ...b,
    from: Math.max(b.min, scaleMin),
    to: i + 1 < asc.length ? asc[i + 1].min : scaleMax,
  }));
}
