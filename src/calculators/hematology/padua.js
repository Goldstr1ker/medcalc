// Шкала Падуа — риск венозной тромбоэмболии у нехирургических госпитализированных пациентов.

import { SYSTEMS } from '../../lib/systems.js';

export default {
  id: 'padua',
  name: 'Шкала Падуа (риск ВТЭ)',
  shortName: 'Padua',
  system: SYSTEMS.HEMATOLOGY,
  tags: ['втэ', 'тромбопрофилактика', 'padua', 'падуа', 'тэла', 'тгв', 'госпитализация'],
  description:
    'Оценка риска венозной тромбоэмболии у терапевтических (нехирургических) госпитализированных пациентов — определяет показания к медикаментозной тромбопрофилактике.',

  inputs: [
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 0, max: 120 },
    { id: 'cancer', label: 'Активное онкозаболевание', type: 'boolean' },
    { id: 'priorVte', label: 'ВТЭ в анамнезе', type: 'boolean' },
    { id: 'immobility', label: 'Сниженная подвижность (постельный режим ≥ 3 дней)', type: 'boolean' },
    { id: 'thrombophilia', label: 'Известная тромбофилия', type: 'boolean' },
    { id: 'recentTraumaSurgery', label: 'Травма или операция в последний месяц', type: 'boolean' },
    { id: 'heartRespFailure', label: 'Сердечная или дыхательная недостаточность', type: 'boolean' },
    { id: 'acuteMiStroke', label: 'Острый инфаркт миокарда или ишемический инсульт', type: 'boolean' },
    { id: 'acuteInfection', label: 'Острая инфекция или ревматологическое заболевание', type: 'boolean' },
    { id: 'obesity', label: 'Ожирение (ИМТ ≥ 30)', type: 'boolean' },
    { id: 'hormonal', label: 'Гормональная терапия (в т.ч. КОК, ЗГТ)', type: 'boolean' },
  ],

  calculate({
    age,
    cancer,
    priorVte,
    immobility,
    thrombophilia,
    recentTraumaSurgery,
    heartRespFailure,
    acuteMiStroke,
    acuteInfection,
    obesity,
    hormonal,
  }) {
    const breakdown = [];
    let score = 0;
    const add = (cond, label, points) => {
      if (cond) {
        score += points;
        breakdown.push({ label, points });
      }
    };
    add(cancer, 'Активное онкозаболевание', 3);
    add(priorVte, 'ВТЭ в анамнезе', 3);
    add(immobility, 'Сниженная подвижность', 3);
    add(thrombophilia, 'Известная тромбофилия', 3);
    add(recentTraumaSurgery, 'Травма или операция за последний месяц', 2);
    add(age >= 70, 'Возраст ≥ 70 лет', 1);
    add(heartRespFailure, 'Сердечная/дыхательная недостаточность', 1);
    add(acuteMiStroke, 'Острый ИМ или ишемический инсульт', 1);
    add(acuteInfection, 'Острая инфекция/ревматологическое заболевание', 1);
    add(obesity, 'Ожирение (ИМТ ≥ 30)', 1);
    add(hormonal, 'Гормональная терапия', 1);
    return { value: score, decimals: 0, breakdown };
  },

  result: {
    type: 'score',
    max: 20,
    bands: [
      { id: 'low', label: 'Низкий риск (< 4)', min: 0, color: 'green' },
      { id: 'high', label: 'Высокий риск (≥ 4)', min: 4, color: 'red' },
    ],
  },

  interpretation: {
    low: 'Низкий риск ВТЭ — рутинная медикаментозная тромбопрофилактика не показана.',
    high: 'Высокий риск ВТЭ — показана тромбопрофилактика при отсутствии противопоказаний.',
  },

  guidance: {
    high: {
      source: 'Barbar S, et al. J Thromb Haemost 2010',
      points: [
        'Медикаментозная тромбопрофилактика (НМГ, НФГ или фондапаринукс) при отсутствии противопоказаний по кровотечению.',
        'При высоком риске кровотечения — механическая профилактика (компрессионный трикотаж, перемежающаяся пневмокомпрессия).',
        'Ранняя мобилизация, переоценка риска при изменении клинического статуса.',
      ],
    },
    low: {
      source: 'Barbar S, et al. J Thromb Haemost 2010',
      points: ['Ранняя мобилизация; медикаментозная профилактика рутинно не требуется.'],
    },
  },

  caveats: [
    'Валидирована для терапевтических (нехирургических) госпитализированных пациентов — не для хирургических или пациентов ОРИТ, где применяются отдельные шкалы (напр. Caprini).',
    'Переоценивайте риск при изменении клинического состояния за время госпитализации.',
  ],

  examples: [
    {
      note: 'Молодой пациент без факторов риска — низкий риск',
      inputs: { age: 40 },
      expect: { value: 0, band: 'low' },
    },
    {
      note: 'Один сильный фактор (активный рак) — 3 балла, порог 4 ещё не достигнут',
      inputs: { age: 40, cancer: true },
      expect: { value: 3, band: 'low' },
    },
    {
      note: 'Активный рак + сниженная подвижность — 6 баллов, высокий риск',
      inputs: { age: 50, cancer: true, immobility: true },
      expect: { value: 6, band: 'high' },
    },
    {
      note: 'Комбинация лёгких факторов: возраст, инфекция, ожирение — 3 балла, ещё низкий риск',
      inputs: { age: 75, acuteInfection: true, obesity: true },
      expect: { value: 3, band: 'low' },
    },
  ],

  references: [
    'Barbar S, et al. A risk assessment model for the identification of hospitalized medical patients at risk for venous thromboembolism: the Padua Prediction Score. J Thromb Haemost. 2010;8(11):2450–2457.',
  ],
  updated: '2026-09-06',
  version: 1,
};
