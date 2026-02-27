## 2. Application Architecture

Natively is built as a classic Electron application with a separation between the **main process** and **renderer process**, but with an advanced architecture focused on performance, security, and privacy.

### Main Architecture Components

#### Central State Manager (AppState)
The `AppState` class is the core of the application and is implemented as a **Singleton** in [`electron/main.ts`](electron/main.ts:81), providing a single source of truth for all system components. It coordinates the work of all modules:
- Window management
- Audio capture and speech processing
- Intelligent AI processing
- Notification and event system
- Updates and installation
- Data storage and indexing

#### Modular Structure
The application is organized as a set of interacting modules:

```
electron/                      # Electron main process
├── main.ts                   # Entry point, AppState (Singleton)
├── preload.ts                # Preload script for secure IPC
├── WindowHelper.ts           # Window management
├── SettingsWindowHelper.ts  # Settings window
├── ModelSelectorWindowHelper.ts # Model selection window
├── ipcHandlers.ts            # IPC message handlers
├── IntelligenceManager.ts   # AI functions manager
├── LLMHelper.ts             # LLM helper
├── ProcessingHelper.ts      # Data processing
├── ScreenshotHelper.ts      # Screenshot capture
├── DonationManager.ts        # Donation management
├── ThemeManager.ts          # Theme management
│
├── audio/                    # Audio system
│   ├── SystemAudioCapture.ts   # System audio capture
│   ├── MicrophoneCapture.ts    # Microphone capture
│   ├── GoogleSTT            # Google Speech-to-Text
│   ├── RestSTT              # REST-based STT providers
│   ├── DeepgramStreamingSTT # Deepgram streaming STT
│   └── AudioDevices.ts         # Audio device management
│
├── llm/                      # LLM modules
│   ├── LLMHelper.ts          # Main LLM helper
│   ├── IntentClassifier.ts   # Intent classifier
│   ├── AnswerLLM.ts          # Answer generation
│   ├── AssistLLM.ts          # AI assistant
│   ├── RecapLLM.ts           # Summary generation
│   ├── FollowUpLLM.ts        # Follow-up questions
│   ├── FollowUpQuestionsLLM.ts # Clarifying questions generator
│   ├── WhatToAnswerLLM.ts    # Determine what to answer
│   ├── TemporalContextBuilder.ts # Time context
│   ├── transcriptCleaner.ts  # Transcript cleaning
│   ├── postProcessor.ts      # Post-processing
│   ├── prompts.ts            # LLM prompts
│   ├── types.ts              # TypeScript types
│   └── index.ts              # Module exports
│
├── services/                 # Service components
│   ├── KeybindManager.ts     # Hotkey management
│   ├── CredentialsManager.ts # Secure credential storage
│   ├── CalendarManager.ts    # Calendar integration
│   ├── InstallPingManager.ts # Install ping
│   └── RateLimiter.ts        # Rate limiting
│
├── db/                       # Database
│   ├── DatabaseManager.ts    # SQLite management
│   ├── seedDemo.ts           # Demo data
│   └── test-db.ts            # DB testing
│
├── rag/                      # RAG system
│   ├── RAGManager.ts         # RAG manager
│   ├── RAGRetriever.ts       # Relevant data retrieval
│   ├── EmbeddingPipeline.ts  # Embedding pipeline
│   ├── VectorStore.ts        # Vector storage
│   ├── SemanticChunker.ts    # Semantic chunking
│   ├── TranscriptPreprocessor.ts # Transcript preprocessor
│   ├── prompts.ts            # RAG prompts
│   └── index.ts              # Module exports
│
├── update/                   # Updates
│   └── ReleaseNotesManager.ts # Release notes management
│
├── config/                   # Configuration
│   └── languages.ts          # Supported languages
│
└── utils/                    # Utilities
    ├── logger.ts             # Logging (electron-log)
    ├── curlUtils.ts          # Curl utilities
    └── emailUtils.ts         # Email utilities
```

#### Renderer Process Structure

```
src/
├── components/               # React components
│   ├── Launcher.tsx          # Main launcher component
│   ├── NativelyInterface.tsx # Main interface
│   ├── SettingsOverlay.tsx   # Settings overlay
│   ├── SettingsPopup.tsx     # Settings popup
│   ├── MeetingDetails.tsx    # Meeting details
│   ├── GlobalChatOverlay.tsx  # Global chat
│   ├── MeetingChatOverlay.tsx # Meeting chat
│   ├── FollowUpEmailModal.tsx # Follow-up email modal
│   ├── FeatureSpotlight.tsx   # Feature demonstration
│   ├── TopSearchPill.tsx      # Search bar
│   ├── UpdateBanner.tsx       # Update banner
│   ├── UpdateModal.tsx        # Update modal
│   │
│   ├── Queue/                 # Screenshot queue
│   ├── Solutions/            # Solutions
│   ├── settings/              # UI settings
│   │   ├── AIProvidersSettings.tsx
│   │   ├── GeneralSettings.tsx
│   │   └── Sidebar.tsx
│   └── ui/                    # Reusable UI components
│
├── _pages/                   # Pages
│   ├── Debug.tsx             # Debug page
│   ├── Queue.tsx             # Queue page
│   └── Solutions.tsx         # Solutions page
│
├── App.tsx                   # Root component
├── main.tsx                  # React entry point
└── index.css                 # Global styles
```

### Execution Flows

#### Main Process
Responsible for:
- Creating and managing browser windows
- System integrations (tray icon, global hotkeys)
- Audio and screen capture
- File system operations
- Application updates
- Coordination between different services
- Logging via [`electron-log`](electron/utils/logger.ts:1)

#### Renderer Process
Implemented as a modern React application on Vite:
- User interface
- Display of transcriptions and AI recommendations
- Settings management
- Access to meeting history
- Visualization of analytics and API usage

### Event and Communication System

IPC (Inter-Process Communication) is used between main and renderer processes for secure interaction:

```typescript
// Example: sending event from main process
this.broadcast("update-available", info)

// Example: handling in renderer process
ipcRenderer.on('intelligence-suggested-answer', handleSuggestedAnswer)
```

An internal event system using EventEmitter is also implemented for communication between main process modules:
- `startMeeting` / `endMeeting` - meeting start and end
- `assist_update` - AI recommendations update
- `suggested_answer` - suggested answer
- `recap` - meeting summary
- `follow_up_questions_update` - clarifying questions

### Application Lifecycle

1. **Initialization**: logging initialization, configuration loading, update checking, AppState instance creation
2. **Ready**: main window creation, global hotkey registration
3. **Active**: working with audio streams, speech processing, recommendations generation
4. **Shutdown**: state saving, memory cleanup, exit

### Resource Management

The application efficiently manages resources:
- **Lazy initialization** of components (e.g., audio pipeline is created only when needed)
- **Live reconfiguration** of audio devices and STT providers
- **Resource cleanup** when meeting ends or application exits
- **Error handling** and recovery from failures (via electron-log)

### Logging System

Logging is implemented via [`electron-log`](electron/utils/logger.ts:1) in a separate module:
- Writing to `natively_debug.log` in Documents folder
- Console output with formatting
- Intercepting `console.log/warn/error` for automatic logging
- Global handlers for `uncaughtException` and `unhandledRejection`

### Architectural Patterns

- **Singleton**: `AppState`, `CredentialsManager`, `DatabaseManager`
- **Observer/Pub-Sub**: event system between components
- **Dependency Injection**: passing dependencies between modules
- **Factory**: dynamic STT provider creation based on settings
- **Facade**: `WindowHelper` provides unified window management interface

This architecture allows Natively to be both powerful and flexible, supporting complex functionality while maintaining high performance and security.
