// Генератор индекса калькуляторов. Пишет ДВА файла:
//
//   src/catalog.generated.js        — лёгкие метаданные (id, path, name, system).
//                                     Грузятся сразу: нужны главной, разделам,
//                                     крошкам и загрузчику тел. ~60 байт на шкалу.
//
//   src/search-index.generated.js   — строки для поиска (primary, secondary).
//                                     Грузятся лениво, когда открыт экран поиска.
//                                     ~500 байт на шкалу — это ⅔ прежнего индекса.
//
// Раньше всё лежало в одном файле, и поисковые строки скачивались и парсились
// при старте, хотя за сеанс поиском пользуются не всегда. Разделение оставляет
// в стартовом бандле только то, без чего не нарисовать первый экран.
//
// Оба файла в .gitignore и генерируются из тех же файлов калькуляторов
// (перед dev и build), поэтому разъехаться с исходниками не могут.

import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadCalculators, REPO_ROOT } from './lib/load-calculators.mjs';
import { buildSearchFields } from '../src/lib/search.js';

const CATALOG_OUT = join(REPO_ROOT, 'src/catalog.generated.js');
const SEARCH_OUT = join(REPO_ROOT, 'src/search-index.generated.js');

const loaded = await loadCalculators();

const rows = loaded
  .map(({ file, calc }) => {
    // Путь в том виде, в каком его вернёт import.meta.glob в registry.js:
    // относительно src/, с ведущим './'.
    const fromSrc = relative(join(REPO_ROOT, 'src'), join(REPO_ROOT, file)).replace(/\\/g, '/');
    const { primary, secondary } = buildSearchFields(calc);

    return {
      meta: { id: calc.id, path: `./${fromSrc}`, name: calc.name, system: calc.system },
      search: { id: calc.id, primary, secondary },
    };
  })
  .sort((a, b) => a.meta.name.localeCompare(b.meta.name, 'ru'));

const AUTOGEN =
  '// СГЕНЕРИРОВАНО АВТОМАТИЧЕСКИ — не редактировать вручную.\n' +
  '// Источник: src/calculators/**/*.js · Генератор: scripts/build-index.mjs\n';

const catalog = rows.map((r) => r.meta);
const searchIndex = rows.map((r) => r.search);

writeFileSync(
  CATALOG_OUT,
  `${AUTOGEN}//\n// Лёгкие метаданные: грузятся сразу (главная, разделы, крошки, загрузка тел).\n\nexport const catalog = ${JSON.stringify(catalog, null, 2)};\n`,
  'utf8',
);
writeFileSync(
  SEARCH_OUT,
  `${AUTOGEN}//\n// Строки для поиска: грузятся лениво при открытии экрана поиска.\n\nexport const searchIndex = ${JSON.stringify(searchIndex, null, 2)};\n`,
  'utf8',
);

const kb = (obj) => (Buffer.byteLength(JSON.stringify(obj), 'utf8') / 1024).toFixed(1);
console.log(
  `Индекс собран: ${rows.length} калькуляторов · ` +
    `метаданные ${kb(catalog)} КБ (сразу) + поиск ${kb(searchIndex)} КБ (лениво)`,
);
