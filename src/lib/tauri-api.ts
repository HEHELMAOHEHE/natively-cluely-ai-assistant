import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';

const currentWindow = getCurrentWindow();

// This object mimics your old electronAPI exactly
export const tauriAPI = {
  // --- 1. Window Management ---
  updateContentDimensions: async (dimensions: { width: number; height: number }) => {
    // Resize the current window (whether overlay or settings)
    await currentWindow.setSize(new (await import('@tauri-apps/api/window')).LogicalSize(dimensions.width, dimensions.height));
  },

  setWindowMode: async (mode: 'launcher' | 'overlay') => {
    // Call Rust to handle the swap animation
    return invoke('set_window_mode', { mode });
  },

  // --- 2. Meeting Lifecycle ---
  startMeeting: async () => {
    console.log("Tauri: Requesting Start Meeting...");
    try {
      // Start audio/AI services in Rust
      const res = await invoke('start_meeting');
      // Force UI switch
      await invoke('set_window_mode', { mode: 'overlay' });
      return res as { success: boolean; error?: string };
    } catch (e) {
      console.error(e);
      return { success: false, error: String(e) };
    }
  },

  endMeeting: async () => {
    console.log("Tauri: Ending Meeting...");
    try {
      await invoke('stop_meeting');
      await invoke('set_window_mode', { mode: 'launcher' });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // --- 3. Native Audio Events (The "Invisible" Logic) ---
  onNativeAudioTranscript: (callback: any) => {
    // Listen for 'transcript' event emitted from Rust
    const unlisten = listen('transcript', (event: any) => {
      callback(event.payload);
    });
    return () => { unlisten.then(f => f()); };
  },

  onNativeAudioSuggestion: (callback: any) => {
    const unlisten = listen('suggestion', (event: any) => {
      callback(event.payload);
    });
    return () => { unlisten.then(f => f()); };
  },

  // --- 4. System & Utils ---
  quitApp: async () => exit(0),

  // Pass-through for generic commands not explicitly typed
  invoke: async (cmd: string, args?: any) => invoke(cmd, args),

  // --- Stubs to prevent crashes (Features to migrate later) ---
  getScreenshots: async () => [],
  getRecentMeetings: async () => [],
  getThemeMode: async () => ({ mode: 'dark', resolved: 'dark' }),
  onThemeChanged: () => () => { },
  getNativeAudioStatus: async () => ({ connected: true }),
  onNativeAudioConnected: (cb: any) => { cb(); return () => { }; }, // Fake connection for UI feedback
  onNativeAudioDisconnected: (cb: any) => () => { },
  onSuggestionProcessingStart: (cb: any) => () => { },
  onSuggestionGenerated: (cb: any) => () => { },
  onSuggestionError: (cb: any) => () => { },

  // Additional Stubs to ensure no regressions from previous big file
  onToggleExpand: () => () => { },
  deleteScreenshot: async () => ({ success: true }),
  onScreenshotTaken: () => () => { },
  onScreenshotAttached: () => () => { },
  takeScreenshot: async () => { },
  onSolutionsReady: () => () => { },
  onResetView: () => () => { },
  onSolutionStart: () => () => { },
  onDebugStart: () => () => { },
  onDebugSuccess: () => () => { },
  onSolutionError: () => () => { },
  onProcessingNoScreenshots: () => () => { },
  onProblemExtracted: () => () => { },
  onSolutionSuccess: () => () => { },
  onUnauthorized: () => () => { },
  onDebugError: () => () => { },
  moveWindowLeft: async () => { },
  moveWindowRight: async () => { },
  moveWindowUp: async () => { },
  moveWindowDown: async () => { },
  toggleWindow: async () => { },
  showWindow: async () => currentWindow.show(),
  hideWindow: async () => currentWindow.hide(),
  setUndetectable: async (state: boolean) => {
    // Invoke backend command targetting the overlay window explicitly
    try {
      await invoke('set_ignore_cursor_events', { ignore: state });
      localStorage.setItem('natively_undetectable', String(state));
      return { success: true };
    } catch (e) {
      console.error("Failed to set undetectable:", e);
      return { success: false, error: String(e) };
    }
  },
  getUndetectable: async () => {
    const stored = localStorage.getItem('natively_undetectable');
    return stored === 'true';
  },
  setOpenAtLogin: async () => ({ success: true }),
  getOpenAtLogin: async () => false,
  onSettingsVisibilityChange: () => () => { },
  toggleSettingsWindow: async () => { },
  closeSettingsWindow: async () => { },
  toggleAdvancedSettings: async () => { },
  closeAdvancedSettings: async () => { },
  getCurrentLlmConfig: async () => ({ provider: 'gemini' as const, model: 'flash', isOllama: false }),
  getAvailableOllamaModels: async () => [],
  switchToOllama: async () => ({ success: false, error: 'Not implemented' }),
  switchToGemini: async () => ({ success: true }),
  testLlmConnection: async () => ({ success: true }),
  selectServiceAccount: async () => ({ success: false, error: 'Not implemented' }),

  // --- INTELLIGENCE COMMANDS ---
  generateWhatToSay: async () => {
    try {
      const answer = await invoke('what_should_i_say');
      return { answer, question: "Inferred", error: null };
    } catch (e) {
      return { answer: null, error: String(e) };
    }
  },

  generateRecap: async () => {
    try {
      const summary = await invoke('generate_recap');
      return { summary };
    } catch (e) {
      console.error(e);
      return { summary: null };
    }
  },

  generateFollowUpQuestions: async () => {
    try {
      const questions = await invoke('generate_follow_up_questions');
      return { questions };
    } catch (e) {
      return { questions: null };
    }
  },

  generateSuggestion: async (context: string) => invoke('what_should_i_say', { context }),
  generateAssist: async () => invoke('what_should_i_say'),
  generateFollowUp: async () => ({ refined: "Refined text", intent: "follow-up" }),
  submitManualQuestion: async (q: string) => ({ answer: "Answer", question: q }),
  getIntelligenceContext: async () => ({ context: "", lastAssistantMessage: null, activeMode: "auto" }),
  resetIntelligence: async () => ({ success: true }),

  onIntelligenceAssistUpdate: () => () => { },
  onIntelligenceSuggestedAnswerToken: () => () => { },
  onIntelligenceSuggestedAnswer: () => () => { },
  onIntelligenceRefinedAnswerToken: () => () => { },
  onIntelligenceRefinedAnswer: () => () => { },
  onIntelligenceFollowUpQuestionsUpdate: () => () => { },
  onIntelligenceFollowUpQuestionsToken: () => () => { },
  onIntelligenceRecap: () => () => { },
  onIntelligenceRecapToken: () => () => { },
  onIntelligenceManualStarted: () => () => { },
  onIntelligenceManualResult: () => () => { },
  onIntelligenceModeChanged: () => () => { },
  onIntelligenceError: () => () => { },

  // --- CALENDAR COMMAND ---
  calendarConnect: async () => {
    try {
      return await invoke('calendar_connect');
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  calendarDisconnect: async () => ({ success: true }),
  getCalendarStatus: async () => ({ connected: false }),
  getUpcomingEvents: async () => [],
  calendarRefresh: async () => ({ success: true }),

  // Meeting Management Stubs
  getMeetingDetails: async () => ({}),
  updateMeetingTitle: async () => true,
  updateMeetingSummary: async () => true,
  deleteMeeting: async () => true,

  // RAG Stubs
  ragQueryMeeting: async (_id: string, query: string) => invoke('rag_query', { query }),
  ragQueryGlobal: async (query: string) => invoke('rag_query', { query }),
  ragCancelQuery: async () => ({ success: true }),
  ragIsMeetingProcessed: async () => true,
  ragGetQueueStatus: async () => ({ pending: 0, processing: 0, completed: 0, failed: 0 }),
  ragRetryEmbeddings: async () => ({ success: true }),
  onRAGStreamChunk: () => () => { },
  onRAGStreamComplete: () => () => { },
  onRAGStreamError: () => () => { },

  // Stream Stubs
  streamGeminiChat: async () => { },
  onGeminiStreamToken: () => () => { },
  onGeminiStreamDone: () => () => { },
  onGeminiStreamError: () => () => { },
  onMeetingsUpdated: () => () => { },
  setThemeMode: async () => { },
  onUpdateAvailable: () => () => { },
  onUpdateDownloaded: () => () => { },
  onUpdateChecking: () => () => { },
  onUpdateNotAvailable: () => () => { },
  onUpdateError: () => () => { },
  restartAndInstall: async () => { },
  checkForUpdates: async () => { },
};
