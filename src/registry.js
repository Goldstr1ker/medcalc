// Реестр калькуляторов. Три уровня загрузки:
//
//   1. catalog — метаданные (id, path, name, system), грузятся сразу.
//      Из них живут главная, разделы, крошки и выбор чанка для загрузки тела.
//   2. search-index — строки для поиска, грузятся лениво при открытии поиска
//      (см. loadSearchIndex). Это ⅔ веса прежнего индекса, а поиском
//      пользуются не в каждом сеансе.
//   3. loaders — тела калькуляторов, каждый отдельным чанком по требованию.
//
// import.meta.glob БЕЗ eager возвращает не модули, а функции-загрузчики, поэтому
// Vite нарезает каждый калькулятор в свой чанк. Офлайн от этого не страдает:
// Workbox всё равно кладёт все чанки в precache, и загрузка идёт из кеша.
//
// Побочный, но важный выигрыш: правка одного калькулятора меняет хеш только
// его чанка. Раньше менялся хеш всего бандла, и у офлайн-пользователей
// service worker перекачивал всё целиком.

import { catalog } from './catalog.generated.js';
import { systemOrderIndex } from './lib/systems.js';
import { rankBySearch } from './lib/search.js';

// Префикс `_` — общие хелперы (напр. ./calculators/_shared/scores.js),
// они не экспортируют калькулятор. Та же оговорка — в walk() внутри
// scripts/lib/load-calculators.mjs, обе должны совпадать.
const loaders = import.meta.glob([
  './calculators/**/*.js',
  '!./calculators/**/_*',
  '!./calculators/**/_*/**',
]);

/** Метаданные всех калькуляторов (без тел). Отсортированы по названию. */
export const calculators = catalog;

const byId = new Map(catalog.map((c) => [c.id, c]));

/** Метаданные по id — без загрузки тела. Доступны мгновенно. */
export function getCalculatorMeta(id) {
  return byId.get(id) ?? null;
}

// Разделы (системы органов) с числом калькуляторов в каждом.
// Порядок — клинический, из lib/systems.js. Пустые разделы сюда не попадают.
const counts = new Map();
for (const c of catalog) counts.set(c.system, (counts.get(c.system) ?? 0) + 1);

export const systems = [...counts.keys()]
  .sort((a, b) => systemOrderIndex(a) - systemOrderIndex(b))
  .map((name) => ({ name, count: counts.get(name) }));

export function getBySystem(system) {
  return catalog.filter((c) => c.system === system);
}

// --- поиск (ленивый индекс) ---
//
// Строки для поиска вынесены в отдельный чанк search-index.generated.js.
// Он подтягивается при монтировании экрана поиска (Home вызывает
// loadSearchIndex), а не при старте приложения. До загрузки searchCalculators
// возвращает пустой список, экран показывает «Загрузка поиска…» — на практике
// чанк берётся из precache мгновенно.

/** @type {Array<{id:string,name:string,system:string,primary:string,secondary:string}> | null} */
let searchEntries = null;
let searchPromise = null;

export function loadSearchIndex() {
  if (!searchPromise) {
    searchPromise = import('./search-index.generated.js').then((mod) => {
      searchEntries = mod.searchIndex.map((s) => {
        const meta = byId.get(s.id);
        return { id: s.id, name: meta.name, system: meta.system, primary: s.primary, secondary: s.secondary };
      });
      return searchEntries;
    });
  }
  return searchPromise;
}

export function isSearchIndexReady() {
  return searchEntries !== null;
}

// Ранжированный поиск: совпадение в названии весит больше, чем в описании/тегах,
// и запрос латиницей («skf») находит кириллические названия («СКФ») благодаря
// транслитерации в рантайме (см. lib/search.js). На каждое нажатие клавиши —
// только сравнение строк по уже загруженному индексу.
export function searchCalculators(query) {
  return searchEntries ? rankBySearch(searchEntries, query) : [];
}

// --- загрузка тел ---

// Кешируем промис, а не результат: если по одному калькулятору прилетело
// два запроса подряд, загрузка всё равно будет одна.
const cache = new Map();

/** Загружает тело калькулятора. Возвращает объект калькулятора или null. */
export function loadCalculator(id) {
  const meta = byId.get(id);
  if (!meta) return Promise.resolve(null);
  if (cache.has(id)) return cache.get(id);

  const loader = loaders[meta.path];
  if (!loader) {
    return Promise.reject(new Error(`нет загрузчика для ${meta.path}`));
  }

  const promise = loader().then((mod) => mod.default);
  // Неудачную загрузку (обрыв сети) не запоминаем — иначе повтор был бы
  // невозможен до перезагрузки страницы.
  promise.catch(() => cache.delete(id));
  cache.set(id, promise);
  return promise;
}

/**
 * Заранее подтянуть чанк — вызывается при наведении/касании пункта списка.
 * К моменту нажатия калькулятор обычно уже загружен.
 */
export function prefetchCalculator(id) {
  loadCalculator(id).catch(() => {});
}
