// Шкала TIMI для нестабильной стенокардии и инфаркта миокарда без подъёма ST.
// 7 признаков, по 1 баллу. Оценивает риск смерти, ИМ и рефрактерной ишемии
// с потребностью в реваскуляризации в течение 14 суток.

import { SYSTEMS } from '../../lib/systems.js';
import { tally } from '../_shared/scoring.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'timi-nstemi',
  name: 'TIMI при ОКС без подъёма ST',
  shortName: 'TIMI (ОКСбпST)',
  system: SYSTEMS.CARDIOLOGY,
  tags: ['timi', 'тими', 'окс', 'нестабильная стенокардия', 'имбпst', 'нестемi', 'риск'],
  description:
    'Стратификация риска при нестабильной стенокардии и инфаркте миокарда без подъёма ST: смерть, повторный ИМ или рефрактерная ишемия с реваскуляризацией в течение 14 суток.',

  inputs: [
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 18, max: 120 },
    {
      id: 'riskFactors',
      label: '≥ 3 факторов риска ИБС (АГ, гиперхолестеринемия, СД, курение, семейный анамнез)',
      type: 'boolean',
    },
    { id: 'knownCad', label: 'Стеноз коронарной артерии ≥ 50% в анамнезе', type: 'boolean' },
    { id: 'aspirin', label: 'Приём аспирина в последние 7 суток', type: 'boolean' },
    { id: 'severeAngina', label: 'Тяжёлая стенокардия: ≥ 2 приступов за последние 24 часа', type: 'boolean' },
    { id: 'stDeviation', label: 'Смещение сегмента ST ≥ 0,5 мм на ЭКГ', type: 'boolean' },
    { id: 'elevatedMarkers', label: 'Повышенные маркёры некроза миокарда (тропонин, КФК-МВ)', type: 'boolean' },
  ],

  calculate({ age, riskFactors, knownCad, aspirin, severeAngina, stDeviation, elevatedMarkers }) {
    return tally([
      [age >= 65, 'Возраст ≥ 65 лет'],
      [riskFactors, '≥ 3 факторов риска ИБС'],
      [knownCad, 'Стеноз коронарной артерии ≥ 50% в анамнезе'],
      [aspirin, 'Приём аспирина в последние 7 суток'],
      [severeAngina, 'Тяжёлая стенокардия (≥ 2 приступов за 24 ч)'],
      [stDeviation, 'Смещение сегмента ST ≥ 0,5 мм'],
      [elevatedMarkers, 'Повышенные маркёры некроза миокарда'],
    ]);
  },

  result: {
    type: 'score',
    max: 7,
    bands: [
      { id: 'low', label: '0–2 — низкий риск', min: 0, color: 'green', risk: 'событие за 14 сут. ≈ 5–8%' },
      { id: 'intermediate', label: '3–4 — промежуточный риск', min: 3, color: 'orange', risk: '≈ 13–20%' },
      { id: 'high', label: '5–7 — высокий риск', min: 5, color: 'red', risk: '≈ 26–41%' },
    ],
  },

  interpretation: {
    low: 'Низкий риск неблагоприятного исхода в течение 14 суток.',
    intermediate: 'Промежуточный риск — как правило, показана инвазивная стратегия в течение 24–72 часов.',
    high: 'Высокий риск — показана ранняя инвазивная стратегия.',
  },

  guidance: {
    low: {
      source: 'Antman EM, et al. JAMA 2000; ESC 2020 «ОКСбпST»; КР «ОКСбпST» (Минздрав РФ)',
      points: [
        'Антиагрегантная и антикоагулянтная терапия по стандарту ОКС.',
        'При стабильном состоянии — неинвазивная стратификация (стресс-визуализация) или отсроченная инвазивная тактика.',
        'Определять риск в динамике: повторная боль, изменения ЭКГ или рост тропонина меняют категорию.',
      ],
    },
    intermediate: {
      source: 'ESC 2020 «ОКСбпST»; КР «ОКСбпST» (Минздрав РФ)',
      points: [
        'Двойная антиагрегантная терапия + антикоагулянт при отсутствии противопоказаний.',
        'Коронароангиография в течение 24–72 часов с реваскуляризацией по показаниям.',
      ],
    },
    high: {
      source: 'ESC 2020 «ОКСбпST»; КР «ОКСбпST» (Минздрав РФ)',
      points: [
        'Ранняя инвазивная стратегия: коронароангиография в течение 24 часов (при нестабильности — немедленно).',
        'Полная антитромботическая терапия, мониторинг ритма и гемодинамики в блоке интенсивной терапии.',
      ],
    },
  },

  caveats: [
    'Шкала для ОКС без подъёма ST; при подъёме ST применяется отдельная шкала TIMI для ИМпST и другая тактика.',
    'GRACE точнее для оценки госпитальной и отдалённой летальности; TIMI проще и чаще используется для быстрой прикидки у постели.',
    'Балл за маркёры некроза зависит от используемого метода определения тропонина.',
  ],

  examples: [
    {
      note: '50 лет, изолированный приём аспирина — 1 балл, низкий риск',
      inputs: { age: 50, aspirin: true },
      expect: { value: 1, band: 'low' },
    },
    {
      note: '70 лет, ИБС в анамнезе, смещение ST — 3 балла, промежуточный риск',
      inputs: { age: 70, knownCad: true, stDeviation: true },
      expect: { value: 3, band: 'intermediate' },
    },
    {
      note: '68 лет, ≥ 3 факторов риска, ИБС в анамнезе, аспирин, смещение ST, повышенные маркёры — 6 баллов',
      inputs: {
        age: 68,
        riskFactors: true,
        knownCad: true,
        aspirin: true,
        stDeviation: true,
        elevatedMarkers: true,
      },
      expect: { value: 6, band: 'high' },
    },
    {
      note: 'Все семь признаков — максимум',
      inputs: {
        age: 80,
        riskFactors: true,
        knownCad: true,
        aspirin: true,
        severeAngina: true,
        stDeviation: true,
        elevatedMarkers: true,
      },
      expect: { value: 7, band: 'high' },
    },
  ],

  references: [
    'Antman EM, Cohen M, Bernink PJLM, et al. The TIMI risk score for unstable angina/non-ST elevation MI. JAMA. 2000;284(7):835–842.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
