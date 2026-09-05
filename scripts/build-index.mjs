// Генератор лёгкого индекса калькуляторов.
//
// Зачем: приложению для главной, разделов и поиска нужны только метаданные
// (название, раздел, теги, описание) — это ~250 байт на калькулятор. Тело же
// (поля, формула, тексты по клинрекам, источники, примеры) весит ~6 КБ и нужно
// только когда человек реально открыл эту шкалу.
//
// Раньше import.meta.glob({ eager: true }) тащил в стартовый бандл всё сразу:
// 16 шкал ≈ 100 КБ исходников, при 150 будет ~900 КБ — и всё это скачивается
// и парсится при открытии главной, хотя за сеанс открывают одну-две шкалы.
//
// Индекс генерируется из тех же файлов, поэтому разъехаться с ними не может.
// Файл в .gitignore и создаётся автоматически перед dev и build.

import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadCalculators, REPO_ROOT } from './lib/load-calculators.mjs';

const OUT = join(REPO_ROOT, 'src/catalog.generated.js');

const loaded = await loadCalculators();

const entries = loaded
  .map(({ file, calc }) => {
    // Путь в том виде, в каком его вернёт import.meta.glob в registry.js:
    // относительно src/, с ведущим './'.
    const fromSrc = relative(join(REPO_ROOT, 'src'), join(REPO_ROOT, file)).replace(/\\/g, '/');

    // Строка для поиска собирается здесь, один раз на сборку, а не на каждое
    // нажатие клавиши в поле поиска.
    const search = [calc.name, calc.shortName, calc.system, calc.description, ...(calc.tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return {
      id: calc.id,
      path: `./${fromSrc}`,
      name: calc.name,
      shortName: calc.shortName ?? null,
      system: calc.system,
      description: calc.description,
      search,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

const body = `// СГЕНЕРИРОВАНО АВТОМАТИЧЕСКИ — не редактировать вручную.
// Источник: src/calculators/**/*.js
// Генератор: scripts/build-index.mjs (запускается перед dev и build)
//
// Лёгкий индекс: только то, что нужно главной, разделам и поиску.
// Тела калькуляторов загружаются отдельными чанками по требованию.

export const catalog = ${JSON.stringify(entries, null, 2)};
`;

writeFileSync(OUT, body, 'utf8');

const totalSearchChars = entries.reduce((n, e) => n + e.search.length, 0);
console.log(
  `Индекс собран: ${entries.length} калькуляторов, ` +
    `${(Buffer.byteLength(body, 'utf8') / 1024).toFixed(1)} КБ ` +
    `(из них поисковых строк ${totalSearchChars} символов)`,
);
