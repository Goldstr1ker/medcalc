// Валидатор схемы калькуляторов.
//
// Зачем: в этом приложении поломка схемы ТИХАЯ. Опечатка в ключе
// (guidance: { hgih: … } вместо high) не роняет сборку и не пишет в консоль —
// просто блок «По клиническим рекомендациям» не отрисуется, и пользователь
// об этом не узнает. Для медицинского инструмента это недопустимо.
//
// Запуск: npm run validate (и автоматически перед каждой сборкой).

import { loadCalculators } from './lib/load-calculators.mjs';
import { ALL_SYSTEMS } from '../src/lib/systems.js';
import { resolveBands } from '../src/lib/bands.js';
import { initialUnits, initialValues, toCanonical } from '../src/lib/compute.js';

const errors = [];
const notes = [];

const err = (file, msg) => errors.push({ file, msg });
const note = (file, msg) => notes.push({ file, msg });

const REQUIRED = ['id', 'name', 'system', 'description', 'calculate', 'result', 'updated', 'version'];
const INPUT_TYPES = new Set(['number', 'select', 'boolean']);
const RESULT_TYPES = new Set(['gauge', 'score', 'value']);
const COLORS = new Set(['green', 'lime', 'yellow', 'orange', 'red', 'darkred', 'slate']);

// Допустимые ключи в том, что возвращает calculate(). Должны совпадать
// с CalcResult / DetailRow / BreakdownRow в src/lib/types.d.ts.
const RESULT_KEYS = new Set(['value', 'unit', 'decimals', 'breakdown', 'details']);
const DETAIL_KEYS = new Set(['label', 'value', 'unit', 'decimals', 'color']);
const BREAKDOWN_KEYS = new Set(['label', 'points']);

const loaded = await loadCalculators();
const seenIds = new Map();

for (const { file, calc } of loaded) {
  if (!calc) {
    err(file, 'файл не экспортирует калькулятор через export default');
    continue;
  }

  // --- обязательные поля ---
  for (const field of REQUIRED) {
    if (calc[field] === undefined || calc[field] === null || calc[field] === '') {
      err(file, `нет обязательного поля "${field}"`);
    }
  }
  if (typeof calc.calculate !== 'function') err(file, 'calculate должен быть функцией');
  if (!calc.references?.length) err(file, 'нет списка источников (references)');
  if (!Array.isArray(calc.inputs) || calc.inputs.length === 0) err(file, 'нет полей ввода (inputs)');

  // --- уникальность id ---
  if (seenIds.has(calc.id)) {
    err(file, `id "${calc.id}" уже занят файлом ${seenIds.get(calc.id)}`);
  } else {
    seenIds.set(calc.id, file);
  }

  // --- раздел из фиксированного перечня ---
  if (calc.system && !ALL_SYSTEMS.includes(calc.system)) {
    err(file, `раздел "${calc.system}" отсутствует в src/lib/systems.js`);
  }

  // --- поля ввода ---
  const inputIds = new Set();
  for (const input of calc.inputs || []) {
    const where = `input "${input.id ?? '(без id)'}"`;
    if (!input.id) err(file, `${where}: нет id`);
    if (!input.label) err(file, `${where}: нет label`);
    if (inputIds.has(input.id)) err(file, `${where}: дублируется id поля`);
    inputIds.add(input.id);

    const type = input.type ?? 'number';
    if (!INPUT_TYPES.has(type)) err(file, `${where}: неизвестный type "${type}"`);
    if (type === 'select' && !input.options?.length) err(file, `${where}: select без options`);
    if (type !== 'number' && input.units) err(file, `${where}: units имеют смысл только у number`);

    for (const u of input.units || []) {
      if (!u.id || !u.label) err(file, `${where}: единица без id/label`);
      if (typeof u.factor !== 'number' || !Number.isFinite(u.factor)) {
        err(file, `${where}: единица "${u.id}" без числового factor`);
      }
    }
    if (input.units?.length === 1) {
      note(file, `${where}: список units из одного элемента — проще задать unit строкой`);
    }
    if (input.group !== undefined && (typeof input.group !== 'string' || !input.group.trim())) {
      err(file, `${where}: group должен быть непустой строкой`);
    }
  }

  // Поля одной группы должны идти подряд: рендер разбивает список по сменам
  // группы, поэтому разорванная группа даст два одинаковых заголовка.
  const groupRuns = [];
  for (const input of calc.inputs ?? []) {
    const g = input.group ?? null;
    if (groupRuns[groupRuns.length - 1] !== g) groupRuns.push(g);
  }
  const repeated = groupRuns.filter((g, i) => g && groupRuns.indexOf(g) !== i);
  if (repeated.length) {
    err(file, `группы полей идут вразбивку: ${[...new Set(repeated)].join(', ')} — соберите поля каждой группы подряд`);
  }

  // --- диапазоны результата ---
  //
  // bands может быть функцией от введённых значений (пороги, зависящие от пола
  // и т.п.). Статически такой набор не проверить, поэтому вычисляем его на
  // входных данных из examples и объединяем все полученные диапазоны.
  // Побочный эффект полезный: чтобы диапазон вообще проверялся, автор обязан
  // покрыть примером ветку, в которой этот диапазон возникает.
  const dynamicBands = typeof calc.result?.bands === 'function';
  let bands = [];
  const bandIds = new Set();

  if (dynamicBands) {
    for (const [i, ex] of (calc.examples ?? []).entries()) {
      try {
        const values = { ...initialValues(calc.inputs), ...(ex.inputs ?? {}) };
        const unitChoice = { ...initialUnits(calc.inputs), ...(ex.units ?? {}) };
        const produced = resolveBands(calc.result, toCanonical(calc.inputs, values, unitChoice));
        if (!produced?.length) {
          err(file, `examples[${i}]: result.bands вернул пустой набор диапазонов`);
          continue;
        }
        for (const b of produced) {
          if (!bands.some((x) => x.id === b.id)) bands.push(b);
        }
      } catch (e) {
        err(file, `examples[${i}]: result.bands упал с ошибкой: ${e.message}`);
      }
    }
  } else {
    bands = calc.result?.bands ?? [];
  }

  if (!bands.length) err(file, 'result.bands пуст — результат не с чем сопоставить');
  if (calc.result?.type && !RESULT_TYPES.has(calc.result.type)) {
    err(file, `неизвестный result.type "${calc.result.type}"`);
  }
  if (calc.result?.type === 'gauge') {
    if (typeof calc.result.min !== 'number' || typeof calc.result.max !== 'number') {
      err(file, 'для result.type "gauge" нужны числовые min и max');
    }
  }

  const seenMin = new Set();
  for (const b of bands) {
    if (!b.id) err(file, 'диапазон без id');
    if (bandIds.has(b.id)) err(file, `диапазон "${b.id}": дублируется id`);
    bandIds.add(b.id);
    if (!b.label) err(file, `диапазон "${b.id}": нет label`);
    if (typeof b.min !== 'number' || !Number.isFinite(b.min)) {
      err(file, `диапазон "${b.id}": min должен быть конечным числом`);
    }
    // У динамических диапазонов набор собран из разных примеров, поэтому
    // совпадение границ между ветками — норма, а не ошибка.
    if (!dynamicBands) {
      if (seenMin.has(b.min)) {
        err(file, `диапазон "${b.id}": min=${b.min} уже занят другим диапазоном`);
      }
      seenMin.add(b.min);
    }
    if (b.color && !COLORS.has(b.color)) err(file, `диапазон "${b.id}": неизвестный цвет "${b.color}"`);
  }

  // Нижний диапазон должен покрывать всё снизу, иначе значение может
  // не попасть никуда и пользователь увидит «результат вне диапазонов».
  if (bands.length && Math.min(...bands.map((b) => b.min)) > 0 && calc.result?.type !== 'score') {
    note(file, `самый нижний диапазон начинается с ${Math.min(...bands.map((b) => b.min))}, а не с 0 — проверьте, что меньшие значения невозможны`);
  }

  // --- ключи текстов должны совпадать с id диапазонов ---
  // Лишний ключ — почти наверняка опечатка, это ошибка.
  // Отсутствующий guidance часто бывает намеренным, это лишь замечание.
  for (const key of Object.keys(calc.interpretation ?? {})) {
    if (!bandIds.has(key)) err(file, `interpretation["${key}"] не соответствует ни одному диапазону`);
  }
  for (const key of Object.keys(calc.guidance ?? {})) {
    if (!bandIds.has(key)) err(file, `guidance["${key}"] не соответствует ни одному диапазону`);
  }
  for (const b of bandIds) {
    if (!calc.interpretation?.[b]) err(file, `диапазон "${b}" без interpretation`);
  }
  const noGuidance = [...bandIds].filter((b) => !calc.guidance?.[b]);
  if (noGuidance.length) note(file, `без guidance: ${noGuidance.join(', ')}`);

  for (const [key, g] of Object.entries(calc.guidance ?? {})) {
    if (!g.source) err(file, `guidance["${key}"]: не указан source`);
    if (!g.points?.length) err(file, `guidance["${key}"]: пустой points`);
  }

  // --- примеры для тестов ---
  if (!calc.examples?.length) {
    err(file, 'нет examples — без них формула ничем не защищена от регрессий');
  }
  for (const [i, ex] of (calc.examples ?? []).entries()) {
    const where = `examples[${i}]`;
    if (!ex.inputs || typeof ex.inputs !== 'object') err(file, `${where}: нет объекта inputs`);
    if (!ex.expect) err(file, `${where}: нет expect`);
    else if (ex.expect.value === undefined && ex.expect.band === undefined) {
      err(file, `${where}: expect должен задавать value и/или band`);
    }
    if (ex.expect?.band && !bandIds.has(ex.expect.band)) {
      err(file, `${where}: ожидаемый диапазон "${ex.expect.band}" не существует`);
    }
    for (const key of Object.keys(ex.inputs ?? {})) {
      if (!inputIds.has(key)) err(file, `${where}: поле "${key}" отсутствует в inputs калькулятора`);
    }
    for (const key of Object.keys(ex.units ?? {})) {
      const input = calc.inputs?.find((x) => x.id === key);
      if (!input) err(file, `${where}: units["${key}"] — нет такого поля`);
      else if (!input.units?.some((u) => u.id === ex.units[key])) {
        err(file, `${where}: у поля "${key}" нет единицы "${ex.units[key]}"`);
      }
    }

    // Форма details проверяется здесь, а не в тестах: тесты сверяют числа,
    // валидатор — что структура пригодна для отрисовки (цвет из палитры и т.п.).
    try {
      const values = { ...initialValues(calc.inputs), ...(ex.inputs ?? {}) };
      const unitChoice = { ...initialUnits(calc.inputs), ...(ex.units ?? {}) };
      const produced = calc.calculate(toCanonical(calc.inputs, values, unitChoice));

      // Лишние ключи в возврате calculate() — это почти всегда опечатка
      // (`decimal` вместо `decimals`), и она ТИХАЯ: значение просто покажется
      // с округлением по умолчанию. Типы такое не ловят: TS не проверяет
      // лишние поля в return метода, типизированного контекстно, — поэтому
      // проверка здесь.
      for (const key of Object.keys(produced ?? {})) {
        if (!RESULT_KEYS.has(key)) {
          err(file, `${where}: calculate() вернул неизвестное поле "${key}" — опечатка?`);
        }
      }
      for (const [j, d] of (produced?.details ?? []).entries()) {
        if (!d.label) err(file, `${where}: details[${j}] без label`);
        if (!Number.isFinite(d.value)) err(file, `${where}: details[${j}] value не число`);
        if (d.color && !COLORS.has(d.color)) {
          err(file, `${where}: details[${j}] неизвестный цвет "${d.color}"`);
        }
        for (const key of Object.keys(d)) {
          if (!DETAIL_KEYS.has(key)) {
            err(file, `${where}: details[${j}] — неизвестное поле "${key}"`);
          }
        }
      }
      for (const [j, row] of (produced?.breakdown ?? []).entries()) {
        if (!row.label) err(file, `${where}: breakdown[${j}] без label`);
        if (!Number.isFinite(row.points)) {
          err(file, `${where}: breakdown[${j}] points не число`);
        }
        for (const key of Object.keys(row)) {
          if (!BREAKDOWN_KEYS.has(key)) {
            err(file, `${where}: breakdown[${j}] — неизвестное поле "${key}"`);
          }
        }
      }
    } catch (e) {
      err(file, `${where}: calculate() упал с ошибкой: ${e.message}`);
    }
  }

  // --- дата обновления ---
  if (calc.updated && !/^\d{4}-\d{2}-\d{2}$/.test(calc.updated)) {
    err(file, `updated "${calc.updated}" — ожидается формат ГГГГ-ММ-ДД`);
  }
}

// ---------- вывод ----------

console.log(`Проверено калькуляторов: ${loaded.length}`);

if (notes.length) {
  console.log(`\nЗамечания (${notes.length}) — могут быть намеренными:`);
  for (const { file, msg } of notes) console.log(`  · ${file}: ${msg}`);
}

if (errors.length) {
  console.log(`\nОШИБКИ (${errors.length}):`);
  for (const { file, msg } of errors) console.log(`  ✗ ${file}: ${msg}`);
  console.log('\nСборка остановлена.');
  process.exit(1);
}

console.log('\nСхема в порядке.');
