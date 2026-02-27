# План обновления зависимостей

## Текущее состояние

### Анализ устаревших пакетов (`npm outdated`)

| Пакет | Текущая | Последняя | Тип обновления |
|-------|---------|-----------|----------------|
| @google/genai | 0.12.0 | 1.43.0 | **MAJOR** (требует переписывания кода) |
| react | 18.3.1 | 19.2.4 | **MAJOR** |
| react-dom | 18.3.1 | 19.2.4 | **MAJOR** |
| tailwindcss | 3.4.19 | 4.2.1 | **MAJOR** |
| tesseract.js | 5.1.1 | 7.0.0 | **MAJOR** |

### Выполнено ✅

| Пакет | Было | Стало |
|-------|------|-------|
| electron | 33.x | 40.6.1 |
| electron-builder | old | 26.8.1 |
| electron-store | old | 10.1.2 |
| @anthropic-ai/sdk | 0.74.0 | 0.78.0 |
| react-syntax-highlighter | 15.6.6 | 16.1.1 |

### Уязвимости безопасности (`npm audit`)

**12 уязвимостей (4 moderate, 8 high):**
- minimatch (high) - ReDoS
- tar (high) - Path Traversal, Symlink Poisoning
- prismjs (moderate) - DOM Clobbering

---

## План обновления

### Этап 1: Критические обновления безопасности

- [ ] `npm audit fix --force` (риск сломать electron-rebuild)
- [ ] ИЛИ: игнорировать (уязвимости в dev dependencies)

### Этап 2: @google/genai → @google/generative-ai (MAJOR)

**Проблема:** Google полностью переписал SDK
- Старое: `@google/genai` (0.12.0) 
- Новое: `@google/generative-ai` (0.24.1)
- API полностью изменился

**Файлы для обновления:**
- `electron/rag/EmbeddingPipeline.ts`
- `electron/main.ts`
- `electron/LLMHelper.ts`
- `electron/llm/types.ts`

**Требует:**
- Изучения нового API
- Переписывания ~100 строк кода

### Этап 3: React 18 → 19

- [ ] react: 18.3.1 → 19.2.4
- [ ] react-dom: 18.3.1 → 19.2.4
- [ ] @types/react: 18.3.x → 19.x
- [ ] @types/react-dom: 18.3.x → 19.x
- [ ] react-query v3 → v5 (**требует изменения кода**)

### Этап 4: Tailwind CSS 3 → 4

- [ ] Обновить tailwindcss: 3.4.19 → 4.2.1
- [ ] Миграция конфигурации (новый формат)
- [ ] Тестирование стилей

### Этап 5: tesseract.js 5 → 7

- [ ] Обновить tesseract.js: 5.1.1 → 7.0.0
- [ ] Тестирование OCR

---

## Статус

- [x] Electron 33 → 40 ✅
- [x] electron-builder ✅
- [x] electron-store ✅
- [x] @anthropic-ai/sdk ✅
- [x] react-syntax-highlighter ✅
- [ ] @google/genai (требует переписывания кода)
- [ ] React 18 → 19 + react-query v5
- [ ] Tailwind CSS 3 → 4
- [ ] tesseract.js 5 → 7

---

## Рекомендации

1. **@google/genai** - Отложить, требует значительного рефакторинга
2. **React 19** - Только после react-query миграции
3. **Tailwind 4** - После React
4. **tesseract.js** - В последнюю очередь
