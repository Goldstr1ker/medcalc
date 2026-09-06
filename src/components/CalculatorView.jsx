import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ISSUE,
  boundInUnit,
  compute,
  initialUnits,
  initialValues,
  resolveText,
  validateValues,
} from '../lib/compute.js';
import { fmtNumber } from '../lib/format.js';
import { isFavorite, toggleFavorite, pushRecent } from '../lib/storage.js';
import Result from './Result.jsx';

// Границы в схеме заданы в канонической единице, а пользователю показываем
// в выбранной — иначе у глюкозы в мг/дл потолок 80 ммоль/л выглядел бы как 80.
function limitText(input, issue, unitId) {
  const shown = boundInUnit(input, issue.limit, unitId);
  const unitLabel = input.units
    ? input.units.find((u) => u.id === unitId)?.label
    : input.unit;
  const withUnit = `${fmtNumber(shown, Number.isInteger(shown) ? 0 : 2)}${unitLabel ? ` ${unitLabel}` : ''}`;
  return issue.kind === ISSUE.BELOW_MIN ? `не меньше ${withUnit}` : `не больше ${withUnit}`;
}

function issueText(input, issue, unitId) {
  switch (issue.kind) {
    case ISSUE.NOT_A_NUMBER:
      return 'Введите число — дробную часть через запятую или точку';
    case ISSUE.BELOW_MIN:
    case ISSUE.ABOVE_MAX:
      return limitText(input, issue, unitId);
    default:
      return null; // EMPTY подсвечивать не нужно — это не ошибка, а «ещё не ввели»
  }
}

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

  // Пока пользователь ничего не менял — результат не показываем, даже если
  // все поля формально валидны. У шкал из одних select/boolean (ШКГ, Апгар,
  // NIHSS, qSOFA, Wells) поля заполнены с первой отрисовки, и без этого флага
  // человек видел бы «готовый» балл на экране, который только что открыл —
  // для медицинского инструмента это читается как расчёт, а не как заглушка.
  const [touched, setTouched] = useState(false);

  // Поля, где браузер держит нераспознанный текст (input.validity.badInput).
  //
  // Ключевая деталь: у <input type="number"> с мусором внутри свойство value
  // равно ПУСТОЙ СТРОКЕ, а введённый текст остаётся видимым на экране. То есть
  // человек видит в поле «70e», а приложение считает поле незаполненным и
  // пишет «Заполните поля для расчёта» — сообщение, которое прямо противоречит
  // тому, что на экране. Отсюда отдельное состояние: значение нам недоступно,
  // но факт «здесь не число» — доступен, и сказать об этом надо явно.
  const [badInputs, setBadInputs] = useState(/** @type {Record<string, boolean>} */ ({}));

  // Сброс состояния при переходе на другой калькулятор.
  useEffect(() => {
    setValues(initialValues(calc.inputs));
    setUnits(initialUnits(calc.inputs));
    setFav(isFavorite(calc.id));
    setTouched(false);
    setBadInputs({});
    pushRecent(calc.id);
  }, [calc]);

  const markTouched = useCallback(() => setTouched(true), []);

  const { ready: valuesValid, issues: valueIssues } = useMemo(
    () => validateValues(calc.inputs, values, units),
    [calc, values, units],
  );

  // Нераспознанный текст в поле объединяем с остальными проблемами: браузер
  // отдаёт value === '', поэтому сама по себе validateValues видит там «пусто»
  // и сказала бы «заполните поля» — про поле, где на экране что-то написано.
  const issues = useMemo(() => {
    const merged = { ...valueIssues };
    for (const [id, bad] of Object.entries(badInputs)) {
      if (bad) merged[id] = { kind: ISSUE.NOT_A_NUMBER };
    }
    return merged;
  }, [valueIssues, badInputs]);

  const hasBadInput = Object.values(badInputs).some(Boolean);
  // Незаполненные поля — это ещё не ошибка, а вот выход за границы уже да.
  const hasBadValue = Object.values(issues).some((i) => i.kind !== ISSUE.EMPTY);
  const ready = valuesValid && !hasBadInput;
  const showResult = ready && touched;

  const { result, band, bands, inputs } = useMemo(() => {
    if (!showResult) return { result: null, band: null, bands: [], inputs: null };
    return compute(calc, values, units);
  }, [calc, values, units, showResult]);

  // Тексты могут быть функциями от результата — тогда в них попадают
  // вычисленные числа (см. resolveText).
  const ctx = { result, band, inputs };
  const interpretation = band ? resolveText(calc.interpretation?.[band.id], ctx) : null;
  const guidance = band ? resolveText(calc.guidance?.[band.id], ctx) : null;

  const fieldBlocks = useMemo(() => groupInputs(calc.inputs), [calc]);

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
          // title скринридеры читают непредсказуемо; звезда — переключатель,
          // поэтому нужны и явная метка, и состояние.
          aria-label={fav ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={fav}
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
              issue={touched ? issues[input.id] : undefined}
              onValue={(v, badInput = false) => {
                markTouched();
                setValues((s) => ({ ...s, [input.id]: v }));
                setBadInputs((s) =>
                  s[input.id] === badInput ? s : { ...s, [input.id]: badInput },
                );
              }}
              onUnit={(u) => {
                markTouched();
                setUnits((s) => ({ ...s, [input.id]: u }));
              }}
            />
          ))}
        </section>
      ))}

      {!showResult ? (
        // Три разных состояния вместо одного «заполните поля»: не число,
        // вне допустимых границ и просто ещё не заполнено — это разные
        // сообщения, и подменять одно другим значит врать пользователю.
        hasBadInput || hasBadValue ? (
          <div className="result result--invalid">
            {hasBadInput
              ? 'Проверьте отмеченные поля — там не число'
              : 'Проверьте выделенные поля — значения вне допустимого диапазона. Расчёт не выполняется.'}
          </div>
        ) : (
          <div className="result result--empty">Заполните поля для расчёта</div>
        )
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

function Field({ input, value, unit, issue, onValue, onUnit }) {
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
  const message = issue ? issueText(input, issue, unit) : null;
  const errorId = message ? `${input.id}-error` : undefined;

  return (
    <label className={`field${message ? ' field--invalid' : ''}`}>
      <span className="field__label">
        {input.label}
        {input.unit ? <span className="field__unit">, {input.unit}</span> : null}
      </span>
      <div className="field__row">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          // Границы схемы канонические — в атрибуты отдаём их в выбранной
          // единице, иначе браузер ругался бы на верный ввод в мг/дл.
          min={boundInUnit(input, input.min, unit)}
          max={boundInUnit(input, input.max, unit)}
          step="any"
          placeholder="—"
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          // Второй аргумент — badInput: при нераспознанном тексте value приходит
          // пустым, и без этого флага поле неотличимо от незаполненного.
          onChange={(e) => onValue(e.currentTarget.value, e.currentTarget.validity.badInput)}
          onWheel={(e) => e.currentTarget.blur()}
        />
        {input.units ? (
          <select
            value={unit}
            // Без метки скринридер читает «мкмоль/л, список» без привязки
            // к полю — непонятно, единицы чего именно.
            aria-label={`Единицы измерения: ${input.label}`}
            onChange={(e) => onUnit(e.target.value)}
          >
            {input.units.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        ) : null}
      </div>
      {message ? (
        <span className="field__error" id={errorId} role="alert">
          {message}
        </span>
      ) : null}
    </label>
  );
}
