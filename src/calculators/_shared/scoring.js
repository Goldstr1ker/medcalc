// Общие хелперы для calculate() у балльных шкал.
//
// Это пример соглашения о файлах-хелперах. Всё в src/calculators/ с префиксом
// `_` (файл или папка) не сканируется как калькулятор: обходчик
// scripts/lib/load-calculators.mjs и import.meta.glob в src/registry.js
// такие пути пропускают. Сюда выносится то, что дословно повторялось
// в calculate() у восьми шкал.

/**
 * Балльная шкала: суммирует баллы за выполненные условия и собирает breakdown
 * (в него попадают только сработавшие строки).
 *
 * @param {Array<[unknown, string, number?]>} rows
 *        [условие, подпись, баллы] — баллы по умолчанию 1, допускаются
 *        дробные и отрицательные (шкала Уэллса для ТГВ).
 * @param {{ decimals?: number }} [opts] decimals для отображения итога.
 */
export function tally(rows, { decimals = 0 } = {}) {
  const breakdown = [];
  let value = 0;
  for (const [cond, label, points = 1] of rows) {
    if (cond) {
      value += points;
      breakdown.push({ label, points });
    }
  }
  return { value, decimals, breakdown };
}
