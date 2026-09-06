// Шкала HEART — риск больших сердечно-сосудистых событий (MACE) в ближайшие
// 6 недель у пациента с болью в груди в приёмном отделении.
// History, ECG, Age, Risk factors, Troponin — каждый пункт 0–2 балла.

import { SYSTEMS } from '../../lib/systems.js';

const HISTORY = [
  'Мало подозрительный анамнез',
  'Умеренно подозрительный анамнез',
  'Выраженно подозрительный анамнез',
];
const ECG = [
  'Норма',
  'Неспецифические изменения реполяризации',
  'Значимая депрессия/элевация сегмента ST',
];
const TROPONIN = [
  '≤ верхней границы нормы',
  '1–3 верхних границы нормы',
  '> 3 верхних границ нормы',
];
const RISK_FACTORS = [
  'Факторов риска нет',
  '1–2 фактора риска',
  '≥ 3 факторов риска или подтверждённый атеросклероз в анамнезе',
];

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'heart-score',
  name: 'Шкала HEART (боль в груди)',
  shortName: 'HEART',
  system: SYSTEMS.CARDIOLOGY,
  tags: ['heart', 'хart', 'боль в груди', 'окс', 'приёмное отделение', 'mace', 'тропонин'],
  description:
    'Стратификация риска больших сердечно-сосудистых событий в течение 6 недель у пациента с болью в груди без явного подъёма ST. Помогает решить вопрос о выписке или наблюдении.',

  inputs: [
    { id: 'history', label: 'Анамнез', type: 'select', options: HISTORY },
    { id: 'ecg', label: 'ЭКГ', type: 'select', options: ECG },
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 18, max: 120 },
    {
      id: 'riskFactors',
      label: 'Факторы риска (АГ, гиперхолестеринемия, СД, ожирение, курение, семейный анамнез)',
      type: 'select',
      options: RISK_FACTORS,
    },
    { id: 'troponin', label: 'Тропонин', type: 'select', options: TROPONIN },
  ],

  calculate({ history, ecg, age, riskFactors, troponin }) {
    const agePoints = age >= 65 ? 2 : age >= 45 ? 1 : 0;
    /** @type {[string, number][]} */
    const parts = [
      ['Анамнез', HISTORY.indexOf(history)],
      ['ЭКГ', ECG.indexOf(ecg)],
      ['Возраст', agePoints],
      ['Факторы риска', RISK_FACTORS.indexOf(riskFactors)],
      ['Тропонин', TROPONIN.indexOf(troponin)],
    ];
    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.filter(([, p]) => p > 0).map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 10,
    bands: [
      { id: 'low', label: '0–3 — низкий риск', min: 0, color: 'green', risk: 'MACE за 6 нед. ≈ 1–2%' },
      { id: 'moderate', label: '4–6 — умеренный риск', min: 4, color: 'orange', risk: '≈ 12–17%' },
      { id: 'high', label: '7–10 — высокий риск', min: 7, color: 'red', risk: '≈ 50–65%' },
    ],
  },

  interpretation: {
    low: 'Низкий риск больших сердечно-сосудистых событий в ближайшие 6 недель.',
    moderate: 'Умеренный риск — требуется наблюдение и дообследование.',
    high: 'Высокий риск — показана ранняя инвазивная тактика.',
  },

  guidance: {
    low: {
      source: 'Six AJ, et al. Neth Heart J. 2008; Backus BE, et al. Int J Cardiol. 2013',
      points: [
        'При HEART 0–3 и отрицательном тропонине (желательно серийном, по протоколу отделения) возможна ранняя выписка с амбулаторным дообследованием.',
        'Обязательно исключить другие угрожающие причины боли в груди: расслоение аорты, ТЭЛА, напряжённый пневмоторакс.',
      ],
    },
    moderate: {
      source: 'Six AJ, et al. Neth Heart J. 2008; ESC 2020 «ОКСбпST»',
      points: [
        'Госпитализация для наблюдения, серийное определение тропонина и ЭКГ.',
        'Неинвазивная визуализация (стресс-тест, КТ-коронарография) или ранняя инвазивная тактика по клинической картине.',
      ],
    },
    high: {
      source: 'Six AJ, et al. Neth Heart J. 2008; ESC 2023 «Острый коронарный синдром»',
      points: [
        'Вести как острый коронарный синдром: двойная антиагрегантная терапия и антикоагулянт при отсутствии противопоказаний.',
        'Ранняя коронароангиография с реваскуляризацией по показаниям.',
      ],
    },
  },

  caveats: [
    'Шкала не применяется при явном подъёме сегмента ST (это показание к экстренной реперфузии независимо от баллов) и при очевидной несердечной причине боли.',
    'Балл за тропонин зависит от того, какой аналитический метод и какая верхняя граница нормы используются в лаборатории; при высокочувствительном тропонине применяются модифицированные протоколы (напр. HEART Pathway).',
    'Оценка анамнеза субъективна — это заложенная особенность шкалы.',
  ],

  examples: [
    {
      note: '40 лет, слабо подозрительный анамнез, ЭКГ и тропонин в норме, факторов риска нет',
      inputs: {
        history: HISTORY[0],
        ecg: ECG[0],
        age: 40,
        riskFactors: RISK_FACTORS[0],
        troponin: TROPONIN[0],
      },
      expect: { value: 0, band: 'low' },
    },
    {
      note: '55 лет, умеренно подозрительный анамнез, неспецифические изменения ЭКГ, 1–2 фактора риска, тропонин в норме',
      inputs: {
        history: HISTORY[1],
        ecg: ECG[1],
        age: 55,
        riskFactors: RISK_FACTORS[1],
        troponin: TROPONIN[0],
      },
      expect: { value: 4, band: 'moderate' },
    },
    {
      note: '70 лет, выраженно подозрительный анамнез, депрессия ST, ≥ 3 факторов риска, тропонин > 3×ВГН',
      inputs: {
        history: HISTORY[2],
        ecg: ECG[2],
        age: 70,
        riskFactors: RISK_FACTORS[2],
        troponin: TROPONIN[2],
      },
      expect: { value: 10, band: 'high' },
    },
    {
      note: '46 лет, умеренно подозрительный анамнез, неспецифические изменения ЭКГ, факторов риска нет, тропонин в норме — ровно 3 балла, ещё низкий риск',
      inputs: {
        history: HISTORY[1],
        ecg: ECG[1],
        age: 46,
        riskFactors: RISK_FACTORS[0],
        troponin: TROPONIN[0],
      },
      expect: { value: 3, band: 'low' },
    },
  ],

  references: [
    'Six AJ, Backus BE, Kelder JC. Chest pain in the emergency room: value of the HEART score. Neth Heart J. 2008;16(6):191–196.',
    'Backus BE, et al. A prospective validation of the HEART score for chest pain patients at the emergency department. Int J Cardiol. 2013;168(3):2153–2158.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
