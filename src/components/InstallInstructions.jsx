import { getInstallInstructions } from '../lib/install-instructions.js';

// Пошаговая инструкция под текущий браузер. Используется и в баннере,
// и в постоянном пункте на главной.
export default function InstallInstructions() {
  const { title, steps, note } = getInstallInstructions();

  return (
    <div className="install-steps">
      <div className="install-steps__title">{title}</div>
      <ol>
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {note ? <p className="install-steps__note">{note}</p> : null}
    </div>
  );
}
