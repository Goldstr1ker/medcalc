// Округление до заданного числа знаков.
export function round(value, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

// Число в русском формате: 33, 1,73, 12 345.
export function fmtNumber(value, decimals = 0) {
  if (value == null || Number.isNaN(value)) return '—';
  return round(value, decimals).toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Русское склонение: plural(1, ['балл', 'балла', 'баллов']) -> 'балл'.
export function plural(n, [one, few, many]) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
