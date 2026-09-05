// 4T score — претестовая вероятность гепарин-индуцированной тромбоцитопении (ГИТ).
// Четыре категории по 0–2 балла, максимум 8.

import { SYSTEMS } from '../../lib/systems.js';

const THROMBOCYTOPENIA = [
  'Падение < 30% или надир < 10×10⁹/л',
  'Падение 30–50% или надир 10–19×10⁹/л',
  'Падение > 50% и надир ≥ 20×10⁹/л',
];
const TIMING = [
  'Падение < 4 дней без недавнего введения гепарина',
  'Вероятно день 5–10, но данные неполные; начало после 10-го дня; либо падение ≤ 1 дня при введении гепарина 30–100 дней назад',
  'Чёткое начало на 5–10 день; либо падение ≤ 1 дня при введении гепарина в последние 30 дней',
];
const THROMBOSIS = [
  'Нет',
  'Прогрессирующий/рецидивирующий тромбоз; эритематозные поражения кожи; подозрение на тромбоз (не подтверждено)',
  'Подтверждённый новый тромбоз, некроз кожи, острая системная реакция после в/в болюса гепарина',
];
const OTHER_CAUSES = ['Явная другая причина есть', 'Возможна другая причина', 'Явной другой причины нет'];

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'four-ts',
  name: '4T — вероятность гепарин-индуцированной тромбоцитопении',
  shortName: '4T (ГИТ)',
  system: SYSTEMS.HEMATOLOGY,
  tags: ['гит', 'hit', '4t', 'тромбоцитопения', 'гепарин'],
  description:
    'Претестовая вероятность гепарин-индуцированной тромбоцитопении (ГИТ) у пациента с падением числа тромбоцитов на фоне гепаринотерапии.',

  inputs: [
    { id: 'thrombocytopenia', label: 'Тромбоцитопения', type: 'select', options: THROMBOCYTOPENIA },
    { id: 'timing', label: 'Сроки падения тромбоцитов', type: 'select', options: TIMING },
    { id: 'thrombosis', label: 'Тромбоз или другие проявления', type: 'select', options: THROMBOSIS },
    { id: 'otherCauses', label: 'Другие причины тромбоцитопении', type: 'select', options: OTHER_CAUSES },
  ],

  calculate({ thrombocytopenia, timing, thrombosis, otherCauses }) {
    /** @type {[string, number][]} */
    const parts = [
      ['Тромбоцитопения', THROMBOCYTOPENIA.indexOf(thrombocytopenia)],
      ['Сроки', TIMING.indexOf(timing)],
      ['Тромбоз/проявления', THROMBOSIS.indexOf(thrombosis)],
      ['Другие причины', OTHER_CAUSES.indexOf(otherCauses)],
    ];
    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 8,
    bands: [
      { id: 'low', label: 'Низкая вероятность (0–3)', min: 0, color: 'green' },
      { id: 'intermediate', label: 'Промежуточная вероятность (4–5)', min: 4, color: 'yellow' },
      { id: 'high', label: 'Высокая вероятность (6–8)', min: 6, color: 'red' },
    ],
  },

  interpretation: {
    low: 'ГИТ маловероятна. Отрицательная прогностическая ценность низкого балла высокая.',
    intermediate: 'Промежуточная вероятность ГИТ — требуется лабораторное подтверждение.',
    high: 'Высокая вероятность ГИТ — действовать немедленно, не дожидаясь результатов лаборатории.',
  },

  guidance: {
    low: {
      source: 'Cuker A, et al. ASH Guidelines 2018',
      points: [
        'Лабораторное тестирование на ГИТ, как правило, не требуется — искать другие причины тромбоцитопении.',
        'Гепарин можно продолжать при отсутствии других противопоказаний.',
      ],
    },
    intermediate: {
      source: 'Cuker A, et al. ASH Guidelines 2018',
      points: [
        'Отменить все источники гепарина, включая НМГ, промывания катетеров и гепарин-покрытые устройства.',
        'Начать альтернативный антикоагулянт (аргатробан, бивалирудин или фондапаринукс — выбор с учётом функции почек/печени) до получения результатов лаборатории.',
        'Отправить тест на антитела к ГИТ (ИФА), при положительном результате — функциональный тест (напр., тест высвобождения серотонина).',
        'Не переливать тромбоциты без клинического кровотечения — может усугубить тромбоз.',
      ],
    },
    high: {
      source: 'Cuker A, et al. ASH Guidelines 2018',
      points: [
        'Немедленно отменить все источники гепарина.',
        'Немедленно начать альтернативный антикоагулянт, не дожидаясь лабораторного подтверждения.',
        'Не начинать варфарин до восстановления числа тромбоцитов (риск венозной гангрены конечности); если пациент уже на варфарине — ввести витамин К.',
        'Тестирование на антитела к ГИТ для подтверждения диагноза.',
      ],
    },
  },

  caveats: [
    '4T — инструмент претестовой вероятности, не диагностический тест. Промежуточный и высокий балл требуют лабораторного подтверждения (ИФА на антитела, функциональные тесты).',
    'При высокой клинической вероятности лечение начинают немедленно, не дожидаясь результатов анализов — задержка повышает риск тромбоза.',
    'Требует аккуратной оценки временной связи с введением гепарина и исключения альтернативных причин тромбоцитопении (сепсис, ДВС, лекарственная тромбоцитопения другой этиологии).',
  ],

  examples: [
    {
      note: 'Классическая картина: явное падение, типичные сроки, тромбоз, нет других причин — высокая вероятность',
      inputs: {
        thrombocytopenia: THROMBOCYTOPENIA[2],
        timing: TIMING[2],
        thrombosis: THROMBOSIS[2],
        otherCauses: OTHER_CAUSES[2],
      },
      expect: { value: 8, band: 'high' },
    },
    {
      note: 'Минимальные изменения по всем категориям — низкая вероятность',
      inputs: {
        thrombocytopenia: THROMBOCYTOPENIA[0],
        timing: TIMING[0],
        thrombosis: THROMBOSIS[0],
        otherCauses: OTHER_CAUSES[0],
      },
      expect: { value: 0, band: 'low' },
    },
    {
      note: 'Умеренное падение с типичными сроками, без тромбоза, но неясная другая причина — промежуточная',
      inputs: {
        thrombocytopenia: THROMBOCYTOPENIA[1],
        timing: TIMING[2],
        thrombosis: THROMBOSIS[0],
        otherCauses: OTHER_CAUSES[1],
      },
      expect: { value: 4, band: 'intermediate' },
    },
  ],

  references: [
    'Lo GK, et al. Evaluation of pretest clinical score (4 T\'s) for the diagnosis of heparin-induced thrombocytopenia. J Thromb Haemost. 2006;4(4):759–765.',
    'Cuker A, et al. American Society of Hematology 2018 guidelines for management of venous thromboembolism: heparin-induced thrombocytopenia. Blood Adv. 2018;2(22):3360–3392.',
  ],
  updated: '2026-09-06',
  version: 1,
};
