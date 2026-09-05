// Корригированный QT: формула Базетта QTc = QT / √RR, доп. — формула Фридерича QTc = QT / RR^(1/3).
// RR (с) = 60 / ЧСС.

import { SYSTEMS } from '../../lib/systems.js';

export default {
  id: 'qtc',
  name: 'QTc — корригированный интервал QT',
  shortName: 'QTc',
  system: SYSTEMS.CARDIOLOGY,
  tags: ['qt', 'qtc', 'базетт', 'фридеричa', 'torsades', 'удлинение qt'],
  description:
    'Коррекция интервала QT на частоту сердечных сокращений (формула Базетта, дополнительно — Фридеричa для крайних значений ЧСС).',

  inputs: [
    { id: 'sex', label: 'Пол', type: 'select', options: ['Мужской', 'Женский'] },
    { id: 'qt', label: 'Интервал QT', type: 'number', unit: 'мс', min: 200, max: 800 },
    { id: 'hr', label: 'ЧСС', type: 'number', unit: 'уд/мин', min: 20, max: 250 },
  ],

  calculate({ qt, hr }) {
    const rrSec = 60 / hr;
    const bazett = qt / Math.sqrt(rrSec);
    const fridericia = qt / Math.cbrt(rrSec);
    return {
      value: bazett,
      unit: 'мс (формула Базетта)',
      decimals: 0,
      details: [{ label: 'По формуле Фридеричa', value: fridericia, unit: 'мс' }],
    };
  },

  result: {
    type: 'gauge',
    min: 340,
    max: 560,

    // Пороги зависят от пола: у женщин верхняя граница нормы на 10 мс выше.
    // Раньше схема этого не позволяла, и приходилось брать единый порог 440 мс
    // с оговоркой в ограничениях — то есть завышать тревогу у женщин.
    bands: ({ sex }) => {
      const female = sex === 'Женский';
      const upperNormal = female ? 460 : 450;
      return [
        { id: 'normal', label: `Норма (< ${upperNormal} мс)`, min: 0, color: 'green' },
        {
          id: 'prolonged',
          label: `Удлинён (${upperNormal}–499 мс)`,
          min: upperNormal,
          color: 'orange',
        },
        {
          id: 'severe',
          label: 'Значительно удлинён (≥ 500 мс)',
          min: 500,
          color: 'red',
          risk: 'высокий риск torsades de pointes',
        },
      ];
    },
  },

  interpretation: {
    normal: ({ inputs }) =>
      `QTc в пределах нормы для ${inputs.sex === 'Женский' ? 'женщин (порог 460 мс)' : 'мужчин (порог 450 мс)'}.`,
    prolonged: ({ inputs }) =>
      `QTc выше нормы для ${inputs.sex === 'Женский' ? 'женщин (≥ 460 мс)' : 'мужчин (≥ 450 мс)'} — повышен риск желудочковых аритмий, включая torsades de pointes.`,
    severe:
      'Выраженно удлинённый QTc (≥ 500 мс) — существенно повышен риск torsades de pointes независимо от пола, особенно при дополнительных факторах риска.',
  },

  guidance: {
    prolonged: {
      source: 'AHA/ACCF/HRS Scientific Statement, Circulation 2009',
      points: [
        'Проверить и по возможности отменить/заменить QT-удлиняющие препараты (сверить со списком, напр. CredibleMeds).',
        'Скорректировать электролиты: калий, магний, кальций.',
        'Оценить наличие структурной патологии сердца, врождённого синдрома удлинённого QT в семейном анамнезе.',
        'При симптомах (синкопе, сердцебиение) — ЭКГ-мониторинг, консультация кардиолога.',
      ],
    },
    severe: {
      source: 'AHA/ACCF/HRS Scientific Statement, Circulation 2009',
      points: [
        'Кардиомониторинг/телеметрия, срочная коррекция электролитов (калий обычно до высоконормальных значений, магний в/в).',
        'Отмена всех QT-удлиняющих препаратов.',
        'При развитии torsades de pointes — в/в магния сульфат как терапия первой линии независимо от исходного уровня магния.',
        'Консультация кардиолога/электрофизиолога.',
      ],
    },
  },

  caveats: [
    'Формула Базетта переоценивает QTc при тахикардии и недооценивает при брадикардии — при ЧСС далеко за пределами 60–100/мин ориентируйтесь на значение по Фридеричa (в блоке ниже).',
    'Точность зависит от качества измерения QT (окончание зубца T часто определяется методом касательной); при широком QRS (блокада ножки) корректнее ориентироваться на интервал JT.',
    'Короткий QT (< 340 мс по Базетту) — отдельная, более редкая патология, не отражённая в шкале выше.',
  ],

  examples: [
    {
      note: 'QT 380 мс при ЧСС 60 — RR = 1 с, коррекция ничего не меняет',
      inputs: { sex: 'Мужской', qt: 380, hr: 60 },
      expect: { value: 380, band: 'normal', details: [380] },
    },
    {
      note: 'QT 400 мс при ЧСС 100 — Базетт завышает (516) относительно Фридеричa (474)',
      inputs: { sex: 'Мужской', qt: 400, hr: 100 },
      expect: { value: 516, band: 'severe', details: [474] },
    },
    {
      note: 'QT 440 мс при ЧСС 75 — удлинён у мужчины',
      inputs: { sex: 'Мужской', qt: 440, hr: 75 },
      expect: { value: 492, band: 'prolonged' },
    },
    // Две записи ниже — суть правки: одно и то же значение QTc = 455 мс
    // патологично для мужчины и нормально для женщины.
    {
      note: 'QTc 455 мс у мужчины — выше порога 450, удлинён',
      inputs: { sex: 'Мужской', qt: 455, hr: 60 },
      expect: { value: 455, band: 'prolonged' },
    },
    {
      note: 'QTc 455 мс у женщины — ниже порога 460, норма',
      inputs: { sex: 'Женский', qt: 455, hr: 60 },
      expect: { value: 455, band: 'normal' },
    },
    {
      note: '≥ 500 мс — значительное удлинение независимо от пола',
      inputs: { sex: 'Женский', qt: 510, hr: 60 },
      expect: { value: 510, band: 'severe' },
    },
  ],

  references: [
    'Rautaharju PM, et al. AHA/ACCF/HRS Recommendations for the Standardization and Interpretation of the Electrocardiogram: Part IV. Circulation. 2009;119(10):e241–250.',
    'Vandenberk B, et al. Which QT Correction Formulae to Use for QT Monitoring? J Am Heart Assoc. 2016;5(6):e003264.',
  ],
  updated: '2026-09-04',
  version: 1,
};
