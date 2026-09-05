// qSOFA (quick SOFA) — прикроватный маркёр риска неблагоприятного исхода
// у пациента с подозрением на инфекцию. По 1 баллу за каждый признак.

import { SYSTEMS } from '../../lib/systems.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'qsofa',
  name: 'qSOFA',
  shortName: 'qSOFA',
  system: SYSTEMS.CRITICAL_CARE,
  tags: ['сепсис', 'sepsis-3', 'sofa', 'инфекция', 'орит', 'септический шок', 'скрининг'],
  description:
    'Быстрая прикроватная оценка риска госпитальной летальности и длительного пребывания в ОРИТ у пациента с подозрением на инфекцию.',

  inputs: [
    { id: 'rr', label: 'ЧДД ≥ 22 в минуту', type: 'boolean' },
    { id: 'ams', label: 'Изменённое сознание (ШКГ < 15)', type: 'boolean' },
    { id: 'sbp', label: 'Систолическое АД ≤ 100 мм рт. ст.', type: 'boolean' },
  ],

  calculate({ rr, ams, sbp }) {
    const breakdown = [];
    let score = 0;
    const add = (cond, label) => {
      if (cond) {
        score += 1;
        breakdown.push({ label, points: 1 });
      }
    };
    add(rr, 'ЧДД ≥ 22/мин');
    add(ams, 'Изменённое сознание (ШКГ < 15)');
    add(sbp, 'САД ≤ 100 мм рт. ст.');
    return { value: score, decimals: 0, breakdown };
  },

  result: {
    type: 'score',
    max: 3,
    bands: [
      { id: 'low', label: 'qSOFA 0–1 — низкий риск', min: 0, color: 'green' },
      { id: 'high', label: 'qSOFA ≥ 2 — высокий риск', min: 2, color: 'red', risk: 'летальность в стационаре ×3–14' },
    ],
  },

  interpretation: {
    low: 'qSOFA < 2. Низкая вероятность неблагоприятного исхода, связанного с сепсисом. Чувствительность шкалы невысока — отрицательный результат не исключает сепсис при клиническом подозрении.',
    high: 'qSOFA ≥ 2. Существенно повышен риск госпитальной летальности и длительного пребывания в ОРИТ у пациентов с подозрением на инфекцию.',
  },

  guidance: {
    low: {
      source: 'Surviving Sepsis Campaign 2021',
      points: [
        'Не откладывать обследование при клиническом подозрении на инфекцию или сепсис.',
        'Повторно оценивать состояние — qSOFA может стать положительным позже.',
        'SSC 2021 не рекомендует qSOFA как единственный инструмент скрининга; рассмотреть SIRS, NEWS2 или MEWS.',
      ],
    },
    high: {
      source: 'Sepsis-3 (JAMA, 2016); Surviving Sepsis Campaign 2021',
      points: [
        'Расценивать как группу высокого риска; при подозрении на инфекцию — действовать по протоколу сепсиса.',
        'Оценить полную шкалу SOFA, лактат, взять посевы крови до введения антибиотика.',
        'Антибиотик широкого спектра — как можно раньше (в идеале в течение 1 часа при септическом шоке).',
        'При гипотензии или лактате ≥ 4 ммоль/л — инфузия кристаллоидов 30 мл/кг с повторной оценкой перфузии.',
        'Рассмотреть перевод в ОРИТ.',
      ],
    },
  },

  caveats: [
    'qSOFA — инструмент настороженности, а не диагноз сепсиса и не основание для старта терапии сам по себе.',
    'Диагноз сепсиса по Sepsis-3 = подозрение на инфекцию + прирост SOFA ≥ 2 баллов.',
  ],

  examples: [
    {
      note: 'Признаков нет — 0 баллов',
      inputs: {},
      expect: { value: 0, band: 'low' },
    },
    {
      note: 'Только тахипноэ — 1 балл, порог ещё не достигнут',
      inputs: { rr: true },
      expect: { value: 1, band: 'low' },
    },
    {
      note: 'Тахипноэ + гипотензия — 2 балла, порог настороженности',
      inputs: { rr: true, sbp: true },
      expect: { value: 2, band: 'high' },
    },
    {
      note: 'Все три признака — максимум',
      inputs: { rr: true, ams: true, sbp: true },
      expect: { value: 3, band: 'high' },
    },
  ],

  references: [
    'Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801–810.',
    'Evans L, et al. Surviving Sepsis Campaign: International Guidelines 2021. Crit Care Med. 2021;49(11):e1063–e1143.',
  ],
  updated: '2026-09-04',
  version: 1,
};
