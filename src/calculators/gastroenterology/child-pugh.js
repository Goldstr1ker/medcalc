// Класс Чайлд-Пью (Child-Pugh): билирубин, альбумин, МНО, асцит, энцефалопатия — по 1-3 балла каждый.

const ASCITES = ['Нет', 'Лёгкий/умеренный (поддаётся диуретикам)', 'Напряжённый (рефрактерный)'];
const ENCEPHALOPATHY = ['Нет', 'I–II степень', 'III–IV степень'];

import { SYSTEMS } from '../../lib/systems.js';
import { ALBUMIN_GL, BILIRUBIN_UMOL } from '../../lib/units.js';

/** @type {import('../../lib/types.js').Calculator} */
export default {
  id: 'child-pugh',
  name: 'Класс тяжести цирроза по Чайлд-Пью',
  shortName: 'Чайлд-Пью',
  system: SYSTEMS.GASTROENTEROLOGY,
  tags: ['цирроз', 'печень', 'чайлд', 'пью', 'child-pugh', 'печёночная недостаточность'],
  description:
    'Оценка тяжести цирроза печени и краткосрочного прогноза по пяти клинико-лабораторным параметрам.',

  inputs: [
    { id: 'bilirubin', label: 'Общий билирубин', type: 'number', min: 0, units: BILIRUBIN_UMOL },
    { id: 'albumin', label: 'Альбумин сыворотки', type: 'number', min: 0, units: ALBUMIN_GL },
    { id: 'inr', label: 'МНО', type: 'number', min: 0.5, max: 10 },
    { id: 'ascites', label: 'Асцит', type: 'select', options: ASCITES },
    { id: 'encephalopathy', label: 'Печёночная энцефалопатия', type: 'select', options: ENCEPHALOPATHY },
  ],

  calculate({ bilirubin, albumin, inr, ascites, encephalopathy }) {
    // Пороги оригинала (Pugh, 1973) заданы в мг/дл: < 2 / 2–3 / > 3.
    // В СИ это 34,2 и 51,3 мкмоль/л (коэффициент 17,1 мкмоль/л на 1 мг/дл).
    const bilPts = bilirubin < 34.2 ? 1 : bilirubin <= 51.3 ? 2 : 3;
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

  examples: [
    {
      note: 'Все параметры в норме — минимально возможные 5 баллов, класс A',
      inputs: { bilirubin: 20, albumin: 40, inr: 1.2 },
      expect: { value: 5, band: 'A' },
    },
    {
      note: 'Средние значения по всем пяти параметрам (по 2 балла) + асцит — класс B',
      inputs: {
        bilirubin: 40,
        albumin: 30,
        inr: 1.8,
        ascites: 'Лёгкий/умеренный (поддаётся диуретикам)',
      },
      expect: { value: 9, band: 'B' },
    },
    {
      note: 'Всё по 3 балла — максимум 15, класс C',
      inputs: {
        bilirubin: 60,
        albumin: 25,
        inr: 2.5,
        ascites: 'Напряжённый (рефрактерный)',
        encephalopathy: 'III–IV степень',
      },
      expect: { value: 15, band: 'C' },
    },
    {
      note: 'Билирубин 51 мкмоль/л (≈ 2,98 мг/дл) — ещё 2 балла за билирубин, не 3',
      inputs: { bilirubin: 51, albumin: 40, inr: 1.2 },
      expect: { value: 6, band: 'A' },
    },
    {
      note: 'Билирубин 52 мкмоль/л (> 3 мг/дл) — уже 3 балла за билирубин',
      inputs: { bilirubin: 52, albumin: 40, inr: 1.2 },
      expect: { value: 7, band: 'B' },
    },
  ],

  references: [
    'Pugh RN, et al. Transection of the oesophagus for bleeding oesophageal varices. Br J Surg. 1973;60(8):646–649.',
    'Child CG, Turcotte JG. Surgery and portal hypertension. In: The liver and portal hypertension. 1964.',
  ],
  updated: '2026-09-06',
  version: 1,
};
