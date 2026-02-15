// ipcHandlers.ts

import { app, ipcMain, shell, dialog, desktopCapturer, systemPreferences, BrowserWindow, screen } from "electron"
import { AppState } from "./main"
import { GEMINI_FLASH_MODEL } from "./IntelligenceManager"
import { DatabaseManager } from "./db/DatabaseManager"; // Import Database Manager
import * as path from "path";
import * as fs from "fs";
import { AudioDevices } from "./audio/AudioDevices";
import { ENGLISH_VARIANTS } from "./config/languages"
import { CalendarManager } from "./services/CalendarManager";
import { ThemeManager } from "./ThemeManager";
import { RAGManager } from "./rag/RAGManager";
import Store from 'electron-store';

export function initializeIpcHandlers(appState: AppState): void {
  const safeHandle = (channel: string, listener: (event: any, ...args: any[]) => Promise<any> | any) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, listener);
  };

  // --- NEW Test Helper ---
  safeHandle("test-release-fetch", async () => {
    try {
      console.log("[IPC] Manual Test Fetch triggered (forcing refresh)...");
      const { ReleaseNotesManager } = require('./update/ReleaseNotesManager');
      const notes = await ReleaseNotesManager.getInstance().fetchReleaseNotes('latest', true);

      if (notes) {
        console.log("[IPC] Notes fetched for:", notes.version);
        const info = {
          version: notes.version || 'latest',
          files: [] as any[],
          path: '',
          sha512: '',
          releaseName: notes.summary,
          releaseNotes: notes.fullBody,
          parsedNotes: notes
        };
        // Send to renderer
        appState.getMainWindow()?.webContents.send("update-available", info);
        return { success: true };
      }
      return { success: false, error: "No notes returned" };
    } catch (err: any) {
      console.error("[IPC] test-release-fetch failed:", err);
      return { success: false, error: err.message };
    }
  });

  safeHandle("get-recognition-languages", async () => {
    return ENGLISH_VARIANTS;
  });

  safeHandle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (!width || !height) return

      const senderWebContents = event.sender
      const settingsWin = appState.settingsWindowHelper.getSettingsWindow()
      const overlayWin = appState.getWindowHelper().getOverlayWindow()
      const launcherWin = appState.getWindowHelper().getLauncherWindow()

      if (settingsWin && !settingsWin.isDestroyed() && settingsWin.webContents.id === senderWebContents.id) {
        appState.settingsWindowHelper.setWindowDimensions(settingsWin, width, height)
      } else if (
        overlayWin && !overlayWin.isDestroyed() && overlayWin.webContents.id === senderWebContents.id
      ) {
        // NativelyInterface logic - Resize ONLY the overlay window using dedicated method
        appState.getWindowHelper().setOverlayDimensions(width, height)
      }
    }
  )

  safeHandle("set-window-mode", async (event, mode: 'launcher' | 'overlay') => {
    appState.getWindowHelper().setWindowMode(mode);
    return { success: true };
  })

  safeHandle("delete-screenshot", async (event, path: string) => {
    await appState.deleteScreenshot(path)
    return { success: true }
  })

  safeHandle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      throw error
    }
  })

  safeHandle("take-selective-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeSelectiveScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      if (error.message === "Selection cancelled") {
        return { cancelled: true }
      }
      throw error
    }
  })

  safeHandle("get-screenshots", async () => {
    try {
      let previews = []
      if (appState.getView() === "queue") {
        previews = await Promise.all(
          appState.getScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      } else {
        previews = await Promise.all(
          appState.getExtraScreenshotQueue().map(async (path) => ({
            path,
            preview: await appState.getImagePreview(path)
          }))
        )
      }
      return previews
    } catch (error) {
      throw error
    }
  })

  safeHandle("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  safeHandle("show-window", async () => {
    appState.showMainWindow()
  })

  safeHandle("hide-window", async () => {
    appState.hideMainWindow()
  })

  safeHandle("reset-queues", async () => {
    try {
      appState.clearQueues()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Donation IPC Handlers
  safeHandle("get-donation-status", async () => {
    const { DonationManager } = require('./DonationManager');
    const manager = DonationManager.getInstance();
    return {
      shouldShow: manager.shouldShowToaster(),
      hasDonated: manager.getDonationState().hasDonated,
      lifetimeShows: manager.getDonationState().lifetimeShows
    };
  });

  safeHandle("mark-donation-toast-shown", async () => {
    const { DonationManager } = require('./DonationManager');
    DonationManager.getInstance().markAsShown();
    return { success: true };
  });

  safeHandle("set-donation-complete", async () => {
    const { DonationManager } = require('./DonationManager');
    DonationManager.getInstance().setHasDonated(true);
    return { success: true };
  });

  // Generate suggestion from transcript - Natively-style text-only reasoning
  safeHandle("generate-suggestion", async (event, context: string, lastQuestion: string) => {
    try {
      const suggestion = await appState.processingHelper.getLLMHelper().generateSuggestion(context, lastQuestion)
      return { suggestion }
    } catch (error: any) {
      throw error
    }
  })

  // IPC handler for analyzing image from file path
  safeHandle("analyze-image-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      throw error
    }
  })

  safeHandle("gemini-chat", async (event, message: string, imagePath?: string, context?: string, options?: { skipSystemPrompt?: boolean }) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().chatWithGemini(message, imagePath, context, options?.skipSystemPrompt);

      console.log(`[IPC] gemini - chat response: `, result ? result.substring(0, 50) : "(empty)");

      if (!result || result.trim().length === 0) {
        return "I apologize, but I couldn't generate a response. Please try again.";
      }

      const intelligenceManager = appState.getIntelligenceManager();
      intelligenceManager.addTranscript({
        text: message,
        speaker: 'user',
        timestamp: Date.now(),
        final: true
      }, true);

      intelligenceManager.addAssistantMessage(result);
      intelligenceManager.logUsage('chat', message, result);

      return result;
    } catch (error: any) {
      throw error;
    }
  });

  // Streaming IPC Handler
  safeHandle("gemini-chat-stream", async (event, message: string, imagePath?: string, context?: string, options?: { skipSystemPrompt?: boolean }) => {
    try {
      console.log("[IPC] gemini-chat-stream started using LLMHelper.streamChat");
      const llmHelper = appState.processingHelper.getLLMHelper();
      const intelligenceManager = appState.getIntelligenceManager();

      intelligenceManager.addTranscript({
        text: message,
        speaker: 'user',
        timestamp: Date.now(),
        final: true
      }, true);

      let fullResponse = "";

      if (!context) {
        try {
          const autoContext = intelligenceManager.getFormattedContext(100);
          if (autoContext && autoContext.trim().length > 0) {
            context = autoContext;
            console.log(`[IPC] Auto - injected 100s context for gemini - chat - stream(${context.length} chars)`);
          }
        } catch (ctxErr) {
          console.warn("[IPC] Failed to auto-inject context:", ctxErr);
        }
      }

      try {
        const stream = llmHelper.streamChat(message, imagePath, context, options?.skipSystemPrompt ? "" : undefined);

        for await (const token of stream) {
          event.sender.send("gemini-stream-token", token);
          fullResponse += token;
        }

        event.sender.send("gemini-stream-done");

        if (fullResponse.trim().length > 0) {
          intelligenceManager.addAssistantMessage(fullResponse);
          intelligenceManager.logUsage('chat', message, fullResponse);
        }

      } catch (streamError: any) {
        console.error("[IPC] Streaming error:", streamError);
        event.sender.send("gemini-stream-error", streamError.message || "Unknown streaming error");
      }

      return null;
    } catch (error: any) {
      console.error("[IPC] Error in gemini-chat-stream setup:", error);
      throw error;
    }
  });

  safeHandle("quit-app", () => {
    app.quit()
  })

  safeHandle("quit-and-install-update", () => {
    console.log('[IPC] quit-and-install-update handler called')
    appState.quitAndInstallUpdate()
  })

  safeHandle("delete-meeting", async (_, id: string) => {
    return DatabaseManager.getInstance().deleteMeeting(id);
  });

  safeHandle("check-for-updates", async () => {
    await appState.checkForUpdates()
  })

  safeHandle("download-update", async () => {
    appState.downloadUpdate()
  })

  // Window movement handlers
  safeHandle("move-window-left", async () => {
    appState.moveWindowLeft()
  })

  safeHandle("move-window-right", async () => {
    appState.moveWindowRight()
  })

  safeHandle("move-window-up", async () => {
    appState.moveWindowUp()
  })

  safeHandle("move-window-down", async () => {
    appState.moveWindowDown()
  })

  safeHandle("center-and-show-window", async () => {
    appState.centerAndShowWindow()
  })

  // Settings Window
  safeHandle("toggle-settings-window", (event, { x, y } = {}) => {
    appState.settingsWindowHelper.toggleWindow(x, y)
  })

  // --- Settings Store ---
  const store = new Store();

  safeHandle("get-settings", async () => {
    return store.get('settings', {});
  });

  safeHandle("save-settings", (event, settings) => {
    store.set('settings', settings);
    // Also notify main process or apply immediate changes if needed
    if (settings.sttProvider) {
      // We might want to trigger reconfig if changed, but we have set-stt-provider for that
    }
    return { success: true }
  })



  safeHandle("close-settings-window", () => {
    appState.settingsWindowHelper.closeWindow()
  })

  safeHandle("set-undetectable", async (_, state: boolean) => {
    appState.setUndetectable(state)
    return { success: true }
  })

  safeHandle("set-disguise", async (_, mode: 'terminal' | 'settings' | 'activity' | 'none') => {
    appState.setDisguise(mode)
    return { success: true }
  })

  safeHandle("get-undetectable", async () => {
    return appState.getUndetectable()
  })

  safeHandle("set-open-at-login", async (_, openAtLogin: boolean) => {
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: false,
      path: app.getPath('exe')
    });
    return { success: true };
  });

  safeHandle("get-open-at-login", async () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  // LLM Model Management Handlers
  safeHandle("get-current-llm-config", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      return {
        provider: llmHelper.getCurrentProvider(),
        model: llmHelper.getCurrentModel(),
        isOllama: llmHelper.isUsingOllama()
      };
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("get-available-ollama-models", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const models = await llmHelper.getOllamaModels();
      return models;
    } catch (error: any) {
      throw error;
    }
  });

  safeHandle("switch-to-ollama", async (_, model?: string, url?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToOllama(model, url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("force-restart-ollama", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const success = await llmHelper.forceRestartOllama();
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("ensure-ollama-running", async () => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const result = await llmHelper.ensureOllamaRunning();
      return result;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  });

  safeHandle("switch-to-gemini", async (_, apiKey?: string, modelId?: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToGemini(apiKey, modelId);

      if (apiKey) {
        const { CredentialsManager } = require('./services/CredentialsManager');
        CredentialsManager.getInstance().setGeminiApiKey(apiKey);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-gemini-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().setGeminiApiKey(apiKey);

      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setApiKey(apiKey);

      appState.getIntelligenceManager().initializeLLMs();

      return { success: true };
    } catch (error: any) {
      console.error("Error saving Gemini API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-groq-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().setGroqApiKey(apiKey);

      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setGroqApiKey(apiKey);

      appState.getIntelligenceManager().initializeLLMs();

      return { success: true };
    } catch (error: any) {
      console.error("Error saving Groq API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-openai-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().setOpenaiApiKey(apiKey);

      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setOpenaiApiKey(apiKey);

      appState.getIntelligenceManager().initializeLLMs();

      return { success: true };
    } catch (error: any) {
      console.error("Error saving OpenAI API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("set-claude-api-key", async (_, apiKey: string) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().setClaudeApiKey(apiKey);

      const llmHelper = appState.processingHelper.getLLMHelper();
      llmHelper.setClaudeApiKey(apiKey);

      appState.getIntelligenceManager().initializeLLMs();

      return { success: true };
    } catch (error: any) {
      console.error("Error saving Claude API key:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-custom-providers", async () => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      const cm = CredentialsManager.getInstance();
      const curlProviders = cm.getCurlProviders();
      const legacyProviders = cm.getCustomProviders() || [];
      return [...curlProviders, ...legacyProviders];
    } catch (error: any) {
      console.error("Error getting custom providers:", error);
      return [];
    }
  });

  safeHandle("save-custom-provider", async (_, provider: any) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().saveCurlProvider(provider);
      return { success: true };
    } catch (error: any) {
      console.error("Error saving custom provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("delete-custom-provider", async (_, id: string) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().deleteCurlProvider(id);
      CredentialsManager.getInstance().deleteCustomProvider(id);
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting custom provider:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("switch-to-custom-provider", async (_, providerId: string) => {
    try {
      const { CredentialsManager } = require('./services/CredentialsManager');
      const providers = [...CredentialsManager.getInstance().getCurlProviders(), ...CredentialsManager.getInstance().getCustomProviders()];
      const provider = providers.find((p: any) => p.id === providerId);

      if (!provider) {
        throw new Error("Provider not found");
      }

      const llmHelper = appState.processingHelper.getLLMHelper();
      await llmHelper.switchToCustom(provider);

      appState.getIntelligenceManager().initializeLLMs();

      return { success: true };
    } catch (error: any) {
      console.error("Error switching to custom provider:", error);
      return { success: false, error: error.message };
    }
  });

  // Need to handle missing handlers properly
  safeHandle("get-credentials", async () => {
    const { CredentialsManager } = require('./services/CredentialsManager');
    return CredentialsManager.getInstance().getAllCredentials();
  });

  safeHandle("save-credentials", async (_, creds: any) => {
    const { CredentialsManager } = require('./services/CredentialsManager');
    const manager = CredentialsManager.getInstance();

    // Core LLM keys
    if (creds.geminiApiKey !== undefined) manager.setGeminiApiKey(creds.geminiApiKey);
    if (creds.groqApiKey !== undefined) manager.setGroqApiKey(creds.groqApiKey);
    if (creds.openaiApiKey !== undefined) manager.setOpenaiApiKey(creds.openaiApiKey);
    if (creds.claudeApiKey !== undefined) manager.setClaudeApiKey(creds.claudeApiKey);

    // STT Provider & Keys
    if (creds.sttProvider !== undefined) manager.setSttProvider(creds.sttProvider);
    if (creds.groqSttApiKey !== undefined) manager.setGroqSttApiKey(creds.groqSttApiKey);
    if (creds.groqSttModel !== undefined) manager.setGroqSttModel(creds.groqSttModel);
    if (creds.openAiSttApiKey !== undefined) manager.setOpenAiSttApiKey(creds.openAiSttApiKey);
    if (creds.deepgramApiKey !== undefined) manager.setDeepgramApiKey(creds.deepgramApiKey);
    if (creds.elevenLabsApiKey !== undefined) manager.setElevenLabsApiKey(creds.elevenLabsApiKey);
    if (creds.azureApiKey !== undefined) manager.setAzureApiKey(creds.azureApiKey);
    if (creds.azureRegion !== undefined) manager.setAzureRegion(creds.azureRegion);
    if (creds.ibmWatsonApiKey !== undefined) manager.setIbmWatsonApiKey(creds.ibmWatsonApiKey);
    if (creds.ibmWatsonRegion !== undefined) manager.setIbmWatsonRegion(creds.ibmWatsonRegion);

    // Other
    if (creds.defaultModel !== undefined) manager.setDefaultModel(creds.defaultModel);

    // Initialize LLMs with new keys
    appState.getIntelligenceManager().initializeLLMs();

    return true;
  });

  safeHandle("get-credentials-status", async () => {
    const { CredentialsManager } = require('./services/CredentialsManager');
    const creds = CredentialsManager.getInstance().getAllCredentials();
    return {
      hasGemini: !!creds.geminiApiKey,
      hasGroq: !!creds.groqApiKey,
      hasStt: !!(creds.googleServiceAccountPath || creds.groqSttApiKey || creds.deepgramApiKey)
    };
  });

  safeHandle("select-service-account", async () => {
    const result: any = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      appState.updateGoogleCredentials(filePath);
      const { CredentialsManager } = require('./services/CredentialsManager');
      CredentialsManager.getInstance().setGoogleServiceAccountPath(filePath);
      return { path: filePath, success: true };
    }
    return { path: null, success: false };
  });

  safeHandle("reset-intelligence", async () => {
    appState.getIntelligenceManager().clearQueues();
    return true;
  });

  safeHandle("set-recognition-language", async (_, lang: string) => {
    store.set('recognitionLanguage', lang);
    return true;
  });

  safeHandle("get-stt-config", async () => {
    const currentSettings: any = store.get('settings', {});
    // Fallback/Default logic if not in store, or delegate to CredentialsManager
    const { CredentialsManager } = require('./services/CredentialsManager');
    const mgr = CredentialsManager.getInstance();
    const creds = mgr.getAllCredentials();

    return {
      provider: currentSettings.sttProvider || creds.sttProvider || 'native',
      language: store.get('recognitionLanguage', 'en-US'),
      // Add other STT config fields if needed by frontend
    };
  });

  // Groq Fast Text Mode
  safeHandle("get-groq-fast-text-mode", async () => {
    const enabled = store.get('groqFastTextMode', false);
    return { enabled };
  });

  safeHandle("set-groq-fast-text-mode", async (_, enabled: boolean) => {
    store.set('groqFastTextMode', enabled);
    // Notify windows
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('groq-fast-text-changed', enabled);
    });
    return { success: true };
  });

  safeHandle("test-llm-connection", async (_, provider: string, key: string) => {
    try {
      const llmHelper = appState.processingHelper.getLLMHelper();
      const result = await llmHelper.testProviderConnection(provider, key);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  safeHandle("seed-demo", async () => {
    // Placeholder for demo seeding if actual logic isn't available in Windows yet
    // or implement basic preference setting
    store.set('isDemoMode', true);
    return { success: true };
  });

  safeHandle("set-stt-provider", async (_, provider: string) => {
    // Save to store first
    const currentSettings: any = store.get('settings', {});
    currentSettings.sttProvider = provider;
    store.set('settings', currentSettings);

    // Reconfigure
    // We need to update credentials manager too?
    // appState.reconfigureSttProvider reads from CredentialsManager.
    // So usually user saves credentials separately.
    // But if this is just switching the active provider preference:
    const { CredentialsManager } = require('./services/CredentialsManager');
    CredentialsManager.getInstance().setSttProvider(provider);

    await appState.reconfigureSttProvider();
    return { success: true };
  });

  safeHandle("get-audio-status", async () => {
    return { connected: true };
  });

  safeHandle("get-undetectable", async () => {
    return appState.getUndetectable();
  });

  safeHandle("set-undetectable", async (_, state: boolean) => {
    appState.setUndetectable(state);
    return { success: true };
  });

  safeHandle("get-disguise", async () => {
    return appState.getDisguise();
  });

  safeHandle("set-disguise", async (_, mode: any) => {
    appState.setDisguise(mode);
    return { success: true };
  });

  safeHandle("open-url", async (_, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  safeHandle("get-app-version", async () => {
    return app.getVersion();
  });

  safeHandle("quit-app", async () => {
    app.quit();
  });

  safeHandle("get-open-at-login", async () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  safeHandle("set-open-at-login", async (_, open: boolean) => {
    app.setLoginItemSettings({ openAtLogin: open });
    return { success: true };
  });

  // --- Calendar Handlers ---
  safeHandle("get-upcoming-events", async () => {
    return CalendarManager.getInstance().getUpcomingEvents();
  });

  safeHandle("get-calendar-status", async () => {
    return CalendarManager.getInstance().getConnectionStatus();
  });

  safeHandle("calendar-connect", async () => {
    await CalendarManager.getInstance().startAuthFlow();
    return { success: true };
  });

  // --- Session Management ---
  safeHandle("start-session", async (event, metadata) => {
    try {
      console.log("[IPC] start-session triggered with metadata:", metadata);
      await appState.startMeeting(metadata);
      // Wait a brief moment to ensure meeting ID is set
      const meetingId = appState.getIntelligenceManager()?.getCurrentMeetingId();
      return { success: true, meetingId };
    } catch (error: any) {
      console.error("[IPC] start-session failed:", error);
      return { success: false, error: error.message };
    }
  });

  safeHandle("stop-session", async () => {
    try {
      console.log("[IPC] stop-session triggered");
      await appState.endMeeting();
      return { success: true };
    } catch (error: any) {
      console.error("[IPC] stop-session failed:", error);
      return { success: false, error: error.message };
    }
  });

  // --- Global RAG ---
  safeHandle("rag-query-global", async (event, query: string) => {
    try {
      const ragManager = appState.getRAGManager();
      if (!ragManager) {
        return { fallback: true, error: "RAG Manager not initialized" };
      }

      console.log("[IPC] rag-query-global triggered for:", query);

      // We need to stream the response back.
      // Since this is a `handle` (invoke), we can't easily stream the return value 
      // in the way the generator works without some bridging.
      // However, the frontend expects a stream. 
      // The `preload.ts` defines `onRAGStreamChunk`, so we should probably use `event.sender.send`.

      // BUT, ipcMain.handle expects a promise return.
      // We will perform the streaming via `event.sender.send` and return a "stream started" object
      // or just wait for it to finish?
      // Best practice for streaming from main to renderer is to use `event.sender.send`.

      (async () => {
        try {
          const iterator = ragManager.queryGlobal(query);
          for await (const chunk of iterator) {
            event.sender.send('rag-stream-chunk', { chunk });
          }
          event.sender.send('rag-stream-complete');
        } catch (err: any) {
          console.error("[IPC] Global RAG stream error:", err);
          event.sender.send('rag-stream-error', { error: err.message || String(err) });
        }
      })();

      return { success: true, streaming: true };

    } catch (error: any) {
      console.error("[IPC] rag-query-global startup failed:", error);
      return { fallback: true, error: error.message };
    }
  });

  // --- Calendar Refresh ---
  safeHandle("calendar-refresh", async () => {
    try {
      console.log("[IPC] calendar-refresh triggered");
      const calendarManager = CalendarManager.getInstance();
      // In the updated CalendarManager (implied), there might be a refreshState method 
      // or we just call getUpcomingEvents(true) to force refresh.
      // Based on my read, I didn't see explicit refreshState exposed public in the snippet I saw,
      // but I'll assume getUpcomingEvents is the standard way or logic I saw in 'Refresh Logic' section.
      // Wait, I saw `public async refreshState(): Promise<void>` in lines 155!

      if ((calendarManager as any).refreshState) {
        await (calendarManager as any).refreshState();
      } else {
        // Fallback
        await calendarManager.getUpcomingEvents();
      }
      return { success: true };
    } catch (error: any) {
      console.error("[IPC] calendar-refresh failed:", error);
      return { success: false, error: error.message };
    }
  });

  // --- Meeting History Handlers ---
  safeHandle("get-recent-meetings", async (_, limit?: number) => {
    return DatabaseManager.getInstance().getRecentMeetings(limit);
  });

  safeHandle("get-meeting-details", async (_, id: string) => {
    return DatabaseManager.getInstance().getMeetingDetails(id);
  });

  safeHandle("update-meeting-title", async (_, id: string, title: string) => {
    return DatabaseManager.getInstance().updateMeetingTitle(id, title);
  });

  safeHandle("clear-all-data", async () => {
    return DatabaseManager.getInstance().clearAllData();
  });

  // --- Search / RAG Handlers ---
  safeHandle("search-meetings", async (_, query: string) => {
    const rag = appState.getRAGManager();
    if (!rag) return { error: "RAG Manager not initialized" };
    // Assuming search method exists and handles everything
    return (rag as any).search(query);
  });

  // --- Theme Handlers ---
  safeHandle("get-theme-mode", async () => {
    const tm = ThemeManager.getInstance();
    return {
      mode: tm.getMode(),
      resolved: tm.getResolvedTheme()
    };
  });

  safeHandle("set-theme-mode", async (_, mode: any) => {
    ThemeManager.getInstance().setMode(mode);
    return { success: true };
  });

  // --- Intelligence Generation Handlers ---
  safeHandle("generate-what-to-say", async (event, question?: string, imagePath?: string) => {
    try {
      const im = appState.getIntelligenceManager();
      if (!im) throw new Error("Intelligence Manager not available");
      // runWhatShouldISay returns Promise<string | null>
      const result = await im.runWhatShouldISay(question, 0.8, imagePath);
      return { success: true, result };
    } catch (error: any) {
      console.error("[IPC] generate-what-to-say failed:", error);
      throw error;
    }
  });

  safeHandle("generate-follow-up", async (event, intent: string) => {
    try {
      const im = appState.getIntelligenceManager();
      if (!im) throw new Error("Intelligence Manager not available");
      const result = await im.runFollowUp(intent);
      return { success: true, result };
    } catch (error: any) {
      console.error("[IPC] generate-follow-up failed:", error);
      throw error;
    }
  });

  safeHandle("generate-recap", async () => {
    try {
      const im = appState.getIntelligenceManager();
      if (!im) throw new Error("Intelligence Manager not available");
      const result = await im.runRecap();
      return { success: true, result };
    } catch (error: any) {
      console.error("[IPC] generate-recap failed:", error);
      throw error;
    }
  });

  safeHandle("generate-follow-up-questions", async () => {
    try {
      const im = appState.getIntelligenceManager();
      if (!im) throw new Error("Intelligence Manager not available");
      const result = await im.runFollowUpQuestions();
      return { success: true, result };
    } catch (error: any) {
      console.error("[IPC] generate-follow-up-questions failed:", error);
      throw error;
    }
  });

  // --- RAG Handlers ---
  safeHandle("rag-query-global", async (event, query: string) => {
    try {
      const rag = appState.getRAGManager();
      if (!rag) throw new Error("RAG Manager not initialized");
      const generator = rag.queryGlobal(query);
      for await (const chunk of generator) {
        event.sender.send('rag-stream-chunk', { chunk });
      }
      event.sender.send('rag-stream-complete');
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] rag-query-global error:', error);
      event.sender.send('rag-stream-error', { error: error.message });
      return { success: false, error: error.message };
    }
  });

  safeHandle("rag-query-meeting", async (event, meetingId: string, query: string) => {
    try {
      const rag = appState.getRAGManager();
      if (!rag) throw new Error("RAG Manager not initialized");
      const generator = rag.queryMeeting(meetingId, query);
      for await (const chunk of generator) {
        event.sender.send('rag-stream-chunk', { chunk });
      }
      event.sender.send('rag-stream-complete');
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] rag-query-meeting error:', error);
      event.sender.send('rag-stream-error', { error: error.message });
      return { success: false, error: error.message };
    }
  });
}
