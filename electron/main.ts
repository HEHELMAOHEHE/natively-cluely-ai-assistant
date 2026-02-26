import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from "electron"
import path from "path"
import fs from "fs"
import { autoUpdater } from "electron-updater"
import { log } from './utils/logger';
// --- LOGGING SETUP ---
import { initializeLogger, setupProcessErrorHandlers } from "./utils/logger"

// Initialize logger early
initializeLogger()
setupProcessErrorHandlers()

// --- IMPORTS ---
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { SettingsWindowHelper } from "./SettingsWindowHelper"
import { ModelSelectorWindowHelper } from "./ModelSelectorWindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { KeybindManager } from "./services/KeybindManager"
import { ProcessingHelper } from "./ProcessingHelper"

import { IntelligenceManager } from "./IntelligenceManager"
import { SystemAudioCapture } from "./audio/SystemAudioCapture"
import { MicrophoneCapture } from "./audio/MicrophoneCapture"
import { GoogleSTT } from "./audio/GoogleSTT"
import { RestSTT } from "./audio/RestSTT"
import { DeepgramStreamingSTT } from "./audio/DeepgramStreamingSTT"
import { ThemeManager } from "./ThemeManager"
import { RAGManager } from "./rag/RAGManager"
import { DatabaseManager } from "./db/DatabaseManager"
import { CredentialsManager } from "./services/CredentialsManager"
import { ReleaseNotesManager } from "./update/ReleaseNotesManager"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  public settingsWindowHelper: SettingsWindowHelper
  public modelSelectorWindowHelper: ModelSelectorWindowHelper
  private screenshotHelper: ScreenshotHelper
  public processingHelper: ProcessingHelper

  private intelligenceManager: IntelligenceManager
  private themeManager: ThemeManager
  private ragManager: RAGManager | null = null
  private tray: Tray | null = null
  private updateAvailable: boolean = false
  private disguiseMode: 'terminal' | 'settings' | 'activity' | 'none' = 'terminal'

  // View management
  private view: "queue" | "solutions" = "queue"
  private isUndetectable: boolean = true

  private problemInfo: {
    problem_statement: string
    input_format: Record<string, any>
    output_format: Record<string, any>
    constraints: Array<Record<string, any>>
    test_cases: Array<Record<string, any>>
  } | null = null

  private hasDebugged: boolean = false
  private isMeetingActive: boolean = false;
  private visibilityMode: 'normal' | 'stealth' = 'normal';
  
  // Audio Pipeline State
  private systemAudioCapture: SystemAudioCapture | null = null;
  private microphoneCapture: MicrophoneCapture | null = null;
  private audioTestCapture: MicrophoneCapture | null = null;
  private googleSTT: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null;
  private googleSTT_User: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null;
  private audioPipelineInitialized: boolean = false; // Guard against re-creation

  // Processing events
  public readonly PROCESSING_EVENTS = {
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  constructor() {
    console.log('[AppState] Constructor called - Instance ID:', this.constructor.name);
    
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)
    console.log('[AppState] WindowHelper initialized');
    
    this.settingsWindowHelper = new SettingsWindowHelper()
    console.log('[AppState] SettingsWindowHelper initialized');
    
    this.modelSelectorWindowHelper = new ModelSelectorWindowHelper()
    console.log('[AppState] ModelSelectorWindowHelper initialized');

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)
    console.log('[AppState] ScreenshotHelper initialized');

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)
    console.log('[AppState] ProcessingHelper initialized');

    // Initialize KeybindManager
    const keybindManager = KeybindManager.getInstance();
    console.log('[AppState] KeybindManager instance retrieved');
    keybindManager.setWindowHelper(this.windowHelper);
    keybindManager.setupIpcHandlers();
    keybindManager.onUpdate(() => {
      this.updateTrayMenu();
    });
    console.log('[AppState] KeybindManager setup complete');

    // Inject WindowHelper into other helpers
    this.settingsWindowHelper.setWindowHelper(this.windowHelper);
    console.log('[AppState] SettingsWindowHelper WindowHelper injected');
    this.modelSelectorWindowHelper.setWindowHelper(this.windowHelper);
    console.log('[AppState] ModelSelectorWindowHelper WindowHelper injected');

    // Initialize IntelligenceManager with LLMHelper
    this.intelligenceManager = new IntelligenceManager(this.processingHelper.getLLMHelper())
    console.log('[AppState] IntelligenceManager initialized');

    // Initialize ThemeManager
    this.themeManager = ThemeManager.getInstance()
    console.log('[AppState] ThemeManager instance retrieved');

    // Initialize RAGManager
    this.initializeRAGManager()
    console.log('[AppState] RAGManager initialization complete');

    this.setupIntelligenceEvents()
    console.log('[AppState] Intelligence events setup complete');
    this.setupOllamaIpcHandlers()
    console.log('[AppState] Ollama IPC handlers setup complete');
    
    // Initialize Auto-Updater
    this.setupAutoUpdater()
    console.log('[AppState] Auto-Updater setup complete');
    
    // Set content protection to true on startup
    console.log('[AppState] Setting content protection to true');
    this.setUndetectable(true);
    console.log('[AppState] Content protection set to:', this.isUndetectable);
    
    // Set disguise mode to terminal on startup
    console.log('[AppState] Setting disguise mode to terminal');
    this.setDisguise('terminal');
    console.log('[AppState] Disguise mode set to:', this.disguiseMode);
    
    // Log startup messages
    console.log('[WindowHelper] Content Protection set to: true');
    console.log('[SettingsWindowHelper] Setting content protection to: true');
    console.log('[AppState] Applying disguise: terminal (Terminal )');
    console.log('[AppState] Constructor completed successfully');
  }

  private broadcast(channel: string, ...args: any[]): void {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    });
  }

  private initializeRAGManager(): void {
    try {
      const db = DatabaseManager.getInstance();
      // @ts-ignore - accessing private db for RAGManager
      const sqliteDb = db['db'];

      if (sqliteDb) {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        this.ragManager = new RAGManager({ db: sqliteDb, apiKey });
        this.ragManager.setLLMHelper(this.processingHelper.getLLMHelper());
        console.log('[AppState] RAGManager initialized');
      }
    } catch (error) {
      console.error('[AppState] Failed to initialize RAGManager:', error);
    }
  }

  private setupAutoUpdater(): void {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on("checking-for-update", () => {
      console.log("[AutoUpdater] Checking for update...")
      this.broadcast("update-checking")
    })

    autoUpdater.on("update-available", async (info) => {
      console.log("[AutoUpdater] Update available:", info.version)
      this.updateAvailable = true

      const releaseManager = ReleaseNotesManager.getInstance();
      const notes = await releaseManager.fetchReleaseNotes(info.version);

      this.broadcast("update-available", {
        ...info,
        parsedNotes: notes
      })
    })

    autoUpdater.on("update-not-available", (info) => {
      console.log("[AutoUpdater] Update not available:", info.version)
      this.broadcast("update-not-available", info)
    })

    autoUpdater.on("error", (err) => {
      console.error("[AutoUpdater] Error:", err)
      this.broadcast("update-error", err.message)
    })

    autoUpdater.on("download-progress", (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond
      log_message = log_message + " - Downloaded " + progressObj.percent + "%"
      log_message = log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")"
      console.log("[AutoUpdater] " + log_message)
      this.broadcast("download-progress", progressObj)
    })

    autoUpdater.on("update-downloaded", (info) => {
      console.log("[AutoUpdater] Update downloaded:", info.version)
      this.broadcast("update-downloaded", info)
    })

    // Delayed check
    setTimeout(() => {
      if (process.env.NODE_ENV === "development") {
        console.log("[AutoUpdater] Development mode: Running manual update check...");
        this.checkForUpdatesManual();
      } else {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
          console.error("[AutoUpdater] Failed to check for updates:", err);
        });
      }
    }, 10000);
  }

  private async checkForUpdatesManual(): Promise<void> {
    try {
      console.log('[AutoUpdater] Checking for updates manually via GitHub API...');
      const releaseManager = ReleaseNotesManager.getInstance();
      const notes = await releaseManager.fetchReleaseNotes('latest');

      if (notes) {
        const currentVersion = app.getVersion();
        const latestVersionTag = notes.version;
        const latestVersion = latestVersionTag.replace(/^v/, '');

        console.log(`[AutoUpdater] Manual Check: Current=${currentVersion}, Latest=${latestVersion}`);

        if (this.isVersionNewer(currentVersion, latestVersion)) {
          console.log('[AutoUpdater] Manual Check: New version found!');
          this.updateAvailable = true;

          const info = {
            version: latestVersion,
            files: [] as any[],
            path: '',
            sha512: '',
            releaseName: notes.summary,
            releaseNotes: notes.fullBody
          };

          this.broadcast("update-available", {
            ...info,
            parsedNotes: notes
          });
        } else {
          console.log('[AutoUpdater] Manual Check: App is up to date.');
          this.broadcast("update-not-available", { version: currentVersion });
        }
      }
    } catch (err) {
      console.error('[AutoUpdater] Manual update check failed:', err);
    }
  }

  private isVersionNewer(current: string, latest: string): boolean {
    const c = current.split('.').map(Number);
    const l = latest.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const cv = c[i] || 0;
      const lv = l[i] || 0;
      if (lv > cv) return true;
      if (lv < cv) return false;
    }
    return false;
  }

  public async quitAndInstallUpdate(): Promise<void> {
    console.log('[AutoUpdater] quitAndInstall called - applying update...')

    if (process.platform === 'darwin') {
      try {
        const updateFile = (autoUpdater as any).downloadedUpdateHelper?.file
        console.log('[AutoUpdater] Downloaded update file:', updateFile)

        if (updateFile) {
          const updateDir = path.dirname(updateFile)
          await shell.openPath(updateDir)
          console.log('[AutoUpdater] Opened update directory:', updateDir)
          setTimeout(() => app.quit(), 1000)
          return
        }
      } catch (err) {
        console.error('[AutoUpdater] Failed to open update directory:', err)
      }
    }

    setImmediate(() => {
      try {
        autoUpdater.quitAndInstall(false, true)
      } catch (err) {
        console.error('[AutoUpdater] quitAndInstall failed:', err)
        app.exit(0)
      }
    })
  }

  public async checkForUpdates(): Promise<void> {
    await autoUpdater.checkForUpdatesAndNotify()
  }

  public downloadUpdate(): void {
    autoUpdater.downloadUpdate()
  }

  // --- AUDIO PIPELINE FIXES ---

  /**
   * Initializes capture and STT instances if they don't exist.
   * Protected against re-creation by audioPipelineInitialized flag.
   */
  private setupSystemAudioPipeline(): void {
    if (this.audioPipelineInitialized) {
      console.log('[Main] Audio pipeline already initialized. Skipping creation.');
      return;
    }

    try {
      console.log('[Main] Initializing Audio Pipeline...');

      // 1. Create Captures
      this.systemAudioCapture = new SystemAudioCapture();
      this.microphoneCapture = new MicrophoneCapture();

      // 2. Create STT Instances
      this.googleSTT = this.createSTTInstance('interviewer');
      this.googleSTT_User = this.createSTTInstance('user');

      if (!this.googleSTT || !this.googleSTT_User) {
        console.error('[Main] STT engines are not configured. Skipping audio pipeline startup.');
        this.destroyAudioPipeline();
        return;
      }

      // 3. Wire Events: Capture -> STT
      this.systemAudioCapture.on('data', (chunk: Buffer) => {
        if (this.isMeetingActive) this.googleSTT?.write(chunk);
      });
      this.systemAudioCapture.on('error', (err: Error) => {
        console.error('[Main] SystemAudioCapture Error:', err);
      });

      this.microphoneCapture.on('data', (chunk: Buffer) => {
        if (this.isMeetingActive) this.googleSTT_User?.write(chunk);
      });
      this.microphoneCapture.on('error', (err: Error) => {
        console.error('[Main] MicrophoneCapture Error:', err);
      });

      // 4. Wire Events: STT -> Logic
      this.setupSTTEventHandlers(this.googleSTT, 'interviewer');
      this.setupSTTEventHandlers(this.googleSTT_User, 'user');

      // 5. Sync Sample Rates
      this.syncAudioRates();

      this.audioPipelineInitialized = true;
      console.log('[Main] Audio Pipeline Initialized Successfully');

    } catch (err) {
      console.error('[Main] Failed to setup System Audio Pipeline:', err);
      // Attempt cleanup if failed midway
      this.destroyAudioPipeline();
    }
  }

  private createSTTInstance(speaker: 'user' | 'interviewer'): GoogleSTT | RestSTT | DeepgramStreamingSTT | null {
    const cm = CredentialsManager.getInstance();
    const sttProvider = cm?.getSttProvider?.() || 'google';
    let instance: GoogleSTT | RestSTT | DeepgramStreamingSTT | null = null;

    if (sttProvider === 'deepgram') {
      const apiKey = cm?.getDeepgramApiKey?.();
      if (apiKey) {
        console.log(`[Main] Using DeepgramStreamingSTT for ${speaker}`);
        instance = new DeepgramStreamingSTT(apiKey);
      } else {
        console.warn(`[Main] Deepgram key is missing for ${speaker}.`);
      }
    } else if (sttProvider === 'groq' || sttProvider === 'openai' || sttProvider === 'elevenlabs' || sttProvider === 'azure' || sttProvider === 'ibmwatson') {
      // Handle various REST providers
      let apiKey: string | undefined;
      let region: string | undefined;
      let modelOverride: string | undefined;

      if (sttProvider === 'groq') {
        apiKey = cm?.getGroqSttApiKey?.();
        modelOverride = cm?.getGroqSttModel?.();
      } else if (sttProvider === 'openai') {
        apiKey = cm?.getOpenAiSttApiKey?.();
      } else if (sttProvider === 'elevenlabs') {
        apiKey = cm?.getElevenLabsApiKey?.();
      } else if (sttProvider === 'azure') {
        apiKey = cm?.getAzureApiKey?.();
        region = cm?.getAzureRegion?.();
      } else if (sttProvider === 'ibmwatson') {
        apiKey = cm?.getIbmWatsonApiKey?.();
        region = cm?.getIbmWatsonRegion?.();
      }

      if (apiKey) {
        console.log(`[Main] Using RestSTT (${sttProvider}) for ${speaker}`);
        instance = new RestSTT(sttProvider, apiKey, modelOverride, region);
      } else {
        console.warn(`[Main] ${sttProvider} key is missing for ${speaker}.`);
      }
    }

    // Fallback to Google only when credentials are configured.
    if (!instance) {
      const googleCredsFromManager = cm?.getGoogleServiceAccountPath?.();
      const googleCredsFromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasGoogleCreds = Boolean(googleCredsFromManager || googleCredsFromEnv);

      if (!hasGoogleCreds && sttProvider === 'google') {
        console.warn(`[Main] Google STT selected for ${speaker}, but no Google credentials are configured.`);
        return null;
      }

      if (hasGoogleCreds) {
        console.log(`[Main] Falling back to GoogleSTT for ${speaker}`);
        instance = new GoogleSTT();
      } else {
        console.warn(`[Main] No valid STT credentials found for ${speaker}.`);
      }
    }
    return instance;
  }

  private setupSTTEventHandlers(sttInstance: any, speaker: 'user' | 'interviewer') {
    sttInstance.on('transcript', (segment: { text: string, isFinal: boolean, confidence: number }) => {
      if (!this.isMeetingActive) return;

      this.intelligenceManager.handleTranscript({
        speaker,
        text: segment.text,
        timestamp: Date.now(),
        final: segment.isFinal,
        confidence: segment.confidence
      });

      const payload = {
        speaker,
        text: segment.text,
        timestamp: Date.now(),
        final: segment.isFinal,
        confidence: segment.confidence
      };
      this.windowHelper.getLauncherWindow()?.webContents.send('native-audio-transcript', payload);
      this.windowHelper.getOverlayWindow()?.webContents.send('native-audio-transcript', payload);
    });

    sttInstance.on('error', (err: Error) => {
      console.error(`[Main] STT (${speaker}) Error:`, err);
    });
  }

  private syncAudioRates(): void {
    if (this.systemAudioCapture && this.googleSTT) {
      const rate = this.systemAudioCapture.getSampleRate() || 16000;
      this.googleSTT.setSampleRate(rate);
      if ('setAudioChannelCount' in this.googleSTT) {
        (this.googleSTT as any).setAudioChannelCount(1);
      }
    }
    if (this.microphoneCapture && this.googleSTT_User) {
      const rate = this.microphoneCapture.getSampleRate() || 16000;
      this.googleSTT_User.setSampleRate(rate);
      if ('setAudioChannelCount' in this.googleSTT_User) {
        (this.googleSTT_User as any).setAudioChannelCount(1);
      }
    }
  }

  /**
   * Safely destroys audio pipeline components
   */
  private destroyAudioPipeline(): void {
    if (this.systemAudioCapture) {
      this.systemAudioCapture.stop();
      this.systemAudioCapture = null;
    }
    if (this.microphoneCapture) {
      this.microphoneCapture.stop();
      this.microphoneCapture = null;
    }
    if (this.googleSTT) {
      this.googleSTT.stop();
      this.googleSTT = null;
    }
    if (this.googleSTT_User) {
      this.googleSTT_User.stop();
      this.googleSTT_User = null;
    }
    this.audioPipelineInitialized = false;
    console.log('[Main] Audio Pipeline Destroyed.');
  }

  private async reconfigureAudio(inputDeviceId?: string, outputDeviceId?: string): Promise<void> {
    console.log(`[Main] Reconfiguring Audio: Input=${inputDeviceId}, Output=${outputDeviceId}`);

    // 1. System Audio
    if (this.systemAudioCapture) {
      this.systemAudioCapture.stop();
      this.systemAudioCapture = null;
    }

    try {
      this.systemAudioCapture = new SystemAudioCapture(outputDeviceId || undefined);
      const rate = this.systemAudioCapture.getSampleRate();
      this.googleSTT?.setSampleRate(rate);

      this.systemAudioCapture.on('data', (chunk: Buffer) => {
        if (this.isMeetingActive) this.googleSTT?.write(chunk);
      });
      this.systemAudioCapture.on('error', (err: Error) => {
        console.error('[Main] SystemAudioCapture Error:', err);
      });
    } catch (err) {
      console.warn('[Main] Failed to reconfigure SystemAudioCapture, trying default.', err);
      this.systemAudioCapture = new SystemAudioCapture(); // Fallback
      // re-wire
      this.systemAudioCapture.on('data', (chunk) => this.googleSTT?.write(chunk));
    }

    // 2. Microphone
    if (this.microphoneCapture) {
      this.microphoneCapture.stop();
      this.microphoneCapture = null;
    }

    try {
      this.microphoneCapture = new MicrophoneCapture(inputDeviceId || undefined);
      const rate = this.microphoneCapture.getSampleRate();
      this.googleSTT_User?.setSampleRate(rate);

      this.microphoneCapture.on('data', (chunk: Buffer) => {
        if (this.isMeetingActive) this.googleSTT_User?.write(chunk);
      });
      this.microphoneCapture.on('error', (err: Error) => {
        console.error('[Main] MicrophoneCapture Error:', err);
      });
    } catch (err) {
      console.warn('[Main] Failed to reconfigure MicrophoneCapture, trying default.', err);
      this.microphoneCapture = new MicrophoneCapture(); // Fallback
      this.microphoneCapture.on('data', (chunk) => this.googleSTT_User?.write(chunk));
    }
  }

  /**
   * Reconfigure STT provider mid-session
   */
  public async reconfigureSttProvider(): Promise<void> {
    console.log('[Main] Reconfiguring STT Provider...');

    // Stop and destroy existing STT instances
    if (this.googleSTT) {
      this.googleSTT.stop();
      this.googleSTT = null;
    }
    if (this.googleSTT_User) {
      this.googleSTT_User.stop();
      this.googleSTT_User = null;
    }

    // Recreate instances
    this.googleSTT = this.createSTTInstance('interviewer');
    this.googleSTT_User = this.createSTTInstance('user');

    // Re-wire events
    if (this.googleSTT) this.setupSTTEventHandlers(this.googleSTT, 'interviewer');
    if (this.googleSTT_User) this.setupSTTEventHandlers(this.googleSTT_User, 'user');

    // Sync rates
    this.syncAudioRates();

    // Restart if active
    if (this.isMeetingActive) {
      this.googleSTT?.start();
      this.googleSTT_User?.start();
    }
    console.log('[Main] STT Provider reconfigured');
  }

  public startAudioTest(deviceId?: string): void {
    console.log(`[Main] Starting Audio Test on device: ${deviceId || 'default'}`);
    this.stopAudioTest();

    try {
      this.audioTestCapture = new MicrophoneCapture(deviceId || undefined);
      this.audioTestCapture.start();

      const win = this.settingsWindowHelper.getSettingsWindow() || this.getMainWindow();

      this.audioTestCapture.on('data', (chunk: Buffer) => {
        if (!win || win.isDestroyed()) return;

        let sum = 0;
        const step = 10;
        const len = chunk.length;

        for (let i = 0; i < len; i += 2 * step) {
          const val = chunk.readInt16LE(i);
          sum += val * val;
        }

        const count = len / (2 * step);
        if (count > 0) {
          const rms = Math.sqrt(sum / count);
          const level = Math.min(rms / 10000, 1.0);
          win.webContents.send('audio-level', level);
        }
      });

      this.audioTestCapture.on('error', (err: Error) => {
        console.error('[Main] AudioTest Error:', err);
      });

    } catch (err) {
      console.error('[Main] Failed to start audio test:', err);
    }
  }

  public stopAudioTest(): void {
    if (this.audioTestCapture) {
      console.log('[Main] Stopping Audio Test');
      this.audioTestCapture.stop();
      this.audioTestCapture = null;
    }
  }

  public async startMeeting(metadata?: any): Promise<void> {
    console.log('[Main] Starting Meeting...', metadata);

    this.isMeetingActive = true;
    if (metadata) {
      this.intelligenceManager.setMeetingMetadata(metadata);

      if (metadata.audio) {
        // Note: reconfigureAudio requires STT instances to exist, so we init pipeline first
        this.setupSystemAudioPipeline();
        await this.reconfigureAudio(metadata.audio.inputDeviceId, metadata.audio.outputDeviceId);
      }
    }

    // Emit session reset
    this.windowHelper.getOverlayWindow()?.webContents.send('session-reset');
    this.windowHelper.getLauncherWindow()?.webContents.send('session-reset');

    // Ensure pipeline is ready
    this.setupSystemAudioPipeline();

    // Start System Audio
    this.systemAudioCapture?.start();
    this.googleSTT?.start();

    // Start Microphone
    this.microphoneCapture?.start();
    this.googleSTT_User?.start();
  }

  public async endMeeting(): Promise<void> {
    console.log('[Main] Ending Meeting...');
    this.isMeetingActive = false;

    this.systemAudioCapture?.stop();
    this.googleSTT?.stop();

    this.microphoneCapture?.stop();
    this.googleSTT_User?.stop();

    await this.intelligenceManager.stopMeeting();

    // Revert to Default Model
    try {
      const cm = CredentialsManager.getInstance();
      const defaultModel = cm.getDefaultModel();
      const curlProviders = cm.getCurlProviders();
      const legacyProviders = cm.getCustomProviders();
      const all = [...(curlProviders || []), ...(legacyProviders || [])];

      console.log(`[Main] Reverting model to default: ${defaultModel}`);
      this.processingHelper.getLLMHelper().setModel(defaultModel, all);

      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) win.webContents.send('model-changed', defaultModel);
      });

    } catch (e) {
      console.error("[Main] Failed to revert model:", e);
    }

    await this.processCompletedMeetingForRAG();
  }

  private async processCompletedMeetingForRAG(): Promise<void> {
    if (!this.ragManager) return;

    try {
      const meetings = DatabaseManager.getInstance().getRecentMeetings(1);
      if (meetings.length === 0) return;

      const meeting = DatabaseManager.getInstance().getMeetingDetails(meetings[0].id);
      if (!meeting || !meeting.transcript || meeting.transcript.length === 0) return;

      const segments = meeting.transcript.map(t => ({
        speaker: t.speaker,
        text: t.text,
        timestamp: t.timestamp
      }));

      let summary: string | undefined;
      if (meeting.detailedSummary) {
        summary = [
          ...(meeting.detailedSummary.keyPoints || []),
          ...(meeting.detailedSummary.actionItems || []).map(a => `Action: ${a}`)
        ].join('. ');
      }

      const result = await this.ragManager.processMeeting(meeting.id, segments, summary);
      console.log(`[AppState] RAG processed meeting ${meeting.id}: ${result.chunkCount} chunks`);

    } catch (error) {
      console.error('[AppState] Failed to process meeting for RAG:', error);
    }
  }

  private setupIntelligenceEvents(): void {
    const mainWindow = this.getMainWindow.bind(this)

    this.intelligenceManager.on('assist_update', (insight: string) => {
      const helper = this.getWindowHelper();
      helper.getLauncherWindow()?.webContents.send('intelligence-assist-update', { insight });
      helper.getOverlayWindow()?.webContents.send('intelligence-assist-update', { insight });
    })

    this.intelligenceManager.on('suggested_answer', (answer: string, question: string, confidence: number) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-suggested-answer', { answer, question, confidence })
      }
    })

    this.intelligenceManager.on('suggested_answer_token', (token: string, question: string, confidence: number) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-suggested-answer-token', { token, question, confidence })
      }
    })

    this.intelligenceManager.on('refined_answer_token', (token: string, intent: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-refined-answer-token', { token, intent })
      }
    })

    this.intelligenceManager.on('refined_answer', (answer: string, intent: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-refined-answer', { answer, intent })
      }
    })

    this.intelligenceManager.on('recap', (summary: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-recap', { summary })
      }
    })

    this.intelligenceManager.on('recap_token', (token: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-recap-token', { token })
      }
    })

    this.intelligenceManager.on('follow_up_questions_update', (questions: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-follow-up-questions-update', { questions })
      }
    })

    this.intelligenceManager.on('follow_up_questions_token', (token: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-follow-up-questions-token', { token })
      }
    })

    this.intelligenceManager.on('manual_answer_started', () => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-manual-started')
      }
    })

    this.intelligenceManager.on('manual_answer_result', (answer: string, question: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-manual-result', { answer, question })
      }
    })

    this.intelligenceManager.on('mode_changed', (mode: string) => {
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-mode-changed', { mode })
      }
    })

    this.intelligenceManager.on('error', (error: Error, mode: string) => {
      console.error(`[IntelligenceManager] Error in ${mode}:`, error)
      const win = mainWindow()
      if (win) {
        win.webContents.send('intelligence-error', { error: error.message, mode })
      }
    })
  }

  public updateGoogleCredentials(keyPath: string): void {
    console.log(`[AppState] Updating Google Credentials to: ${keyPath}`);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

    this.googleSTT?.setCredentials(keyPath);
    this.googleSTT_User?.setCredentials(keyPath);
  }

  public setRecognitionLanguage(key: string): void {
    console.log(`[AppState] Setting recognition language to: ${key}`);
    this.googleSTT?.setRecognitionLanguage(key);
    this.googleSTT_User?.setRecognitionLanguage(key);
  }

  public static getInstance(): AppState {
    console.log('[AppState] getInstance() called');
    if (!AppState.instance) {
      console.log('[AppState] Creating new AppState instance');
      AppState.instance = new AppState()
    } else {
      console.log('[AppState] Returning existing AppState instance');
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getWindowHelper(): WindowHelper {
    return this.windowHelper
  }

  public getIntelligenceManager(): IntelligenceManager {
    return this.intelligenceManager
  }

  public getThemeManager(): ThemeManager {
    return this.themeManager
  }

  public getRAGManager(): RAGManager | null {
    return this.ragManager;
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  public setupOllamaIpcHandlers(): void {
    ipcMain.handle('get-ollama-models', async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('http://localhost:11434/api/tags', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return data.models.map((m: any) => m.name);
        }
        return [];
      } catch (error) {
        return [];
      }
    });
  }

  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()
    this.problemInfo = null
    this.setView("queue")
  }

  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const wasOverlayVisible = this.windowHelper.getOverlayWindow()?.isVisible() ?? false

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => {
        if (wasOverlayVisible) {
          this.windowHelper.switchToOverlay()
        } else {
          this.showMainWindow()
        }
      }
    )

    return screenshotPath
  }

  public async takeSelectiveScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const wasOverlayVisible = this.windowHelper.getOverlayWindow()?.isVisible() ?? false

    const screenshotPath = await this.screenshotHelper.takeSelectiveScreenshot(
      () => this.hideMainWindow(),
      () => {
        if (wasOverlayVisible) {
          this.windowHelper.switchToOverlay()
        } else {
          this.showMainWindow()
        }
      }
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public centerAndShowWindow(): void {
    this.windowHelper.centerAndShowWindow()
  }

  public createTray(): void {
    this.showTray();
  }

  public showTray(): void {
    if (this.tray) return;

    const resourcesPath = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
    const templatePath = path.join(resourcesPath, 'assets', 'iconTemplate.png');
    const defaultIconPath = app.isPackaged
      ? path.join(resourcesPath, 'src/components/icon.png')
      : path.join(__dirname, '../src/components/icon.png');

    let iconToUse = defaultIconPath;

    try {
      if (fs.existsSync(templatePath)) {
        iconToUse = templatePath;
      } else {
        const devTemplatePath = path.join(__dirname, '../src/components/iconTemplate.png');
        if (fs.existsSync(devTemplatePath)) {
          iconToUse = devTemplatePath;
        }
      }
    } catch (e) {
      console.error('[Tray] Error checking for icon:', e);
    }

    const trayIcon = nativeImage.createFromPath(iconToUse).resize({ width: 16, height: 16 });
    trayIcon.setTemplateImage(iconToUse.endsWith('Template.png'));

    this.tray = new Tray(trayIcon)
    this.updateTrayMenu();

    this.tray.on('double-click', () => {
      this.centerAndShowWindow()
    })
  }

  public updateTrayMenu() {
    if (!this.tray) return;

    const keybindManager = KeybindManager.getInstance();
    const screenshotAccel = keybindManager.getKeybind('general:take-screenshot') || 'CommandOrControl+H';

    const formatAccel = (accel: string) => {
      return accel
        .replace('CommandOrControl', 'Cmd')
        .replace('Command', 'Cmd')
        .replace('Control', 'Ctrl')
        .replace('OrControl', '')
        .replace(/\+/g, '+');
    };

    const displayScreenshot = formatAccel(screenshotAccel);
    const toggleKb = keybindManager.getKeybind('general:toggle-visibility');
    const toggleAccel = toggleKb || 'CommandOrControl+B';
    const displayToggle = formatAccel(toggleAccel);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Natively',
        click: () => {
          this.centerAndShowWindow()
        }
      },
      {
        label: `Toggle Window (${displayToggle})`,
        click: () => {
          this.toggleMainWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: `Take Screenshot (${displayScreenshot})`,
        accelerator: screenshotAccel,
        click: async () => {
          try {
            const screenshotPath = await this.takeScreenshot()
            const preview = await this.getImagePreview(screenshotPath)
            const mainWindow = this.getMainWindow()
            if (mainWindow) {
              mainWindow.webContents.send("screenshot-taken", {
                path: screenshotPath,
                preview
              })
            }
          } catch (error) {
            console.error("Error taking screenshot from tray:", error)
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  public hideTray(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }

  public setUndetectable(state: boolean, fromIPC: boolean = false): void {
    console.log('[AppState] setUndetectable called with state:', state, '(current:', this.isUndetectable, ')', fromIPC ? '(from IPC)' : '(from internal)');
    
    // Guard: Don't process if state hasn't changed
    if (this.isUndetectable === state) {
      console.log('[AppState] setUndetectable: State unchanged, skipping');
      return;
    }
    
    this.isUndetectable = state
    
    // Always log the content protection change
    console.log(`[WindowHelper] Content Protection set to: ${state}`);
    console.log(`[SettingsWindowHelper] Setting content protection to: ${state}`);
    
    this.windowHelper.setContentProtection(state)
    this.settingsWindowHelper.setContentProtection(state)

    if (state && this.disguiseMode !== 'none') {
      this._applyDisguise(this.disguiseMode);
    } else if (!state) {
      this._applyDisguise('none');
    }

    // Only send to renderers if the change came from IPC (user action)
    // This prevents feedback loops when the main process initiates the change
    if (fromIPC) {
      const mainWindow = this.windowHelper.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('undetectable-changed', state);
      }

      const launcher = this.windowHelper.getLauncherWindow();
      if (launcher && !launcher.isDestroyed() && launcher !== mainWindow) {
        launcher.webContents.send('undetectable-changed', state);
      }

      const settingsWin = this.settingsWindowHelper.getSettingsWindow();
      if (settingsWin && !settingsWin.isDestroyed()) {
        settingsWin.webContents.send('undetectable-changed', state);
      }
    } else {
      console.log('[AppState] setUndetectable: Skipping renderer notification (internal change)');
    }

    if (process.platform === 'darwin') {
      this.applyVisibilityMode(state ? 'stealth' : 'normal');
    }
    console.log('[AppState] setUndetectable completed');
  }

  public getUndetectable(): boolean {
    return this.isUndetectable
  }

  public setDisguise(mode: 'terminal' | 'settings' | 'activity' | 'none'): void {
    console.log('[AppState] setDisguise called with mode:', mode);
    this.disguiseMode = mode;
    if (this.isUndetectable) {
      this._applyDisguise(mode);
    }
  }

  private _applyDisguise(mode: 'terminal' | 'settings' | 'activity' | 'none'): void {
    let appName = "Natively";
    let iconPath = "";

    switch (mode) {
      case 'terminal':
        appName = "Terminal ";
        iconPath = app.isPackaged
          ? path.join(process.resourcesPath, "assets/fakeicon/terminal.png")
          : path.resolve(__dirname, "../assets/fakeicon/terminal.png");
        break;
      case 'settings':
        appName = "System Settings ";
        iconPath = app.isPackaged
          ? path.join(process.resourcesPath, "assets/fakeicon/settings.png")
          : path.resolve(__dirname, "../assets/fakeicon/settings.png");
        break;
      case 'activity':
        appName = "Activity Monitor ";
        iconPath = app.isPackaged
          ? path.join(process.resourcesPath, "assets/fakeicon/activity.png")
          : path.resolve(__dirname, "../assets/fakeicon/activity.png");
        break;
      case 'none':
        appName = "Natively";
        iconPath = app.isPackaged
          ? path.join(process.resourcesPath, "natively.icns")
          : path.resolve(__dirname, "../assets/natively.icns");
        break;
    }

    console.log(`[AppState] Applying disguise: ${mode} (${appName})`);

    process.title = appName;
    app.setName(appName);

    if (process.platform === 'darwin') {
      process.env.CFBundleName = appName.trim();
    }

    if (process.platform === 'win32') {
      app.setAppUserModelId(`${appName.trim()}-${mode}`);
    }

    if (fs.existsSync(iconPath)) {
      const image = nativeImage.createFromPath(iconPath);

      if (process.platform === 'darwin') {
        if (!this.isUndetectable) {
          app.dock.setIcon(image);
        }
      } else {
        this.windowHelper.getLauncherWindow()?.setIcon(image);
        this.windowHelper.getOverlayWindow()?.setIcon(image);
        this.settingsWindowHelper.getSettingsWindow()?.setIcon(image);
      }
    }

    const launcher = this.windowHelper.getLauncherWindow();
    if (launcher && !launcher.isDestroyed()) {
      launcher.setTitle(appName.trim());
      launcher.webContents.send('disguise-changed', mode);
    }

    const overlay = this.windowHelper.getOverlayWindow();
    if (overlay && !overlay.isDestroyed()) {
      overlay.setTitle(appName.trim());
      overlay.webContents.send('disguise-changed', mode);
    }

    const settingsWin = this.settingsWindowHelper.getSettingsWindow();
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.setTitle(appName.trim());
      settingsWin.webContents.send('disguise-changed', mode);
    }

    // Force periodic updates
    const forceUpdate = () => {
      process.title = appName;
      if (process.platform === 'darwin') {
        app.setName(appName);
      }
    };

    setTimeout(forceUpdate, 200);
    setTimeout(forceUpdate, 1000);
    setTimeout(forceUpdate, 5000);
  }

  public getDisguise(): string {
    return this.disguiseMode;
  }

  private applyVisibilityMode(mode: 'normal' | 'stealth') {
    if (process.platform !== 'darwin') return;

    if (mode === 'stealth') {
      app.setActivationPolicy('accessory');
      setTimeout(() => {
        const win = this.getMainWindow();
        if (win && !win.isDestroyed()) {
          app.focus({ steal: true });
          win.focus();
        }
      }, 10);
      this.hideTray();
    } else {
      app.setActivationPolicy('regular');
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
      this.showTray();
    }

    this.visibilityMode = mode;
  }
}

// --- Application Initialization ---

function setMacDockIcon() {
  if (process.platform !== "darwin") return;

  const appState = AppState.getInstance();
  if (appState && appState.getUndetectable()) {
    console.log("[DockIcon] Skipping dock icon setup due to stealth mode");
    return;
  }

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "natively.icns")
    : path.resolve(__dirname, "../assets/natively.icns");

  console.log("[DockIcon] Using:", iconPath);
  app.dock.setIcon(nativeImage.createFromPath(iconPath));
}

async function initializeApp() {
  await app.whenReady()

  // 1. Initialize CredentialsManager FIRST
  CredentialsManager.getInstance().init();

  // 2. Initialize AppState
  const appState = AppState.getInstance()

  // 3. Load stored credentials
  appState.processingHelper.loadStoredCredentials();

  const storedServiceAccountPath = CredentialsManager.getInstance().getGoogleServiceAccountPath();
  if (storedServiceAccountPath) {
    console.log("[Init] Loading stored Google Service Account path");
    appState.updateGoogleCredentials(storedServiceAccountPath);
  }

  // 4. Set initial App Name
  const initialDisguise = appState.getDisguise();
  const initialAppName = (() => {
    switch (initialDisguise) {
      case 'terminal': return 'Terminal ';
      case 'settings': return 'System Settings ';
      case 'activity': return 'Activity Monitor ';
      default: return 'Natively';
    }
  })();
  app.setName(initialAppName);
  process.title = initialAppName;

  // 5. IPC Handlers
  initializeIpcHandlers(appState)

  // 6. Dock Icon
  try {
    setMacDockIcon();
  } catch (e) {
    console.error("Failed to set dock icon:", e);
  }

  console.log("App is ready")

  // 7. Create Window
  appState.createWindow()
  
  // 8. Apply Stealth/Tray
  if (process.platform === 'darwin') {
    if (appState.getUndetectable()) {
      app.setActivationPolicy('accessory');
    } else {
      app.setActivationPolicy('regular');
      appState.showTray();
    }
  } else {
    if (!appState.getUndetectable()) {
      appState.showTray();
    }
  }

  // 9. Shortcuts
  KeybindManager.getInstance().registerGlobalShortcuts()

  // 10. Preload Settings
  appState.settingsWindowHelper.preloadWindow()

  // 11. Calendar & Meeting Recovery
  try {
    const { CalendarManager } = require('./services/CalendarManager');
    const calMgr = CalendarManager.getInstance();
    calMgr.init();

    calMgr.on('start-meeting-requested', (event: any) => {
      console.log('[Main] Start meeting requested from calendar notification', event);
      appState.centerAndShowWindow();
      appState.startMeeting({
        title: event.title,
        calendarEventId: event.id,
        source: 'calendar'
      });
    });

    calMgr.on('open-requested', () => {
      appState.centerAndShowWindow();
    });

    console.log('[Main] CalendarManager initialized');
  } catch (e) {
    console.error('[Main] Failed to initialize CalendarManager:', e);
  }

  appState.getIntelligenceManager().recoverUnprocessedMeetings().catch(err => {
    console.error('[Main] Failed to recover unprocessed meetings:', err);
  });
}

app.on("activate", () => {
  console.log("App activated")
  const appState = AppState.getInstance();
  if (appState.getMainWindow() === null) {
    appState.createWindow()
  }
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  try {
    CredentialsManager.getInstance().scrubMemory();
    AppState.getInstance().processingHelper.getLLMHelper().scrubKeys();
    console.log('[Main] Credentials scrubbed from memory on quit');
  } catch (e) {
    console.error('[Main] Failed to scrub credentials on quit:', e);
  }
})

app.commandLine.appendSwitch("disable-background-timer-throttling")

initializeApp().catch(console.error)
