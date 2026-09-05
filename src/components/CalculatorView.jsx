import { useEffect, useMemo, useState } from 'react';
import { compute, initialUnits, initialValues, isReady, resolveText } from '../lib/compute.js';
import { isFavorite, toggleFavorite, pushRecent } from '../lib/storage.js';
import Result from './Result.jsx';

// Разбивает поля на блоки по input.group, сохраняя порядок объявления.
// Поля без группы образуют блок без заголовка. Нужно для длинных шкал
// (SOFA, APACHE II, NIHSS), где плоская простыня полей нечитаема на телефоне.
function groupInputs(inputs) {
  const blocks = [];
  for (const input of inputs) {
    const group = input.group ?? null;
    const last = blocks[blocks.length - 1];
    if (!last || last.group !== group) blocks.push({ group, items: [input] });
    else last.items.push(input);
  }
  return blocks;
}

export default function CalculatorView({ calc, onBack }) {
  const [values, setValues] = useState(() => initialValues(calc.inputs));
  const [units, setUnits] = useState(() => initialUnits(calc.inputs));
  const [fav, setFav] = useState(() => isFavorite(calc.id));

  // Сброс состояния при переходе на другой калькулятор.
  useEffect(() => {
    setValues(initialValues(calc.inputs));
    setUnits(initialUnits(calc.inputs));
    setFav(isFavorite(calc.id));
    pushRecent(calc.id);
  }, [calc]);

  const ready = isReady(calc.inputs, values);

  const { result, band, bands, inputs } = useMemo(() => {
    if (!ready) return { result: null, band: null, bands: [], inputs: null };
    return compute(calc, values, units);
  }, [calc, values, units, ready]);

  // Тексты могут быть функциями от результата — тогда в них попадают
  // вычисленные числа (см. resolveText).
  const ctx = { result, band, inputs };
  const interpretation = band ? resolveText(calc.interpretation?.[band.id], ctx) : null;
  const guidance = band ? resolveText(calc.guidance?.[band.id], ctx) : null;

  const fieldBlocks = groupInputs(calc.inputs);

  return (
    <div className="calc">
      <button className="link-back" onClick={onBack}>← Все калькуляторы</button>

      <header className="calc__head">
        <div>
          <div className="calc__system">{calc.system}</div>
          <h1 className="calc__title">{calc.name}</h1>
        </div>
        <button
          className={`star${fav ? ' star--on' : ''}`}
          title={fav ? 'Убрать из избранного' : 'В избранное'}
          onClick={() => {
            toggleFavorite(calc.id);
            setFav((f) => !f);
          }}
        >
          {fav ? '★' : '☆'}
        </button>
      </header>

      {calc.description ? <p className="calc__desc">{calc.description}</p> : null}

      {fieldBlocks.map((block, i) => (
        <section className="fields" key={block.group ?? `block-${i}`}>
          {block.group ? <h2 className="fields__group">{block.group}</h2> : null}
          {block.items.map((input) => (
            <Field
              key={input.id}
              input={input}
              value={values[input.id]}
              unit={units[input.id]}
              onValue={(v) => setValues((s) => ({ ...s, [input.id]: v }))}
              onUnit={(u) => setUnits((s) => ({ ...s, [input.id]: u }))}
            />
          ))}
        </section>
      ))}

      {!ready ? (
        <div className="result result--empty">Заполните поля для расчёта</div>
      ) : result?.error || !band ? (
        <Result
          spec={calc.result}
          bands={bands}
          result={result ?? { error: 'неизвестная ошибка' }}
          band={band}
        />
      ) : (
        <>
          <Result spec={calc.result} bands={bands} result={result} band={band} />

          {interpretation ? <p className="interp">{interpretation}</p> : null}

          {guidance ? (
            <section className="guidance">
              <h2>По клиническим рекомендациям</h2>
              <ul>
                {guidance.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
              <div className="guidance__source">Источник: {guidance.source}</div>
            </section>
          ) : null}
        </>
      )}

      {calc.caveats?.length ? (
        <section className="caveats">
          <h2>Ограничения</h2>
          <ul>
            {calc.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {calc.references?.length ? (
        <section className="refs">
          <h2>Источники</h2>
          <ol>
            {calc.references.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <footer className="calc__meta">
        Обновлено: {calc.updated} · версия {calc.version}
        <div className="disclaimer-line">
          Инструмент для образовательных целей и поддержки решений. Проверяйте по первоисточнику;
          не заменяет клиническое суждение и очную консультацию.
        </div>
      </footer>
    </div>
  );
}

function Field({ input, value, unit, onValue, onUnit }) {
  if (input.type === 'select') {
    return (
      <label className="field">
        <span className="field__label">{input.label}</span>
        <select value={value} onChange={(e) => onValue(e.target.value)}>
          {input.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  }

  if (input.type === 'boolean') {
    return (
      <button
        type="button"
        className={`toggle${value ? ' toggle--on' : ''}`}
        aria-pressed={value}
        onClick={() => onValue(!value)}
      >
        <span className="toggle__box">{value ? '✓' : ''}</span>
        <span className="toggle__label">{input.label}</span>
      </button>
    );
  }

  // number
  return (
    <label className="field">
      <span className="field__label">
        {input.label}
        {input.unit ? <span className="field__unit">, {input.unit}</span> : null}
      </span>
      <div className="field__row">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={input.min}
          max={input.max}
          step="any"
          placeholder="—"
          onChange={(e) => onValue(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
        />
        {input.units ? (
          <select value={unit} onChange={(e) => onUnit(e.target.value)}>
            {input.units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        ) : null}
      </div>
    </label>
  );
}
