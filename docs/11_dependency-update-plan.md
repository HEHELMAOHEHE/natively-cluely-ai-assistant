# План обновления зависимостей

## Текущее состояние

### Анализ устаревших пакетов (`npm outdated`)

| Пакет | Текущая | Последняя | Тип обновления |
|-------|---------|-----------|----------------|
| @anthropic-ai/sdk | 0.74.0 | 0.78.0 | minor |
| @google/genai | 0.12.0 | 1.43.0 | **MAJOR** |
| react | 18.3.1 | 19.2.4 | **MAJOR** |
| react-dom | 18.3.1 | 19.2.4 | **MAJOR** |
| react-syntax-highlighter | 15.6.6 | 16.1.1 | minor |
| tailwindcss | 3.4.19 | 4.2.1 | **MAJOR** |
| tesseract.js | 5.1.1 | 7.0.0 | **MAJOR** |

### Уязвимости безопасности (`npm audit`)

**12 уязвимостей (4 moderate, 8 high):**

1. **minimatch <3.1.4** (high) - ReDoS уязвимость
   - Затронут: `glob` → `minimatch`
   - Решение: обновить glob

2. **prismjs <1.30.0** (moderate) - DOM Clobbering
   - Затронут: `react-syntax-highlighter` → `refractor` → `prismjs`
   - Решение: обновить react-syntax-highlighter

3. **tar** (high) - Множественные уязвимости
   - Затронут: `electron-rebuild`, `sqlite3`, `node-gyp`, `cacache`
   - Решение: использовать `npm audit fix --force`

---

## План обновления

### Этап 1: Критические обновления безопасности

**Выполнено ✅:**
- Electron: 33.x → 40.6.1
- electron-builder: обновлён
- electron-store: обновлён

**Требуется:**
- [ ] Запустить `npm audit fix --force` для обновления tar, minimatch
- [ ] Обновить react-syntax-highlighter: 15.6.6 → 16.1.1

### Этап 2: AI SDKs

| SDK | Текущая | Целевая | Заметки |
|-----|---------|---------|---------|
| @anthropic-ai/sdk | 0.74.0 | 0.78.0 | Безопасное minor обновление |
| @google/genai | 0.12.0 | 1.x | Требует проверки API |

**Риски:**
- @google/genai 1.x имеет breaking changes в API

### Этап 3: React 18 → 19

**Зависимости для обновления:**
- react: 18.3.1 → 19.2.4
- react-dom: 18.3.1 → 19.2.4
- @types/react: 18.3.x → 19.x
- @types/react-dom: 18.3.x → 19.x

**Требует также:**
- react-query v3 → v5 (требует миграции кода!)
- react-router v6 → v7 (опционально)

**Известные проблемы:**
- TanStack Query v5 имеет breaking API changes
- Нужно проверить использование useQuery/useMutation в коде

### Этап 4: Tailwind CSS 3 → 4

**Изменения в v4:**
- Новая конфигурация через CSS переменные
- Изменён @theme директив
- Удалена поддержка PostCSS плагина (теперь через Vite)

**Миграция:**
- Создать新的 tailwind.config.js (или использовать CSS-only подход)
- Обновить PostCSS конфигурацию

### Этап 5: tesseract.js 5 → 7

**Изменения:**
- Breaking changes в API
- Изменился интерфейс Worker

**Рекомендация:** Отложить до последнего этапа

---

## Статус

- [x] Electron 33 → 40
- [x] Vite, electron-builder
- [x] Native modules (better-sqlite3, keytar)
- [ ] react-syntax-highlighter
- [ ] AI SDKs (@google/genai, @anthropic-ai)
- [ ] React 18 → 19 + react-query v5
- [ ] Tailwind CSS 3 → 4
- [ ] tesseract.js 5 → 7
- [ ] npm audit fix --force

---

## Рекомендуемый порядок

1. **Сейчас (безопасно):**
   - `npm audit fix --force`
   - Обновить react-syntax-highlighter

2. **AI SDKs:**
   - @anthropic-ai/sdk: 0.74 → 0.78
   - @google/genai: 0.12 → 1.x (проверить API)

3. **React 19 (требует код):**
   - Обновить react, react-dom
   - Обновить react-query v3 → v5
   - Исправить импорты useQuery/useMutation

4. **Tailwind 4:**
   - Миграция конфигурации
   - Тестирование стилей

5. **tesseract.js:**
   - Тестирование OCR функциональности
