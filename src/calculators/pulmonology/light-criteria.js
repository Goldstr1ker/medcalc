// Критерии Лайта — разграничение экссудативного и транссудативного
// плеврального выпота. Выпот экссудативный, если выполнен хотя бы один критерий.

import { SYSTEMS } from '../../lib/systems.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'light-criteria',
  name: 'Критерии Лайта (экссудат/транссудат)',
  shortName: 'Критерии Лайта',
  system: SYSTEMS.PULMONOLOGY,
  tags: ['лайт', 'light', 'плевральный выпот', 'экссудат', 'транссудат', 'плеврит', 'торакоцентез'],
  description:
    'Разграничение экссудативного и транссудативного плеврального выпота по соотношению белка и ЛДГ в плевральной жидкости и сыворотке.',

  inputs: [
    {
      id: 'pleuralProtein',
      label: 'Белок плевральной жидкости',
      type: 'number',
      unit: 'г/л',
      min: 1,
      max: 100,
      group: 'Белок',
    },
    {
      id: 'serumProtein',
      label: 'Белок сыворотки',
      type: 'number',
      unit: 'г/л',
      min: 20,
      max: 120,
      group: 'Белок',
    },
    {
      id: 'pleuralLDH',
      label: 'ЛДГ плевральной жидкости',
      type: 'number',
      unit: 'Ед/л',
      min: 5,
      max: 20000,
      group: 'ЛДГ',
    },
    {
      id: 'serumLDH',
      label: 'ЛДГ сыворотки',
      type: 'number',
      unit: 'Ед/л',
      min: 20,
      max: 5000,
      group: 'ЛДГ',
    },
    {
      id: 'serumLDHUpperLimit',
      label: 'Верхняя граница нормы ЛДГ сыворотки',
      type: 'number',
      unit: 'Ед/л',
      min: 100,
      max: 1000,
      group: 'ЛДГ',
    },
  ],

  calculate({ pleuralProtein, serumProtein, pleuralLDH, serumLDH, serumLDHUpperLimit }) {
    const proteinRatio = pleuralProtein / serumProtein;
    const ldhRatio = pleuralLDH / serumLDH;
    const ldhAbsolute = pleuralLDH / ((2 / 3) * serumLDHUpperLimit);

    const met =
      (proteinRatio > 0.5 ? 1 : 0) + (ldhRatio > 0.6 ? 1 : 0) + (ldhAbsolute > 1 ? 1 : 0);

    return {
      value: met,
      decimals: 0,
      details: [
        { label: 'Белок плевр./сыворотка (порог > 0,5)', value: proteinRatio, decimals: 2 },
        { label: 'ЛДГ плевр./сыворотка (порог > 0,6)', value: ldhRatio, decimals: 2 },
        { label: 'ЛДГ плевр. / (⅔ ВГН ЛДГ) (порог > 1)', value: ldhAbsolute, decimals: 2 },
      ],
    };
  },

  result: {
    type: 'value',
    bands: [
      { id: 'transudate', label: 'Транссудат (ни один критерий не выполнен)', min: 0, color: 'slate' },
      { id: 'exudate', label: 'Экссудат (выполнен ≥ 1 критерий)', min: 1, color: 'orange' },
    ],
  },

  interpretation: {
    transudate:
      'Ни один из трёх критериев не выполнен — выпот транссудативный. Причина, как правило, системная: сердечная недостаточность, цирроз, нефротический синдром, гипоальбуминемия.',
    exudate:
      'Выполнен хотя бы один критерий — выпот экссудативный. Причина обычно локальная: пневмония (парапневмонический выпот), злокачественное новообразование, тромбоэмболия лёгочной артерии, туберкулёз, панкреатит, заболевания соединительной ткани.',
  },

  guidance: {
    transudate: {
      source: 'Light RW. Pleural effusion. N Engl J Med. 2002; BTS Pleural Disease Guideline 2010',
      points: [
        'Лечение направлено на основное заболевание (сердечная недостаточность, цирроз, нефротический синдром).',
        'Диагностический торакоцентез при транссудате обычно не требует дальнейшего расширенного анализа плевральной жидкости.',
      ],
    },
    exudate: {
      source: 'Light RW. Pleural effusion. N Engl J Med. 2002; BTS Pleural Disease Guideline 2010',
      points: [
        'Расширить анализ плевральной жидкости: клеточный состав и цитология, pH и глюкоза, окраска по Граму и посев, аденозиндезаминаза при подозрении на туберкулёз, амилаза при подозрении на панкреатит/разрыв пищевода.',
        'pH < 7,2 при парапневмоническом выпоте — показание к дренированию плевральной полости.',
        'При отсутствии диагноза — КТ грудной клетки с контрастированием, при необходимости торакоскопия с биопсией плевры.',
      ],
    },
  },

  caveats: [
    'Критерии Лайта максимально чувствительны, но примерно у 25% пациентов с транссудатом (особенно на фоне диуретической терапии при сердечной недостаточности) ошибочно классифицируют выпот как экссудат. При пограничных значениях помогает градиент альбумина сыворотка–плевра > 12 г/л или белковый градиент > 31 г/л — в пользу транссудата.',
    'Значения ЛДГ следует сравнивать с референсным интервалом именно той лаборатории, где выполнен анализ.',
  ],

  examples: [
    {
      note: 'Сердечная недостаточность: белок плевр. 25 при сыворотке 65, ЛДГ плевр. 120 при сыворотке 200 (ВГН 250) — транссудат',
      inputs: {
        pleuralProtein: 25,
        serumProtein: 65,
        pleuralLDH: 120,
        serumLDH: 200,
        serumLDHUpperLimit: 250,
      },
      expect: { value: 0, band: 'transudate', details: [0.38, 0.6, 0.72] },
    },
    {
      note: 'Парапневмонический выпот: белок плевр. 45 при сыворотке 70, ЛДГ плевр. 900 при сыворотке 220 (ВГН 250) — все три критерия',
      inputs: {
        pleuralProtein: 45,
        serumProtein: 70,
        pleuralLDH: 900,
        serumLDH: 220,
        serumLDHUpperLimit: 250,
      },
      expect: { value: 3, band: 'exudate', details: [0.64, 4.09, 5.4] },
    },
    {
      note: 'Пограничный случай: выполнен только белковый критерий',
      inputs: {
        pleuralProtein: 40,
        serumProtein: 70,
        pleuralLDH: 90,
        serumLDH: 200,
        serumLDHUpperLimit: 250,
      },
      expect: { value: 1, band: 'exudate', details: [0.57, 0.45, 0.54] },
    },
  ],

  references: [
    'Light RW, et al. Pleural effusions: the diagnostic separation of transudates and exudates. Ann Intern Med. 1972;77(4):507–513.',
    'Hooper C, et al. Investigation of a unilateral pleural effusion in adults: BTS Pleural Disease Guideline 2010. Thorax. 2010;65(Suppl 2):ii4–ii17.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
