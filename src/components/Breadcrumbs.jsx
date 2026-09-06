// Хлебные крошки на странице калькулятора.
//
// Раньше здесь была единственная кнопка «← Все калькуляторы», ведущая на
// главную. Из-за этого путь «раздел → калькулятор» был односторонним:
// открыв CURB-65 из пульмонологии, вернуться в пульмонологию было нельзя —
// только на главную и оттуда заново в раздел.
//
// Раздел берётся из самого калькулятора (calc.system), а не из истории
// переходов: принадлежность к разделу — свойство калькулятора, поэтому
// ссылка работает одинаково, откуда бы человек ни пришёл — из раздела,
// из поиска, из избранного или по прямой ссылке.
export default function Breadcrumbs({ system, onHome, onAll, onSystem }) {
  return (
    <nav className="crumbs" aria-label="Навигация по разделам">
      <button className="crumbs__link" onClick={onHome}>
        Главная
      </button>
      <span className="crumbs__sep" aria-hidden="true">
        ›
      </span>
      <button className="crumbs__link" onClick={onAll}>
        Все калькуляторы
      </button>
      {system ? (
        <>
          <span className="crumbs__sep" aria-hidden="true">
            ›
          </span>
          <button className="crumbs__link" onClick={() => onSystem(system)}>
            {system}
          </button>
        </>
      ) : null}
    </nav>
  );
}
