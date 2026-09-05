// Ранжированный поиск по калькуляторам.
//
// Общий модуль для генератора индекса (build-index.mjs) и рантайма
// (registry.js) — правило поиска существует ровно в одном месте, а не
// продублировано между тем, что считается при сборке, и тем, что фильтрует
// на экране.
//
// Масштабируемость: buildSearchFields() вызывается один раз на калькулятор
// при генерации индекса и не трогает данные других калькуляторов — добавление
// новой шкалы не требует правки этого файла и не пересчитывает существующие
// записи. rankBySearch() на каждый вызов проходит по каталогу один раз
// (без вложенных проходов), поэтому запрос остаётся дешёвым и при разрастании
// списка на порядок.

import { transliterate } from './transliterate.js';

/**
 * Строит два уровня текста для поиска по одному калькулятору:
 *   primary   — название и короткое имя (совпадение здесь весит больше);
 *   secondary — раздел, описание, теги.
 *
 * Транслитерация здесь НЕ подмешивается: раньше в индекс писалась склейка
 * «текст + его транслитерация», и это ровно удваивало вес индекса — а он
 * грузится целиком при старте и растёт линейно с числом калькуляторов.
 * Теперь латинская форма считается в рантайме и кешируется (см. translitOf).
 */
export function buildSearchFields({ name, shortName, system, description, tags }) {
  return {
    primary: [name, shortName].filter(Boolean).join(' ').toLowerCase(),
    secondary: [system, description, ...(tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

const WEIGHT_NAME_WORD = 10; // термин совпал с началом названия или отдельным словом в нём
const WEIGHT_NAME_SUBSTRING = 6; // термин — часть слова в названии
const WEIGHT_SECONDARY = 2; // термин нашёлся только в разделе/описании/тегах

// Латинская форма полей поиска. Считается лениво, один раз на запись каталога,
// и живёт ровно столько же, сколько сама запись (WeakMap не держит её в памяти
// после того, как каталог стал не нужен). Первый поиск за сеанс делает один
// проход по каталогу, дальше — только сравнение строк.
const translitCache = new WeakMap();

function translitOf(entry) {
  let cached = translitCache.get(entry);
  if (!cached) {
    cached = {
      primary: transliterate(entry.primary),
      secondary: transliterate(entry.secondary),
    };
    translitCache.set(entry, cached);
  }
  return cached;
}

function isWordMatch(text, term) {
  return text === term || text.startsWith(`${term} `) || text.includes(` ${term}`);
}

/**
 * Вес одного слова запроса для одного калькулятора. null — слово не найдено вовсе.
 * Каждый уровень проверяется и по исходному тексту, и по его транслитерации,
 * чтобы «skf» находил «СКФ». Латиница транслитерацию проходит без изменений,
 * поэтому запросы вроде «ckd-epi» работают в обеих ветках одинаково.
 */
function scoreTerm(entry, term) {
  const latin = translitOf(entry);

  if (isWordMatch(entry.primary, term) || isWordMatch(latin.primary, term)) {
    return WEIGHT_NAME_WORD;
  }
  if (entry.primary.includes(term) || latin.primary.includes(term)) {
    return WEIGHT_NAME_SUBSTRING;
  }
  if (entry.secondary.includes(term) || latin.secondary.includes(term)) {
    return WEIGHT_SECONDARY;
  }
  return null;
}

/**
 * Отбирает и ранжирует калькуляторы по запросу.
 * Каждое слово запроса должно найтись хотя бы где-то — иначе калькулятор
 * исключается (логика «И», как и раньше). Порядок — по сумме весов: чем ближе
 * совпадение к названию, тем выше калькулятор в списке.
 */
export function rankBySearch(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const item of items) {
    let total = 0;
    let matchedAll = true;
    for (const term of terms) {
      const s = scoreTerm(item, term);
      if (s === null) {
        matchedAll = false;
        break;
      }
      total += s;
    }
    if (matchedAll) scored.push({ item, total });
  }

  scored.sort((a, b) => b.total - a.total || a.item.name.localeCompare(b.item.name, 'ru'));
  return scored.map((s) => s.item);
}
