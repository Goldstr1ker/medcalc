import { useEffect, useMemo, useState } from 'react';
import {
  calculators,
  getCalculatorMeta,
  prefetchCalculator,
  searchCalculators,
  systems,
} from '../registry.js';
import { getFavorites, getRecents } from '../lib/storage.js';
import InstallSection from './InstallSection.jsx';

export default function Home({ onOpen, onOpenSystem, onOpenAll }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCalculators(query), [query]);

  // Автофокус поиска — только там, где есть мышь. На телефоне он при каждом
  // заходе на главную поднимает клавиатуру поверх избранного и разделов.
  const [autoFocusSearch] = useState(() => window.matchMedia?.('(pointer: fine)').matches ?? false);

  // Раньше localStorage читался прямо в теле рендера — то есть на каждый
  // повторный рендер, да ещё с линейным поиском по массиву на каждый id.
  const [favorites, setFavorites] = useState([]);
  const [recents, setRecents] = useState([]);
  useEffect(() => {
    setFavorites(getFavorites().map(getCalculatorMeta).filter(Boolean));
    setRecents(getRecents().map(getCalculatorMeta).filter(Boolean));
  }, []);

  return (
    <div className="home">
      <header className="home__head">
        <h1>МедКалк</h1>
        <p>Калькуляторы и шкалы с разбором по клиническим рекомендациям. Работает офлайн.</p>
      </header>

      <input
        className="search"
        type="search"
        placeholder="Поиск: СКФ, инсульт, сепсис…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocusSearch}
      />

      {query ? (
        <section>
          <h2 className="section-title">Найдено: {results.length}</h2>
          <CalcList items={results} onOpen={onOpen} />
        </section>
      ) : (
        <>
          {favorites.length > 0 && (
            <section>
              <h2 className="section-title">Избранное</h2>
              <CalcList items={favorites} onOpen={onOpen} />
            </section>
          )}

          {recents.length > 0 && (
            <section>
              <h2 className="section-title">Недавние</h2>
              <CalcList items={recents} onOpen={onOpen} />
            </section>
          )}

          <section>
            <h2 className="section-title">Разделы</h2>
            <div className="systems">
              {systems.map((s) => (
                <button key={s.name} className="system-card" onClick={() => onOpenSystem(s.name)}>
                  <span className="system-card__name">{s.name}</span>
                  <span className="system-card__count">{s.count}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Полный список вынесен на отдельный экран: на главной он не нужен,
              а при полутора сотнях калькуляторов только замедлял бы её отрисовку. */}
          <section>
            <button className="all-link" onClick={onOpenAll}>
              <span>Все калькуляторы</span>
              <span className="all-link__count">{calculators.length}</span>
            </button>
          </section>

          <InstallSection />
        </>
      )}
    </div>
  );
}

export function CalcList({ items, onOpen }) {
  if (!items.length) return <p className="muted">Ничего не найдено.</p>;
  return (
    <ul className="calc-list">
      {items.map((c) => (
        <li key={c.id}>
          <button
            className="calc-list__item"
            onClick={() => onOpen(c.id)}
            // Подтягиваем чанк заранее: к моменту нажатия калькулятор
            // обычно уже загружен, и переход выглядит мгновенным.
            onPointerEnter={() => prefetchCalculator(c.id)}
            onTouchStart={() => prefetchCalculator(c.id)}
          >
            <span className="calc-list__name">{c.name}</span>
            <span className="calc-list__system">{c.system}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
