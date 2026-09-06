// Шкала ISTH для явного ДВС-синдрома. Четыре лабораторных параметра,
// сумма ≥ 5 баллов соответствует явному (декомпенсированному) ДВС.

import { SYSTEMS } from '../../lib/systems.js';

const FIBRIN_MARKER = [
  'Нет повышения',
  'Умеренное повышение',
  'Выраженное повышение',
];
const FIBRIN_MARKER_PTS = [0, 2, 3];

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'isth-dic',
  name: 'Шкала ISTH (явный ДВС-синдром)',
  shortName: 'ISTH ДВС',
  system: SYSTEMS.HEMATOLOGY,
  tags: ['двс', 'исth', 'isth', 'диссеминированное внутрисосудистое свёртывание', 'коагулопатия', 'd-димер'],
  description:
    'Диагностика явного ДВС-синдрома у пациента с состоянием, которое может его вызвать (сепсис, травма, акушерская патология, онкология). Оценивается в динамике.',

  inputs: [
    { id: 'platelets', label: 'Тромбоциты', type: 'number', unit: '×10⁹/л', min: 1, max: 600, group: 'Показатели' },
    {
      id: 'fibrinMarker',
      label: 'Маркёр образования фибрина (D-димер / ПДФ)',
      type: 'select',
      options: FIBRIN_MARKER,
      group: 'Показатели',
    },
    {
      id: 'ptProlongation',
      label: 'Удлинение протромбинового времени относительно нормы',
      type: 'number',
      unit: 'с',
      min: 0,
      max: 60,
      group: 'Показатели',
    },
    { id: 'fibrinogen', label: 'Фибриноген', type: 'number', unit: 'г/л', min: 0.2, max: 12, group: 'Показатели' },
  ],

  calculate({ platelets, fibrinMarker, ptProlongation, fibrinogen }) {
    const pltPts = platelets < 50 ? 2 : platelets < 100 ? 1 : 0;
    const fibrinPts = FIBRIN_MARKER_PTS[FIBRIN_MARKER.indexOf(fibrinMarker)];
    const ptPts = ptProlongation > 6 ? 2 : ptProlongation >= 3 ? 1 : 0;
    const fibrinogenPts = fibrinogen < 1 ? 1 : 0;

    /** @type {[string, number][]} */
    const parts = [
      ['Тромбоциты', pltPts],
      ['Маркёр образования фибрина', fibrinPts],
      ['Удлинение ПВ', ptPts],
      ['Фибриноген', fibrinogenPts],
    ];
    return {
      value: parts.reduce((sum, [, p]) => sum + p, 0),
      decimals: 0,
      breakdown: parts.filter(([, p]) => p > 0).map(([label, points]) => ({ label, points })),
    };
  },

  result: {
    type: 'score',
    max: 8,
    bands: [
      { id: 'notOvert', label: '< 5 — явного ДВС нет', min: 0, color: 'green' },
      { id: 'overt', label: '≥ 5 — явный ДВС-синдром', min: 5, color: 'red' },
    ],
  },

  interpretation: {
    notOvert:
      'Критериям явного ДВС не соответствует. Это не исключает ДВС на ранней (компенсированной) стадии — при сохраняющемся клиническом подозрении повторить оценку через 1–2 дня.',
    overt:
      'Сумма ≥ 5 баллов соответствует явному ДВС-синдрому — декомпенсации системы гемостаза с потреблением факторов свёртывания и тромбоцитов.',
  },

  guidance: {
    overt: {
      source: 'Taylor FB, et al. Thromb Haemost 2001; КР по ДВС-синдрому; рекомендации ISTH',
      points: [
        'Главное — лечение состояния, вызвавшего ДВС (санация очага инфекции и антибактериальная терапия при сепсисе, родоразрешение при акушерской патологии, остановка кровотечения при травме).',
        'При кровотечении или высоком его риске (инвазивное вмешательство): свежезамороженная плазма, криопреципитат при фибриногене < 1,5–2 г/л, трансфузия тромбоцитов при уровне < 20–50 × 10⁹/л.',
        'При преобладании тромботических проявлений и отсутствии активного кровотечения — терапевтические или профилактические дозы гепарина.',
        'Динамический контроль тромбоцитов, ПВ/МНО, фибриногена, D-димера; повторный расчёт шкалы.',
      ],
    },
  },

  caveats: [
    'Шкала применяется только при наличии заболевания/состояния, ассоциированного с ДВС; вне этого контекста не валидна.',
    'Полуколичественная оценка маркёра фибрина (D-димер / ПДФ) зависит от метода и референсных значений лаборатории: «умеренное» повышение — ориентировочно в несколько раз выше нормы, «выраженное» — на порядок и более.',
    'Существует шкала ISTH для неявного (non-overt) ДВС с динамической оценкой — здесь не реализована.',
    'Значение < 5 не отменяет клинического наблюдения при высоком подозрении.',
  ],

  examples: [
    {
      note: 'Тромбоциты 150, маркёр не повышен, ПВ +1 с, фибриноген 3 — 0 баллов',
      inputs: { platelets: 150, fibrinMarker: FIBRIN_MARKER[0], ptProlongation: 1, fibrinogen: 3 },
      expect: { value: 0, band: 'notOvert' },
    },
    {
      note: 'Тромбоциты 80 (1) + умеренное повышение маркёра (2) + ПВ +4 с (1) — 4 балла, явного ДВС ещё нет',
      inputs: { platelets: 80, fibrinMarker: FIBRIN_MARKER[1], ptProlongation: 4, fibrinogen: 2 },
      expect: { value: 4, band: 'notOvert' },
    },
    {
      note: 'Тромбоциты 40 (2) + выраженное повышение маркёра (3) + ПВ +7 с (2) + фибриноген 0,8 (1) — 8 баллов',
      inputs: { platelets: 40, fibrinMarker: FIBRIN_MARKER[2], ptProlongation: 7, fibrinogen: 0.8 },
      expect: { value: 8, band: 'overt' },
    },
    {
      note: 'Тромбоциты 90 (1) + умеренное повышение (2) + ПВ +7 с (2) — ровно 5, явный ДВС',
      inputs: { platelets: 90, fibrinMarker: FIBRIN_MARKER[1], ptProlongation: 7, fibrinogen: 2 },
      expect: { value: 5, band: 'overt' },
    },
  ],

  references: [
    'Taylor FB Jr, Toh CH, Hoots WK, et al. Towards definition, clinical and laboratory criteria, and a scoring system for disseminated intravascular coagulation. Thromb Haemost. 2001;86(5):1327–1330.',
  ],
  updated: '2026-09-07',
  version: '1.0',
};
