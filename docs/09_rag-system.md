## 9. Installation and Setup

Natively provides flexible installation options for different user categories: end users, developers, and those who want to contribute to the project.

### For End Users

#### Quick Start
1. **Download the latest version** from [GitHub releases](https://github.com/evinjohnn/natively-cluely-ai-assistant/releases)
2. **Install the application**:
   - **macOS**: drag Natively.app to the Applications folder
   - **Windows**: run the installer
   - **Linux**: extract the archive and run the executable

3. **Troubleshooting on macOS**:
```
# If "Unidentified Developer" appears
Right-click app > Open > Click Open

# If "App is Damaged" appears
xattr -cr /Applications/Natively.app
# Or specify the path where the app is installed
```

4. **Launch the application** from Applications or via launch menu

### For Developers

#### System Requirements
- **Node.js** (v20+ recommended)
- **Git**
- **Rust** (required for native audio capture)

#### Installation and Launch
```bash
# Clone the repository
git clone https://github.com/evinjohnn/natively-cluely-ai-assistant.git
cd natively-cluely-ai-assistant

# Install dependencies
bun install

# Create .env configuration file
touch .env
```

#### Environment Variables Configuration (.env)
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

#### Launching the Application
```bash
# Development
bun start

# Build distribution
bun run dist
```

### API Key Configuration

#### Supported AI Providers
| Provider | Variable | Description |
|---------|----------|--------|
| **Gemini** | `GEMINI_API_KEY` | Recommended option with large context window |
| **Groq** | `GROQ_API_KEY` | Ultra-fast operation with Llama 3 |
| **OpenAI** | `OPENAI_API_KEY` | GPT-5.2 with high reasoning capabilities |
| **Anthropic** | `CLAUDE_API_KEY` | Claude 4.5 for complex tasks |
| **Google STT** | `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON file |

#### Google Cloud Speech-to-Text Setup
1. Create or select a project in Google Cloud Console
2. Enable Speech-to-Text API
3. Create Service Account
4. Assign role: `roles/speech.client`
5. Generate and download JSON key
6. Specify path in Natively settings

### Local AI Configuration (Ollama)

For fully offline operation without internet:

1. **Install Ollama**:
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - download from ollama.com/download
```

2. **Launch model**:
```bash
# Run Llama 3
ollama run llama3

# Run Mistral
ollama run mistral

# Run CodeLlama
ollama run codellama
```

3. **Configuration in .env**:
```env
USE_OLLAMA=true
OLLAMA_MODEL=llama3
OLLAMA_URL=http://localhost:11434
```

4. The application will automatically detect running Ollama instance

### Hotkey Configuration

#### Default Global Combinations
```json
{
  "general": {
    "toggle-visibility": "CmdOrCtrl+Shift+Space",
    "take-screenshot": "CmdOrCtrl+H",
    "move-left": "CmdOrCtrl+Alt+Left",
    "move-right": "CmdOrCtrl+Alt+Right"
  },
  "ai": {
    "manual-prompt": "CmdOrCtrl+M",
    "regenerate-answer": "CmdOrCtrl+R"
  }
}
```

#### Configuration via Interface
1. Open application settings
2. Go to "Key Bindings" section
3. Click on desired action and enter new combination
4. Save changes

### Audio Configuration

#### Dual Audio System
Natively uses two independent channels:

1. **System Audio Capture** - for recording interlocutors
2. **Microphone Capture** - for user commands

#### Device Selection
1. Open audio settings
2. Select input/output devices:
   - **Input Device**: user's microphone
   - **Output Device**: system audio output

3. Test volume level

### Application Updates

#### Automatic Update
- Application checks for updates on startup
- Notification about new version appears in interface
- Ability to download and install update with one click

#### macOS Specifics
On macOS, unsigned applications cannot automatically restart after update. Instead:
1. Application opens folder with downloaded update
2. User must manually install new version
3. Old version is closed

### System Requirements

#### Minimum Requirements
- **Operating System**: macOS, Windows, or Linux
- **RAM**: 4GB
- **Disk Space**: ~500MB + space for recording storage
- **Node.js**: v20+

#### Recommended Configurations
- **For cloud models**: 8GB RAM, stable internet connection
- **For local models (Ollama)**: 16GB+ RAM, powerful CPU/GPU

### Troubleshooting

#### Common Issues

**Problem**: "Unidentified Developer" on macOS
- **Solution**: Right-click > Open > Open

**Problem**: "App is Damaged"
- **Solution**: Run in Terminal `xattr -cr /Applications/Natively.app`

**Problem**: System audio capture not working
- **Solution**: Make sure Rust is installed and audio system permissions are granted

**Problem**: No connection to Ollama
- **Solution**: Check that Ollama is running (`ollama serve`) and URL is correct

**Problem**: STT not recognizing speech
- **Solution**: Check API keys and select suitable provider in settings

### Secure Installation

#### Integrity Check
Since the project is open source, you can:
1. Verify source code before installation
2. Build the application yourself from source
3. Ensure there's no spyware

#### Key Storage
- API keys stored only locally
- System secret storage is used:
  - **macOS Keychain**
  - **Windows Credential Vault**
  - **libsecret** for Linux

This comprehensive installation and setup documentation allows users of any level to start using Natively effectively and securely.
