import { useCallback, useEffect, useState } from 'react';
import { getCalculator, getBySystem } from './registry.js';
import Home, { CalcList } from './components/Home.jsx';
import CalculatorView from './components/CalculatorView.jsx';
import Disclaimer from './components/Disclaimer.jsx';
import InstallHint from './components/InstallHint.jsx';

// Простейший роутер на hash: #/  #/system/<раздел>  #/calc/<id>
function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'calc' && parts[1]) return { name: 'calc', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'system' && parts[1]) return { name: 'system', system: decodeURIComponent(parts[1]) };
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
  const go = useCallback((hash) => {
    window.location.hash = hash;
  }, []);

  return (
    <Disclaimer>
      <div className="app">
        {route.name === 'home' && (
          <Home
            onOpen={(id) => go(`#/calc/${id}`)}
            onOpenSystem={(system) => go(`#/system/${encodeURIComponent(system)}`)}
          />
        )}

        {route.name === 'system' && (
          <SystemView
            system={route.system}
            onOpen={(id) => go(`#/calc/${id}`)}
            onBack={() => go('#/')}
          />
        )}

        {route.name === 'calc' && <CalcRoute id={route.id} onBack={() => go('#/')} />}

        <InstallHint />
      </div>
    </Disclaimer>
  );
}

function SystemView({ system, onOpen, onBack }) {
  const items = getBySystem(system);
  return (
    <div className="home">
      <button className="link-back" onClick={onBack}>← На главную</button>
      <h1 className="section-title section-title--lg">{system}</h1>
      <CalcList items={items} onOpen={onOpen} />
    </div>
  );
}

function CalcRoute({ id, onBack }) {
  const calc = getCalculator(id);
  if (!calc) {
    return (
      <div className="home">
        <button className="link-back" onClick={onBack}>← Все калькуляторы</button>
        <p className="muted">Калькулятор не найден.</p>
      </div>
    );
  }
  return <CalculatorView calc={calc} onBack={onBack} />;
}
