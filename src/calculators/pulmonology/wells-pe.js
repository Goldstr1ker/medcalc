// Шкала Уэллса для ТЭЛА (дихотомизированная версия: ≤4 — маловероятна, >4 — вероятна).

import { SYSTEMS } from '../../lib/systems.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'wells-pe',
  name: 'Шкала Уэллса для ТЭЛА',
  shortName: 'Wells (ТЭЛА)',
  system: SYSTEMS.PULMONOLOGY,
  tags: ['тэла', 'wells', 'уэллс', 'тромбоэмболия', 'd-димер', 'ктпа'],
  description:
    'Претестовая вероятность тромбоэмболии лёгочной артерии — определяет дальнейшую тактику (Д-димер vs КТ-ангиопульмонография).',

  inputs: [
    { id: 'dvtSigns', label: 'Клинические признаки ТГВ (отёк, боль при пальпации по ходу вен)', type: 'boolean' },
    { id: 'peMostLikely', label: 'ТЭЛА — наиболее вероятный диагноз или равновероятна с альтернативными', type: 'boolean' },
    { id: 'hr100', label: 'ЧСС > 100/мин', type: 'boolean' },
    { id: 'immobilization', label: 'Иммобилизация ≥ 3 дней или операция за последние 4 недели', type: 'boolean' },
    { id: 'priorDvtPe', label: 'ТГВ или ТЭЛА в анамнезе', type: 'boolean' },
    { id: 'hemoptysis', label: 'Кровохарканье', type: 'boolean' },
    { id: 'malignancy', label: 'Онкозаболевание (лечение в течение 6 мес. или паллиативное)', type: 'boolean' },
  ],

  calculate({ dvtSigns, peMostLikely, hr100, immobilization, priorDvtPe, hemoptysis, malignancy }) {
    const breakdown = [];
    let score = 0;
    const add = (cond, label, pts) => {
      if (cond) {
        score += pts;
        breakdown.push({ label, points: pts });
      }
    };
    add(dvtSigns, 'Клинические признаки ТГВ', 3);
    add(peMostLikely, 'ТЭЛА — наиболее вероятный диагноз', 3);
    add(hr100, 'ЧСС > 100/мин', 1.5);
    add(immobilization, 'Иммобилизация/операция', 1.5);
    add(priorDvtPe, 'ТГВ/ТЭЛА в анамнезе', 1.5);
    add(hemoptysis, 'Кровохарканье', 1);
    add(malignancy, 'Онкозаболевание', 1);
    return { value: score, decimals: 1, breakdown };
  },

  result: {
    // max округлён вверх до целого только для отображения (баллы шкалы дробные: 1, 1.5, 3);
    // порог диапазона «вероятна» (4.5) отражает реальную границу «> 4».
    type: 'score',
    max: 13,
    bands: [
      { id: 'unlikely', label: 'ТЭЛА маловероятна (≤ 4)', min: 0, color: 'green' },
      { id: 'likely', label: 'ТЭЛА вероятна (> 4)', min: 4.5, color: 'red' },
    ],
  },

  interpretation: {
    unlikely:
      'Низкая претестовая вероятность. При очень низком клиническом подозрении можно применить правило PERC; иначе — Д-димер.',
    likely: 'Высокая претестовая вероятность — Д-димер не используется для исключения ТЭЛА, показана визуализация.',
  },

  guidance: {
    unlikely: {
      source: 'ESC 2019 Guidelines for Pulmonary Embolism',
      points: [
        'При крайне низком подозрении — применить правило PERC (Pulmonary Embolism Rule-out Criteria); если все критерии отрицательны, дальнейшее обследование на ТЭЛА не требуется.',
        'Иначе — Д-димер (по показаниям с возрастной коррекцией порога у пациентов > 50 лет).',
        'Отрицательный Д-димер при низкой вероятности — ТЭЛА практически исключена.',
        'Положительный Д-димер — показана КТ-ангиопульмонография (КТПА).',
      ],
    },
    likely: {
      source: 'ESC 2019 Guidelines for Pulmonary Embolism',
      points: [
        'Д-димер не используется для исключения диагноза при высокой претестовой вероятности — сразу визуализация (КТПА, при противопоказаниях — вентиляционно-перфузионная сцинтиграфия).',
        'При гемодинамической нестабильности — обследование и лечение по протоколу высокого риска ТЭЛА (в т.ч. рассмотреть эмпирическую антикоагуляцию/тромболизис до подтверждения диагноза, если ожидание визуализации опасно).',
        'Оценить тяжесть (напр., PESI/sPESI) после подтверждения диагноза.',
      ],
    },
  },

  caveats: [
    'Шкала Уэллса — инструмент претестовой вероятности, а не диагностический критерий; всегда сочетается с клинической оценкой.',
    'Существует и трёхуровневая (недихотомизированная) версия: < 2 — низкая, 2–6 — умеренная, > 6 — высокая вероятность.',
    'Для беременных и в первичном звене предпочтительны отдельные валидированные алгоритмы (напр., YEARS).',
  ],

  examples: [
    {
      note: 'Критериев нет — ТЭЛА маловероятна',
      inputs: {},
      expect: { value: 0, band: 'unlikely' },
    },
    {
      note: 'Тахикардия + кровохарканье: 1,5 + 1 = 2,5 — всё ещё маловероятна',
      inputs: { hr100: true, hemoptysis: true },
      expect: { value: 2.5, band: 'unlikely' },
    },
    {
      note: 'Ровно 4 балла (1,5+1,5+1) — граница, ТЭЛА ещё маловероятна',
      inputs: { hr100: true, immobilization: true, malignancy: true },
      expect: { value: 4, band: 'unlikely' },
    },
    {
      note: 'Признаки ТГВ + ТЭЛА наиболее вероятна: 3 + 3 = 6 — вероятна, сразу КТПА',
      inputs: { dvtSigns: true, peMostLikely: true },
      expect: { value: 6, band: 'likely' },
    },
  ],

  references: [
    'Wells PS, et al. Excluding pulmonary embolism at the bedside without diagnostic imaging. Ann Intern Med. 2001;135(2):98–107.',
    'Konstantinides SV, et al. 2019 ESC Guidelines for the diagnosis and management of acute pulmonary embolism. Eur Heart J. 2020;41(4):543–603.',
  ],
  updated: '2026-09-04',
  version: 1,
};
