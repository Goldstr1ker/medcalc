// Тесты правила поиска: транслитерация и ранжирование.
//
// Проверяются как самостоятельные модули (transliterate, buildSearchFields,
// rankBySearch на синтетических данных), так и настоящий каталог — чтобы
// поймать регрессию вида «добавили калькулятор — поиск для старых сломался».

import test from 'node:test';
import assert from 'node:assert/strict';

import { transliterate } from '../src/lib/transliterate.js';
import { buildSearchFields, rankBySearch } from '../src/lib/search.js';

test('транслитерация: базовые буквы и составные звуки', () => {
  assert.equal(transliterate('скф'), 'skf');
  assert.equal(transliterate('сепсис'), 'sepsis');
  assert.equal(transliterate('щука'), 'schuka');
  assert.equal(transliterate('объём'), 'obem'); // ъ схлопывается в пусто, ё -> e
});

test('транслитерация не трогает то, что уже латиница или цифры', () => {
  assert.equal(transliterate('ckd-epi 2021'), 'ckd-epi 2021');
  assert.equal(transliterate('4t'), '4t');
});

test('buildSearchFields: запрос латиницей находит кириллическое название', () => {
  const { primary } = buildSearchFields({
    name: 'СКФ по CKD-EPI (2021)',
    shortName: 'СКФ CKD-EPI',
  });
  // «skf» — это ровно транслитерация «скф», а не отдельно прописанный тег.
  assert.ok(primary.includes('skf'));
});

test('rankBySearch: совпадение в названии ранжируется выше совпадения в описании', () => {
  const items = [
    {
      name: 'Калькулятор Б',
      ...buildSearchFields({
        name: 'Калькулятор Б',
        description: 'упоминает сепсис вскользь, в общем описании',
      }),
    },
    {
      name: 'Оценка сепсиса',
      ...buildSearchFields({ name: 'Оценка сепсиса', description: 'ничего общего' }),
    },
  ];
  const result = rankBySearch(items, 'сепсис');
  assert.equal(result.length, 2, 'оба должны найтись — оба содержат слово');
  assert.equal(result[0].name, 'Оценка сепсиса', 'совпадение в названии должно быть первым');
});

test('rankBySearch: все слова запроса обязательны (логика «И»)', () => {
  const items = [
    { name: 'А', ...buildSearchFields({ name: 'А', tags: ['почки', 'острое'] }) },
    { name: 'Б', ...buildSearchFields({ name: 'Б', tags: ['почки'] }) },
  ];
  const result = rankBySearch(items, 'почки острое');
  assert.deepEqual(result.map((r) => r.name), ['А']);
});

test('rankBySearch: пустой запрос — пустой результат, а не весь каталог', () => {
  const items = [{ name: 'А', ...buildSearchFields({ name: 'А' }) }];
  assert.deepEqual(rankBySearch(items, ''), []);
  assert.deepEqual(rankBySearch(items, '   '), []);
});

test('rankBySearch: при равном весе порядок алфавитный (стабильный, а не порядок вставки)', () => {
  const items = [
    { name: 'Яблоко', ...buildSearchFields({ name: 'Яблоко', tags: ['общее'] }) },
    { name: 'Абрикос', ...buildSearchFields({ name: 'Абрикос', tags: ['общее'] }) },
  ];
  const result = rankBySearch(items, 'общее');
  assert.deepEqual(result.map((r) => r.name), ['Абрикос', 'Яблоко']);
});

// --- проверка на настоящем каталоге ---
//
// Импортируем catalog.generated.js и rankBySearch напрямую, а не
// searchCalculators из registry.js: registry.js использует import.meta.glob
// для тел калькуляторов — это фича сборки Vite, в чистом Node её нет
// (так же обходятся другие тесты в этом проекте, см. calculators.test.mjs).
// Ловит регрессию, если чей-то новый калькулятор случайно перетянет
// на себя ранжирование по общему слову вроде «риск» или «оценка».

import { catalog } from '../src/catalog.generated.js';

test('поиск по реальному каталогу: латиницей находится калькулятор СКФ', () => {
  const results = rankBySearch(catalog, 'skf');
  assert.ok(
    results.some((c) => c.id === 'ckd-epi-2021'),
    'запрос "skf" должен найти СКФ по CKD-EPI через транслитерацию',
  );
});

test('поиск по реальному каталогу: точное название — всегда на первом месте', () => {
  for (const calc of catalog) {
    const results = rankBySearch(catalog, calc.shortName ?? calc.name);
    assert.equal(
      results[0]?.id,
      calc.id,
      `запрос по собственному названию "${calc.name}" должен находить его первым`,
    );
  }
});
