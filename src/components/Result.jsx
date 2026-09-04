import { bandRanges, COLORS } from '../lib/bands.js';
import { fmtNumber, plural } from '../lib/format.js';

// Выбор представления результата по calc.result.type.
export default function Result({ spec, result, band }) {
  if (result?.error) {
    return <div className="result result--error">Не удалось рассчитать: {result.error}</div>;
  }
  if (spec.type === 'gauge') return <Gauge spec={spec} result={result} band={band} />;
  if (spec.type === 'score') return <Score spec={spec} result={result} band={band} />;
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
          <b>
            {fmtNumber(d.value, d.decimals ?? 0)}
            {d.unit ? ` ${d.unit}` : ''}
          </b>
        </li>
      ))}
    </ul>
  );
}

function Gauge({ spec, result, band }) {
  const { min, max } = spec;
  const ranges = bandRanges(spec.bands, min, max);
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

function Score({ spec, result, band }) {
  const max = spec.max ?? Math.max(...spec.bands.map((b) => b.min)) + 2;
  const pips = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="result">
      <div className="result__value" style={{ color: COLORS[band.color] }}>
        {result.value}
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
              <b>+{row.points}</b>
            </li>
          ))}
        </ul>
      ) : null}
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
