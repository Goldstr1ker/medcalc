// HOMA-IR = инсулин натощак (мкЕд/мл) × глюкоза натощак (ммоль/л) / 22,5.

import { SYSTEMS } from '../../lib/systems.js';
import { GLUCOSE_MMOL } from '../../lib/units.js';

export default {
  id: 'homa-ir',
  name: 'HOMA-IR — индекс инсулинорезистентности',
  shortName: 'HOMA-IR',
  system: SYSTEMS.ENDOCRINOLOGY,
  tags: ['homa-ir', 'инсулинорезистентность', 'метаболический синдром', 'сахарный диабет', 'инсулин'],
  description:
    'Оценка инсулинорезистентности по уровню инсулина и глюкозы натощак — скрининговый инструмент, не заменяет клэмп-тест.',

  inputs: [
    { id: 'insulin', label: 'Инсулин натощак', type: 'number', unit: 'мкЕд/мл', min: 0, max: 300 },
    { id: 'glucose', label: 'Глюкоза натощак', type: 'number', min: 0, max: 40, units: GLUCOSE_MMOL },
  ],

  calculate({ insulin, glucose }) {
    return { value: (insulin * glucose) / 22.5, decimals: 2 };
  },

  result: {
    type: 'value',
    bands: [
      { id: 'normal', label: 'Норма (< 2,7)', min: 0, color: 'green' },
      { id: 'resistant', label: 'Инсулинорезистентность вероятна (≥ 2,7)', min: 2.7, color: 'orange' },
    ],
  },

  interpretation: {
    normal: 'HOMA-IR в пределах обычно принимаемой нормы.',
    resistant: 'Значение указывает на вероятную инсулинорезистентность.',
  },

  guidance: {
    resistant: {
      source: 'Wallace TM, et al. Diabetes Care 2004',
      points: [
        'Оценивать вместе с клинической картиной (метаболический синдром, СПКЯ, НАЖБП) — изолированного порога для диагноза недостаточно.',
        'Модификация образа жизни (питание, физическая активность, снижение массы тела) — основа коррекции.',
        'При сомнениях — пероральный глюкозотолерантный тест и оценка липидного профиля.',
      ],
    },
  },

  caveats: [
    'Пороговое значение не стандартизировано: в разных популяциях и лабораториях используются разные отрезные точки (от 2,0 до 3,0 и выше) — 2,7 приведено как часто цитируемый ориентир, а не универсальный диагностический критерий.',
    'Результат зависит от калибровки конкретного анализа на инсулин — сравнение между разными лабораториями ограниченно достоверно.',
    'Не валиден при инсулинотерапии и при значимой дисфункции бета-клеток (низкая секреция инсулина).',
  ],

  examples: [
    {
      note: 'Инсулин 5 мкЕд/мл, глюкоза 5 ммоль/л — норма',
      inputs: { insulin: 5, glucose: 5 },
      expect: { value: 1.11, band: 'normal' },
    },
    {
      note: 'Инсулин 20 мкЕд/мл, глюкоза 6 ммоль/л — инсулинорезистентность',
      inputs: { insulin: 20, glucose: 6 },
      expect: { value: 5.33, band: 'resistant' },
    },
    {
      note: 'Глюкоза в мг/дл (108 мг/дл = 6 ммоль/л) даёт тот же результат',
      inputs: { insulin: 20, glucose: 108 },
      units: { glucose: 'mgdl' },
      expect: { value: 5.33, band: 'resistant' },
    },
  ],

  references: [
    'Matthews DR, et al. Homeostasis model assessment: insulin resistance and beta-cell function from fasting plasma glucose and insulin concentrations in man. Diabetologia. 1985;28(7):412–419.',
    'Wallace TM, Levy JC, Matthews DR. Use and abuse of HOMA modeling. Diabetes Care. 2004;27(6):1487–1495.',
  ],
  updated: '2026-09-06',
  version: 1,
};
