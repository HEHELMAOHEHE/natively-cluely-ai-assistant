## 4. Audio Capture System

Natively implements an advanced dual-channel audio capture system, which is a key feature of the application and ensures high effectiveness in professional scenarios.

### Audio System Architecture

The system is built on the separation of two independent audio streams:

#### 1. System Audio Capture
- **Purpose**: recording sound from interlocutors in Zoom, Google Meet, Teams, and other applications
- **Implementation**: native Rust module for direct access to system audio pools
- **Advantages**:
  - High quality without ambient noise interference
  - No need to use microphone for recording interlocutors
  - Low processing latency (<500 ms)
  - Supports any applications (not just browser-based)

#### 2. Microphone Capture
- **Purpose**: recording user's voice for commands and dictation
- **Isolated Channel**: allows user to ask private AI questions without interacting with the main meeting
- **Global Toggle**: ability to instantly enable/disable via hotkeys

### Technical Implementation

#### Main Components

```typescript
// In AppState.ts
private systemAudioCapture: SystemAudioCapture | null = null;
private microphoneCapture: MicrophoneCapture | null = null;
private googleSTT: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null; // for interlocutors
private googleSTT_User: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null; // for user
```

#### Data Flow

**For system audio:**
```
SystemAudioCapture → (Buffer) → STT (googleSTT) → transcript → IntelligenceManager → UI
```

**For microphone:**
```
MicrophoneCapture → (Buffer) → STT (googleSTT_User) → transcript → IntelligenceManager → UI
```

#### Key Methods

```typescript
private setupSystemAudioPipeline(): void {
  // Initialize system audio capture
  this.systemAudioCapture = new SystemAudioCapture();
  this.systemAudioCapture.on('data', (chunk: Buffer) => {
    this.googleSTT?.write(chunk);
  });
  
  // Initialize microphone capture
  this.microphoneCapture = new MicrophoneCapture();
  this.microphoneCapture.on('data', (chunk: Buffer) => {
    this.googleSTT_User?.write(chunk);
  });
}
```

### STT Provider Support

The system supports multiple Speech-to-Text providers that can be selected by users:

#### Available Providers:
- **Google Cloud Speech-to-Text**: via Service Account JSON
- **Deepgram Streaming STT**: with streaming transcription support
- **Groq**: ultra-fast speech recognition
- **OpenAI Whisper**: precise recognition via OpenAI API
- **ElevenLabs**: high-precision recognition
- **Azure Speech Services**: Microsoft speech recognition services
- **IBM Watson**: IBM speech recognition system

#### Provider Selection Mechanism:
```typescript
const sttProvider = CredentialsManager.getInstance().getSttProvider();

if (sttProvider === 'deepgram') {
  this.googleSTT = new DeepgramStreamingSTT(apiKey);
} else if (sttProvider === 'groq' || sttProvider === 'openai' || ...) {
  this.googleSTT = new RestSTT(sttProvider, apiKey, modelOverride, region);
} else {
  this.googleSTT = new GoogleSTT(); // fallback
}
```

### Device Management

Users can configure specific input/output devices:

```typescript
public async reconfigureAudio(inputDeviceId?: string, outputDeviceId?: string): Promise<void> {
  // Reconfigure system audio capture
  this.systemAudioCapture?.stop();
  this.systemAudioCapture = new SystemAudioCapture(outputDeviceId);
  
  // Reconfigure microphone capture
  this.microphoneCapture?.stop();
  this.microphoneCapture = new MicrophoneCapture(inputDeviceId);
}
```

### Dynamic Reconfiguration

The system supports changing providers on the fly:

```typescript
public async reconfigureSttProvider(): Promise<void> {
  // Stop existing STT
  this.googleSTT?.stop();
  this.googleSTT_User?.stop();
  
  // Clear and reinitialize
  this.setupSystemAudioPipeline();
  
  // Restart if meeting is active
  if (this.isMeetingActive) {
    this.googleSTT?.start();
    this.googleSTT_User?.start();
  }
}
```

### Error Handling and Fault Tolerance

The system includes error recovery mechanisms:

```typescript
this.systemAudioCapture.on('error', (err: Error) => {
  console.error('[Main] SystemAudioCapture Error:', err);
  // Automatic recovery with fallback to default device
});
```

### Audio Testing

Built-in volume level test for functionality verification:

```typescript
public startAudioTest(deviceId?: string): void {
  this.audioTestCapture = new MicrophoneCapture(deviceId);
  this.audioTestCapture.on('data', (chunk: Buffer) => {
    // Calculate RMS for visual level display
    const level = Math.min(rms / 10000, 1.0);
    win.webContents.send('audio-level', level);
  });
}
```

### Implementation Details

#### Lazy Initialization
The audio pipeline is created only when needed, preventing resource consumption at startup:

```typescript
// LAZY INIT: Do not setup pipeline here to prevent launch volume surge.
// this.setupSystemAudioPipeline()
```

#### Sample Rate Synchronization
Critical synchronization of parameters between capture and STT:

```typescript
// Sample rate synchronization
const sysRate = this.systemAudioCapture?.getSampleRate() || 16000;
this.googleSTT?.setSampleRate(sysRate);

const micRate = this.microphoneCapture?.getSampleRate() || 16000;
this.googleSTT_User?.setSampleRate(micRate);
```

#### Role Separation
Clear separation of functions between the two channels:
- **Channel 1 (system audio)**: analysis of others' speech, meeting context, understanding questions
- **Channel 2 (microphone)**: private AI requests, answer preparation, internal thoughts

### Architecture Advantages

1. **High Accuracy**: separating sources prevents voice mixing
2. **Privacy**: ability to ask personal AI questions without participating in the main conversation
3. **Flexibility**: supporting different providers for different channels
4. **Performance**: optimized processing for each channel
5. **Fault Tolerance**: fallback mechanisms for configuration errors

This dual-channel architecture makes Natively an especially effective tool for technical interviews, sales, and other professional situations where both analysis of what's happening and preparation of own responses are required.
