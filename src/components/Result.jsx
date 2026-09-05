import { bandRanges, COLORS } from '../lib/bands.js';
import { fmtNumber, plural } from '../lib/format.js';

// Выбор представления результата по calc.result.type.
// bands приходят снаружи уже вычисленными: они могут зависеть от введённых
// значений (см. resolveBands), поэтому брать их из spec напрямую нельзя.
export default function Result({ spec, bands, result, band }) {
  if (result?.error) {
    return <div className="result result--error">Не удалось рассчитать: {result.error}</div>;
  }
  if (!band) {
    // Значение не попало ни в один диапазон — ошибка в схеме калькулятора.
    return <div className="result result--error">Результат вне заданных диапазонов</div>;
  }
  if (spec.type === 'gauge') return <Gauge spec={spec} bands={bands} result={result} band={band} />;
  if (spec.type === 'score') return <Score spec={spec} bands={bands} result={result} band={band} />;
  return <PlainValue result={result} band={band} />;
}

function BandCaption({ band }) {
  return (
    <div className="result__band" style={{ color: COLORS[band.color] }}>
      {band.label}
      {band.risk ? <span className="result__risk"> · {band.risk}</span> : null}
    </div>
  );
}

// Дополнительные вычисленные значения (напр. скорость инфузии, альтернативная формула).
// В отличие от breakdown (баллы шкалы, со знаком «+»), это просто пары «подпись: значение».
function Details({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="details">
      {items.map((d, i) => (
        <li key={i}>
          <span>{d.label}</span>
          {/* color — для подшкал по системам органов (SOFA): сразу видно,
              какая система тянет общий балл вверх */}
          <b style={d.color ? { color: COLORS[d.color] } : undefined}>
            {fmtNumber(d.value, d.decimals ?? 0)}
            {d.unit ? ` ${d.unit}` : ''}
          </b>
        </li>
      ))}
    </ul>
  );
}

function Gauge({ spec, bands, result, band }) {
  const { min, max } = spec;
  const ranges = bandRanges(bands, min, max);
  const pct = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const markerPct = pct(result.value);

  return (
    <div className="result">
      <div className="result__value" style={{ color: COLORS[band.color] }}>
        {fmtNumber(result.value, result.decimals)}
        {result.unit ? <span className="result__unit"> {result.unit}</span> : null}
      </div>
      <BandCaption band={band} />

      <div className="gauge">
        <div className="gauge__track">
          {ranges.map((r) => (
            <div
              key={r.id}
              className="gauge__seg"
              title={r.label}
              style={{
                left: `${pct(r.from)}%`,
                width: `${pct(r.to) - pct(r.from)}%`,
                background: COLORS[r.color],
              }}
            />
          ))}
          <div className="gauge__marker" style={{ left: `${markerPct}%` }} />
        </div>
        <div className="gauge__ticks">
          {ranges.slice(1).map((r) => (
            <span key={r.id} className="gauge__tick" style={{ left: `${pct(r.from)}%` }}>
              {fmtNumber(r.from)}
            </span>
          ))}
        </div>
      </div>

      <Details items={result.details} />
    </div>
  );
}

function Score({ spec, bands, result, band }) {
  const max = spec.max ?? Math.max(...bands.map((b) => b.min)) + 2;
  const pips = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="result">
      <div className="result__value" style={{ color: COLORS[band.color] }}>
        {/* Балл целый — показываем без дробной части («4», не «4,0»);
            дробный (шкалы с шагом 0,5, напр. Уэллс) — с одним знаком. */}
        {fmtNumber(result.value, Number.isInteger(result.value) ? 0 : 1)}
        <span className="result__unit"> / {max} {plural(max, ['балл', 'балла', 'баллов'])}</span>
      </div>
      <BandCaption band={band} />

      <div className="pips">
        {pips.map((i) => (
          <span
            key={i}
            className={`pip${i <= result.value ? ' pip--on' : ''}`}
            style={i <= result.value ? { background: COLORS[band.color] } : undefined}
          />
        ))}
      </div>

      {result.breakdown?.length ? (
        <ul className="breakdown">
          {result.breakdown.map((row, i) => (
            <li key={i}>
              <span>{row.label}</span>
              <b>+{fmtNumber(row.points, Number.isInteger(row.points) ? 0 : 1)}</b>
            </li>
          ))}
        </ul>
      ) : null}

      <Details items={result.details} />
    </div>
  );
}

function PlainValue({ result, band }) {
  return (
    <div className="result">
      <div className="result__value" style={{ color: COLORS[band.color] }}>
        {fmtNumber(result.value, result.decimals)}
        {result.unit ? <span className="result__unit"> {result.unit}</span> : null}
      </div>
      <BandCaption band={band} />
      <Details items={result.details} />
    </div>
  );
}
