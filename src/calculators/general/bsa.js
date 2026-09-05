// Площадь поверхности тела по формуле Мостеллера: BSA(м²) = √(рост(см) × масса(кг) / 3600).

import { SYSTEMS } from '../../lib/systems.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'bsa',
  name: 'Площадь поверхности тела (BSA)',
  shortName: 'BSA (Мостеллер)',
  system: SYSTEMS.GENERAL,
  tags: ['bsa', 'площадь поверхности тела', 'мостеллер', 'дозирование', 'химиотерапия'],
  description:
    'Площадь поверхности тела по формуле Мостеллера — используется для дозирования химиотерапии и расчёта сердечного индекса.',

  inputs: [
    { id: 'height', label: 'Рост', type: 'number', unit: 'см', min: 30, max: 250 },
    { id: 'weight', label: 'Масса тела', type: 'number', unit: 'кг', min: 2, max: 300 },
  ],

  calculate({ height, weight }) {
    return { value: Math.sqrt((height * weight) / 3600), unit: 'м²', decimals: 2 };
  },

  result: {
    type: 'value',
    bands: [{ id: 'default', label: 'Расчётная площадь поверхности тела', min: 0, color: 'slate' }],
  },

  interpretation: {
    default:
      'Площадь поверхности тела применяется для дозирования ряда препаратов (в первую очередь химиотерапии) и расчёта сердечного индекса (сердечный выброс / BSA).',
  },

  caveats: [
    'Точность снижается на крайних значениях массы тела (выраженное ожирение, кахексия) — для дозирования химиотерапии часто применяют ограничение по BSA сверху (напр., условный потолок 2,0–2,2 м²) по институциональному протоколу.',
    'У детей возможны отдельные формулы (напр., Haycock); Мостеллер применим и у детей, и у взрослых и наиболее распространён благодаря простоте.',
    'При беременности, асците, значимых отёках BSA по массе тела завышается.',
  ],

  examples: [
    {
      note: 'Взрослый среднего роста и массы',
      inputs: { height: 170, weight: 70 },
      expect: { value: 1.82 },
    },
    {
      note: 'Ребёнок 5 лет, 18 кг, 110 см',
      inputs: { height: 110, weight: 18 },
      expect: { value: 0.74 },
    },
    {
      note: 'Крупный взрослый',
      inputs: { height: 190, weight: 100 },
      expect: { value: 2.3 },
    },
  ],

  references: ['Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.'],
  updated: '2026-09-06',
  version: 1,
};
