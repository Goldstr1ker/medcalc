// Шкала Апгар — оценка состояния новорождённого. 5 компонентов по 0–2 балла.
// Оценивается на 1-й и 5-й минуте (при низком балле — дополнительно на 10-й).

import { SYSTEMS } from '../../lib/systems.js';

const APPEARANCE = [
  'Синюшность или бледность всего тела',
  'Тело розовое, конечности синюшные (акроцианоз)',
  'Розовый цвет всего тела',
];
const PULSE = ['Отсутствует', '< 100/мин', '≥ 100/мин'];
const GRIMACE = [
  'Нет реакции',
  'Гримаса или слабая реакция на раздражение',
  'Кашель, чихание, крик, активное отдёргивание',
];
const ACTIVITY = ['Вялый, движений нет', 'Некоторое сгибание конечностей', 'Активные движения'];
const RESPIRATION = ['Отсутствует', 'Слабое, нерегулярное дыхание', 'Хороший крик, регулярное дыхание'];

export default {
  id: 'apgar',
  name: 'Шкала Апгар',
  shortName: 'Апгар',
  system: SYSTEMS.PEDIATRICS,
  tags: ['апгар', 'apgar', 'новорождённый', 'роды', 'неонатология'],
  description:
    'Оценка состояния новорождённого сразу после рождения. Проводится на 1-й и 5-й минуте жизни (при низком балле — повторно на 10-й).',

  inputs: [
    { id: 'appearance', label: 'Окраска кожи', type: 'select', options: APPEARANCE },
    { id: 'pulse', label: 'ЧСС', type: 'select', options: PULSE },
    { id: 'grimace', label: 'Рефлекторная возбудимость', type: 'select', options: GRIMACE },
    { id: 'activity', label: 'Мышечный тонус', type: 'select', options: ACTIVITY },
    { id: 'respiration', label: 'Дыхание', type: 'select', options: RESPIRATION },
  ],

  calculate({ appearance, pulse, grimace, activity, respiration }) {
    const parts = [
      ['Окраска кожи', APPEARANCE.indexOf(appearance)],
      ['ЧСС', PULSE.indexOf(pulse)],
      ['Рефлекторная возбудимость', GRIMACE.indexOf(grimace)],
      ['Мышечный тонус', ACTIVITY.indexOf(activity)],
      ['Дыхание', RESPIRATION.indexOf(respiration)],
    ];
    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 10,
    bands: [
      { id: 'low', label: 'Низкая оценка (0–3)', min: 0, color: 'red' },
      { id: 'moderate', label: 'Умеренное отклонение (4–6)', min: 4, color: 'yellow' },
      { id: 'normal', label: 'Норма (7–10)', min: 7, color: 'green' },
    ],
  },

  interpretation: {
    low: 'Низкая оценка — требуется активная реанимационная помощь.',
    moderate: 'Умеренное отклонение от нормы — требуется стимуляция и наблюдение, возможна дыхательная поддержка.',
    normal: 'Состояние в пределах нормы.',
  },

  guidance: {
    low: {
      source: 'Neonatal Resuscitation Program (NRP); AAP/AHA',
      points: [
        'Реанимация начинается по клинической картине (дыхание, тонус, ЧСС) немедленно, не дожидаясь подсчёта оценки на 1-й минуте.',
        'Обеспечить тепловую цепочку, санацию дыхательных путей при необходимости, тактильную стимуляцию.',
        'При отсутствии эффективного дыхания — вентиляция под положительным давлением; при ЧСС < 60 несмотря на адекватную ИВЛ — компрессии грудной клетки и адреналин по алгоритму NRP.',
        'Переоценка каждые 30–60 секунд до стабилизации.',
      ],
    },
    moderate: {
      source: 'Neonatal Resuscitation Program (NRP); AAP/AHA',
      points: [
        'Продолжить стимуляцию, при необходимости — вспомогательная вентиляция и дополнительный кислород под контролем сатурации.',
        'Тщательное наблюдение, повторная оценка на 5-й и, при сохраняющихся отклонениях, на 10-й минуте.',
      ],
    },
    normal: {
      source: 'Neonatal Resuscitation Program (NRP); AAP/AHA',
      points: ['Стандартный уход: контакт «кожа к коже», продолжить наблюдение по протоколу отделения.'],
    },
  },

  caveats: [
    'Оценка на 1-й минуте не должна задерживать начало реанимационных мероприятий — они начинаются по клинической картине в реальном времени.',
    'Балл на 5-й минуте точнее прогнозирует исход, чем на 1-й; при низком балле оценку продолжают каждые 5 минут до 20-й минуты.',
    'На результат влияют недоношенность, седация/анестезия у матери, врождённые аномалии — низкий балл не всегда означает асфиксию в родах.',
    'Шкала не предназначена для определения объёма реанимационных мероприятий — решение принимается по текущему клиническому состоянию.',
  ],

  examples: [
    {
      note: 'Здоровый доношенный новорождённый — максимум 10',
      inputs: {
        appearance: APPEARANCE[2],
        pulse: PULSE[2],
        grimace: GRIMACE[2],
        activity: ACTIVITY[2],
        respiration: RESPIRATION[2],
      },
      expect: { value: 10, band: 'normal' },
    },
    {
      note: 'Типичная 1-минутная оценка: акроцианоз, ЧСС ниже 100, слабый крик — умеренное отклонение',
      inputs: {
        appearance: APPEARANCE[1],
        pulse: PULSE[1],
        grimace: GRIMACE[1],
        activity: ACTIVITY[1],
        respiration: RESPIRATION[1],
      },
      expect: { value: 5, band: 'moderate' },
    },
    {
      note: 'Отсутствие дыхания и ЧСС, синюшность — тяжёлая асфиксия',
      inputs: {
        appearance: APPEARANCE[0],
        pulse: PULSE[0],
        grimace: GRIMACE[0],
        activity: ACTIVITY[0],
        respiration: RESPIRATION[0],
      },
      expect: { value: 0, band: 'low' },
    },
  ],

  references: [
    'Apgar V. A proposal for a new method of evaluation of the newborn infant. Curr Res Anesth Analg. 1953;32(4):260–267.',
    'Weiner GM, Zaichkin J, eds. Textbook of Neonatal Resuscitation (NRP), 8th ed. American Academy of Pediatrics, 2021.',
  ],
  updated: '2026-09-06',
  version: 1,
};
