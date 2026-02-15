
export interface ElectronAPI {
  // --- Window Management ---
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  close: () => void;
  showWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;
  toggleMain: () => void;
  toggleWindow: () => void; // Alias
  toggleSettings: (pos?: { x: number, y: number }) => Promise<void>;
  closeSettings: () => Promise<void>;
  dragWindow: (isDragging: boolean) => void;
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;

  // Window Events
  onWindowFocus: (callback: (isFocused: boolean) => void) => () => void;
  onHideApp: (callback: () => void) => () => void;

  // --- Session & Intelligence Flow ---
  startSession: (metadata?: any) => Promise<{ success: boolean; meetingId?: string; error?: string }>;
  stopSession: () => Promise<{ success: boolean; error?: string }>;
  startMeeting: (metadata?: any) => Promise<{ success: boolean; meetingId?: string; error?: string }>; // Alias
  endMeeting: () => Promise<{ success: boolean; error?: string }>; // Alias
  resetIntelligence: () => Promise<void>;

  // Intelligence Generation (NEW)
  generateWhatToSay: (question?: string, imagePath?: string) => Promise<{ success: boolean; result: string | null }>;
  generateFollowUp: (intent: string) => Promise<{ success: boolean; result: string | null }>;
  generateRecap: () => Promise<{ success: boolean; result: string | null }>;
  generateFollowUpQuestions: () => Promise<{ success: boolean; result: string | null }>;
  generateSuggestion: (context: string, lastQuestion: string) => Promise<{ suggestion: string }>;
  analyzeImageFile: (path: string) => Promise<any>;

  // Generic Intelligence Events
  onTranscriptionToken: (callback: (data: any) => void) => () => void;
  onNativeAudioTranscript: (callback: (data: any) => void) => () => void;
  onMeetingEnd: (callback: (data: { meetingId: string }) => void) => () => void;
  onMeetingsUpdated: (callback: () => void) => () => void;
  onSessionReset: (callback: () => void) => () => void;
  onResetView: (callback: () => void) => () => void;

  // Intelligence Events (Standardized)
  onSuggestionProcessingStart: (callback: () => void) => () => void;
  onIntelligenceSuggestedAnswerToken: (callback: (data: any) => void) => () => void;
  onIntelligenceSuggestedAnswer: (callback: (data: any) => void) => () => void;
  onIntelligenceRefinedAnswerToken: (callback: (data: any) => void) => () => void;
  onIntelligenceRefinedAnswer: (callback: (data: any) => void) => () => void;
  onIntelligenceRecapToken: (callback: (data: any) => void) => () => void;
  onIntelligenceRecap: (callback: (data: any) => void) => () => void;
  onIntelligenceFollowUpQuestionsToken: (callback: (data: any) => void) => () => void;
  onIntelligenceFollowUpQuestionsUpdate: (callback: (data: any) => void) => () => void;
  onIntelligenceManualResult: (callback: (data: any) => void) => () => void;
  onIntelligenceModeChange: (callback: (mode: string) => void) => () => void;
  onIntelligenceError: (callback: (data: any) => void) => () => void;

  // Solution Specific Events
  onSolutionStart: (callback: () => void) => () => void;
  onSolutionError: (callback: (error: any) => void) => () => void;
  onSolutionSuccess: (callback: (data: any) => void) => () => void;
  onDebugStart: (callback: () => void) => () => void;
  onDebugSuccess: (callback: (data: any) => void) => () => void;
  onDebugError: (callback: (error: any) => void) => () => void;
  onProcessingNoScreenshots: (callback: () => void) => () => void;

  // --- Gemini / Chat ---
  streamGeminiChat: (message: string, imagePath?: string, context?: string, options?: any) => Promise<void>;
  onGeminiStreamToken: (callback: (token: string) => void) => () => void;
  onGeminiStreamDone: (callback: () => void) => () => void;
  onGeminiStreamError: (callback: (error: string) => void) => () => void;
  geminiChat: (message: string, imagePath?: string, context?: string, options?: any) => Promise<string>;

  // --- Screenshot Management ---
  takeScreenshot: () => Promise<string>;
  takeSelectiveScreenshot: () => Promise<string | { cancelled: boolean }>;
  getScreenshots: () => Promise<Array<{ path: string; preview: string }>>; // Updated to object array
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>;
  onScreenshotTaken: (callback: (data: any) => void) => () => void;
  onScreenshotAttached: (callback: (data: any) => void) => () => void;

  // --- History & RAG ---
  getRecentMeetings: (limit?: number) => Promise<any[]>;
  getMeetingDetails: (id: string) => Promise<any>;
  updateMeetingTitle: (id: string, title: string) => Promise<void>;
  updateMeetingSummary: (id: string, updates: any) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  searchMeetings: (query: string) => Promise<any[]>;
  onSearchToken: (callback: (token: string) => void) => () => void;
  onSearchComplete: (callback: (answer: string) => void) => () => void;

  // Global RAG
  ragQueryGlobal: (query: string) => Promise<{ success: boolean; streaming?: boolean; fallback?: boolean; error?: string }>;
  ragQueryMeeting: (meetingId: string, query: string) => Promise<{ success: boolean; streaming?: boolean; fallback?: boolean; error?: string }>; // Added
  onRAGStreamChunk: (callback: (data: { chunk: string }) => void) => () => void;
  onRAGStreamComplete: (callback: () => void) => () => void;
  onRAGStreamError: (callback: (data: { error: string }) => void) => () => void;

  // --- Calendar ---
  getCalendarStatus: () => Promise<{ connected: boolean; email?: string; lastSync?: number }>;
  calendarConnect: () => Promise<{ success: boolean; error?: string }>;
  calendarRefresh: () => Promise<{ success: boolean; error?: string }>;
  getUpcomingEvents: () => Promise<any[]>;

  // --- Credentials & Config ---
  getCredentials: () => Promise<any>;
  getStoredCredentials: () => Promise<any>; // Alias
  saveCredentials: (creds: any) => Promise<{ success: boolean; error?: string }>;
  getCredentialsStatus: () => Promise<any>;
  selectServiceAccount: () => Promise<any>;
  testReleaseFetch: () => Promise<{ success: boolean; error?: string }>;

  // LLM Switching
  getCurrentLlmConfig: () => Promise<any>;
  getOllamaModels: () => Promise<string[]>;
  getAvailableOllamaModels: () => Promise<string[]>;
  switchToOllama: (model: string, url?: string) => Promise<{ success: boolean; error?: string }>;
  switchToGemini: (apiKey?: string, modelId?: string) => Promise<{ success: boolean; error?: string }>;
  forceRestartOllama: () => Promise<{ success: boolean; error?: string }>;
  ensureOllamaRunning: () => Promise<{ success: boolean; message?: string }>;
  onModelChanged: (callback: (modelId: string) => void) => () => void;

  // --- Settings & Utils ---
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean }>;
  getSttConfig: () => Promise<any>;
  setSttProvider: (provider: string) => Promise<{ success: boolean }>;
  setRecognitionLanguage: (lang: string) => Promise<void>;
  getRecognitionLanguages: () => Promise<any>; // Changed to any to handle Record<string, ...>
  getAppVersion: () => Promise<string>;
  quitApp: () => void;
  openUrl: (url: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  getOpenAtLogin: () => Promise<boolean>;
  setOpenAtLogin: (open: boolean) => Promise<{ success: boolean }>;
  setWindowMode: (mode: 'launcher' | 'overlay') => Promise<{ success: boolean }>;
  updateContentDimensions: (dims: { width: number; height: number }) => Promise<void>;

  // --- Undetectable / Disguise ---
  getUndetectable: () => Promise<boolean>;
  setUndetectable: (state: boolean) => Promise<{ success: boolean }>;
  getDisguise: () => Promise<string>;
  setDisguise: (mode: string) => Promise<{ success: boolean }>;
  onUndetectableChanged: (callback: (state: boolean) => void) => () => void;
  onDisguiseChanged: (callback: (mode: string) => void) => () => void;
  onGroqFastTextChanged: (callback: (state: boolean) => void) => () => void;

  // --- Keybinds ---
  getKeybinds: () => Promise<any[]>; // Returns keybind array
  setKeybind: (id: string, accelerator: string) => Promise<boolean>;
  resetKeybinds: () => Promise<any[]>; // Returns keybind array
  onKeybindsUpdate: (callback: (keybinds: any) => void) => () => void;

  // --- Theme ---
  getThemeMode: () => Promise<{ mode: string; resolved: string }>;
  setThemeMode: (mode: string) => Promise<void>;
  onThemeChanged: (callback: (data: { mode: string; resolved: string }) => void) => () => void;

  // --- Audio ---
  getNativeAudioStatus: () => Promise<{ connected: boolean }>; // Updated property name
  onNativeAudioConnected: (callback: () => void) => () => void;
  onNativeAudioDisconnected: (callback: () => void) => () => void;
  startAudioTest: (deviceId?: string) => void;
  stopAudioTest: () => void;
  onAudioLevel: (callback: (level: number) => void) => () => void;

  // --- Update ---
  checkUpdate: () => Promise<any>;
  downloadUpdate: () => Promise<any>;
  restartAndInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onDownloadProgress: (callback: (progress: any) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;

  // --- Donation ---
  getDonationStatus: () => Promise<{ shouldShow: boolean; hasDonated: boolean; lifetimeShows: number }>;
  markDonationToastShown: () => Promise<void>;
  setDonationComplete: () => Promise<void>;

  // --- Compatibility / Legacy ---
  onSettingsVisibilityChange: (callback: (isVisible: boolean) => void) => () => void;
  onToggleExpand: (callback: () => void) => () => void;
  onSuggestionGenerated: (callback: (data: any) => void) => () => void;
  onSuggestionError: (callback: (error: any) => void) => () => void;

  // Generic Invoke
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;

  // New Methods from Sync
  setGeminiApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  setGroqApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  setOpenaiApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  setClaudeApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  testLlmConnection: (provider: string, key: string) => Promise<{ success: boolean; error?: string }>;
  getGroqFastTextMode: () => Promise<{ enabled: boolean }>;
  setGroqFastTextMode: (enabled: boolean) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}