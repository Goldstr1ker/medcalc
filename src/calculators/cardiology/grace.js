// Шкала GRACE — риск смерти при остром коронарном синдроме.
//
// Реализована оригинальная модель GRACE 1.0 (Granger, 2003): балльная таблица
// из восьми предикторов, сумма которых даёт госпитальную летальность, а по
// другим порогам — летальность за 6 месяцев после выписки (Fox, 2006).
// GRACE 2.0 (2014) считает 1- и 3-летний прогноз по нелинейным зависимостям и
// требует номограммы/калькулятора — здесь не воспроизводится.
//
// Порог суммы > 140 — критерий ранней инвазивной тактики (≤ 24 ч) при ОКСбпST
// в рекомендациях ESC.

import { SYSTEMS } from '../../lib/systems.js';
import { CREATININE_MGDL } from '../../lib/units.js';

const KILLIP = [
  'I — признаков сердечной недостаточности нет',
  'II — влажные хрипы, III тон или набухание шейных вен',
  'III — отёк лёгких',
  'IV — кардиогенный шок',
];
const KILLIP_POINTS = [0, 20, 39, 59];

// Балльные таблицы GRACE 1.0 для госпитальной летальности (Granger, 2003).
function agePoints(age) {
  if (age < 30) return 0;
  if (age < 40) return 8;
  if (age < 50) return 25;
  if (age < 60) return 41;
  if (age < 70) return 58;
  if (age < 80) return 75;
  if (age < 90) return 91;
  return 100;
}

function heartRatePoints(hr) {
  if (hr < 50) return 0;
  if (hr < 70) return 3;
  if (hr < 90) return 9;
  if (hr < 110) return 15;
  if (hr < 150) return 24;
  if (hr < 200) return 38;
  return 46;
}

function sbpPoints(sbp) {
  if (sbp < 80) return 58;
  if (sbp < 100) return 53;
  if (sbp < 120) return 43;
  if (sbp < 140) return 34;
  if (sbp < 160) return 24;
  if (sbp < 200) return 10;
  return 0;
}

/** Креатинин в мг/дл (каноническая единица поля). */
function creatininePoints(cr) {
  if (cr < 0.4) return 1;
  if (cr < 0.8) return 4;
  if (cr < 1.2) return 7;
  if (cr < 1.6) return 10;
  if (cr < 2.0) return 13;
  if (cr < 4.0) return 21;
  return 28;
}

/** Категория риска смерти за 6 мес. после выписки (Fox, 2006). */
function postDischargeRisk(score) {
  if (score <= 88) return 'низкий (< 3%)';
  if (score <= 118) return 'промежуточный (3–8%)';
  return 'высокий (> 8%)';
}

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'grace',
  name: 'Шкала GRACE (ОКС)',
  shortName: 'GRACE',
  system: SYSTEMS.CARDIOLOGY,
  tags: [
    'grace',
    'грейс',
    'окс',
    'острый коронарный синдром',
    'оксбпst',
    'инфаркт миокарда',
    'нестабильная стенокардия',
    'летальность',
    'риск',
    'инвазивная тактика',
  ],
  description:
    'Прогноз госпитальной летальности и летальности за 6 месяцев после выписки при остром коронарном синдроме. Сумма > 140 — один из критериев ранней инвазивной тактики при ОКС без подъёма ST.',

  inputs: [
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 18, max: 120 },
    { id: 'hr', label: 'ЧСС', type: 'number', unit: 'уд/мин', min: 10, max: 350 },
    { id: 'sbp', label: 'Систолическое АД', type: 'number', unit: 'мм рт. ст.', min: 30, max: 300 },
    {
      id: 'creatinine',
      label: 'Креатинин сыворотки',
      type: 'number',
      min: 0.1,
      max: 25,
      units: CREATININE_MGDL,
    },
    { id: 'killip', label: 'Класс по Killip', type: 'select', options: KILLIP },
    {
      id: 'arrest',
      label: 'Остановка кровообращения при поступлении',
      type: 'boolean',
    },
    { id: 'stChange', label: 'Отклонение сегмента ST на ЭКГ', type: 'boolean' },
    {
      id: 'markers',
      label: 'Повышены кардиоспецифические маркёры (тропонин, КФК-МВ)',
      type: 'boolean',
    },
  ],

  calculate({ age, hr, sbp, creatinine, killip, arrest, stChange, markers }) {
    /** @type {[string, number][]} */
    const parts = [
      ['Возраст', agePoints(age)],
      ['ЧСС', heartRatePoints(hr)],
      ['Систолическое АД', sbpPoints(sbp)],
      ['Креатинин', creatininePoints(creatinine)],
      ['Класс по Killip', KILLIP_POINTS[KILLIP.indexOf(killip)]],
      ['Остановка кровообращения при поступлении', arrest ? 39 : 0],
      ['Отклонение сегмента ST', stChange ? 28 : 0],
      ['Повышенные кардиоспецифические маркёры', markers ? 14 : 0],
    ];
    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.filter(([, p]) => p > 0).map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 372,
    bands: [
      {
        id: 'low',
        label: '≤ 108 — низкий риск',
        min: 0,
        color: 'green',
        risk: 'госпитальная летальность < 1%',
      },
      {
        id: 'intermediate',
        label: '109–140 — промежуточный риск',
        min: 109,
        color: 'orange',
        risk: 'госпитальная летальность 1–3%',
      },
      {
        id: 'high',
        label: '> 140 — высокий риск',
        min: 141,
        color: 'red',
        risk: 'госпитальная летальность > 3%',
      },
    ],
  },

  interpretation: {
    low: ({ result }) =>
      `Сумма ${result.value} баллов — низкий риск. Госпитальная летальность < 1%. ` +
      `Риск смерти в первые 6 месяцев после выписки — ${postDischargeRisk(result.value)}.`,
    intermediate: ({ result }) =>
      `Сумма ${result.value} баллов — промежуточный риск. Госпитальная летальность 1–3%. ` +
      `Риск смерти в первые 6 месяцев после выписки — ${postDischargeRisk(result.value)}.`,
    high: ({ result }) =>
      `Сумма ${result.value} баллов — высокий риск. Госпитальная летальность > 3%. ` +
      `Риск смерти в первые 6 месяцев после выписки — ${postDischargeRisk(result.value)}.`,
  },

  guidance: {
    low: {
      source:
        'КР «Острый коронарный синдром без подъёма сегмента ST» (Минздрав РФ); ESC 2023 «Острый коронарный синдром»',
      points: [
        'ОКСбпST низкого риска (GRACE ≤ 140, нет других критериев высокого риска): инвазивная стратегия в плановом порядке или неинвазивная оценка ишемии по клинической картине.',
        'Оптимальная медикаментозная терапия: двойная антиагрегантная терапия, антикоагулянт на время госпитализации, статин, бета-блокатор и иАПФ/БРА по показаниям.',
        'При STEMI шкала прогноз не отменяет показаний к экстренной реперфузии.',
      ],
    },
    intermediate: {
      source: 'ESC 2023 «Острый коронарный синдром»; КР «ОКС без подъёма сегмента ST» (Минздрав РФ)',
      points: [
        'Промежуточный риск — инвазивная стратегия во время госпитализации (коронароангиография, как правило, в пределах 24–72 ч).',
        'Двойная антиагрегантная терапия и антикоагулянт; госпитализация в отделение с возможностью мониторинга ритма.',
      ],
    },
    high: {
      source: 'ESC 2023 «Острый коронарный синдром»; КР «ОКС без подъёма сегмента ST» (Минздрав РФ)',
      points: [
        'GRACE > 140 при ОКСбпST — показание к ранней инвазивной тактике: коронароангиография в пределах 24 часов.',
        'Двойная антиагрегантная терапия, антикоагулянт, госпитализация в блок интенсивной терапии кардиологического профиля.',
        'При нестабильной гемодинамике, рефрактерной ишемии, жизнеугрожающих аритмиях или механических осложнениях — немедленная инвазивная тактика (< 2 ч) независимо от баллов.',
      ],
    },
  },

  caveats: [
    'Реализована модель GRACE 1.0 (регистр 2003 г.): госпитальная летальность и, по отдельным порогам, летальность за 6 месяцев после выписки. GRACE 2.0 (2014) даёт 1- и 3-летний прогноз по нелинейным зависимостям и требует номограммы — здесь не воспроизводится.',
    'Стратификация за 6 месяцев после выписки по сумме баллов: ≤ 88 — низкий риск (< 3%), 89–118 — промежуточный (3–8%), > 118 — высокий (> 8%).',
    'Шкала оценивает прогноз, а не показания к реперфузии: подъём сегмента ST — показание к экстренной реперфузии независимо от суммы баллов.',
    'Порог «> 140» для инвазивной тактики в пределах 24 ч относится к ОКС без подъёма ST; при нестабильной гемодинамике инвазивная тактика немедленная независимо от GRACE.',
    'Все параметры — на момент поступления (класс по Killip, креатинин, маркёры, ЧСС, АД).',
  ],

  examples: [
    {
      note: 'НС/ОКСбпST, стабильный: 50 лет, ЧСС 80, САД 140, креатинин 1,0 мг/дл, Killip I, тропонин повышен → 95, низкий риск',
      inputs: {
        age: 50,
        hr: 80,
        sbp: 140,
        creatinine: 1.0,
        killip: KILLIP[0],
        markers: true,
      },
      units: { creatinine: 'mgdl' },
      expect: { value: 95, band: 'low' },
    },
    {
      note: 'Граница низкого риска: 65 лет, ЧСС 85, САД 130, креатинин 1,0 мг/дл, Killip I, маркёры не повышены → ровно 108',
      inputs: {
        age: 65,
        hr: 85,
        sbp: 130,
        creatinine: 1.0,
        killip: KILLIP[0],
      },
      units: { creatinine: 'mgdl' },
      expect: { value: 108, band: 'low' },
    },
    {
      note: '68 лет, ЧСС 72, САД 125, креатинин 1,0 мг/дл, Killip I, тропонин повышен → 122, промежуточный риск',
      inputs: {
        age: 68,
        hr: 72,
        sbp: 125,
        creatinine: 1.0,
        killip: KILLIP[0],
        markers: true,
      },
      units: { creatinine: 'mgdl' },
      expect: { value: 122, band: 'intermediate' },
    },
    {
      note: 'Граница высокого риска: 78 лет, ЧСС 80, САД 130, креатинин 1,0 мг/дл, Killip I, маркёры повышены → 139, ещё промежуточный',
      inputs: {
        age: 78,
        hr: 80,
        sbp: 130,
        creatinine: 1.0,
        killip: KILLIP[0],
        markers: true,
      },
      units: { creatinine: 'mgdl' },
      expect: { value: 139, band: 'intermediate' },
    },
    {
      note: 'То же, но креатинин 1,3 мг/дл (переход через балльную границу) → 142, уже высокий риск',
      inputs: {
        age: 78,
        hr: 80,
        sbp: 130,
        creatinine: 1.3,
        killip: KILLIP[0],
        markers: true,
      },
      units: { creatinine: 'mgdl' },
      expect: { value: 142, band: 'high' },
    },
    {
      note: 'Обширный инфаркт с отёком лёгких: 78 лет, ЧСС 115, САД 95, креатинин 2,1 мг/дл, Killip III, отклонение ST, маркёры повышены → 254, высокий риск',
      inputs: {
        age: 78,
        hr: 115,
        sbp: 95,
        creatinine: 2.1,
        killip: KILLIP[2],
        stChange: true,
        markers: true,
      },
      units: { creatinine: 'mgdl' },
      expect: { value: 254, band: 'high' },
    },
  ],

  references: [
    'Granger CB, Goldberg RJ, Dabbous O, et al. Predictors of hospital mortality in the Global Registry of Acute Coronary Events. Arch Intern Med. 2003;163(19):2345–2353.',
    'Fox KAA, Dabbous OH, Goldberg RJ, et al. Prediction of risk of death and myocardial infarction in the six months after presentation with acute coronary syndrome (GRACE). BMJ. 2006;333(7578):1091.',
    'Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J. 2023;44(38):3720–3826.',
  ],
  updated: '2026-09-08',
  version: '1.0',
};
