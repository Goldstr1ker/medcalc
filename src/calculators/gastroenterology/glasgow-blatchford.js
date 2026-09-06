// Шкала Глазго–Блэтчфорд (GBS) — риск при кровотечении из верхних отделов
// желудочно-кишечного тракта. Отбирает пациентов, которым нужна госпитализация
// и вмешательство (переливание, эндоскопический гемостаз, операция).

import { SYSTEMS } from '../../lib/systems.js';
import { HEMOGLOBIN_GL } from '../../lib/units.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'glasgow-blatchford',
  name: 'Шкала Глазго–Блэтчфорд (ЖКК)',
  shortName: 'Глазго–Блэтчфорд',
  system: SYSTEMS.GASTROENTEROLOGY,
  tags: ['gbs', 'блэтчфорд', 'глазго', 'желудочно-кишечное кровотечение', 'жкк', 'кровотечение', 'мелена'],
  description:
    'Оценка риска при кровотечении из верхних отделов ЖКТ до эндоскопии. Балл 0 позволяет рассмотреть амбулаторное ведение; высокий балл предсказывает потребность в переливании и эндоскопическом гемостазе.',

  inputs: [
    { id: 'sex', label: 'Пол', type: 'select', options: ['Мужской', 'Женский'] },
    { id: 'urea', label: 'Мочевина сыворотки', type: 'number', unit: 'ммоль/л', min: 0.5, max: 60, group: 'Лабораторные' },
    { id: 'hemoglobin', label: 'Гемоглобин', type: 'number', min: 20, max: 250, units: HEMOGLOBIN_GL, group: 'Лабораторные' },
    { id: 'sbp', label: 'Систолическое АД', type: 'number', unit: 'мм рт. ст.', min: 40, max: 260, group: 'Гемодинамика' },
    { id: 'pulse', label: 'ЧСС', type: 'number', unit: 'уд/мин', min: 20, max: 250, group: 'Гемодинамика' },
    { id: 'melena', label: 'Мелена', type: 'boolean', group: 'Прочее' },
    { id: 'syncope', label: 'Синкопе', type: 'boolean', group: 'Прочее' },
    { id: 'hepaticDisease', label: 'Заболевание печени в анамнезе', type: 'boolean', group: 'Прочее' },
    { id: 'cardiacFailure', label: 'Сердечная недостаточность в анамнезе', type: 'boolean', group: 'Прочее' },
  ],

  calculate({ sex, urea, hemoglobin, sbp, pulse, melena, syncope, hepaticDisease, cardiacFailure }) {
    const female = sex === 'Женский';

    const ureaPoints = urea >= 25 ? 6 : urea >= 10 ? 4 : urea >= 8 ? 3 : urea >= 6.5 ? 2 : 0;

    let hbPoints;
    if (female) hbPoints = hemoglobin < 100 ? 6 : hemoglobin < 120 ? 1 : 0;
    else hbPoints = hemoglobin < 100 ? 6 : hemoglobin < 120 ? 3 : hemoglobin < 130 ? 1 : 0;

    const sbpPoints = sbp < 90 ? 3 : sbp < 100 ? 2 : sbp < 110 ? 1 : 0;

    /** @type {[string, number][]} */
    const parts = [
      ['Мочевина', ureaPoints],
      ['Гемоглобин', hbPoints],
      ['Систолическое АД', sbpPoints],
      ['ЧСС ≥ 100/мин', pulse >= 100 ? 1 : 0],
      ['Мелена', melena ? 1 : 0],
      ['Синкопе', syncope ? 2 : 0],
      ['Заболевание печени', hepaticDisease ? 2 : 0],
      ['Сердечная недостаточность', cardiacFailure ? 2 : 0],
    ];

    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.filter(([, p]) => p > 0).map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 23,
    bands: [
      { id: 'veryLow', label: '0 — очень низкий риск', min: 0, color: 'green' },
      { id: 'low', label: '1–5 — низкий риск', min: 1, color: 'lime' },
      { id: 'moderate', label: '6–11 — умеренный риск', min: 6, color: 'orange' },
      { id: 'high', label: '≥ 12 — высокий риск', min: 12, color: 'red' },
    ],
  },

  interpretation: {
    veryLow:
      'Балл 0 — крайне низкая вероятность потребности во вмешательстве. Такие пациенты — кандидаты на амбулаторное ведение с плановой эндоскопией.',
    low: 'Низкий риск, но не нулевой — обычно требуется госпитализация и эндоскопия в обычные сроки.',
    moderate: 'Умеренный риск потребности в переливании крови и эндоскопическом гемостазе.',
    high: 'Высокий риск — вероятны переливание, эндоскопический гемостаз, возможно повторное кровотечение.',
  },

  guidance: {
    veryLow: {
      source: 'КР «Язвенное желудочно-кишечное кровотечение»; ESGE 2021; NICE NG12',
      points: [
        'При GBS 0, стабильной гемодинамике, отсутствии тяжёлых сопутствующих заболеваний и социальной возможности наблюдения — рассмотреть выписку с амбулаторной эндоскопией.',
        'Обязательно исключить приём антикоагулянтов и НПВП, оценить необходимость их отмены.',
      ],
    },
    moderate: {
      source: 'КР «Язвенное желудочно-кишечное кровотечение»; ESGE 2021',
      points: [
        'Госпитализация, венозный доступ большого диаметра, определение группы крови и совместимости.',
        'Инфузионная терапия; трансфузия эритроцитов при гемоглобине < 70 г/л (< 80 г/л при сердечно-сосудистой патологии).',
        'Эзофагогастродуоденоскопия в течение 24 часов после стабилизации; ингибитор протонной помпы внутривенно.',
      ],
    },
    high: {
      source: 'КР «Язвенное желудочно-кишечное кровотечение»; ESGE 2021',
      points: [
        'Ведение как тяжёлого ЖКК: реанимационные мероприятия, при массивной кровопотере — протокол массивной трансфузии.',
        'Ранняя ЭГДС (в течение 24 ч, при нестабильности — экстренно после стабилизации) с эндоскопическим гемостазом.',
        'При подозрении на варикозное кровотечение — вазоактивные препараты (терлипрессин/октреотид) и антибиотикопрофилактика.',
        'Коррекция коагулопатии, отмена и реверсия антикоагулянтов по показаниям.',
      ],
    },
  },

  caveats: [
    'Шкала оценивает риск вмешательства, а не летальность; для прогноза летальности после эндоскопии используют шкалу Рокалла.',
    'Мочевину нужно вводить в ммоль/л. Если лаборатория даёт азот мочевины крови (BUN) в мг/дл, разделите на 2,8.',
    'Модифицированный вариант (без мочевины и гемоглобина) применяют, когда лабораторные данные ещё недоступны.',
  ],

  examples: [
    {
      note: 'Мужчина, мочевина 5, Hb 150, АД 130, ЧСС 80, без симптомов — балл 0',
      inputs: { sex: 'Мужской', urea: 5, hemoglobin: 150, sbp: 130, pulse: 80 },
      expect: { value: 0, band: 'veryLow' },
    },
    {
      note: 'Мужчина, мочевина 7, Hb 125, АД 130, ЧСС 80, мелена: 2 + 1 + 1 = 4',
      inputs: { sex: 'Мужской', urea: 7, hemoglobin: 125, sbp: 130, pulse: 80, melena: true },
      expect: { value: 4, band: 'low' },
    },
    {
      note: 'Женщина, мочевина 12, Hb 105, АД 105 (100–109 → 1), ЧСС 90, мелена: 4 + 1 + 1 + 1 = 7',
      inputs: { sex: 'Женский', urea: 12, hemoglobin: 105, sbp: 105, pulse: 90, melena: true },
      expect: { value: 7, band: 'moderate' },
    },
    {
      note: 'Женщина, мочевина 9 (8–9,9 → 3), Hb 95 (< 100 → 6), АД 95 (90–99 → 2), ЧСС 105, синкопе: 3 + 6 + 2 + 1 + 2 = 14',
      inputs: { sex: 'Женский', urea: 9, hemoglobin: 95, sbp: 95, pulse: 105, syncope: true },
      expect: { value: 14, band: 'high' },
    },
    {
      note: 'Мужчина, мочевина 30, Hb 80, АД 85, ЧСС 120, мелена, синкопе, болезнь печени: 6 + 6 + 3 + 1 + 1 + 2 + 2 = 21',
      inputs: {
        sex: 'Мужской',
        urea: 30,
        hemoglobin: 80,
        sbp: 85,
        pulse: 120,
        melena: true,
        syncope: true,
        hepaticDisease: true,
      },
      expect: { value: 21, band: 'high' },
    },
    {
      note: 'Гемоглобин в г/дл (12,5 = 125 г/л) даёт тот же результат',
      inputs: { sex: 'Мужской', urea: 7, hemoglobin: 12.5, sbp: 130, pulse: 80, melena: true },
      units: { hemoglobin: 'gdl' },
      expect: { value: 4, band: 'low' },
    },
  ],

  references: [
    'Blatchford O, Murray WR, Blatchford M. A risk score to predict need for treatment for upper-gastrointestinal haemorrhage. Lancet. 2000;356(9238):1318–1321.',
    'Gralnek IM, et al. Endoscopic diagnosis and management of nonvariceal upper gastrointestinal hemorrhage: ESGE Guideline update 2021. Endoscopy. 2021;53(3):300–332.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
