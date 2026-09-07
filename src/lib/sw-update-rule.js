// Правило периодической проверки обновления. Отдельный файл (а не место в
// sw-update.js) — чтобы тест не тянул virtual:pwa-register, которого вне сборки
// Vite не существует.

/**
 * Нужно ли сейчас дёргать registration.update().
 * - офлайн — запрос всё равно не уйдёт, только шумит в консоли;
 * - пока предыдущий апдейт ещё ставится — повторная проверка мешает.
 */
export function shouldCheckForUpdate({ online, installing }) {
  return online && !installing;
}
