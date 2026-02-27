## 3. Technology Stack

Natively is built on modern and reliable technologies that ensure high performance, cross-platform compatibility, and security. The project uses a combination of web technologies for the interface and native components for system integration.

### Core Technologies

#### Frontend
- **React 19** — library for building user interfaces
- **Vite** — modern bundler with instant hot reload during development
- **TypeScript** — strict typing for improved code reliability
- **TailwindCSS 3** — utility-first styling framework
- **Electron 40** — platform for building desktop applications using Chromium and Node.js
- **TanStack Query v5** — async state management for React

#### Backend and Main Process
- **Node.js (v20+)** — JavaScript runtime
- **Rust** — used for native audio capture directly from the system
- **Electron** — provides access to operating system APIs
- **SQLite** — local relational database for storing transcripts, metadata, and vector embeddings
- **IPC (Inter-Process Communication)** — mechanism for communication between Electron main process and renderer processes

#### Artificial Intelligence System
- **Google Cloud Speech-to-Text** — speech-to-text via Google STT
- **Groq** — ultra-fast AI acceleration with Llama 3 models
- **OpenAI Whisper** — speech transcription from OpenAI
- **Deepgram** — cloud speech recognition
- **ElevenLabs** — advanced speech recognition
- **Azure Speech Services** — Microsoft speech recognition services
- **IBM Watson** — IBM speech recognition system

#### AI Models
- **Gemini 3 Pro/Flash** — recommended option with huge context window (2M tokens) and low cost
- **OpenAI GPT-5.2** — high reasoning capabilities
- **Anthropic Claude 4.5** — excellent code understanding and complex tasks
- **Groq/Llama 3** — incredible response speed (almost instant)
- **Ollama** — support for fully local models (Llama 3, Mistral, Gemma, CodeLlama)

#### Additional Technologies
- **Sharp** — optimized image processing library for fast screenshot analysis
- **electron-updater** — automatic application updates
- **AutoUpdater** — update manager for Electron applications
- **ReleaseNotesManager** — release information management

### Architectural Decisions

#### Client-Server Model within Electron
The application uses a classic Electron architecture:
- **Main Process**: manages application lifecycle, windows, system events, audio capture, and database
- **Renderer Process**: responsible for interface display, user interaction, and AI results visualization

Communication between these processes is handled via IPC (Inter-Process Communication), ensuring security and isolation.

#### Local Storage and RAG
- **SQLite** is used as the primary data storage
- **Local RAG (Retrieval Augmented Generation)** system with local vector database is implemented
- All vector embeddings are created and stored exclusively on the user's device
- Semantic search across meeting history is supported ("What did John say about API last week?")

#### Audio System
- **System Audio Capture** — captures audio directly from the operating system (Zoom, Teams, Meet)
- **Microphone Capture** — separate channel for user's microphone
- Dual audio channel support: one for interlocutors, another for user's commands
- Native Rust implementation for efficient system audio capture without latency

### Dependency Management
The project uses npm/yarn for package management:
```bash
npm install
```

Key dependencies include:
- `electron` 40.x — application foundation
- `react` 19, `react-dom` 19 — interface
- `@tanstack/react-query` v5 — async state management
- `vite` — bundler
- `better-sqlite3` — database operations
- `sharp` — image processing
- `axios/fetch` — API HTTP requests
- `electron-store` — persistent configuration storage

### External Service Integrations

#### BYOK (Bring Your Own Keys)
User provides their own keys for cloud services:
- `GEMINI_API_KEY` — for Gemini access
- `GROQ_API_KEY` — for Groq usage
- `OPENAI_API_KEY` — for OpenAI
- `CLAUDE_API_KEY` — for Anthropic Claude
- `GOOGLE_APPLICATION_CREDENTIALS` — path to Google service account JSON file for STT

#### .env Configuration
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
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus

# Local AI (Ollama)
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434

# Default Model Configuration
DEFAULT_MODEL=gemini-3-flash-preview
```

### System Requirements

#### Minimum Requirements:
- **Operating System**: macOS, Windows, or Linux
- **RAM**: 4GB (minimum), 8GB+ recommended
- **Disk Space**: ~500MB for installation + storage space for recordings
- **Node.js**: v20 or higher
- **Git**: for cloning the repository
- **Rust**: required for compiling native audio components

#### Recommended Configurations:
- For cloud models: 8GB RAM, stable internet connection
- For local models (Ollama): 16GB+ RAM, powerful CPU/GPU

This technology stack allows Natively to be simultaneously powerful, flexible, and private, combining best practices of web development with deep operating system integration.
