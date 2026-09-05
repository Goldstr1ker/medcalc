import { useCallback, useEffect, useState } from 'react';
import { calculators, getBySystem, getCalculatorMeta, loadCalculator } from './registry.js';
import { acceptDisclaimer, isDisclaimerAccepted } from './lib/storage.js';
import Home, { CalcList } from './components/Home.jsx';
import CalculatorView from './components/CalculatorView.jsx';
import Disclaimer from './components/Disclaimer.jsx';
import InstallBanner from './components/InstallBanner.jsx';

// Простейший роутер на hash: #/  #/system/<раздел>  #/calc/<id>
function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'calc' && parts[1]) return { name: 'calc', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'system' && parts[1]) return { name: 'system', system: decodeURIComponent(parts[1]) };
  if (parts[0] === 'all') return { name: 'all' };
  return { name: 'home' };
}

function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const [accepted, setAccepted] = useState(() => isDisclaimerAccepted());

  const go = useCallback((hash) => {
    window.location.hash = hash;
  }, []);

  if (!accepted) {
    return (
      <Disclaimer
        onAccept={() => {
          acceptDisclaimer();
          setAccepted(true);
        }}
      />
    );
  }

  return (
    <div className="app">
      {route.name === 'home' && (
        <Home
          onOpen={(id) => go(`#/calc/${id}`)}
          onOpenSystem={(system) => go(`#/system/${encodeURIComponent(system)}`)}
          onOpenAll={() => go('#/all')}
        />
      )}

      {route.name === 'system' && (
        <SystemView
          system={route.system}
          onOpen={(id) => go(`#/calc/${id}`)}
          onBack={() => go('#/')}
        />
      )}

      {route.name === 'all' && (
        <ListPage
          title="Все калькуляторы"
          items={calculators}
          onOpen={(id) => go(`#/calc/${id}`)}
          onBack={() => go('#/')}
        />
      )}

      {route.name === 'calc' && <CalcRoute id={route.id} onBack={() => go('#/')} />}

      <InstallBanner />
    </div>
  );
}

function ListPage({ title, items, onOpen, onBack }) {
  return (
    <div className="home">
      <button className="link-back" onClick={onBack}>← На главную</button>
      <h1 className="section-title section-title--lg">{title}</h1>
      <CalcList items={items} onOpen={onOpen} />
    </div>
  );
}

function SystemView({ system, onOpen, onBack }) {
  return <ListPage title={system} items={getBySystem(system)} onOpen={onOpen} onBack={onBack} />;
}

// Тело калькулятора грузится отдельным чанком, поэтому маршрут асинхронный.
// Заголовок и раздел берутся из индекса и рисуются сразу — так переход
// не выглядит как пустой экран с надписью «Загрузка», даже если чанк
// действительно нужно скачать.
function CalcRoute({ id, onBack }) {
  const [calc, setCalc] = useState(null);
  const [status, setStatus] = useState('loading');
  const meta = getCalculatorMeta(id);

  useEffect(() => {
    let alive = true;
    setCalc(null);
    setStatus('loading');

    loadCalculator(id).then(
      (loaded) => {
        if (!alive) return;
        if (loaded) {
          setCalc(loaded);
          setStatus('ready');
        } else {
          setStatus('missing');
        }
      },
      () => {
        if (alive) setStatus('error');
      },
    );

    return () => {
      alive = false;
    };
  }, [id]);

  if (status === 'ready' && calc) return <CalculatorView calc={calc} onBack={onBack} />;

  return (
    <div className="calc">
      <button className="link-back" onClick={onBack}>← На главную</button>

      {meta ? (
        <header className="calc__head">
          <div>
            <div className="calc__system">{meta.system}</div>
            <h1 className="calc__title">{meta.name}</h1>
          </div>
        </header>
      ) : null}

      {status === 'loading' ? (
        <div className="result result--empty">Загрузка…</div>
      ) : status === 'error' ? (
        <div className="result result--error">
          Не удалось загрузить калькулятор. Проверьте соединение и обновите страницу.
        </div>
      ) : (
        <p className="muted">Калькулятор не найден.</p>
      )}
    </div>
  );
}
