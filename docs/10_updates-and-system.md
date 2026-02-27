## 10. Development and Functionality Extension

Natively is designed as an open project that can be easily modified, extended, and adapted for specific needs. The application architecture allows developers to make changes at all levels — from user interface to AI core.

### Project Structure for Development

#### Main Directories
```
natively/
├── main/                  # Electron main process
├── services/              # Service components (KeybindManager, CredentialsManager)
├── audio/                 # Audio system (SystemAudioCapture, GoogleSTT, RestSTT)
├── db/                    # Database operations (DatabaseManager)
├── rag/                   # RAG system (RAGManager)
├── update/                # Updates (ReleaseNotesManager)
├── assets/                # Assets (icons, disguise)
└── src/                   # Frontend (React/Vite)
    ├── components/
    ├── views/
    └── App.tsx
```

### Development Environment Setup

#### Requirements
- **Node.js** (v20+ recommended)
- **Git**
- **Rust** (for native audio capture)

#### Installing Dependencies
```bash
git clone https://github.com/evinjohnn/natively-cluely-ai-assistant.git
cd natively-cluely-ai-assistant
bun install
```

#### Environment Variables
Create a `.env` file:
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

#### Running in Development Mode
```bash
bun start
```

#### Building Distribution
```bash
bun run dist
```

### Extending Functionality

#### Adding New STT Provider
To integrate a new speech recognition provider:

1. Create a new class implementing STT interface:
```typescript
// audio/NewProviderSTT.ts
export class NewProviderSTT extends EventEmitter {
  constructor(private apiKey: string) {
    super();
  }

  start(): void {
    // Logic for starting streaming transcription
  }

  stop(): void {
    // Stop
  }

  write(chunk: Buffer): void {
    // Process audio chunk
  }

  private handleTranscript(text: string, isFinal: boolean): void {
    this.emit('transcript', { text, isFinal });
  }
}
```

2. Integrate into `setupSystemAudioPipeline()`:
```typescript
if (sttProvider === 'newprovider') {
  const apiKey = CredentialsManager.getInstance().getNewProviderApiKey();
  if (apiKey) {
    this.googleSTT = new NewProviderSTT(apiKey);
  }
}
```

#### Adding New LLM Provider
To connect a new AI model:

1. Extend `LLMHelper`:
```typescript
// processing/LLMHelper.ts
async generateResponse(prompt: string, model: string): Promise<string> {
  if (model.startsWith('newprovider/')) {
    return this.callNewProviderApi(prompt, model);
  }
  // ... other providers
}
```

2. Add handler in IPC:
```typescript
ipcMain.handle('generate-response', async (event, { prompt, model }) => {
  return await llmHelper.generateResponse(prompt, model);
});
```

#### New Hotkeys
Add new combinations via `KeybindManager`:

```typescript
// services/KeybindManager.ts
private defaultKeybinds = {
  "general": {
    "toggle-visibility": "CmdOrCtrl+Shift+Space",
    "take-screenshot": "CmdOrCtrl+H",
    "custom-action": "CmdOrCtrl+Alt+C" // New combination
  },
  "ai": {
    "manual-prompt": "CmdOrCtrl+M",
    "regenerate-answer": "CmdOrCtrl+R"
  }
}
```

### Interface Modification

#### Component Structure
Frontend is built on React using Vite:
- **App.tsx**: root component
- **components/**: reusable UI components
- **views/**: pages and views

#### Adding New Views
1. Create new component:
```tsx
// src/views/CustomView.tsx
const CustomView = () => {
  return (
    <div className="custom-view">
      <h2>My Extension</h2>
      {/* Custom interface */}
    </div>
  );
};
```

2. Integrate with main process via IPC:
```typescript
// In main process
ipcMain.handle('custom-action', async () => {
  // Processing logic
  return result;
});
```

### Extending RAG System

#### Custom Embeddings
You can add support for custom embedding creation methods:

```typescript
// rag/RAGManager.ts
async createEmbeddings(text: string): Promise<number[]> {
  // Can use local models or other providers
  if (this.useLocalEmbeddings) {
    return this.createLocalEmbedding(text);
  }
  return this.callGeminiEmbedding(text);
}
```

#### New Format Support
Extend document processing:
```typescript
// Add support for PDF, DOCX, presentations
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

### Testing and Debugging

#### Logging
The application has a built-in logging system:
```typescript
console.log('Message'); // Will be written to natively_debug.log
```

Logs are saved in:
- macOS: `~/Documents/natively_debug.log`
- Windows: `%USERPROFILE%\Documents\natively_debug.log`
- Linux: `~/Documents/natively_debug.log`

#### Debug Tools
- **Development Mode**: `NODE_ENV=development`
- **Built-in Audio Test**: microphone level checking
- **IPC DevTools**: monitoring messages between processes

### Building and Distribution

#### Generating Distributions
```bash
# Build for all platforms
bun run dist

# Or for specific platform
bun run dist:mac
bun run dist:win
bun run dist:linux
```

#### App Signing (macOS)
For distribution outside App Store:
```bash
# Need Apple Developer ID
electron-builder --mac --sign
```

### Contributing to the Project

#### Contribution Principles
1. **Fork** the repository
2. Create separate branch: `git checkout -b feature/my-feature`
3. Commit changes
4. Push to your fork
5. Create Pull Request

#### Contribution Types
- **Bug fixes**: especially in audio capture and STT
- **Documentation improvements**: README, code comments
- **New integrations**: AI providers, STT, calendars
- **UI/UX improvements**: themes, animations, performance
- **Testing**: unit tests, e2e tests

#### Code Requirements
- TypeScript with strict typing
- Clean, understandable code
- Comments on complex sections
- Compliance with existing architecture

### Licensing

The project is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**, which means:

1. **Complete freedom of use**: can be used for any purpose
2. **Mandatory source code disclosure**: if you modify and use the application over a network, you must provide source code
3. **No restrictions on commercial use**
4. **Transparency**: all changes are visible to community

### Future Development

#### Possible Extension Directions
1. **Mobile platform support** via Capacitor or React Native
2. **Professional services integration**: Jira, Notion, Salesforce
3. **Collaborative features**: secure knowledge sharing in teams
4. **Enhanced video analysis**: not just audio, but also visual context
5. **Multimodal model support**: simultaneous processing of text, audio, and video

Natively represents a powerful foundation for creating private, local AI assistants that can be adapted for any professional usage scenario.
