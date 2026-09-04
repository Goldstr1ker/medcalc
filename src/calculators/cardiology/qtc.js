// Корригированный QT: формула Базетта QTc = QT / √RR, доп. — формула Фридерича QTc = QT / RR^(1/3).
// RR (с) = 60 / ЧСС.

export default {
  id: 'qtc',
  name: 'QTc — корригированный интервал QT',
  shortName: 'QTc',
  system: 'Кардиология',
  tags: ['qt', 'qtc', 'базетт', 'фридеричa', 'torsades', 'удлинение qt'],
  description:
    'Коррекция интервала QT на частоту сердечных сокращений (формула Базетта, дополнительно — Фридеричa для крайних значений ЧСС).',

  inputs: [
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
    bands: [
      { id: 'normal', label: 'Норма (≤ 440 мс)', min: 0, color: 'green' },
      { id: 'borderline', label: 'Пограничное удлинение (440–459 мс)', min: 440, color: 'yellow' },
      { id: 'prolonged', label: 'Удлинён (460–499 мс)', min: 460, color: 'orange' },
      {
        id: 'severe',
        label: 'Значительно удлинён (≥ 500 мс)',
        min: 500,
        color: 'red',
        risk: 'высокий риск torsades de pointes',
      },
    ],
  },

  interpretation: {
    normal: 'QTc в пределах нормы.',
    borderline: 'Пограничное удлинение — переоценить с учётом клинического контекста и препаратов, влияющих на QT.',
    prolonged: 'Удлинённый QTc — повышен риск желудочковых аритмий, включая torsades de pointes.',
    severe: 'Выраженно удлинённый QTc (≥ 500 мс) — существенно повышен риск torsades de pointes, особенно при дополнительных факторах риска.',
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
    'Порог патологии на ~10 мс выше у женщин, чем у мужчин — здесь использован единый консервативный порог.',
    'Точность зависит от качества измерения QT (окончание зубца T часто определяется методом касательной); при широком QRS (блокада ножки) корректнее ориентироваться на интервал JT.',
    'Короткий QT (< 340 мс по Базетту) — отдельная, более редкая патология, не отражённая в шкале выше.',
  ],

  references: [
    'Rautaharju PM, et al. AHA/ACCF/HRS Recommendations for the Standardization and Interpretation of the Electrocardiogram: Part IV. Circulation. 2009;119(10):e241–250.',
    'Vandenberk B, et al. Which QT Correction Formulae to Use for QT Monitoring? J Am Heart Assoc. 2016;5(6):e003264.',
  ],
  updated: '2026-09-04',
  version: 1,
};
