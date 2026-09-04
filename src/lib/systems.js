// Разделы (системы органов) — фиксированный перечень.
//
// Раньше system был свободной строкой: опечатка («Неврология» вместо
// «Нефрология», лишний пробел в конце) молча создавала фантомный раздел.
// Теперь калькулятор обязан выбрать значение отсюда, а валидатор это проверяет.
//
// Перечень намеренно шире, чем текущее наполнение: пустые разделы на главной
// не показываются (registry.js считает их по фактическим калькуляторам),
// зато при добавлении новой шкалы название берётся из готового списка,
// а не придумывается заново.

export const SYSTEMS = {
  CARDIOLOGY: 'Кардиология',
  PULMONOLOGY: 'Пульмонология',
  NEPHROLOGY: 'Нефрология',
  GASTROENTEROLOGY: 'Гастроэнтерология',
  NEUROLOGY: 'Неврология',
  ENDOCRINOLOGY: 'Эндокринология',
  HEMATOLOGY: 'Гематология и гемостаз',
  CRITICAL_CARE: 'Реаниматология',
  OBSTETRICS: 'Акушерство и гинекология',
  PEDIATRICS: 'Педиатрия',
  GENERAL: 'Общее',
};

// Порядок разделов на главной. Клинический, а не алфавитный:
// «Общее» намеренно последним. Чтобы переставить разделы — правьте здесь.
export const SYSTEM_ORDER = [
  SYSTEMS.CARDIOLOGY,
  SYSTEMS.PULMONOLOGY,
  SYSTEMS.NEPHROLOGY,
  SYSTEMS.GASTROENTEROLOGY,
  SYSTEMS.NEUROLOGY,
  SYSTEMS.ENDOCRINOLOGY,
  SYSTEMS.HEMATOLOGY,
  SYSTEMS.CRITICAL_CARE,
  SYSTEMS.OBSTETRICS,
  SYSTEMS.PEDIATRICS,
  SYSTEMS.GENERAL,
];

export const ALL_SYSTEMS = Object.values(SYSTEMS);

// Индекс раздела для сортировки. Неизвестный раздел уходит в конец
// (валидатор такой случай всё равно пометит ошибкой).
export function systemOrderIndex(name) {
  const i = SYSTEM_ORDER.indexOf(name);
  return i === -1 ? SYSTEM_ORDER.length : i;
}
