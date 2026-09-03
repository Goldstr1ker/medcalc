// Локальное хранилище: избранное, недавние, флаг принятого дисклеймера.
// Всё в localStorage, ничего не уходит на сервер. Любое обращение обёрнуто в try/catch —
// приватный режим браузера может кидать исключения.

const FAV = 'medcalc.favorites';
const REC = 'medcalc.recents';
const DISCLAIMER = 'medcalc.disclaimerAccepted';
const RECENTS_LIMIT = 8;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим — молча пропускаем */
  }
}

export function getFavorites() {
  const list = read(FAV, []);
  return Array.isArray(list) ? list : [];
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

export function toggleFavorite(id) {
  const list = getFavorites();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  write(FAV, next);
  return next;
}

export function getRecents() {
  const list = read(REC, []);
  return Array.isArray(list) ? list : [];
}

export function pushRecent(id) {
  const next = [id, ...getRecents().filter((x) => x !== id)].slice(0, RECENTS_LIMIT);
  write(REC, next);
  return next;
}

export function isDisclaimerAccepted() {
  return read(DISCLAIMER, false) === true;
}

export function acceptDisclaimer() {
  write(DISCLAIMER, true);
}
