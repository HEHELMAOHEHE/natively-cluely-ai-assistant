## 10. Разработка и расширение функциональности

Natively разработан как открытый проект, который легко можно модифицировать, расширять и адаптировать под конкретные нужды. Архитектура приложения позволяет разработчикам вносить изменения на всех уровнях — от пользовательского интерфейса до ядра ИИ.

### Структура проекта для разработки

#### Основные директории
```
natively/
├── main/                  # Основной процесс Electron
├── services/              # Сервисные компоненты (KeybindManager, CredentialsManager)
├── audio/                 # Аудио-система (SystemAudioCapture, GoogleSTT, RestSTT)
├── db/                    # Работа с базой данных (DatabaseManager)
├── rag/                   # RAG-система (RAGManager)
├── update/                # Обновления (ReleaseNotesManager)
├── assets/                # Ассеты (иконки, маскировка)
└── src/                   # Фронтенд (React/Vite)
    ├── components/
    ├── views/
    └── App.tsx
```

### Настройка среды разработки

#### Требования
- **Node.js** (v20+ рекомендуется)
- **Git**
- **Rust** (для нативного аудиозахвата)

#### Установка зависимостей
```bash
git clone https://github.com/evinjohnn/natively-cluely-ai-assistant.git
cd natively-cluely-ai-assistant
npm install
```

#### Переменные окружения
Создайте файл `.env`:
```env
# Cloud AI
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
CLAUDE_API_KEY=your_key
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

# Speech Providers
DEEPGRAM_API_KEY=your_key
ELEVENLABS_API_KEY=your_key

# Local AI (Ollama)
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2

# Development
NODE_ENV=development
```

#### Запуск в режиме разработки
```bash
npm start
```

#### Сборка дистрибутива
```bash
npm run dist
```

### Расширение функциональности

#### Добавление нового STT-провайдера
Для интеграции нового провайдера распознавания речи:

1. Создайте новый класс, реализующий интерфейс STT:
```typescript
// audio/NewProviderSTT.ts
export class NewProviderSTT extends EventEmitter {
  constructor(private apiKey: string) {
    super();
  }

  start(): void {
    // Логика запуска потоковой транскрипции
  }

  stop(): void {
    // Остановка
  }

  write(chunk: Buffer): void {
    // Обработка аудио-чанка
  }

  private handleTranscript(text: string, isFinal: boolean): void {
    this.emit('transcript', { text, isFinal });
  }
}
```

2. Интегрируйте в `setupSystemAudioPipeline()`:
```typescript
if (sttProvider === 'newprovider') {
  const apiKey = CredentialsManager.getInstance().getNewProviderApiKey();
  if (apiKey) {
    this.googleSTT = new NewProviderSTT(apiKey);
  }
}
```

#### Добавление нового LLM-провайдера
Для подключения новой модели ИИ:

1. Расширьте `LLMHelper`:
```typescript
// processing/LLMHelper.ts
async generateResponse(prompt: string, model: string): Promise<string> {
  if (model.startsWith('newprovider/')) {
    return this.callNewProviderApi(prompt, model);
  }
  // ... остальные провайдеры
}
```

2. Добавьте обработку в IPC:
```typescript
ipcMain.handle('generate-response', async (event, { prompt, model }) => {
  return await llmHelper.generateResponse(prompt, model);
});
```

#### Новые горячие клавиши
Добавьте новые сочетания через `KeybindManager`:

```typescript
// services/KeybindManager.ts
private defaultKeybinds = {
  "general": {
    "toggle-visibility": "CmdOrCtrl+Shift+Space",
    "take-screenshot": "CmdOrCtrl+H",
    "custom-action": "CmdOrCtrl+Alt+C" // Новое сочетание
  },
  "ai": {
    "manual-prompt": "CmdOrCtrl+M",
    "regenerate-answer": "CmdOrCtrl+R"
  }
}
```

### Модификация интерфейса

#### Компонентная структура
Фронтенд построен на React с использованием Vite:
- **App.tsx**: корневой компонент
- **components/**: переиспользуемые UI-компоненты
- **views/**: страницы и представления

#### Добавление новых представлений
1. Создайте новый компонент:
```tsx
// src/views/CustomView.tsx
const CustomView = () => {
  return (
    <div className="custom-view">
      <h2>Мое расширение</h2>
      {/* Кастомный интерфейс */}
    </div>
  );
};
```

2. Интегрируйте с основным процессом через IPC:
```typescript
// В основном процессе
ipcMain.handle('custom-action', async () => {
  // Логика обработки
  return result;
});
```

### Расширение RAG-системы

#### Пользовательские эмбеддинги
Можно добавить поддержку кастомных методов создания эмбеддингов:

```typescript
// rag/RAGManager.ts
async createEmbeddings(text: string): Promise<number[]> {
  // Можно использовать локальные модели или другие провайдеры
  if (this.useLocalEmbeddings) {
    return this.createLocalEmbedding(text);
  }
  return this.callGeminiEmbedding(text);
}
```

#### Поддержка новых форматов
Расширьте обработку документов:
```typescript
// Добавьте поддержку PDF, DOCX, презентаций
async processDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return this.extractPdfText(filePath);
    case '.docx':
      return this.extractDocxText(filePath);
    case '.pptx':
      return this.extractPptxText(filePath);
    default:
      return '';
  }
}
```

### Тестирование и отладка

#### Логирование
Приложение имеет встроенную систему логирования:
```typescript
console.log('Сообщение'); // Будет записано в natively_debug.log
```

Логи сохраняются в:
- macOS: `~/Documents/natively_debug.log`
- Windows: `%USERPROFILE%\Documents\natively_debug.log`
- Linux: `~/Documents/natively_debug.log`

#### Отладочные инструменты
- **Режим разработки**: `NODE_ENV=development`
- **Встроенный тест аудио**: проверка уровней микрофона
- **IPC DevTools**: мониторинг сообщений между процессами

### Сборка и распространение

#### Генерация дистрибутивов
```bash
# Сборка для всех платформ
npm run dist

# Или для конкретной платформы
npm run dist:mac
npm run dist:win
npm run dist:linux
```

#### Подпись приложений (macOS)
Для распространения вне App Store:
```bash
# Необходимо иметь Apple Developer ID
electron-builder --mac --sign
```

### Вклад в проект

#### Принципы внесения изменений
1. **Fork** репозитория
2. Создание отдельной ветки: `git checkout -b feature/my-feature`
3. Коммит изменений
4. Push в свой fork
5. Создание Pull Request

#### Типы вклада
- **Исправление багов**: особенно в аудио-захвате и STT
- **Улучшение документации**: README, комментарии в коде
- **Новые интеграции**: провайдеры ИИ, STT, календари
- **UI/UX улучшения**: темы, анимации, производительность
- **Тестирование**: unit-тесты, e2e-тесты

#### Требования к коду
- TypeScript с строгой типизацией
- Чистый, понятный код
- Комментарии к сложным участкам
- Соответствие существующей архитектуре

### Лицензирование

Проект распространяется под лицензией **GNU Affero General Public License v3.0 (AGPL-3.0)**, что означает:

1. **Полная свобода использования**: можно использовать для любых целей
2. **Обязательное открытие исходного кода**: если вы модифицируете и используете приложение через сеть, должны предоставить исходный код
3. **Нет ограничений на коммерческое использование**
4. **Прозрачность**: все изменения видны сообществу

### Будущее развитие

#### Возможные направления расширения
1. **Поддержка мобильных платформ** через Capacitor или React Native
2. **Интеграция с профессиональными сервисами**: Jira, Notion, Salesforce
3. **Коллаборативные функции**: безопасный обмен знаниями в команде
4. **Улучшенный анализ видео**: не только аудио, но и визуальный контекст
5. **Поддержка многомодальных моделей**: одновременная обработка текста, аудио и видео

Natively представляет собой мощную основу для создания приватных, локальных ИИ-ассистентов, которые могут быть адаптированы под любые профессиональные сценарии использования.


