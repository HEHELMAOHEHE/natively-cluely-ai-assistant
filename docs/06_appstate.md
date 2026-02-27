## 6. State Management System (AppState)

The `AppState` class is the central component of Natively's architecture, implementing the Singleton pattern and serving as the single source of truth for the entire application.

### Architectural Role

`AppState` performs the functions of:
- **Central State Manager** - stores global application state
- **Module Orchestrator** - coordinates the work of all services and components
- **Event Bus** - ensures communication between Electron main process and renderer processes
- **Lifecycle Management** - controls application startup, operation, and shutdown

### Singleton Implementation

```typescript
private static instance: AppState | null = null

public static getInstance(): AppState {
  if (!AppState.instance) {
    AppState.instance = new AppState()
  }
  return AppState.instance
}
```

This implementation ensures that there is only one instance of `AppState` throughout the application, providing state consistency.

### Main Components and Dependencies

`AppState` integrates the following key modules:

#### Windows and Interface
- `WindowHelper` - main window, overlay, and other windows management
- `SettingsWindowHelper` - settings window management
- `ModelSelectorWindowHelper` - AI model selection
- `Tray` - system tray icon

#### Audio System
- `SystemAudioCapture` - system audio capture
- `MicrophoneCapture` - microphone capture
- `GoogleSTT` / `RestSTT` / `DeepgramStreamingSTT` - speech-to-text

#### AI Core
- `IntelligenceManager` - meeting context processing, answer generation
- `ProcessingHelper` - processing assistance, including LLM functionality
- `RAGManager` - local knowledge system with vector embeddings

#### Data and Storage
- `DatabaseManager` - SQLite database operations
- `ScreenshotHelper` - screenshot capture and management
- `ThemeManager` - interface theme management

#### System Services
- `KeybindManager` - hotkey management
- `CredentialsManager` - secure API key storage
- `ReleaseNotesManager` - release information management
- `autoUpdater` - automatic application updates

### Meeting State Management

#### Meeting Active Flag
```typescript
private isMeetingActive: boolean = false;
```
Key flag determining the current meeting state. Used for:
- Blocking transcription processing when meeting is not active
- Controlling audio capture start/stop
- Managing AI processing lifecycle

#### Meeting Start
```typescript
public async startMeeting(metadata?: any): Promise<void> {
  this.isMeetingActive = true;
  // ... component initialization
  this.setupSystemAudioPipeline();
  this.systemAudioCapture?.start();
  this.googleSTT?.start();
  // ...
}
```

#### Meeting End
```typescript
public async endMeeting(): Promise<void> {
  this.isMeetingActive = false; // Block new data
  // Stop audio capture
  this.systemAudioCapture?.stop();
  this.googleSTT?.stop();
  // Save and index results
  await this.intelligenceManager.stopMeeting();
  await this.processCompletedMeetingForRAG();
}
```

### Events and Broadcasting

`AppState` uses an event bus for communication with the interface:

```typescript
private broadcast(channel: string, ...args: any[]): void {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}
```

Main events:
- `update-available` - new update available
- `native-audio-transcript` - new transcription
- `intelligence-suggested-answer` - AI suggested answer
- `screenshot-taken` - screenshot taken
- `undetectable-changed` - stealth mode changed
- `disguise-changed` - disguise changed

### Configuration Management

#### Audio Reconfiguration
```typescript
public async reconfigureAudio(inputDeviceId?: string, outputDeviceId?: string): Promise<void> {
  // Stop existing captures
  this.systemAudioCapture?.stop();
  this.microphoneCapture?.stop();
  
  // Create new ones with specified devices
  this.systemAudioCapture = new SystemAudioCapture(outputDeviceId);
  this.microphoneCapture = new MicrophoneCapture(inputDeviceId);
}
```

#### STT Provider Reconfiguration
```typescript
public async reconfigureSttProvider(): Promise<void> {
  // Stop and clean up existing STT
  this.googleSTT?.stop();
  this.googleSTT?.removeAllListeners();
  this.googleSTT = null;
  
  // Reinitialize pipeline
  this.setupSystemAudioPipeline();
}
```

### Security and Privacy Modes

#### Stealth Mode
```typescript
public setUndetectable(state: boolean): void {
  this.isUndetectable = state;
  this.windowHelper.setContentProtection(state);
  
  // Apply disguise
  if (state && this.disguiseMode !== 'none') {
    this._applyDisguise(this.disguiseMode);
  } else if (!state) {
    this._applyDisguise('none');
  }
}
```

#### Application Disguise
```typescript
private _applyDisguise(mode: 'terminal' | 'settings' | 'activity' | 'none'): void {
  let appName = "";
  switch (mode) {
    case 'terminal': appName = "Terminal "; break;
    case 'settings': appName = "System Settings "; break;
    case 'activity': appName = "Activity Monitor "; break;
    default: appName = "Natively";
  }
  
  // Change process name
  process.title = appName;
  app.setName(appName);
  
  // Change icon
  const image = nativeImage.createFromPath(iconPath);
  app.dock.setIcon(image); // macOS
  
  // Change window titles
  launcher.setTitle(appName.trim());
}
```

### Update Management

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
  // Special handling for macOS
  if (process.platform === 'darwin') {
    // Open update folder
    await shell.openPath(updateDir);
    setTimeout(() => app.quit(), 1000);
    return;
  }
  
  // Standard installation for other OS
  autoUpdater.quitAndInstall(false, true);
}
```

### System Services Integration

#### Global Hotkeys
```typescript
// In initializeApp()
KeybindManager.getInstance().registerGlobalShortcuts()

// Update tray menu on changes
keybindManager.onUpdate(() => {
  this.updateTrayMenu();
});
```

#### Tray Operations
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

### Security and Memory Cleanup

```typescript
app.on("before-quit", () => {
  CredentialsManager.getInstance().scrubMemory();
  appState.processingHelper.getLLMHelper().scrubKeys();
})
```

Despite cleanup attempts, in JavaScript it is impossible to guaranteedly remove data from memory due to Garbage Collector behavior.

### Logging

```typescript
async function logToFile(msg: string) {
  if (!isDev) return;
  try {
    await fs.promises.appendFile(logFile, new Date().toISOString() + ' ' + msg + '\n');
  } catch (e) { /* Ignore */ }
}

// Override console.log for file writing
console.log = (...args: any[]) => {
  const msg = args.map(a => (a instanceof Error) ? a.stack || a.message : 
    (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile('[LOG] ' + msg);
  originalLog.apply(console, args);
};
```

### Application Initialization

```typescript
async function initializeApp() {
  await app.whenReady()
  
  // Initialize managers
  CredentialsManager.getInstance().init();
  const appState = AppState.getInstance()
  
  // Setup IPC handlers
  initializeIpcHandlers(appState)
  
  // Create windows
  appState.createWindow()
  
  // Register global hotkeys
  KeybindManager.getInstance().registerGlobalShortcuts()
  
  // Preload settings window
  appState.settingsWindowHelper.preloadWindow()
}
```

`AppState` represents a complex, multi-functional class that unifies all application components into a single coherent system, ensuring stable operation of Natively as a powerful AI assistant for professional meetings.
