// Реестр калькуляторов.
//
// Разделён на две части:
//   1. catalog — лёгкий индекс метаданных, генерируется скриптом и грузится сразу.
//      Из него живут главная, разделы и поиск.
//   2. loaders — тела калькуляторов, каждое отдельным чанком, грузятся по требованию.
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

const loaders = import.meta.glob('./calculators/**/*.js');

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

// Ранжированный поиск: совпадение в названии весит больше, чем в описании/тегах,
// и запрос латиницей («skf») находит кириллические названия («СКФ») благодаря
// транслитерации, вшитой в индекс при сборке (см. lib/search.js). Сами поля
// поиска предвычислены генератором — здесь на каждое нажатие клавиши идёт
// только сравнение строк, без пересборки текста.
export function searchCalculators(query) {
  return rankBySearch(catalog, query);
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
