// Шкала Уэллса для тромбоза глубоких вен (дихотомизированная версия).

import { SYSTEMS } from '../../lib/systems.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'wells-dvt',
  name: 'Шкала Уэллса для ТГВ',
  shortName: 'Wells (ТГВ)',
  system: SYSTEMS.HEMATOLOGY,
  tags: ['тгв', 'wells', 'уэллс', 'тромбоз глубоких вен', 'd-димер'],
  description:
    'Претестовая вероятность тромбоза глубоких вен нижних конечностей — определяет тактику: Д-димер или сразу компрессионное УЗИ.',

  inputs: [
    { id: 'cancer', label: 'Активное онкозаболевание', type: 'boolean' },
    { id: 'paralysis', label: 'Парез, паралич или иммобилизация гипсовой повязкой ноги', type: 'boolean' },
    { id: 'bedridden', label: 'Постельный режим ≥ 3 дней или операция за последние 12 недель', type: 'boolean' },
    { id: 'tenderness', label: 'Локальная болезненность по ходу глубоких вен', type: 'boolean' },
    { id: 'legSwollen', label: 'Отёк всей ноги', type: 'boolean' },
    { id: 'calfSwelling', label: 'Отёк голени > 3 см по сравнению со здоровой ногой', type: 'boolean' },
    { id: 'pittingEdema', label: 'Отёк с ямкой только на стороне поражения', type: 'boolean' },
    { id: 'collateralVeins', label: 'Коллатеральные (не варикозные) поверхностные вены', type: 'boolean' },
    { id: 'priorDvt', label: 'ТГВ в анамнезе', type: 'boolean' },
    { id: 'alternativeDiagnosis', label: 'Альтернативный диагноз как минимум так же вероятен', type: 'boolean' },
  ],

  calculate({
    cancer,
    paralysis,
    bedridden,
    tenderness,
    legSwollen,
    calfSwelling,
    pittingEdema,
    collateralVeins,
    priorDvt,
    alternativeDiagnosis,
  }) {
    const breakdown = [];
    let score = 0;
    const add = (cond, label, points) => {
      if (cond) {
        score += points;
        breakdown.push({ label, points });
      }
    };
    add(cancer, 'Активное онкозаболевание', 1);
    add(paralysis, 'Парез/паралич/иммобилизация', 1);
    add(bedridden, 'Постельный режим/недавняя операция', 1);
    add(tenderness, 'Локальная болезненность по ходу вен', 1);
    add(legSwollen, 'Отёк всей ноги', 1);
    add(calfSwelling, 'Отёк голени > 3 см', 1);
    add(pittingEdema, 'Отёк с ямкой на стороне поражения', 1);
    add(collateralVeins, 'Коллатеральные поверхностные вены', 1);
    add(priorDvt, 'ТГВ в анамнезе', 1);
    add(alternativeDiagnosis, 'Альтернативный диагноз не менее вероятен', -2);
    return { value: score, decimals: 0, breakdown };
  },

  result: {
    type: 'score',
    max: 9,
    bands: [
      { id: 'unlikely', label: 'ТГВ маловероятен (≤ 1)', min: -2, color: 'green' },
      { id: 'likely', label: 'ТГВ вероятен (≥ 2)', min: 2, color: 'red' },
    ],
  },

  interpretation: {
    unlikely: 'ТГВ маловероятен — дальнейшая тактика через Д-димер.',
    likely: 'ТГВ вероятен — показано компрессионное УЗИ вен нижних конечностей.',
  },

  guidance: {
    unlikely: {
      source: 'Wells PS, et al. Lancet 1997; N Engl J Med 2003',
      points: [
        'Д-димер: при отрицательном результате ТГВ практически исключён без дальнейшей визуализации.',
        'При положительном Д-димере — компрессионное УЗИ вен.',
      ],
    },
    likely: {
      source: 'Wells PS, et al. Lancet 1997; N Engl J Med 2003',
      points: [
        'Компрессионное УЗИ вен нижних конечностей напрямую, без Д-димера.',
        'При невозможности срочного УЗИ и высоком клиническом подозрении — рассмотреть эмпирическую антикоагуляцию до визуализации.',
        'Отрицательное УЗИ при высокой претестовой вероятности — повторить исследование через 5–7 дней или выполнить дополнительную визуализацию.',
      ],
    },
  },

  caveats: [
    'Шкала — инструмент претестовой вероятности, не диагностический критерий сам по себе.',
    'Менее валидна при подозрении на рецидив ТГВ на фоне ранее перенесённого эпизода.',
    'Для беременных и в амбулаторном звене без доступа к УЗИ применяются отдельные алгоритмы.',
  ],

  examples: [
    {
      note: 'Признаков нет — маловероятен',
      inputs: {},
      expect: { value: 0, band: 'unlikely' },
    },
    {
      note: 'Альтернативный диагноз не менее вероятен — уходит в минус',
      inputs: { tenderness: true, alternativeDiagnosis: true },
      expect: { value: -1, band: 'unlikely' },
    },
    {
      note: 'Отёк всей ноги + локальная болезненность + недавняя операция — вероятен',
      inputs: { legSwollen: true, tenderness: true, bedridden: true },
      expect: { value: 3, band: 'likely' },
    },
    {
      note: 'Ровно порог 2 балла — уже «вероятен»',
      inputs: { cancer: true, priorDvt: true },
      expect: { value: 2, band: 'likely' },
    },
  ],

  references: [
    'Wells PS, et al. Value of assessment of pretest probability of deep-vein thrombosis in clinical management. Lancet. 1997;350(9094):1795–1798.',
    'Wells PS, et al. Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis. N Engl J Med. 2003;349(13):1227–1235.',
  ],
  updated: '2026-09-06',
  version: 1,
};
