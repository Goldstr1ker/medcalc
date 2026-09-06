// PERC (Pulmonary Embolism Rule-out Criteria) — 8 признаков. Если клиническая
// вероятность ТЭЛА уже низкая И все 8 отрицательны, дальнейшее обследование
// на ТЭЛА (Д-димер, КТ) не требуется.

import { SYSTEMS } from '../../lib/systems.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'perc',
  name: 'Правило PERC (исключение ТЭЛА)',
  shortName: 'PERC',
  system: SYSTEMS.PULMONOLOGY,
  tags: ['perc', 'перк', 'тэла', 'исключение тэла', 'д-димер', 'приёмное отделение'],
  description:
    'Проверка, можно ли клинически исключить ТЭЛА без анализов и визуализации. Применяется только когда претестовая вероятность ТЭЛА уже расценена как низкая.',

  inputs: [
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 12, max: 120 },
    { id: 'pulse', label: 'ЧСС', type: 'number', unit: 'уд/мин', min: 20, max: 250 },
    { id: 'spo2', label: 'SpO₂ на воздухе', type: 'number', unit: '%', min: 50, max: 100 },
    { id: 'hemoptysis', label: 'Кровохарканье', type: 'boolean' },
    { id: 'estrogen', label: 'Приём эстрогенов', type: 'boolean' },
    { id: 'priorVte', label: 'ТГВ или ТЭЛА в анамнезе', type: 'boolean' },
    { id: 'unilateralLegSwelling', label: 'Односторонний отёк ноги', type: 'boolean' },
    {
      id: 'recentSurgeryTrauma',
      label: 'Операция или травма с госпитализацией за последние 4 недели',
      type: 'boolean',
    },
  ],

  calculate({
    age,
    pulse,
    spo2,
    hemoptysis,
    estrogen,
    priorVte,
    unilateralLegSwelling,
    recentSurgeryTrauma,
  }) {
    const positives = [
      [age >= 50, 'Возраст ≥ 50 лет'],
      [pulse >= 100, 'ЧСС ≥ 100/мин'],
      [spo2 < 95, 'SpO₂ < 95%'],
      [hemoptysis, 'Кровохарканье'],
      [estrogen, 'Приём эстрогенов'],
      [priorVte, 'ТГВ/ТЭЛА в анамнезе'],
      [unilateralLegSwelling, 'Односторонний отёк ноги'],
      [recentSurgeryTrauma, 'Операция/травма за 4 недели'],
    ].filter(([cond]) => cond);

    return {
      value: positives.length,
      decimals: 0,
      breakdown: positives.map(([, label]) => ({ label, points: 1 })),
    };
  },

  result: {
    type: 'value',
    bands: [
      {
        id: 'negative',
        label: 'PERC отрицателен — все 8 признаков отсутствуют',
        min: 0,
        color: 'green',
      },
      {
        id: 'positive',
        label: 'PERC положителен — есть ≥ 1 признак',
        min: 1,
        color: 'orange',
      },
    ],
  },

  interpretation: {
    negative:
      'Ни один из 8 признаков не выявлен. При исходно низкой клинической вероятности ТЭЛА (например, по гештальту врача или шкале Уэллса) диагноз можно исключить без Д-димера и визуализации — риск пропущенной ТЭЛА < 2%.',
    positive:
      'Выявлен как минимум один признак — правило PERC не позволяет исключить ТЭЛА клинически. Нужно продолжить обследование по алгоритму.',
  },

  guidance: {
    negative: {
      source: 'Kline JA, et al. J Thromb Haemost. 2004; ESC 2019 «ТЭЛА»',
      points: [
        'PERC применим только при уже низкой претестовой вероятности; при умеренной или высокой — правило не используется, сразу переходят к Д-димеру или КТ-ангиопульмонографии.',
        'Дальнейшее обследование именно на ТЭЛА не требуется; при этом продолжается поиск других причин симптомов.',
      ],
    },
    positive: {
      source: 'ESC 2019 «ТЭЛА»',
      points: [
        'Определить Д-димер (при возможности — с возрастной коррекцией порога у пациентов старше 50 лет).',
        'Отрицательный Д-димер при низкой вероятности — ТЭЛА исключена; положительный — КТ-ангиопульмонография.',
      ],
    },
  },

  caveats: [
    'PERC — не инструмент оценки вероятности, а бинарный «стоп-фильтр». Он валиден только после того, как клиническая вероятность самостоятельно оценена как низкая.',
    'Не применять у беременных, у пациентов на антикоагулянтах, при высокой претестовой вероятности и в популяциях с высокой распространённостью ТЭЛА.',
    'Порог по ЧСС — строго ≥ 100/мин (даёт признак), по SpO₂ — строго < 95%.',
  ],

  examples: [
    {
      note: '35 лет, ЧСС 80, SpO₂ 98%, ничего из списка — PERC отрицателен',
      inputs: { age: 35, pulse: 80, spo2: 98 },
      expect: { value: 0, band: 'negative' },
    },
    {
      note: '55 лет (≥ 50) — уже один признак, PERC положителен',
      inputs: { age: 55, pulse: 80, spo2: 98 },
      expect: { value: 1, band: 'positive' },
    },
    {
      note: 'Тахикардия, гипоксемия, кровохарканье, ТЭЛА в анамнезе — 4 признака',
      inputs: { age: 40, pulse: 110, spo2: 92, hemoptysis: true, priorVte: true },
      expect: { value: 4, band: 'positive' },
    },
  ],

  references: [
    'Kline JA, Mitchell AM, Kabrhel C, et al. Clinical criteria to prevent unnecessary diagnostic testing in emergency department patients with suspected pulmonary embolism. J Thromb Haemost. 2004;2(8):1247–1255.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
