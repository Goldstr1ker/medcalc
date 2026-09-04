// Реестр калькуляторов.
//
// Каждый файл в src/calculators/**/*.js экспортирует по умолчанию один объект-калькулятор.
// import.meta.glob подхватывает их автоматически — чтобы добавить калькулятор,
// достаточно создать новый файл, править этот реестр не нужно.

import { systemOrderIndex } from './lib/systems.js';

const modules = import.meta.glob('./calculators/**/*.js', { eager: true });

export const calculators = Object.values(modules)
  .map((m) => m.default)
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

// Разделы (системы органов) с числом калькуляторов в каждом.
// Порядок — клинический, из lib/systems.js, а не алфавитный.
// Разделы без калькуляторов сюда не попадают.
export const systems = [...new Set(calculators.map((c) => c.system))]
  .sort((a, b) => systemOrderIndex(a) - systemOrderIndex(b))
  .map((name) => ({
    name,
    count: calculators.filter((c) => c.system === name).length,
  }));

export function getCalculator(id) {
  return calculators.find((c) => c.id === id) || null;
}

export function getBySystem(system) {
  return calculators.filter((c) => c.system === system);
}

// Поиск по названию, разделу, тегам и описанию. Все слова запроса должны совпасть.
export function searchCalculators(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const parts = q.split(/\s+/);
  return calculators.filter((c) => {
    const hay = [c.name, c.shortName, c.system, c.description, ...(c.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return parts.every((p) => hay.includes(p));
  });
}
