// Скорость инфузии в каплях в минуту по заданной скорости в мл/ч и капельному фактору системы.
// капель/мин = (мл/ч × капель/мл) / 60

import { SYSTEMS } from '../../lib/systems.js';

const DROP_FACTORS = {
  '10 капель/мл (макрокапельница)': 10,
  '15 капель/мл (макрокапельница)': 15,
  '20 капель/мл (стандартная макрокапельница)': 20,
  '60 капель/мл (микрокапельница, педиатрия)': 60,
};
const DROP_FACTOR_OPTIONS = Object.keys(DROP_FACTORS);

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'drip-rate',
  name: 'Скорость инфузии в каплях в минуту',
  shortName: 'Капли/мин',
  system: SYSTEMS.GENERAL,
  tags: ['инфузия', 'капельница', 'капли в минуту', 'капельный фактор', 'скорость введения'],
  description:
    'Пересчёт назначенной скорости инфузии (мл/ч) в капли в минуту — для введения через гравитационную капельницу без насоса.',

  inputs: [
    { id: 'rate', label: 'Назначенная скорость', type: 'number', unit: 'мл/ч', min: 1, max: 1000 },
    { id: 'dropFactor', label: 'Капельный фактор системы', type: 'select', options: DROP_FACTOR_OPTIONS },
  ],

  calculate({ rate, dropFactor }) {
    const factor = DROP_FACTORS[dropFactor];
    return { value: (rate * factor) / 60, unit: 'капель/мин', decimals: 0 };
  },

  result: {
    type: 'value',
    bands: [{ id: 'default', label: 'Расчётная скорость капельного введения', min: 0, color: 'slate' }],
  },

  interpretation: {
    default: 'Округляйте до целого числа капель — точнее подсчитать вручную всё равно невозможно.',
  },

  caveats: [
    'Капельный фактор указан на упаковке конкретной инфузионной системы — уточняйте по факту, значения по умолчанию являются ориентировочными.',
    'Гравитационная капельница подвержена дрейфу скорости (высота ёмкости, положение конечности, вязкость раствора); для препаратов с узким терапевтическим окном и точного объёма используйте инфузионный насос, а не подсчёт капель.',
    'Для детей и препаратов, требующих точного дозирования, предпочтительна микрокапельница (60 капель/мл) или шприцевой насос.',
  ],

  examples: [
    {
      note: '120 мл/ч через стандартную систему 20 капель/мл — 40 капель/мин',
      inputs: { rate: 120, dropFactor: DROP_FACTOR_OPTIONS[2] },
      expect: { value: 40 },
    },
    {
      note: 'Та же скорость через микрокапельницу 60 капель/мл — капля в каплю с мл/ч',
      inputs: { rate: 120, dropFactor: DROP_FACTOR_OPTIONS[3] },
      expect: { value: 120 },
    },
    {
      note: '80 мл/ч через систему 15 капель/мл',
      inputs: { rate: 80, dropFactor: DROP_FACTOR_OPTIONS[1] },
      expect: { value: 20 },
    },
  ],

  references: [
    'Kee JL, Hayes ER, McCuistion LE. Pharmacology: A Nursing Process Approach. Elsevier — раздел о расчёте скорости внутривенных инфузий.',
  ],
  updated: '2026-09-06',
  version: 1,
};
