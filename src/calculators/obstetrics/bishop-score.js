// Шкала Бишопа — «зрелость» шейки матки перед родовозбуждением.
// Пять признаков при влагалищном исследовании, суммарно 0–13 баллов.

import { SYSTEMS } from '../../lib/systems.js';

const DILATION = ['Шейка закрыта', 'Раскрытие 1–2 см', 'Раскрытие 3–4 см', 'Раскрытие ≥ 5 см'];
const EFFACEMENT = ['Укорочение 0–30%', 'Укорочение 40–50%', 'Укорочение 60–70%', 'Укорочение ≥ 80%'];
const STATION = [
  'Головка над входом в таз (−3)',
  'Головка прижата ко входу (−2)',
  'Головка малым сегментом, на уровне седалищных остей (−1…0)',
  'Головка большим сегментом или ниже остей (+1…+2)',
];
const CONSISTENCY = ['Плотная', 'Средней плотности', 'Мягкая'];
const POSITION = ['Отклонена кзади', 'Срединное положение', 'Обращена кпереди'];

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'bishop-score',
  name: 'Шкала Бишопа (зрелость шейки матки)',
  shortName: 'Шкала Бишопа',
  system: SYSTEMS.OBSTETRICS,
  tags: ['бишоп', 'bishop', 'зрелость шейки матки', 'родовозбуждение', 'индукция родов', 'преиндукция'],
  description:
    'Оценка готовности шейки матки к родовозбуждению. Чем выше балл, тем выше вероятность успешных родов через естественные родовые пути.',

  inputs: [
    { id: 'dilation', label: 'Раскрытие шейки матки', type: 'select', options: DILATION },
    { id: 'effacement', label: 'Укорочение (сглаживание) шейки', type: 'select', options: EFFACEMENT },
    { id: 'station', label: 'Положение предлежащей части', type: 'select', options: STATION },
    { id: 'consistency', label: 'Консистенция шейки', type: 'select', options: CONSISTENCY },
    { id: 'position', label: 'Позиция шейки относительно оси таза', type: 'select', options: POSITION },
  ],

  calculate({ dilation, effacement, station, consistency, position }) {
    /** @type {[string, number][]} */
    const parts = [
      ['Раскрытие', DILATION.indexOf(dilation)],
      ['Укорочение', EFFACEMENT.indexOf(effacement)],
      ['Положение предлежащей части', STATION.indexOf(station)],
      ['Консистенция', CONSISTENCY.indexOf(consistency)],
      ['Позиция шейки', POSITION.indexOf(position)],
    ];
    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.filter(([, p]) => p > 0).map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 13,
    bands: [
      { id: 'unfavorable', label: '≤ 5 — незрелая шейка', min: 0, color: 'red' },
      { id: 'intermediate', label: '6–7 — недостаточно зрелая', min: 6, color: 'orange' },
      { id: 'favorable', label: '≥ 8 — зрелая шейка', min: 8, color: 'green' },
    ],
  },

  interpretation: {
    unfavorable:
      'Незрелая шейка матки. Родовозбуждение без предварительной подготовки сопряжено с повышенным риском неудачи индукции и кесарева сечения.',
    intermediate:
      'Промежуточная зрелость. Тактика зависит от показаний к родоразрешению и клинической ситуации.',
    favorable:
      'Зрелая шейка матки. Вероятность успешного родовозбуждения высокая, течение приближается к спонтанным родам.',
  },

  guidance: {
    unfavorable: {
      source: 'КР «Роды одноплодные, родоразрешение путём индукции»; ACOG Practice Bulletin 107; WHO 2022',
      points: [
        'Перед родовозбуждением — преиндукционная подготовка шейки матки: простагландины (динопростон, мизопростол по протоколу) или механические методы (баллонный катетер Фолея, катетер Кука).',
        'Оценить показания к родоразрешению и его срочность — от этого зависит выбор между подготовкой шейки и кесаревым сечением.',
        'Обязательный кардиотокографический контроль состояния плода до и во время подготовки.',
      ],
    },
    intermediate: {
      source: 'КР «Роды одноплодные, родоразрешение путём индукции»; ACOG Practice Bulletin 107',
      points: [
        'Возможна как преиндукционная подготовка, так и родовозбуждение амниотомией с окситоцином — по клинической ситуации.',
        'Повторная оценка шейки в динамике.',
      ],
    },
    favorable: {
      source: 'КР «Роды одноплодные, родоразрешение путём индукции»; ACOG Practice Bulletin 107',
      points: [
        'Родовозбуждение амниотомией с последующей инфузией окситоцина по протоколу.',
        'Непрерывный кардиотокографический мониторинг; контроль характера схваток (избегать гиперстимуляции).',
      ],
    },
  },

  caveats: [
    'Пороговые значения различаются между источниками: «зрелой» чаще считают шейку при ≥ 8 баллов, «незрелой» — при ≤ 5–6.',
    'У повторнородящих прогностическая ценность выше; существуют упрощённый Бишоп (только раскрытие, укорочение, положение части) и модификации с поправкой на паритет и срок беременности.',
    'Оценка субъективна и зависит от исследователя.',
  ],

  examples: [
    {
      note: 'Шейка закрыта, плотная, кзади, головка над входом — 0 баллов',
      inputs: {},
      expect: { value: 0, band: 'unfavorable' },
    },
    {
      note: 'Раскрытие 1–2 см, укорочение 40–50%, головка прижата, средняя плотность, срединное положение — 1+1+1+1+1 = 5',
      inputs: {
        dilation: DILATION[1],
        effacement: EFFACEMENT[1],
        station: STATION[1],
        consistency: CONSISTENCY[1],
        position: POSITION[1],
      },
      expect: { value: 5, band: 'unfavorable' },
    },
    {
      note: 'Раскрытие 1–2 см, укорочение 40–50%, головка малым сегментом, средняя плотность, срединное положение — 1+1+2+1+1 = 6',
      inputs: {
        dilation: DILATION[1],
        effacement: EFFACEMENT[1],
        station: STATION[2],
        consistency: CONSISTENCY[1],
        position: POSITION[1],
      },
      expect: { value: 6, band: 'intermediate' },
    },
    {
      note: 'Раскрытие 3–4 см, укорочение ≥ 80%, головка большим сегментом, мягкая, обращена кпереди — 2+3+3+2+2 = 12',
      inputs: {
        dilation: DILATION[2],
        effacement: EFFACEMENT[3],
        station: STATION[3],
        consistency: CONSISTENCY[2],
        position: POSITION[2],
      },
      expect: { value: 12, band: 'favorable' },
    },
  ],

  references: [
    'Bishop EH. Pelvic scoring for elective induction. Obstet Gynecol. 1964;24:266–268.',
    'ACOG Practice Bulletin No. 107: Induction of labor. Obstet Gynecol. 2009;114(2 Pt 1):386–397.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
