// Класс Чайлд-Пью (Child-Pugh): билирубин, альбумин, МНО, асцит, энцефалопатия — по 1-3 балла каждый.

const ASCITES = ['Нет', 'Лёгкий/умеренный (поддаётся диуретикам)', 'Напряжённый (рефрактерный)'];
const ENCEPHALOPATHY = ['Нет', 'I–II степень', 'III–IV степень'];

export default {
  id: 'child-pugh',
  name: 'Класс тяжести цирроза по Чайлд-Пью',
  shortName: 'Чайлд-Пью',
  system: 'Гастроэнтерология',
  tags: ['цирроз', 'печень', 'чайлд', 'пью', 'child-pugh', 'печёночная недостаточность'],
  description:
    'Оценка тяжести цирроза печени и краткосрочного прогноза по пяти клинико-лабораторным параметрам.',

  inputs: [
    {
      id: 'bilirubin',
      label: 'Общий билирубин',
      type: 'number',
      min: 0,
      units: [
        { id: 'umol', label: 'мкмоль/л', factor: 1 },
        { id: 'mgdl', label: 'мг/дл', factor: 17.1 },
      ],
    },
    {
      id: 'albumin',
      label: 'Альбумин сыворотки',
      type: 'number',
      min: 0,
      units: [
        { id: 'gl', label: 'г/л', factor: 1 },
        { id: 'gdl', label: 'г/дл', factor: 10 },
      ],
    },
    { id: 'inr', label: 'МНО', type: 'number', min: 0.5, max: 10 },
    { id: 'ascites', label: 'Асцит', type: 'select', options: ASCITES },
    { id: 'encephalopathy', label: 'Печёночная энцефалопатия', type: 'select', options: ENCEPHALOPATHY },
  ],

  calculate({ bilirubin, albumin, inr, ascites, encephalopathy }) {
    const bilPts = bilirubin < 34 ? 1 : bilirubin <= 50 ? 2 : 3;
    const albPts = albumin > 35 ? 1 : albumin >= 28 ? 2 : 3;
    const inrPts = inr < 1.7 ? 1 : inr <= 2.3 ? 2 : 3;
    const ascitesPts = ASCITES.indexOf(ascites) + 1;
    const encPts = ENCEPHALOPATHY.indexOf(encephalopathy) + 1;

    return {
      value: bilPts + albPts + inrPts + ascitesPts + encPts,
      decimals: 0,
      breakdown: [
        { label: `Билирубин`, points: bilPts },
        { label: `Альбумин`, points: albPts },
        { label: `МНО`, points: inrPts },
        { label: `Асцит: ${ascites}`, points: ascitesPts },
        { label: `Энцефалопатия: ${encephalopathy}`, points: encPts },
      ],
    };
  },

  result: {
    type: 'score',
    max: 15,
    bands: [
      { id: 'A', label: 'Класс A (5–6) — компенсированный', min: 5, color: 'green', risk: '≈100% 1-летняя выживаемость' },
      { id: 'B', label: 'Класс B (7–9) — субкомпенсированный', min: 7, color: 'yellow', risk: '≈80% 1-летняя выживаемость' },
      { id: 'C', label: 'Класс C (10–15) — декомпенсированный', min: 10, color: 'red', risk: '≈45% 1-летняя выживаемость' },
    ],
  },

  interpretation: {
    A: 'Класс А — компенсированный цирроз, наилучший прогноз.',
    B: 'Класс B — значимое нарушение функции печени.',
    C: 'Класс C — декомпенсированный цирроз, наихудший прогноз из трёх классов.',
  },

  guidance: {
    A: {
      source: 'Pugh RN, et al. Br J Surg 1973',
      points: [
        'Стандартное амбулаторное наблюдение, скрининг варикозно расширенных вен пищевода и гепатоцеллюлярной карциномы по протоколу.',
        'Вакцинация против гепатитов A/B при отсутствии иммунитета, отказ от алкоголя, избегать гепатотоксичных препаратов.',
      ],
    },
    B: {
      source: 'Pugh RN, et al. Br J Surg 1973',
      points: [
        'Обследование по программе трансплантации печени.',
        'Активное наблюдение и лечение осложнений: асцит, энцефалопатия, варикозное кровотечение.',
        'Для приоритизации в листе ожидания трансплантации использовать MELD-Na, а не только класс Чайлд-Пью.',
      ],
    },
    C: {
      source: 'Pugh RN, et al. Br J Surg 1973',
      points: [
        'Направление в центр трансплантации печени.',
        'Активная терапия осложнений декомпенсации; многие вмешательства и операции сопряжены с высоким периоперационным риском.',
        'Обсуждение прогноза и, при противопоказаниях к трансплантации, паллиативных аспектов помощи.',
      ],
    },
  },

  caveats: [
    'Оценка асцита и энцефалопатии субъективна — межисследовательская вариабельность выше, чем у лабораторных параметров.',
    'Для приоритизации в листе ожидания трансплантации печени точнее MELD-Na (учитывает функцию почек) — см. отдельный калькулятор.',
    'Исторически создан для прогноза при хирургии по поводу портальной гипертензии, но широко используется как общий индекс тяжести цирроза.',
  ],

  references: [
    'Pugh RN, et al. Transection of the oesophagus for bleeding oesophageal varices. Br J Surg. 1973;60(8):646–649.',
    'Child CG, Turcotte JG. Surgery and portal hypertension. In: The liver and portal hypertension. 1964.',
  ],
  updated: '2026-09-04',
  version: 1,
};
