import { Component } from 'react';
import { getCalculatorMeta } from '../registry.js';

// Граница ошибок вокруг калькулятора.
//
// compute() уже ловит исключения внутри calculate(), но это не весь риск.
// interpretation и guidance могут быть функциями, Result читает
// result.breakdown и result.details, а result.bands — функцией от введённых
// значений: любое из этого кидает уже во время рендера, мимо try/catch
// в compute. Без границы одна кривая правка в одном калькуляторе гасит
// всё приложение в белый экран — при полутора сотнях шкал это вопрос
// времени, а не вероятности.
//
// Сброса состояния внутри намеренно нет: App передаёт key={id}, поэтому
// при переходе на другой калькулятор компонент пересоздаётся с чистым state.
export default class CalculatorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // В консоль пишем всегда, и в проде тоже: иначе сломанный калькулятор
    // выглядит просто как «не работает», без единой зацепки, где искать.
    console.error(`Ошибка при отрисовке калькулятора "${this.props.id}":`, error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const meta = getCalculatorMeta(this.props.id);

    return (
      <div className="calc">
        <button className="link-back" onClick={this.props.onBack}>← На главную</button>

        <header className="calc__head">
          <div>
            {meta ? <div className="calc__system">{meta.system}</div> : null}
            <h1 className="calc__title">{meta?.name ?? 'Калькулятор'}</h1>
          </div>
        </header>

        <div className="result result--error">
          Не удалось показать этот калькулятор — в нём ошибка.
          <div className="muted">Остальные калькуляторы работают.</div>
        </div>

        {/* Стек — только в дев-сборке: пользователю он ничего не даёт,
            а при разработке это единственный способ понять, что упало. */}
        {import.meta.env.DEV ? (
          <pre className="error-detail">{String(error?.stack ?? error)}</pre>
        ) : null}
      </div>
    );
  }
}
