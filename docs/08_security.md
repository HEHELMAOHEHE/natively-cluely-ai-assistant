## 8. Security and Privacy

Natively is built on the fundamental principle of **"Privacy by Design"**, making it a particularly valuable tool for professional scenarios where data confidentiality is critical.

### Key Security Principles

#### Fully Local Processing
- **All data stays on user's device**: audio, transcripts, screenshots, vector embeddings
- **No external servers**: the application has no backend that could store or analyze data
- **Local database**: SQLite is used to store all meeting information
- **Local RAG**: Retrieval Augmented Generation system works completely locally

#### No Telemetry
- **No analytics**: the application doesn't collect any user behavior information
- **No tracking**: actions, usage time, launch frequency are not logged
- **Unlimited usage**: no subscriptions, paid plans, or hidden fees

#### Bring Your Own Keys (BYOK)
- User provides their own API keys for cloud services:
  - Gemini
  - OpenAI
  - Anthropic
  - Groq
  - Google Cloud STT
  - Deepgram
  - ElevenLabs
  - Azure
  - IBM Watson
- Keys are used locally only and **never leave the device**
- Keys are cleared from memory when exiting the application

```typescript
app.on("before-quit", () => {
  CredentialsManager.getInstance().scrubMemory();
  appState.processingHelper.getLLMHelper().scrubKeys();
})
```

### Security Architecture

#### CredentialsManager Module
The central credentials manager provides secure storage:

```typescript
class CredentialsManager {
  private geminiApiKey: string | null = null;
  private groqApiKey: string | null = null;
  private openAiApiKey: string | null = null;
  private claudeApiKey: string | null = null;
  private googleServiceAccountPath: string | null = null;
  private deepgramApiKey: string | null = null;
  // ... other providers
}
```

**Security Methods:**
- `init()`: load keys from encrypted OS storage
- `scrubMemory()`: attempt to clear keys from memory before exit
- `get*ApiKey()`: secure key retrieval on request

#### Local Storage
- System secret storage mechanisms are used:
  - **macOS Keychain** for secure API key storage
  - **Windows Credential Vault** for Windows
  - **libsecret** for Linux
- Configuration via `.env` file only for development

#### File System Operations
- All data is stored in user directories:
  - Documents (`app.getPath('documents')`)
  - Application Data (`app.getPath('userData')`)
  - Cache (`app.getPath('cache')`)
- No data is sent to cloud without explicit user consent

### Privacy Modes

#### Stealth Mode 2.0
Advanced disguise system for situations requiring hiding assistant usage:

```typescript
public setUndetectable(state: boolean): void {
  this.isUndetectable = state;
  this.windowHelper.setContentProtection(state);
  
  if (state && this.disguiseMode !== 'none') {
    this._applyDisguise(this.disguiseMode);
  } else if (!state) {
    this._applyDisguise('none');
  }
}
```

**Features:**
- Hiding from dock (macOS) or taskbar (Windows)
- Screenshot blocking
- Disabling notifications
- Setting `accessory` flag for macOS

#### Disguise Mode
System for disguising as system utilities:

```typescript
private _applyDisguise(mode: 'terminal' | 'settings' | 'activity' | 'none'): void {
  let appName = "";
  switch (mode) {
    case 'terminal': appName = "Terminal "; break;
    case 'settings': appName = "System Settings "; break;
    case 'activity': appName = "Activity Monitor "; break;
    default: appName = "Natively";
  }
  
  process.title = appName;
  app.setName(appName);
  // ... update icons and titles
}
```

**Available Options:**
- **Terminal**: disguise as terminal
- **System Settings**: disguise as system settings
- **Activity Monitor**: disguise as activity monitor
- **None**: standard display

### Data Protection

#### Encryption and Storage
- **API keys**: stored in secure OS storage (Keychain, Credential Vault)
- **Transcripts and notes**: stored in SQLite database in user directory
- **Screenshots**: temporary files in cache, can be deleted by user

#### Access Control
- **Global hotkeys**: can be fully customized by user
- **Screen capture control**: user must explicitly allow screen access in OS settings
- **Microphone control**: similarly, requires explicit OS permission

### Error Handling and Fault Tolerance

#### Failure Handling
```typescript
// In setupSystemAudioPipeline()
try {
  // Initialize audio channels
} catch (err) {
  console.error('[Main] Failed to setup System Audio Pipeline:', err);
  // Fallback to default devices
}
```

#### Automatic Recovery
- When STT provider fails, fallback to GoogleSTT occurs
- When device problems occur, automatic selection is used
- Live reconfiguration support

### Security Limitations

#### JavaScript Issues
- **Impossible guaranteed memory cleanup**: in JavaScript, it's impossible to forcibly remove data from memory due to Garbage Collector behavior
- **IPC limitations**: inter-process communication requires data transfer, which could potentially create vulnerabilities
- **Electron dependency**: vulnerabilities in Chromium or Node.js could affect security

#### Third-Party Service Dependencies
- **Cloud providers**: when using Gemini, OpenAI, and other cloud services, data is transmitted to third parties
- **API keys**: although stored locally, their compromise could lead to abuse of user's resources

### Licensing and Open Source

#### AGPL-3.0 License
- **Complete transparency**: all source code is available for review
- **Protection against closing**: if the application is modified and used over a network, full source code must be open
- **No hidden features**: impossible to add spyware without community knowledge

#### Security Audit
- Possibility of independent code audit by any developer
- Community can identify and fix vulnerabilities
- Transparency of all critical functions implementation

### Recommendations for Secure Usage

1. **Use Ollama for complete autonomy**: connecting to local models eliminates data transmission to third parties
2. **Regularly change API keys**: especially when working on shared or unprotected devices
3. **Use stealth mode**: when necessary to comply with company policies
4. **Clean meeting history**: delete sensitive data when necessary
5. **Be attentive to OS settings**: control permissions for microphone, camera, and screen access

Natively represents a rare example of balance between powerful AI features and strict privacy requirements, making it one of the most secure solutions in its class.
