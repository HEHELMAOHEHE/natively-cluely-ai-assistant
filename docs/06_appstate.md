## 6. Система управления состоянием (AppState)

Класс `AppState` является центральным компонентом архитектуры Natively, реализующим паттерн Singleton и выступающим в роли единого источника правды для всего приложения.

### Архитектурная роль

`AppState` выполняет функции:
- **Центрального менеджера состояния** - хранит глобальное состояние приложения
- **Оркестратора модулей** - координирует работу всех сервисов и компонентов
- **Шины событий** - обеспечивает коммуникацию между основным процессом Electron и процессами рендеринга
- **Управления жизненным циклом** - контролирует запуск, работу и завершение приложения

### Реализация Singleton

```typescript
private static instance: AppState | null = null

public static getInstance(): AppState {
  if (!AppState.instance) {
    AppState.instance = new AppState()
  }
  return AppState.instance
}
```

Эта реализация гарантирует, что во всем приложении существует только один экземпляр `AppState`, обеспечивая согласованность состояния.

### Основные компоненты и зависимости

`AppState` интегрирует следующие ключевые модули:

#### Окна и интерфейс
- `WindowHelper` - управление главным окном, оверлеем и другими окнами
- `SettingsWindowHelper` - управление окном настроек
- `ModelSelectorWindowHelper` - выбор модели ИИ
- `Tray` - иконка в системном трее

#### Аудио-система
- `SystemAudioCapture` - захват системного звука
- `MicrophoneCapture` - захват микрофона
- `GoogleSTT` / `RestSTT` / `DeepgramStreamingSTT` - преобразование речи в текст

#### Ядро ИИ
- `IntelligenceManager` - обработка контекста встречи, генерация ответов
- `ProcessingHelper` - помощь в обработке, включая LLM-функциональность
- `RAGManager` - локальная система знаний с векторными эмбеддингами

#### Данные и хранилище
- `DatabaseManager` - работа с SQLite базой данных
- `ScreenshotHelper` - захват и управление скриншотами
- `ThemeManager` - управление темами интерфейса

#### Системные сервисы
- `KeybindManager` - управление горячими клавишами
- `CredentialsManager` - безопасное хранение API-ключей
- `ReleaseNotesManager` - управление информацией о релизах
- `autoUpdater` - автоматическое обновление приложения

### Управление состоянием встречи

#### Флаг активности встречи
```typescript
private isMeetingActive: boolean = false;
```
Ключевой флаг, определяющий состояние текущей встречи. Используется для:
- Блокировки обработки транскрипций при неактивной встрече
- Контроля запуска/остановки аудио-захвата
- Управления жизненным циклом ИИ-обработки

#### Начало встречи
```typescript
public async startMeeting(metadata?: any): Promise<void> {
  this.isMeetingActive = true;
  // ... инициализация компонентов
  this.setupSystemAudioPipeline();
  this.systemAudioCapture?.start();
  this.googleSTT?.start();
  // ...
}
```

#### Завершение встречи
```typescript
public async endMeeting(): Promise<void> {
  this.isMeetingActive = false; // Блокировка новых данных
  // Остановка аудио-захвата
  this.systemAudioCapture?.stop();
  this.googleSTT?.stop();
  // Сохранение и индексация результатов
  await this.intelligenceManager.stopMeeting();
  await this.processCompletedMeetingForRAG();
}
```

### События и широковещательная передача

`AppState` использует шину событий для коммуникации с интерфейсом:

```typescript
private broadcast(channel: string, ...args: any[]): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}
```

Основные события:
- `update-available` - доступно новое обновление
- `native-audio-transcript` - новая транскрипция
- `intelligence-suggested-answer` - предложенный ответ от ИИ
- `screenshot-taken` - сделан скриншот
- `undetectable-changed` - изменение режима невидимости
- `disguise-changed` - изменение маскировки

### Управление конфигурацией

#### Переконфигурация аудио
```typescript
public async reconfigureAudio(inputDeviceId?: string, outputDeviceId?: string): Promise<void> {
  // Остановка существующих захватов
  this.systemAudioCapture?.stop();
  this.microphoneCapture?.stop();
  
  // Создание новых с указанными устройствами
  this.systemAudioCapture = new SystemAudioCapture(outputDeviceId);
  this.microphoneCapture = new MicrophoneCapture(inputDeviceId);
}
```

#### Переконфигурация STT-провайдера
```typescript
public async reconfigureSttProvider(): Promise<void> {
  // Остановка и очистка существующих STT
  this.googleSTT?.stop();
  this.googleSTT?.removeAllListeners();
  this.googleSTT = null;
  
  // Повторная инициализация пайплайна
  this.setupSystemAudioPipeline();
}
```

### Режимы безопасности и приватности

#### Режим невидимости
```typescript
public setUndetectable(state: boolean): void {
  this.isUndetectable = state;
  this.windowHelper.setContentProtection(state);
  
  // Применение маскировки
  if (state && this.disguiseMode !== 'none') {
    this._applyDisguise(this.disguiseMode);
  } else if (!state) {
    this._applyDisguise('none');
  }
}
```

#### Маскировка приложения
```typescript
private _applyDisguise(mode: 'terminal' | 'settings' | 'activity' | 'none'): void {
  let appName = "";
  switch (mode) {
    case 'terminal': appName = "Terminal "; break;
    case 'settings': appName = "System Settings "; break;
    case 'activity': appName = "Activity Monitor "; break;
    default: appName = "Natively";
  }
  
  // Изменение названия процесса
  process.title = appName;
  app.setName(appName);
  
  // Изменение иконки
  const image = nativeImage.createFromPath(iconPath);
  app.dock.setIcon(image); // macOS
  
  // Изменение заголовков окон
  launcher.setTitle(appName.trim());
}
```

### Управление обновлениями

```typescript
private setupAutoUpdater(): void {
  autoUpdater.on("update-available", async (info) => {
    this.updateAvailable = true;
    this.broadcast("update-available", info);
  });
  
  autoUpdater.on("update-downloaded", (info) => {
    this.broadcast("update-downloaded", info);
  });
}

public async quitAndInstallUpdate(): Promise<void> {
  // Особая обработка для macOS
  if (process.platform === 'darwin') {
    // Открытие папки с обновлением
    await shell.openPath(updateDir);
    setTimeout(() => app.quit(), 1000);
    return;
  }
  
  // Стандартная установка для других ОС
  autoUpdater.quitAndInstall(false, true);
}
```

### Интеграция с системными сервисами

#### Глобальные горячие клавиши
```typescript
// В initializeApp()
KeybindManager.getInstance().registerGlobalShortcuts()

// Обновление меню трэя при изменениях
keybindManager.onUpdate(() => {
  this.updateTrayMenu();
});
```

#### Работа с треем
```typescript
public createTray(): void {
  this.tray = new Tray(trayIcon)
  this.tray.setToolTip('Natively - Press Cmd+Shift+Space to show')
  this.updateTrayMenu();
}

private updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Natively', click: () => this.centerAndShowWindow() },
    { label: 'Take Screenshot', click: () => this.takeScreenshot() },
    { label: 'Quit', click: () => app.quit() }
  ])
  this.tray.setContextMenu(contextMenu)
}
```

### Безопасность и очистка памяти

```typescript
app.on("before-quit", () => {
  CredentialsManager.getInstance().scrubMemory();
  appState.processingHelper.getLLMHelper().scrubKeys();
})
```

Несмотря на попытки очистки, в JavaScript невозможно гарантированно удалить данные из памяти из-за особенностей работы Garbage Collector.

### Логирование

```typescript
async function logToFile(msg: string) {
  if (!isDev) return;
  try {
    await fs.promises.appendFile(logFile, new Date().toISOString() + ' ' + msg + '\n');
  } catch (e) { /* Ignore */ }
}

// Переопределение console.log для записи в файл
console.log = (...args: any[]) => {
  const msg = args.map(a => (a instanceof Error) ? a.stack || a.message : 
    (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile('[LOG] ' + msg);
  originalLog.apply(console, args);
};
```

### Инициализация приложения

```typescript
async function initializeApp() {
  await app.whenReady()
  
  // Инициализация менеджеров
  CredentialsManager.getInstance().init();
  const appState = AppState.getInstance()
  
  // Настройка IPC-обработчиков
  initializeIpcHandlers(appState)
  
  // Создание окон
  appState.createWindow()
  
  // Регистрация глобальных горячих клавиш
  KeybindManager.getInstance().registerGlobalShortcuts()
  
  // Предварительная загрузка окна настроек
  appState.settingsWindowHelper.preloadWindow()
}
```

`AppState` представляет собой сложный, многофункциональный класс, который объединяет все компоненты приложения в единую согласованную систему, обеспечивая стабильную работу Natively как мощного ИИ-ассистента для профессиональных встреч.

