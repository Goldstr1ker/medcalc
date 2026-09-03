import { useState } from 'react';
import { isDisclaimerAccepted, acceptDisclaimer } from '../lib/storage.js';

// Однократный экран-предупреждение при первом запуске.
export default function Disclaimer({ children }) {
  const [accepted, setAccepted] = useState(() => isDisclaimerAccepted());

  if (accepted) return children;

  return (
    <div className="gate">
      <div className="gate__card">
        <h1>Прежде чем начать</h1>
        <p>
          МедКалк — образовательный инструмент и средство поддержки принятия решений для студентов
          и врачей. Он <b>не заменяет</b> клиническое суждение, действующие клинические рекомендации
          и очную консультацию.
        </p>
        <ul>
          <li>Проверяйте формулы и трактовку по первоисточникам, указанным в каждом калькуляторе.</li>
          <li>Решения о диагностике и лечении принимает лечащий врач с учётом полной картины.</li>
          <li>Данные пациента остаются в браузере и никуда не отправляются.</li>
        </ul>
        <button
          className="btn-primary"
          onClick={() => {
            acceptDisclaimer();
            setAccepted(true);
          }}
        >
          Понятно, продолжить
        </button>
      </div>
    </div>
  );
}
