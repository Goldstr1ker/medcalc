// SOFA (Sequential Organ Failure Assessment) — оценка органной дисфункции
// по шести системам, от 0 до 4 баллов каждая, суммарно 0–24.
//
// Этот калькулятор — первый, использующий группировку полей (input.group)
// и цветные подшкалы в details: без них 8 полей шли бы сплошной простынёй,
// а вклад отдельных систем в общий балл был бы не виден.

import { SYSTEMS } from '../../lib/systems.js';
import { BILIRUBIN_UMOL, CREATININE_UMOL } from '../../lib/units.js';

const VASOPRESSORS = [
  'Нет',
  'Добутамин (любая доза) или допамин ≤ 5',
  'Допамин > 5, адреналин ≤ 0,1 или норадреналин ≤ 0,1',
  'Допамин > 15, адреналин > 0,1 или норадреналин > 0,1',
];

// Цвет подшкалы по числу баллов — чтобы сразу видеть, какая система тянет вниз.
/** @type {import('../../lib/types.js').BandColor[]} */
const SUBSCORE_COLORS = ['green', 'lime', 'yellow', 'orange', 'red'];

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'sofa',
  name: 'SOFA — оценка органной дисфункции',
  shortName: 'SOFA',
  system: SYSTEMS.CRITICAL_CARE,
  tags: ['sofa', 'сепсис', 'sepsis-3', 'орит', 'органная дисфункция', 'полиорганная недостаточность'],
  description:
    'Балльная оценка дисфункции шести систем органов. Прирост SOFA на ≥ 2 балла у пациента с подозрением на инфекцию соответствует критериям сепсиса по Sepsis-3.',

  inputs: [
    {
      id: 'pafi',
      label: 'PaO₂/FiO₂',
      type: 'number',
      unit: 'мм рт. ст.',
      min: 20,
      max: 700,
      group: 'Дыхание',
    },
    {
      id: 'respSupport',
      label: 'Респираторная поддержка (ИВЛ или CPAP)',
      type: 'boolean',
      group: 'Дыхание',
    },
    {
      id: 'platelets',
      label: 'Тромбоциты',
      type: 'number',
      unit: '×10⁹/л',
      min: 0,
      max: 1000,
      group: 'Коагуляция',
    },
    {
      id: 'bilirubin',
      label: 'Общий билирубин',
      type: 'number',
      min: 0,
      units: BILIRUBIN_UMOL,
      group: 'Печень',
    },
    {
      id: 'map',
      label: 'Среднее АД',
      type: 'number',
      unit: 'мм рт. ст.',
      min: 20,
      max: 160,
      group: 'Кровообращение',
    },
    {
      id: 'vasopressor',
      label: 'Вазопрессоры (мкг/кг/мин)',
      type: 'select',
      options: VASOPRESSORS,
      group: 'Кровообращение',
    },
    {
      id: 'gcs',
      label: 'Шкала комы Глазго',
      type: 'number',
      unit: 'баллов',
      min: 3,
      max: 15,
      group: 'ЦНС',
    },
    {
      id: 'creatinine',
      label: 'Креатинин',
      type: 'number',
      min: 0,
      units: CREATININE_UMOL,
      group: 'Почки',
    },
  ],

  calculate({ pafi, respSupport, platelets, bilirubin, map, vasopressor, gcs, creatinine }) {
    // Дыхание: 3 и 4 балла засчитываются только при респираторной поддержке.
    let resp = 0;
    if (pafi < 400) resp = 1;
    if (pafi < 300) resp = 2;
    if (pafi < 200 && respSupport) resp = 3;
    if (pafi < 100 && respSupport) resp = 4;

    let coag = 0;
    if (platelets < 150) coag = 1;
    if (platelets < 100) coag = 2;
    if (platelets < 50) coag = 3;
    if (platelets < 20) coag = 4;

    let liver = 0;
    if (bilirubin >= 20) liver = 1;
    if (bilirubin >= 33) liver = 2;
    if (bilirubin >= 102) liver = 3;
    if (bilirubin >= 205) liver = 4;

    // Кровообращение: вазопрессоры перевешивают уровень АД.
    const vasoIndex = VASOPRESSORS.indexOf(vasopressor);
    const cardio = vasoIndex > 0 ? vasoIndex + 1 : map < 70 ? 1 : 0;

    let cns = 0;
    if (gcs <= 14) cns = 1;
    if (gcs <= 12) cns = 2;
    if (gcs <= 9) cns = 3;
    if (gcs <= 5) cns = 4;

    let renal = 0;
    if (creatinine >= 110) renal = 1;
    if (creatinine >= 171) renal = 2;
    if (creatinine >= 300) renal = 3;
    if (creatinine >= 441) renal = 4;

    /** @type {[string, number][]} */
    const parts = [
      ['Дыхание', resp],
      ['Коагуляция', coag],
      ['Печень', liver],
      ['Кровообращение', cardio],
      ['ЦНС', cns],
      ['Почки', renal],
    ];

    return {
      value: parts.reduce((sum, [, points]) => sum + points, 0),
      decimals: 0,
      details: parts.map(([label, points]) => ({
        label,
        value: points,
        unit: points === 1 ? 'балл' : points >= 2 && points <= 4 ? 'балла' : 'баллов',
        color: SUBSCORE_COLORS[points],
      })),
    };
  },

  result: {
    type: 'score',
    max: 24,
    bands: [
      { id: 'low', label: '0–6 баллов', min: 0, color: 'green', risk: 'летальность < 10%' },
      { id: 'moderate', label: '7–9 баллов', min: 7, color: 'yellow', risk: '≈ 15–20%' },
      { id: 'high', label: '10–12 баллов', min: 10, color: 'orange', risk: '≈ 40–50%' },
      { id: 'veryHigh', label: '13–14 баллов', min: 13, color: 'red', risk: '≈ 50–60%' },
      { id: 'critical', label: '≥ 15 баллов', min: 15, color: 'darkred', risk: '> 80%' },
    ],
  },

  interpretation: {
    low: 'Органная дисфункция отсутствует или минимальна.',
    moderate: 'Умеренная органная дисфункция.',
    high: 'Выраженная органная дисфункция.',
    veryHigh: 'Тяжёлая полиорганная недостаточность.',
    critical: 'Крайне тяжёлая полиорганная недостаточность, летальность превышает 80%.',
  },

  guidance: {
    low: {
      source: 'Sepsis-3 (JAMA, 2016)',
      points: [
        'Значение важно не само по себе, а в динамике: прирост SOFA на ≥ 2 балла от исходного у пациента с подозрением на инфекцию — это сепсис по Sepsis-3.',
        'У пациента без известной органной дисфункции исходный SOFA принимается за 0.',
      ],
    },
    moderate: {
      source: 'Sepsis-3 (JAMA, 2016); Surviving Sepsis Campaign 2021',
      points: [
        'Оценить прирост относительно исходного значения — именно он определяет диагноз сепсиса.',
        'При подозрении на инфекцию — посевы крови, лактат, ранняя антибактериальная терапия.',
        'Повторять оценку в динамике: нарастание балла указывает на ухудшение прогноза.',
      ],
    },
    high: {
      source: 'Surviving Sepsis Campaign 2021',
      points: [
        'Ведение в условиях ОРИТ, органная поддержка по показаниям.',
        'Ежедневная переоценка SOFA — динамика информативнее однократного значения.',
        'При септическом шоке — вазопрессоры с целевым средним АД ≥ 65 мм рт. ст., контроль лактата.',
      ],
    },
    veryHigh: {
      source: 'Surviving Sepsis Campaign 2021',
      points: [
        'Полный объём органной поддержки в ОРИТ.',
        'Пересмотреть источник инфекции и адекватность его санации.',
        'Обсудить прогноз с пациентом и семьёй.',
      ],
    },
    critical: {
      source: 'Surviving Sepsis Campaign 2021',
      points: [
        'Максимальный объём органной поддержки; ежедневная переоценка.',
        'Повторно оценить санацию очага инфекции и адекватность антибактериальной терапии.',
        'Обсуждение целей лечения и паллиативных аспектов помощи с семьёй.',
      ],
    },
  },

  caveats: [
    'Прогностическая ценность у SOFA — в динамике, а не в однократном значении: клинически значим прирост относительно исходного балла.',
    'Респираторный компонент требует газов артериальной крови; при их отсутствии применяют модификации с SpO₂/FiO₂, здесь не реализованные.',
    'Балл за кровообращение зависит от доз вазопрессоров — вводите фактическую дозу на момент оценки.',
    'Шкала валидирована для взрослых пациентов ОРИТ, не для детей (существует pSOFA).',
  ],

  examples: [
    {
      note: 'Все показатели в норме, вазопрессоров нет — 0 баллов',
      inputs: { pafi: 450, platelets: 250, bilirubin: 10, map: 90, gcs: 15, creatinine: 80 },
      expect: { value: 0, band: 'low', details: [0, 0, 0, 0, 0, 0] },
    },
    {
      note: 'PaO₂/FiO₂ 150 без респираторной поддержки — только 2 балла, а не 3',
      inputs: { pafi: 150, platelets: 250, bilirubin: 10, map: 90, gcs: 15, creatinine: 80 },
      expect: { value: 2, details: [2, 0, 0, 0, 0, 0] },
    },
    {
      note: 'Тот же PaO₂/FiO₂ 150, но на ИВЛ — уже 3 балла',
      inputs: {
        pafi: 150,
        respSupport: true,
        platelets: 250,
        bilirubin: 10,
        map: 90,
        gcs: 15,
        creatinine: 80,
      },
      expect: { value: 3, details: [3, 0, 0, 0, 0, 0] },
    },
    {
      note: 'Вазопрессоры перевешивают нормальное АД: норадреналин ≤ 0,1 даёт 3 балла при АД 90',
      inputs: {
        pafi: 450,
        platelets: 250,
        bilirubin: 10,
        map: 90,
        vasopressor: 'Допамин > 5, адреналин ≤ 0,1 или норадреналин ≤ 0,1',
        gcs: 15,
        creatinine: 80,
      },
      expect: { value: 3, details: [0, 0, 0, 3, 0, 0] },
    },
    {
      note: 'Гипотензия без вазопрессоров — 1 балл',
      inputs: { pafi: 450, platelets: 250, bilirubin: 10, map: 65, gcs: 15, creatinine: 80 },
      expect: { value: 1, details: [0, 0, 0, 1, 0, 0] },
    },
    {
      note: 'Тяжёлый септический шок: все системы поражены — 24 балла',
      inputs: {
        pafi: 80,
        respSupport: true,
        platelets: 15,
        bilirubin: 250,
        map: 50,
        vasopressor: 'Допамин > 15, адреналин > 0,1 или норадреналин > 0,1',
        gcs: 4,
        creatinine: 500,
      },
      expect: { value: 24, band: 'critical', details: [4, 4, 4, 4, 4, 4] },
    },
    {
      note: 'Промежуточный случай: по 2 балла за четыре системы',
      inputs: {
        pafi: 250,
        platelets: 80,
        bilirubin: 50,
        map: 90,
        gcs: 11,
        creatinine: 200,
      },
      expect: { value: 10, band: 'high', details: [2, 2, 2, 0, 2, 2] },
    },
    {
      note: 'Креатинин в мг/дл переводится корректно: 2,26 мг/дл = 200 мкмоль/л',
      inputs: { pafi: 450, platelets: 250, bilirubin: 10, map: 90, gcs: 15, creatinine: 2.2624 },
      units: { creatinine: 'mgdl' },
      expect: { value: 2, details: [0, 0, 0, 0, 0, 2] },
    },
  ],

  references: [
    'Vincent JL, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707–710.',
    'Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801–810.',
    'Evans L, et al. Surviving Sepsis Campaign: International Guidelines 2021. Crit Care Med. 2021;49(11):e1063–e1143.',
  ],
  updated: '2026-09-06',
  version: 1,
};
