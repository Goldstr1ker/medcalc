# МедКалк

Клинические калькуляторы и шкалы с разбором по клиническим рекомендациям.
Русский язык, единицы СИ по умолчанию, работает офлайн.

## Запуск

```bash
npm install
npm run dev
```

Откроется на http://localhost:5173

## Сборка

```bash
npm run build      # -> dist/, статические файлы, деплой куда угодно
npm run preview    # локальный просмотр сборки
```

## Деплой

Автоматический на GitHub Pages: пуш в `main` запускает
`.github/workflows/deploy.yml` (сборка + публикация).
Живой адрес: https://goldstr1ker.github.io/medcalc/

Один раз включить в репозитории: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

Роутинг — по hash (`#/calc/<id>`), `base: './'` в `vite.config.js`, поэтому
подпапка `/medcalc/` работает без доп. настройки и SPA-fallback не нужен.

## Как добавить калькулятор

Создать файл `src/calculators/<раздел>/<id>.js` с `export default` объектом.
Реестр (`src/registry.js`) подхватит его автоматически — больше ничего править не нужно.

Минимальная схема:

```js
export default {
  id: 'unique-id',
  name: 'Полное название',
  shortName: 'Короткое',            // необязательно
  system: 'Нефрология',             // раздел = папка/группировка на главной
  tags: ['ключевые', 'слова'],      // для поиска
  description: '...',

  inputs: [
    { id: 'sex', label: 'Пол', type: 'select', options: ['Мужской', 'Женский'] },
    { id: 'age', label: 'Возраст', type: 'number', unit: 'лет', min: 0, max: 120 },
    { id: 'scr', label: 'Креатинин', type: 'number', units: [
      { id: 'umol', label: 'мкмоль/л', factor: 1 / 88.4 },   // -> каноническая единица
      { id: 'mgdl', label: 'мг/дл', factor: 1 },
    ]},
    { id: 'flag', label: 'Признак есть', type: 'boolean' },
  ],

  // получает канонические значения (единицы уже переведены)
  calculate(v) {
    return {
      value: 42,
      unit: 'мл/мин/1,73 м²',       // для type: 'score' не нужно
      decimals: 0,
      breakdown: [{ label: 'За что балл', points: 1 }],  // необязательно, для score
    };
  },

  result: {
    type: 'gauge',                  // 'gauge' | 'score' | 'value'
    min: 0, max: 120,               // для gauge
    // max: 9,                      // для score
    bands: [
      { id: 'norm', label: 'Норма', min: 90, color: 'green' },
      { id: 'low',  label: 'Снижение', min: 0, color: 'red', risk: '≈2% в год' },
    ],
  },

  interpretation: { norm: '...', low: '...' },        // текст по id band'а
  guidance: {                                          // «по клинрекам это значит…»
    low: { source: 'КР ... , 2021', points: ['...', '...'] },
  },
  caveats: ['Ограничение 1', 'Ограничение 2'],         // необязательно
  references: ['Автор и т.д. Журнал. Год.'],
  updated: '2026-09-04',
  version: 1,
};
```

Цвета band'ов: `green`, `lime`, `yellow`, `orange`, `red`, `darkred`, `slate`.

## Что дальше

- PWA (офлайн + установка на домашний экран) — `vite-plugin-pwa`
- Ещё калькуляторы
- Тёмная тема — уже есть, по системной настройке
- Обёртка Capacitor для App Store / Google Play
- Опционально: бэкенд (аккаунты, синхронизация, приём правок) — Postgres/Supabase
