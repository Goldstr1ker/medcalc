// NEWS2 (National Early Warning Score 2) — шкала раннего предупреждения
// об ухудшении состояния у взрослого пациента в стационаре.
// Реализована шкала SpO₂ №1 (для большинства пациентов).

import { SYSTEMS } from '../../lib/systems.js';

const CONSCIOUSNESS = [
  'Ясное (Alert)',
  'Спутанность, реакция на голос/боль или отсутствие реакции (новое)',
];

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'news2',
  name: 'NEWS2 — шкала раннего предупреждения',
  shortName: 'NEWS2',
  system: SYSTEMS.CRITICAL_CARE,
  tags: ['news2', 'ньюс', 'шкала раннего предупреждения', 'ухудшение', 'сепсис', 'мониторинг', 'ews'],
  description:
    'Агрегированная оценка витальных показателей для раннего выявления ухудшения состояния взрослого пациента и определения объёма реагирования.',

  inputs: [
    { id: 'rr', label: 'Частота дыхания', type: 'number', unit: 'в минуту', min: 3, max: 60, group: 'Витальные показатели' },
    { id: 'spo2', label: 'SpO₂', type: 'number', unit: '%', min: 50, max: 100, group: 'Витальные показатели' },
    { id: 'onOxygen', label: 'Получает дополнительный кислород', type: 'boolean', group: 'Витальные показатели' },
    { id: 'sbp', label: 'Систолическое АД', type: 'number', unit: 'мм рт. ст.', min: 40, max: 260, group: 'Витальные показатели' },
    { id: 'pulse', label: 'ЧСС', type: 'number', unit: 'уд/мин', min: 20, max: 220, group: 'Витальные показатели' },
    { id: 'temp', label: 'Температура тела', type: 'number', unit: '°C', min: 30, max: 43, group: 'Витальные показатели' },
    { id: 'consciousness', label: 'Уровень сознания', type: 'select', options: CONSCIOUSNESS, group: 'Витальные показатели' },
  ],

  calculate({ rr, spo2, onOxygen, sbp, pulse, temp, consciousness }) {
    const rrPts = rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3;
    const spo2Pts = spo2 >= 96 ? 0 : spo2 >= 94 ? 1 : spo2 >= 92 ? 2 : 3;
    const oxygenPts = onOxygen ? 2 : 0;
    const sbpPts = sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3;
    const pulsePts = pulse <= 40 ? 3 : pulse <= 50 ? 1 : pulse <= 90 ? 0 : pulse <= 110 ? 1 : pulse <= 130 ? 2 : 3;
    const tempPts = temp <= 35 ? 3 : temp <= 36 ? 1 : temp <= 38 ? 0 : temp <= 39 ? 1 : 2;
    const consciousnessPts = CONSCIOUSNESS.indexOf(consciousness) === 1 ? 3 : 0;

    /** @type {[string, number][]} */
    const parts = [
      ['Частота дыхания', rrPts],
      ['SpO₂', spo2Pts],
      ['Дополнительный кислород', oxygenPts],
      ['Систолическое АД', sbpPts],
      ['ЧСС', pulsePts],
      ['Температура', tempPts],
      ['Уровень сознания', consciousnessPts],
    ];

    const total = parts.reduce((sum, [, p]) => sum + p, 0);
    const anyThree = parts.some(([, p]) => p === 3);

    return {
      value: total,
      decimals: 0,
      breakdown: parts.filter(([, p]) => p > 0).map(([label, points]) => ({ label, points })),
      details: anyThree
        ? [{ label: 'Есть параметр с оценкой 3 балла — минимум средний уровень реагирования', value: 3 }]
        : [],
    };
  },

  result: {
    type: 'score',
    max: 20,
    bands: [
      { id: 'zero', label: '0 — плановое наблюдение', min: 0, color: 'green' },
      { id: 'low', label: '1–4 — низкий уровень', min: 1, color: 'lime' },
      { id: 'medium', label: '5–6 — средний уровень', min: 5, color: 'orange' },
      { id: 'high', label: '≥ 7 — высокий уровень', min: 7, color: 'red' },
    ],
  },

  interpretation: {
    zero: 'Все показатели в норме. Плановое наблюдение, оценка не реже чем каждые 12 часов.',
    low: 'Низкий агрегированный балл. Оценка не реже каждых 4–6 часов; при отдельном параметре в 3 балла — не реже 1 раза в час и осмотр врача.',
    medium: 'Средний уровень тревоги — требуется срочный осмотр врача, способного оценить остроту состояния, и рассмотрение перевода на более высокий уровень наблюдения.',
    high: 'Высокий уровень тревоги — экстренная оценка бригадой интенсивной терапии, непрерывный мониторинг витальных показателей, как правило перевод в отделение более высокого уровня.',
  },

  guidance: {
    low: {
      source: 'Royal College of Physicians. National Early Warning Score (NEWS) 2. 2017',
      points: [
        'Информировать медицинскую сестру, ответственную за пациента.',
        'Медсестра решает, нужно ли участить наблюдение и/или вызвать врача.',
        'Отдельный показатель с оценкой 3 балла — повод для срочного врачебного осмотра, даже если сумма невелика.',
      ],
    },
    medium: {
      source: 'Royal College of Physicians. NEWS 2. 2017',
      points: [
        'Срочно вызвать врача или дежурную бригаду для оценки пациента.',
        'Обеспечить наблюдение с частотой не реже 1 раза в час.',
        'Рассмотреть перевод в палату с возможностью усиленного наблюдения; при подозрении на инфекцию — оценить критерии сепсиса и начать терапию по протоколу.',
      ],
    },
    high: {
      source: 'Royal College of Physicians. NEWS 2. 2017',
      points: [
        'Экстренный вызов бригады интенсивной терапии / реанимационной бригады.',
        'Непрерывный мониторинг витальных показателей.',
        'Перевод в отделение реанимации или палату интенсивной терапии.',
      ],
    },
  },

  caveats: [
    'Здесь реализована шкала SpO₂ №1. Для пациентов с хронической гиперкапнической дыхательной недостаточностью (целевая SpO₂ 88–92%) применяется шкала №2 с другими порогами — в этом калькуляторе её нет.',
    'NEWS2 валидирована для взрослых (≥ 16 лет), не для беременных и не для пациентов на паллиативном лечении.',
    'Балл — вспомогательный инструмент, а не замена клинической оценки; при явной тревоге эскалация проводится независимо от суммы.',
    'Любой отдельный показатель с оценкой 3 балла требует как минимум среднего уровня реагирования, даже при общей сумме 1–4.',
  ],

  examples: [
    {
      note: 'ЧД 16, SpO₂ 98% на воздухе, АД 120, ЧСС 70, t 36,7, сознание ясное — 0 баллов',
      inputs: { rr: 16, spo2: 98, sbp: 120, pulse: 70, temp: 36.7, consciousness: CONSCIOUSNESS[0] },
      expect: { value: 0, band: 'zero' },
    },
    {
      note: 'ЧД 22 (2) + SpO₂ 95 (1) + ЧСС 95 (1) — 4 балла, низкий уровень',
      inputs: { rr: 22, spo2: 95, sbp: 120, pulse: 95, temp: 37, consciousness: CONSCIOUSNESS[0] },
      expect: { value: 4, band: 'low' },
    },
    {
      note: 'ЧД 25 (3) + SpO₂ 94 (1) + кислород (2) + АД 105 (1) + ЧСС 100 (1) + t 38,5 (1) — 9 баллов, высокий уровень',
      inputs: { rr: 25, spo2: 94, onOxygen: true, sbp: 105, pulse: 100, temp: 38.5, consciousness: CONSCIOUSNESS[0] },
      expect: { value: 9, band: 'high' },
    },
    {
      note: 'ЧД 21 (2) + АД 100 (2) + ЧСС 115 (2) — 6 баллов, средний уровень',
      inputs: { rr: 21, spo2: 97, sbp: 100, pulse: 115, temp: 37, consciousness: CONSCIOUSNESS[0] },
      expect: { value: 6, band: 'medium' },
    },
    {
      note: 'Спутанность сознания (3) + ЧД 30 (3) + АД 85 (3) + t 35 (3) — 12 баллов',
      inputs: { rr: 30, spo2: 97, sbp: 85, pulse: 80, temp: 35, consciousness: CONSCIOUSNESS[1] },
      expect: { value: 12, band: 'high' },
    },
  ],

  references: [
    'Royal College of Physicians. National Early Warning Score (NEWS) 2: Standardising the assessment of acute-illness severity in the NHS. London: RCP, 2017.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
