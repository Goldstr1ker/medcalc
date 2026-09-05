// ABCD2 — риск инсульта в первые 2 суток после транзиторной ишемической атаки.

import { SYSTEMS } from '../../lib/systems.js';

const CLINICAL = [
  'Другие симптомы или ничего из перечисленного',
  'Нарушение речи без слабости',
  'Слабость в конечности(ях) с одной стороны',
];
const DURATION = ['< 10 минут', '10–59 минут', '≥ 60 минут'];

export default {
  id: 'abcd2',
  name: 'ABCD2 — риск инсульта после ТИА',
  shortName: 'ABCD2',
  system: SYSTEMS.NEUROLOGY,
  tags: ['тиа', 'abcd2', 'инсульт', 'транзиторная ишемическая атака'],
  description:
    'Оценка риска ишемического инсульта в течение 2 суток после транзиторной ишемической атаки — помогает определить срочность обследования.',

  inputs: [
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 0, max: 120 },
    { id: 'sbp', label: 'САД на момент осмотра', type: 'number', unit: 'мм рт. ст.', min: 40, max: 260 },
    { id: 'dbp', label: 'ДАД на момент осмотра', type: 'number', unit: 'мм рт. ст.', min: 20, max: 180 },
    { id: 'clinical', label: 'Клиническая картина', type: 'select', options: CLINICAL },
    { id: 'duration', label: 'Длительность симптомов', type: 'select', options: DURATION },
    { id: 'diabetes', label: 'Сахарный диабет', type: 'boolean' },
  ],

  calculate({ age, sbp, dbp, clinical, duration, diabetes }) {
    const breakdown = [];
    let score = 0;
    const add = (points, label) => {
      if (points > 0) {
        score += points;
        breakdown.push({ label, points });
      }
    };
    add(age >= 60 ? 1 : 0, 'Возраст ≥ 60 лет');
    add(sbp >= 140 || dbp >= 90 ? 1 : 0, 'АД ≥ 140/90 мм рт. ст. на момент осмотра');
    add(CLINICAL.indexOf(clinical), `Клиническая картина: ${clinical}`);
    add(DURATION.indexOf(duration), `Длительность: ${duration}`);
    add(diabetes ? 1 : 0, 'Сахарный диабет');
    return { value: score, decimals: 0, breakdown };
  },

  result: {
    type: 'score',
    max: 7,
    bands: [
      { id: 'low', label: 'Низкий риск (0–3)', min: 0, color: 'green', risk: '≈1% инсульта за 2 суток' },
      { id: 'moderate', label: 'Умеренный риск (4–5)', min: 4, color: 'yellow', risk: '≈4,1%' },
      { id: 'high', label: 'Высокий риск (6–7)', min: 6, color: 'red', risk: '≈8,1%' },
    ],
  },

  interpretation: {
    low: 'Низкий расчётный риск инсульта в ближайшие 2 суток.',
    moderate: 'Умеренный риск — показано срочное обследование.',
    high: 'Высокий риск инсульта в ближайшие 2 суток.',
  },

  guidance: {
    low: {
      source: 'Johnston SC, et al. Lancet 2007; NICE NG128',
      points: [
        'Даже при низком балле по ABCD2 актуальные рекомендации требуют срочной специализированной оценки (как правило, в течение 24 часов) для всех пациентов с подозрением на ТИА.',
        'Ацетилсалициловая кислота как можно раньше при отсутствии противопоказаний, если инсульт исключён визуализацией.',
      ],
    },
    moderate: {
      source: 'Johnston SC, et al. Lancet 2007; NICE NG128',
      points: [
        'Срочная визуализация головного мозга и сосудов (КТ/МРТ, дуплекс сонных артерий или КТ/МР-ангиография).',
        'Ацетилсалициловая кислота немедленно при отсутствии противопоказаний.',
        'Специализированная оценка в кратчайшие сроки, оптимально в течение 24 часов.',
      ],
    },
    high: {
      source: 'Johnston SC, et al. Lancet 2007; NICE NG128',
      points: [
        'Госпитализация или неотложная специализированная оценка в течение 24 часов.',
        'Срочная визуализация сосудов — значимый стеноз сонной артерии требует срочной каротидной эндартерэктомии/стентирования.',
        'Ацетилсалициловая кислота немедленно при отсутствии противопоказаний; начать вторичную профилактику.',
      ],
    },
  },

  caveats: [
    'ABCD2 не заменяет визуализацию: очаг на ДВИ-МРТ или значимый стеноз сонной артерии сами по себе требуют срочного ведения независимо от балла.',
    'Крещендо-ТИА (повторные эпизоды) — показание к срочному обследованию вне зависимости от расчётного балла.',
    'Шкала разработана и валидирована для взрослых с клинической картиной, соответствующей ТИА; не заменяет клиническую оценку.',
  ],

  examples: [
    {
      note: 'Молодой пациент, короткий эпизод без очаговых симптомов — низкий риск',
      inputs: { age: 40, sbp: 130, dbp: 80, clinical: CLINICAL[0], duration: DURATION[0] },
      expect: { value: 0, band: 'low' },
    },
    {
      note: 'Слабость в руке 45 минут у пациента 65 лет с диабетом',
      inputs: { age: 65, sbp: 150, dbp: 95, clinical: CLINICAL[2], duration: DURATION[1], diabetes: true },
      expect: { value: 6, band: 'high' },
    },
    {
      note: 'Нарушение речи без слабости, 30 минут, АГ — умеренный риск',
      inputs: { age: 55, sbp: 145, dbp: 85, clinical: CLINICAL[1], duration: DURATION[1] },
      expect: { value: 3, band: 'low' },
    },
    {
      note: 'Максимум по всем критериям — 7 баллов',
      inputs: { age: 70, sbp: 160, dbp: 100, clinical: CLINICAL[2], duration: DURATION[2], diabetes: true },
      expect: { value: 7, band: 'high' },
    },
  ],

  references: [
    'Johnston SC, et al. Validation and refinement of scores to predict very early stroke risk after transient ischaemic attack. Lancet. 2007;369(9558):283–292.',
    'NICE Guideline NG128: Stroke and transient ischaemic attack in over 16s.',
  ],
  updated: '2026-09-06',
  version: 1,
};
