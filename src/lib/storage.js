// Локальное хранилище: избранное, недавние, флаг принятого дисклеймера.
// Всё в localStorage, ничего не уходит на сервер. Любое обращение обёрнуто в try/catch —
// приватный режим браузера может кидать исключения.

const FAV = 'medcalc.favorites';
const REC = 'medcalc.recents';
const DISCLAIMER = 'medcalc.disclaimerAccepted';
const INSTALL_SNOOZE = 'medcalc.installSnoozedUntil';
const RECENTS_LIMIT = 8;
const INSTALL_SNOOZE_DAYS = 30;

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

// Баннер установки закрывается не навсегда, а откладывается: раньше стоял
// вечный флаг, и закрывший его один раз больше никогда не видел предложения.
export function snoozeInstallBanner() {
  write(INSTALL_SNOOZE, Date.now() + INSTALL_SNOOZE_DAYS * 24 * 60 * 60 * 1000);
}

export function isInstallBannerSnoozed() {
  const until = read(INSTALL_SNOOZE, 0);
  return typeof until === 'number' && Date.now() < until;
}

/** Сколько разных калькуляторов человек уже открывал — триггер для баннера. */
export function distinctCalculatorsOpened() {
  return getRecents().length;
}
