## 2. Архитектура приложения

Natively построен как классическое Electron-приложение с разделением на **основной процесс (main process)** и **процесс рендеринга (renderer process)**, но с продвинутой архитектурой, ориентированной на производительность, безопасность и приватность.

### Основные компоненты архитектуры

#### Центральный менеджер состояния (AppState)
Класс `AppState` является ядром приложения и реализован как **Singleton** в [`electron/main.ts`](electron/main.ts:81), обеспечивая единый источник правды для всех компонентов системы. Он координирует работу всех модулей:
- Управление окнами
- Аудио-захват и обработка речи
- Интеллектуальная обработка через ИИ
- Система уведомлений и событий
- Обновления и установка
- Хранение и индексация данных

#### Модульная структура
Приложение организовано в виде набора взаимодействующих модулей:

```
electron/                      # Основной процесс Electron
├── main.ts                   # Точка входа, AppState (Singleton)
├── preload.ts                # Preload скрипт для безопасного IPC
├── WindowHelper.ts           # Управление окнами
├── SettingsWindowHelper.ts  # Окно настроек
├── ModelSelectorWindowHelper.ts # Окно выбора модели
├── ipcHandlers.ts            # Обработчики IPC-сообщений
├── IntelligenceManager.ts   # Менеджер ИИ-функций
├── LLMHelper.ts             # Помощник для работы с LLM
├── ProcessingHelper.ts      # Обработка данных
├── ScreenshotHelper.ts      # Захват скриншотов
├── DonationManager.ts        # Управление донатами
├── ThemeManager.ts          # Управление темами
│
├── audio/                    # Аудио-система
│   ├── SystemAudioCapture.ts   # Захват системного звука
│   ├── MicrophoneCapture.ts    # Захват микрофона
│   ├── GoogleSTT.ts            # Google Speech-to-Text
│   ├── RestSTT.ts              # REST-based STT провайдеры
│   ├── DeepgramStreamingSTT.ts # Deepgram streaming STT
│   └── AudioDevices.ts         # Управление аудио-устройствами
│
├── llm/                      # LLM модули
│   ├── LLMHelper.ts          # Основной helper для LLM
│   ├── IntentClassifier.ts   # Классификатор намерений
│   ├── AnswerLLM.ts          # Генерация ответов
│   ├── AssistLLM.ts          # Помощник ИИ
│   ├── RecapLLM.ts           # Генерация резюме
│   ├── FollowUpLLM.ts        # Follow-up вопросы
│   ├── FollowUpQuestionsLLM.ts # Генерация уточняющих вопросов
│   ├── WhatToAnswerLLM.ts    # Определение что отвечать
│   ├── TemporalContextBuilder.ts # Контекст времени
│   ├── transcriptCleaner.ts  # Очистка транскриптов
│   ├── postProcessor.ts      # Пост-обработка
│   ├── prompts.ts            # Промпты для LLM
│   ├── types.ts              # TypeScript типы
│   └── index.ts              # Экспорт модулей
│
├── services/                 # Сервисные компоненты
│   ├── KeybindManager.ts     # Управление горячими клавишами
│   ├── CredentialsManager.ts # Безопасное хранение учетных данных
│   ├── CalendarManager.ts    # Интеграция с календарем
│   ├── InstallPingManager.ts # Пинг при установке
│   └── RateLimiter.ts        # Ограничение частоты запросов
│
├── db/                       # Работа с базой данных
│   ├── DatabaseManager.ts    # Управление SQLite
│   ├── seedDemo.ts           # Демо-данные
│   └── test-db.ts            # Тестирование БД
│
├── rag/                      # RAG-система
│   ├── RAGManager.ts         # Менеджер RAG
│   ├── RAGRetriever.ts       # Получение релевантных данных
│   ├── EmbeddingPipeline.ts  # Конвейер эмбеддингов
│   ├── VectorStore.ts        # Векторное хранилище
│   ├── SemanticChunker.ts    # Семантическая разбивка
│   ├── TranscriptPreprocessor.ts # Препроцессор транскриптов
│   ├── prompts.ts            # Промпты для RAG
│   └── index.ts              # Экспорт модулей
│
├── update/                   # Обновления
│   └── ReleaseNotesManager.ts # Управление релизами
│
├── config/                   # Конфигурация
│   └── languages.ts          # Поддерживаемые языки
│
└── utils/                    # Утилиты
    ├── logger.ts             # Логирование (electron-log)
    ├── curlUtils.ts          # Curl утилиты
    └── emailUtils.ts         # Email утилиты
```

#### Структура рендер-процесса (Renderer)

```
src/
├── components/               # React компоненты
│   ├── Launcher.tsx          # Главный компонент запуска
│   ├── NativelyInterface.tsx # Основной интерфейс
│   ├── SettingsOverlay.tsx   # Оверлей настроек
│   ├── SettingsPopup.tsx     # Всплывающее окно настроек
│   ├── MeetingDetails.tsx    # Детали встречи
│   ├── GlobalChatOverlay.tsx  # Глобальный чат
│   ├── MeetingChatOverlay.tsx # Чат встречи
│   ├── FollowUpEmailModal.tsx # Модалка follow-up email
│   ├── FeatureSpotlight.tsx   # Демонстрация функций
│   ├── TopSearchPill.tsx      # Поисковая строка
│   ├── UpdateBanner.tsx       # Баннер обновлений
│   ├── UpdateModal.tsx        # Модалка обновлений
│   │
│   ├── Queue/                 # Очередь скриншотов
│   ├── Solutions/            # Решения
│   ├── settings/              # Настройки UI
│   │   ├── AIProvidersSettings.tsx
│   │   ├── GeneralSettings.tsx
│   │   └── Sidebar.tsx
│   └── ui/                    # Переиспользуемые UI компоненты
│
├── _pages/                   # Страницы
│   ├── Debug.tsx             # Страница отладки
│   ├── Queue.tsx             # Страница очереди
│   └── Solutions.tsx         # Страница решений
│
├── App.tsx                   # Корневой компонент
├── main.tsx                  # Точка входа React
└── index.css                 # Глобальные стили
```

### Потоки выполнения

#### Основной процесс (Main Process)
Отвечает за:
- Создание и управление окнами браузера
- Системные интеграции (иконка в трее, глобальные горячие клавиши)
- Захват аудио и экрана
- Работу с файловой системой
- Обновления приложения
- Координацию между различными сервисами
- Логирование через [`electron-log`](electron/utils/logger.ts:1)

#### Процесс рендеринга (Renderer Process)
Реализован как современное React-приложение на Vite:
- Интерфейс пользователя
- Отображение транскрипций и рекомендаций ИИ
- Управление настройками
- Доступ к истории встреч
- Визуализация аналитики и использования API

### Система событий и коммуникации

Между основным и рендер-процессами используется IPC (Inter-Process Communication) для безопасного взаимодействия:

```typescript
// Пример: отправка события из основного процесса
this.broadcast("update-available", info)

// Пример: обработка в рендер-процессе
ipcRenderer.on('intelligence-suggested-answer', handleSuggestedAnswer)
```

Также реализована система внутренних событий через EventEmitter для связи между модулями основного процесса:
- `startMeeting` / `endMeeting` - начало и завершение встречи
- `assist_update` - обновление рекомендаций ИИ
- `suggested_answer` - предложенный ответ
- `recap` - сводка встречи
- `follow_up_questions_update` - вопросы для уточнения

### Жизненный цикл приложения

1. **Инициализация**: инициализация логирования, загрузка конфигурации, проверка обновлений, создание экземпляра `AppState`
2. **Готовность**: создание главного окна, регистрация глобальных горячих клавиш
3. **Активность**: работа с аудио-потоками, обработка речи, генерация рекомендаций
4. **Завершение**: сохранение состояния, очистка памяти, выход

### Управление ресурсами

Приложение эффективно управляет ресурсами:
- **Ленивая инициализация** компонентов (например, аудио-конвейер создается только при необходимости)
- **Переконфигурация "на лету"** аудио-устройств и STT-провайдеров
- **Очистка ресурсов** при завершении встречи или выходе из приложения
- **Обработка ошибок** и восстановление после сбоев (через electron-log)

### Система логирования

Логирование реализовано через [`electron-log`](electron/utils/logger.ts:1) в отдельном модуле:
- Запись в файл `natively_debug.log` в папке Documents
- Вывод в консоль с форматированием
- Перехват `console.log/warn/error` для автоматического логирования
- Глобальные обработчики `uncaughtException` и `unhandledRejection`

### Архитектурные паттерны

- **Singleton**: `AppState`, `CredentialsManager`, `DatabaseManager`
- **Observer/Pub-Sub**: система событий между компонентами
- **Dependency Injection**: передача зависимостей между модулями
- **Factory**: динамическое создание STT-провайдеров в зависимости от настроек
- **Facade**: `WindowHelper` предоставляет унифицированный интерфейс управления окнами

Эта архитектура позволяет Natively быть одновременно мощным и гибким, поддерживая сложную функциональность при сохранении высокой производительности и безопасности.
