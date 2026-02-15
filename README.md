<<<<<<< HEAD
# Natively  -  Trusted by 1000+ users



Natively - The invisible desktop assistant that provides real-time insights, answers, and support during meetings, interviews, presentations, and professional conversations.

## 🎬 Demo

![Natively Demo](demo.gif)

## 🚀 Quick Start Guide
**For Personal Use:**
Download the latest version from [Releases](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases)

### Prerequisites (For Development)
- **Node.js**: Installed on your computer (v20+ recommended)
- **Git**: Installed on your computer
- **Rust**: Required for building the native audio capture module

- **AI Credentials**:
  - **Gemini API Key**: Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - **Google Service Account**: Required for real-time speech-to-text accuracy.
### Bring Your Own Google Speech-to-Text (BYOK)

**CRITICAL: Google Service Account is REQUIRED for transcription.**
Natively relies on Google Speech-to-Text for real-time transcription. Without a valid Google Service Account, the application's core transcription features will NOT function.

You must provide your own Google Cloud Service Account JSON key.
**Your credentials never leave your machine and are used only locally.** We do not proxy, log, upload, or store your keys — ever.

#### Why BYOK?
- You control billing & quotas
- No shared keys, no rate limits
- No hidden usage or tracking
- Works offline (except for Google STT calls)

#### What You Need
- A Google Cloud account
- Billing enabled
- A Service Account with Speech-to-Text access
- A JSON key file

#### Create a Google STT Service Account

**1. Create / Select a Google Cloud Project**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select an existing one
- Enable billing

**2. Enable Speech-to-Text API**
- Go to **APIs & Services** -> **Library**
- Search for and enable **Cloud Speech-to-Text API**

**3. Create a Service Account**
- Go to **IAM & Admin** -> **Service Accounts** -> **Create Service Account**
- Name: `natively-stt` (or similar)
- Description: Optional

**4. Assign Permission**
- Add this specific role: **Speech-to-Text User** (`roles/speech.client`)
- *Do NOT use Owner or Editor roles unless testing*

**5. Create a JSON Key**
- Open the newly created service account
- Go to **Keys** -> **Add Key** -> **Create new key**
- Choose **JSON**
- Download the file and save it safely.
- **Action**: Set the Service Account location in the Natively settings to this file.

#### How to Claim the $300 Credit

1. Go to [cloud.google.com](https://cloud.google.com)
2. Click "Get started for free"
3. Sign in with a Google account
4. Enter billing details (card required for verification)
5. Accept the free trial
6. You will instantly receive $300 credit valid for 90 days

### Installation Steps

1. Clone the repository:
=======
<div align="center">
  <img src="assets/icon.png" width="150" alt="Natively AI Assistant Logo">

  # Natively – Open Source AI Meeting Assistant & Cluely Alternative

  [![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey?style=flat-square)](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases)
  [![Downloads](https://img.shields.io/github/downloads/evinjohnn/natively-cluely-ai-assistant/total?style=flat-square&color=success)](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases)
  ![Repo Views](https://img.shields.io/badge/Views-13.4k-lightgrey?style=flat-square)
  [![Stars](https://img.shields.io/github/stars/evinjohnn/natively-cluely-ai-assistant?style=flat-square)](https://github.com/evinjohnn/natively-cluely-ai-assistant)
  ![Status](https://img.shields.io/badge/Status-active-success?style=flat-square)

</div>

---

<div align="center">

> **Natively** is a **free, privacy-first AI Copilot** for **Google Meet, Zoom, and Teams**. It serves as an open-source alternative to Cluely, providing **real-time transcription**, **interview assistance**, and **automated meeting notes** completely locally.

Unlike cloud-only tools, Natively uses **Local RAG (Retrieval Augmented Generation)** to remember past conversations, giving you instant answers during **technical interviews**, **sales calls**, and **daily standups**.

</div>

---

## Why Natively?

While other tools focus on being "lightweight" wrappers, Natively is a complete intelligence system.

- **Local Vector Database (RAG):** We embed your meetings locally so you can ask, "What did John say about the API last week?"
- **Rich Dashboard:** A full UI to manage, search, and export your history—not just a floating window.
- **Rolling Context:** We don't just transcribe; we maintain a "memory window" of the conversation for smarter answers.

---

<div align="center">

[![Portfolio](https://img.shields.io/badge/Portfolio-evinjohn.vercel.app-blueviolet?style=flat-square&logo=vercel&logoColor=white)](https://evinjohn.vercel.app/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/evinjohn/)
[![X](https://img.shields.io/badge/X-@evinjohnn-black?style=flat-square&logo=x&logoColor=white)](https://x.com/evinjohnn)
[![Hire Me](https://img.shields.io/badge/Hire_Me-Contact-success?style=flat-square&logo=gmail&logoColor=white)](mailto:evinjohnn@gmail.com?subject=Natively%20-%20Hiring%20Inquiry)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-FFDD00?style=flat-square&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/evinjohnn)

</div>

## Demo

![Natively AI Assistant Demo - Real-time Interview Helper and Transcription](assets/natively-ai-meeting-assistant-demo.gif)

This demo shows **a complete live meeting scenario**:
- Real-time transcription as the meeting happens  
- Rolling context awareness across multiple speakers  
- Screenshot analysis of shared slides  
- Instant generation of what to say next  
- Follow-up questions and concise responses  
- All happening live, without recording or post-processing  

---

<div align="center">

### Download Natively
*The privacy-first AI assistant for meetings.*

[![Download for macOS](https://img.shields.io/badge/Download_for-macOS-white?style=for-the-badge&logo=apple&logoColor=black)](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases/latest)
[![Download for Windows](https://img.shields.io/badge/Download_for-Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases/tag/v1.1.2)

<small>Requires macOS 12+ or Windows 10/11</small>
</div>

> [!NOTE]
> **macOS Users:**
> 
> 1.  **"Unidentified Developer"**: If you see this, Right-click the app > Select **Open** > Click **Open**.
> 2.  **"App is Damaged"**: If you see this (common with DMGs), run this in Terminal:
>     ```bash
>     xattr -cr /Applications/Natively.app
>     ```
>     *(Or point to wherever you installed the app)*

### What's New in v1.1.6
- **Expanded Speech Providers:** First-class support for **Google, Groq, OpenAI, Deepgram, ElevenLabs, Azure, and IBM Watson**.
- **Custom Key Bindings:** Fully customizable global shortcuts for window actions.
- **Stealth Mode 2.0:** Enhanced masquerading (Terminal, Activity Monitor) and "undetectable" dock mode.
- **Markdown Rendering:** Improved formatting and code highlighting in the Usage View.
- **Performance:** Optimized image analysis with `sharp` and lower latency interactions.
- **Models:** Support for **Gemini 3**, **GPT-5.2**, **Groq Llama 3.3**, **Claude 4.5** or any other LLM provider.

---


## Table of Contents

- [Why Natively?](#why-natively)
- [Privacy & Security](#privacy--security-core-design-principle)
- [Quick Start (End Users)](#quick-start-end-users)
- [Installation (Developers)](#installation-developers--contributors)
- [AI Providers](#ai-providers)
- [Key Features](#key-features)
- [Meeting Intelligence Dashboard](#meeting-intelligence-dashboard)
- [Use Cases](#use-cases)
- [Comparison](#comparison)
- [FAQ](#faq)
- [Architecture Overview](#architecture-overview)
- [Technical Details](#technical-details)
- [Known Limitations](#known-limitations)
- [Responsible Use](#responsible-use)
- [Contributing](#contributing)
- [License](#license)

---

## What Is Natively?

**Natively** is a **desktop AI assistant for live situations**:
- Meetings
- Interviews
- Presentations
- Classes
- Professional conversations

It provides:
- Live answers
- Rolling conversational context
- Screenshot and document understanding
- Real-time speech-to-text
- Instant suggestions for what to say next

All while remaining **invisible, fast, and privacy-first**.

---

## Privacy & Security (Core Design Principle)

- 100% open source (AGPL-3.0)
- Bring Your Own Keys (BYOK)
- Local AI option (Ollama)
- All data stored locally
- No telemetry
- No tracking
- No hidden uploads

You explicitly control:
- What runs locally
- What uses cloud AI
- Which providers are enabled

---

## Installation (Developers & Contributors)

### Prerequisites
- Node.js (v20+ recommended)
- Git
- Rust (required for native audio capture)

### AI Credentials & Speech Providers

**Natively is 100% free to use with your own keys.**  
Connect **any** speech provider and **any** LLM. No subscriptions, no markups, no hidden fees. All keys are stored locally.

### Unlimited Free Transcription (Whisper, Google, Deepgram)
- **Google Cloud Speech-to-Text** (Service Account)
- **Groq** (API Key)
- **OpenAI Whisper** (API Key)
- **Deepgram** (API Key)
- **ElevenLabs** (API Key)
- **Azure Speech Services** (API Key + Region)
- **IBM Watson** (API Key + Region)

### AI Engine Support (Bring Your Own Key)
Connect Natively to **any** leading model or local inference engine.

| Provider | Best For |
| :--- | :--- |
| **Gemini 3 Pro/Flash** | Recommended: Massive context window (2M tokens) & low cost. |
| **OpenAI (GPT-5.2)** | High reasoning capabilities. |
| **Anthropic (Claude 4.5)** | Coding & complex nuanced tasks. |
| **Groq / Llama 3** | insane speed (near-instant answers). |
| **Ollama / LocalAI** | 100% Offline & Private (No API keys needed). |
| **OpenAI-Compatible** | Connect to *any* custom endpoint (vLLM, LM Studio, etc.) |

> **Note:** You only need ONE speech provider to get started. We recommend **Google STT** ,**Groq** or **Deepgram** for the fastest real-time performance.  

---
#### To Use Google Speech-to-Text (Optional)

Your credentials:
- Never leave your machine
- Are not logged, proxied, or stored remotely
- Are used only locally by the app

What You Need:
- Google Cloud account
- Billing enabled
- Speech-to-Text API enabled
- Service Account JSON key

Setup Summary:
1. Create or select a Google Cloud project  
2. Enable Speech-to-Text API  
3. Create a Service Account  
4. Assign role: `roles/speech.client`  
5. Generate and download a JSON key  
6. Point Natively to the JSON file in settings 

---

## Development Setup

### Clone the Repository
>>>>>>> main
```bash
git clone https://github.com/evinjohnn/natively-cluely-ai-assistant.git
cd natively-cluely-ai-assistant
```

<<<<<<< HEAD
2. Install dependencies:
```bash
npm install
# Note: This automatically builds the Rust native audio module
```

3. Set up environment variables:
   - Create a file named `.env` in the root folder
   
   **For Gemini (Cloud AI) & Speech-to-Text:**
   ```env
   GEMINI_API_KEY=your_api_key_here
   GROQ_API_KEY=your_groq_key_here
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-service-account.json
   ```
   
   **For Ollama (Local/Private AI):**
   ```env
   USE_OLLAMA=true
   OLLAMA_MODEL=llama3.2
   OLLAMA_URL=http://localhost:11434
   ```
   
   - Save the file

### Running the App

#### Method 1: Development Mode (Recommended for first run)
1. Start the development server:
=======
### Install Dependencies
```bash
npm install
```

### Environment Variables
Create a `.env` file:

```env
# Cloud AI
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
CLAUDE_API_KEY=your_key
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

# Speech Providers (Optional - only one needed)
DEEPGRAM_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=eastus
IBM_WATSON_API_KEY=your_key
IBM_WATSON_REGION=us-south

# Local AI (Ollama)
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434

# Default Model Configuration
DEFAULT_MODEL=gemini-3-flash-preview
```

### Run (Development)
>>>>>>> main
```bash
npm start
```

<<<<<<< HEAD
This command automatically:
- Starts the Vite dev server on port 5180
- Waits for the server to be ready
- Launches the Electron app

#### Method 2: Production Build
```bash
npm run dist
```
The built app will be in the `release` folder.

## 🤖 AI Provider Options

### Ollama (Recommended for Privacy)
**Pros:**
- 100% private - data never leaves your computer
- No API costs
- Works offline
- Supports many models: `llama3.2`, `codellama`, `mistral`, etc.

**Setup:**
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3.2`
3. Set environment variables as shown above

### Google Gemini
**Pros:**
- Latest AI technology (Gemini 3.0 Flash/Pro)
- Fast responses
- Best accuracy for complex tasks and multimodal analysis

**Cons:**
- Requires API key and internet
- Data sent to Google servers
- Usage costs may apply (though free tier is generous)

### Groq
**Pros:**
- Super fast inference
- Free tier available

**Cons:**
- No multimodal (vision) responses via Groq directly in this implementation context (usually text-only)

## ⚠️ Important Notes

1. **Closing the App**: 
   - Press `Cmd + Q` (Mac) or `Ctrl + Q` (Windows/Linux) to quit
   - Or use Activity Monitor/Task Manager to close `Natively`
   - The X button currently doesn't work (known issue)

2. **If the app doesn't start**:
   - Make sure no other app is using port 5180
   - Try killing existing processes:
     ```bash
     # Find processes using port 5180
     lsof -i :5180
     # Kill them (replace [PID] with the process ID)
     kill [PID]
     ```
   - For Ollama users: Make sure Ollama is running (`ollama serve`)

3. **Keyboard Shortcuts**:
   - `Cmd/Ctrl + B`: Toggle window visibility
   - `Cmd/Ctrl + H`: Take screenshot (Smart Analysis)
   - `Cmd/Ctrl + Shift + H`: Take selective screenshot
   - `Cmd + Enter`: Get solution / Send message
   - `Cmd/Ctrl + Arrow Keys`: Move window

#### General Installation Issues
If you see other errors:
1. Delete the `node_modules` folder
2. Delete `package-lock.json` 
3. Run `npm install` again
4. Try running with `npm start`

### Platform-Specific Notes
- **Windows**: Looking for maintainers
- **Ubuntu/Linux**: Looking for maintainers
- **macOS**: Native support with proper window management

## Key Features

### **Invisible AI Assistant**
- Translucent, always-on-top window that's barely noticeable
- Hide/show instantly with global hotkeys
- Works seamlessly across all applications

### **Smart Screenshot Analysis** 
- Take screenshots of any content with `Cmd/Ctrl + H`
- AI analyzes images, documents, presentations, or problems
- Get instant explanations, answers, and solutions

### **Audio Intelligence**
- **Native Rust Module**: High-performance, low-latency audio capture
- Process audio files and recordings
- Real-time transcription and analysis
- Perfect for meeting notes and content review

### **Contextual Chat**
- Chat with AI about anything you see on screen
- Maintains conversation context
- Ask follow-up questions for deeper insights

### **Interface Features (Quick Actions)**
Control your interactions instantly with 5 powerful tools:
- **✏️ What to answer?**: Instantly generates a context-aware response to the current topic.
- **💬 Shorten**: Refines the last suggested answer to be more concise and natural.
- **🔄 Recap**: Generates a comprehensive summary of the conversation so far.
- **❓ Follow Up Question**: Suggests strategic questions you can ask to drive the conversation.
- **⚡ Answer**: Manually trigger a response or use voice input to ask specific questions.

### **Live Meeting Intelligence**
- **🧠 Rolling Context Window**: Maintains a smart, sliding window of conversation history. This allows the AI to "remember" what was just said, enabling instant, highly relevant answers as soon as a question is asked.
- **Rolling Transcript**: View real-time speech-to-text as the meeting progresses.
- **Smart Note Taking**: Automatically captures key points and summaries (via Recap).
- **Usage Tracking**: Monitor your interaction history and AI usage.

### **Privacy-First Design**
- **Local AI Option**: Use Ollama for 100% private processing
- **Cloud Option**: Google Gemini for maximum performance
- **Data Control**: All data stored locally in SQLite
- No data tracking or storage on external servers (unless using Cloud AI)

## Use Cases

### **Academic & Learning**
```
✓ Live presentation support during classes
✓ Quick research during online exams  
✓ Language translation and explanations
✓ Math and science problem solving
```

### **Professional Meetings**
```
✓ Sales call preparation and objection handling
✓ Technical interview coaching
✓ Client presentation support
✓ Real-time fact-checking and data lookup
```

### **Development & Tech**
```
✓ Debug error messages instantly
✓ Code explanation and optimization
✓ Documentation and API references
✓ Algorithm and architecture guidance
```

## Why Choose Natively?

| Feature | Natively | Commercial Alternatives |
|---------|-------------|------------------------|
| **Cost** | 100% Free | $29-99/month |
| **Privacy** | Local AI Option | Cloud-only |
| **Open Source** | Full transparency | Closed source |
| **Customization** | Fully customizable | Limited options |
| **Data Control** | You own your data | Third-party servers |
| **Offline Mode** | Yes (with Ollama) | No |

## Technical Details

### **Tech Stack**
- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS](https://tailwindcss.com/)
- **Backend/Desktop**: [Electron](https://www.electronjs.org/)
- **Native Performance**: **Rust** (via N-API) for system audio capture
- **Database**: [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) for local storage
- **State Management**: React Query

### **AI Models Supported**
- **Google Gemini**: `gemini-3-flash-preview` (Fast, Multimodal), `gemini-3-pro-preview` (Reasoning)
- **Ollama (Local)**: `llama3.2`, `mistral`, `codellama`, etc.
- **Groq**: High-speed inference for open models (Llama 3, Mixtral)

### **System Requirements**
```bash
Minimum:  4GB RAM, Dual-core CPU, 2GB storage
Recommended: 8GB+ RAM, Quad-core CPU, 5GB+ storage
Optimal: 16GB+ RAM (Apple Silicon M1/M2/M3) for local AI models
```

## 🤝 Contributing

This project welcomes contributions! While I have limited time for active maintenance, I'll review and merge quality PRs.

**Ways to contribute:**
- 🐛 Bug fixes and stability improvements
- ✨ New features and AI model integrations  
- 📚 Documentation and tutorial improvements
- 🌍 Translations and internationalization
- 🎨 UI/UX enhancements

For commercial integrations or custom development, reach out.

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

If you use, modify, or run this software as a service over a network,
you must make the complete source code available under the same license.

---

**⭐ Star this repo if Natively helps you succeed in meetings, interviews, or presentations!**

### 🏷️ Tags
`ai-assistant` `meeting-notes` `interview-helper` `presentation-support` `ollama` `gemini-ai` `electron-app` `cross-platform` `privacy-focused` `open-source` `local-ai` `screenshot-analysis` `academic-helper` `sales-assistant` `coding-companion`
=======
### Build (Production)
```bash
npm run dist
```

---

### AI Providers
- **Custom (BYO Endpoint):** Paste any cURL command to use OpenRouter, DeepSeek, or private endpoints.
- **Ollama (Local):** Zero-setup detection of local models (Llama 3, Mistral, Gemma).
- **Google Gemini:** First-class support for Gemini 3.0 Pro/Flash.
- **OpenAI:** GPT-5.2 support with optimized system prompts.
- **Anthropic:** Claude 4.5 Sonnet support for complex reasoning.
- **Groq:** Ultra-fast inference with Llama 3 models.

---

## Key Features

### Invisible Desktop Assistant
- Always-on-top translucent overlay
- Instantly hide/show with shortcuts
- Works across all applications

### Real-time Interview Copilot & Coding Help
- Real-time speech-to-text
- Context-aware Memory (RAG) for Past Meetings
- Instant answers as questions are asked
- Smart recap and summaries

### Instant Screen & Slide Analysis (OCR)
- Capture any screen content
- Analyze slides, documents, code, or problems
- Immediate explanations and solutions

### Contextual Actions
- What should I answer?
- Shorten response
- Recap conversation
- Suggest follow-up questions
- Manual or voice-triggered prompts

### Dual-Channel Audio Intelligence
Natively understands that *listening* to a meeting and *talking* to an AI are different tasks. We treat them separately:

- **System Audio (The Meeting):** Captures high-fidelity audio directly from your OS (Zoom, Teams, Meet). It "hears" what your colleagues are saying without interference from your room noise.
- **Microphone Input (Your Voice):** A dedicated channel for your voice commands and dictation. Toggle it instantly to ask Natively a private question without muting your meeting software.

### Spotlight Search & Calendar
- Global activation shortcut
- Instant answer overlay
- Upcoming meeting readiness

### Local RAG & Long-Term Memory
- **Full Offline RAG:** All vector embeddings and retrieval happen locally (SQLite).
- **Semantic Search:** innovative "Smart Scope" detects if you are asking about the current meeting or a past one.
- **Global Knowledge:** Ask questions across *all* your past meetings ("What did we decide about the API last month?").
- **Automatic Indexing:** Meetings are automatically chunked, embedded, and indexed in the background.

### Advanced Privacy & Stealth
- **Undetectable Mode:** Instantly hide from dock/taskbar.
- **Masquerading:** Disguise process names and window titles as harmless system utilities.
- **Local-Only Processing:** All data stays on your machine.

---

## Meeting Intelligence Dashboard
Natively includes a powerful, local-first meeting management system to review, search, and manage your entire conversation history.

![Dashboard Preview](assets/dashboard-preview.png)

- **Meeting Archives:** Access full transcripts of every past meeting, searchable by keywords or dates.
- **Smart Export:** One-click export of transcripts and AI summaries to **Markdown, JSON, or Text**—perfect for pasting into Notion, Obsidian, or Slack.
- **Usage Statistics:** Track your token usage and API costs in real-time. Know exactly how much you are spending on Gemini, OpenAI, or Claude.
- **Audio Separation:** Distinct controls for **System Audio** (what they say) vs. **Microphone** (what you dictate).
- **Session Management:** Rename, organize, or delete past sessions to keep your workspace clean.

---

## Use Cases

### Academic & Learning
- **Live Assistance:** Get explanations for complex lecture topics in real-time.
- **Translation:** Instant language translation during international classes.
- **Problem Solving:** Immediate help with coding or mathematical problems.

### Professional Meetings
- **Interview Support:** Context-aware prompts to help you navigate technical questions.
- **Sales & Client Calls:** Real-time clarification of technical specs or previous discussion points.
- **Meeting Summaries:** Automatically extract action items and core decisions.

### Development & Technical Work
- **Code Insight:** Explain unfamiliar blocks of code or logic on your screen.
- **Debugging:** Context-aware assistance for resolving logs or terminal errors.
- **Architecture:** Guidance on system design and integration patterns.

---

## Comparison

**Natively is built on a simple promise: Any speech provider, any API key, 100% free to use, and universally compatible.**

| Feature | Natively | Commercial Tools (Cluely, etc.) | Other OSS |
| :--- | :--- | :--- | :--- |
| **Price** | **Free (BYOK)** | $20 - $50 / month | Free |
| **Speech Providers** | **Any (Google, Groq, Deepgram, etc.)** | Locked to Vendor | Limited |
| **LLM Choice** | **Any (Local or Cloud)** | Locked to Vendor | Limited |
| **Privacy** | **Local-First & Private** | Data stored on servers | Depends |
| **Latency** | **Real-Time (<500ms)** | Variable | Often Slow |
| **Universal Mode** | **Works over ANY app** | often limited to browser | No |
| **Meeting History** | **Full Dashboard & Search** | Limited | None |
| **Data Export** | **JSON / Markdown / Text** | Proprietary Format | None |
| **Audio Channels** | **Dual (System + Mic)** | Single Stream | Single Stream |
| **Screenshot Analysis** | **Yes (Native)** | Limited | Rare |
| **Stealth Mode** | **Yes (Undetectable)** | No | No |

---

## Architecture Overview

Natively processes audio, screen context, and user input locally, maintains a rolling context window, and sends only the required prompt data to the selected AI provider (local or cloud).

No raw audio, screenshots, or transcripts are stored or transmitted unless explicitly enabled by the user. 

---

## Technical Details

### Tech Stack
- **React, Vite, TypeScript, TailwindCSS**
- **Electron**
- **Rust** (native audio)
- **SQLite** (local storage)

### Supported Models
- **Gemini 3** (Flash / Pro)
- **OpenAI** (GPT-5.2)
- **Claude** (Sonnet 4.5)
- **Ollama** (Llama, Mistral, CodeLlama)
- **Groq** (Llama, Mixtral)

### System Requirements
- **Minimum:** 4GB RAM
- **Recommended:** 8GB+ RAM
- **Optimal:** 16GB+ RAM for local AI

---

## Responsible Use

Natively is intended for:
- Learning
- Productivity
- Accessibility
- Professional assistance

Users are responsible for complying with:
- Workplace policies
- Academic rules
- Local laws and regulations

This project does not encourage misuse or deception.

---

## Known Limitations
- Linux support is limited and looking for maintainers

---

## Contributing

Contributions are welcome:
- Bug fixes
- Feature improvements
- Documentation
- UI/UX enhancements
- New AI integrations

Quality pull requests will be reviewed and merged.

---

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

If you run or modify this software over a network, you must provide the full source code under the same license.

> **Note:** This project is available for sponsorships, ads, or partnerships – perfect for companies in the AI, productivity, or developer tools space.

---

**Star this repo if Natively helps you succeed in meetings, interviews, or presentations!**

---

---

## FAQ

#### Is Natively really free?
Yes. Natively is an open-source project. You only pay for what you use by bringing your own API keys (Gemini, OpenAI, Anthropic, etc.), or use it **100% free** by connecting to a local Ollama instance.

#### Does Natively work with Zoom, Teams, and Google Meet?
Yes. Natively uses a Rust-based system audio capture that works universally across any desktop application, including Zoom, Microsoft Teams, Google Meet, Slack, and Discord.

#### Is my data safe?
Natively is built on **Privacy-by-Design**. All transcripts, vector embeddings (Local RAG), and keys are stored locally on your machine. We have no backend and collect zero telemetry.

#### Can I use it for technical interviews?
Natively is a powerful assistant for any professional situation. However, users are responsible for complying with their company policies and interview guidelines.

#### How do I use local models?
Simply install **Ollama**, run a model (e.g., `ollama run llama3`), and Natively will automatically detect it. Enable "Ollama" in the AI Providers settings to switch to offline mode.

---

### Tags
`ai-assistant` `meeting-notes` `interview-helper` `presentation-support` `ollama` `gemini-ai` `electron-app` `cross-platform` `privacy-focused` `open-source` `local-ai` `screenshot-analysis` `academic-helper` `sales-assistant` `coding-companion` `cluely` `cluely alternative` `interview coder` `final round ai` `claude skills` `moltbot`

---

## Star History

<a href="https://star-history.com/#evinjohnn/natively-cluely-ai-assistant&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=evinjohnn/natively-cluely-ai-assistant&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=evinjohnn/natively-cluely-ai-assistant&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=evinjohnn/natively-cluely-ai-assistant&type=Date" />
 </picture>
</a>
>>>>>>> main
