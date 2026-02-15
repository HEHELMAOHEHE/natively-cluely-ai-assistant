
import { contextBridge, ipcRenderer } from 'electron';

declare global {
  interface Window {
    electronAPI: any;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Window Management ---
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  restore: () => ipcRenderer.send('window-restore'),
  close: () => ipcRenderer.send('window-close'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  toggleMain: () => ipcRenderer.send('toggle-main'),
  toggleWindow: () => ipcRenderer.send('toggle-main'), // Alias for NativelyInterface
  toggleSettings: (pos?: { x: number, y: number }) => ipcRenderer.invoke('toggle-settings-window', pos),
  closeSettings: () => ipcRenderer.invoke('close-settings-window'),
  dragWindow: (isDragging: boolean) => ipcRenderer.send('drag-window', isDragging),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),

  // Window Events
  onWindowFocus: (callback: (isFocused: boolean) => void) => {
    const listener = (_event: any, isFocused: boolean) => callback(isFocused);
    ipcRenderer.on('window-focus', listener);
    return () => ipcRenderer.removeListener('window-focus', listener);
  },
  onHideApp: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('hide-app', listener);
    return () => ipcRenderer.removeListener('hide-app', listener);
  },

  // --- Session & Intelligence Flow ---
  startSession: (metadata?: any) => ipcRenderer.invoke('start-session', metadata),
  stopSession: () => ipcRenderer.invoke('stop-session'),
  startMeeting: (metadata?: any) => ipcRenderer.invoke('start-session', metadata), // Alias
  endMeeting: () => ipcRenderer.invoke('stop-session'), // Alias
  resetIntelligence: () => ipcRenderer.invoke('reset-intelligence'),

  // Intelligence Generation (NEW)
  generateWhatToSay: (question?: string, imagePath?: string) => ipcRenderer.invoke('generate-what-to-say', question, imagePath),
  generateFollowUp: (intent: string) => ipcRenderer.invoke('generate-follow-up', intent),
  generateRecap: () => ipcRenderer.invoke('generate-recap'),
  generateFollowUpQuestions: () => ipcRenderer.invoke('generate-follow-up-questions'),

  // Generic Intelligence Events
  onTranscriptionToken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('transcription-token', listener);
    return () => ipcRenderer.removeListener('transcription-token', listener);
  },
  onNativeAudioTranscript: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('native-audio-transcript', listener);
    return () => ipcRenderer.removeListener('native-audio-transcript', listener);
  },
  onMeetingEnd: (callback: (data: { meetingId: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('meeting-end', listener);
    return () => ipcRenderer.removeListener('meeting-end', listener);
  },
  onMeetingsUpdated: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('meetings-updated', listener);
    return () => ipcRenderer.removeListener('meetings-updated', listener);
  },
  onSessionReset: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('session-reset', listener);
    return () => ipcRenderer.removeListener('session-reset', listener);
  },
  onResetView: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('session-reset', listener);
    ipcRenderer.on('reset-view', listener);
    return () => {
      ipcRenderer.removeListener('session-reset', listener);
      ipcRenderer.removeListener('reset-view', listener);
    };
  },

  // Intelligence Events (Standardized)
  onSuggestionProcessingStart: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('intelligence-manual-started', listener);
    return () => ipcRenderer.removeListener('intelligence-manual-started', listener);
  },
  onIntelligenceSuggestedAnswerToken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-suggested-answer-token', listener);
    return () => ipcRenderer.removeListener('intelligence-suggested-answer-token', listener);
  },
  onIntelligenceSuggestedAnswer: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-suggested-answer', listener);
    return () => ipcRenderer.removeListener('intelligence-suggested-answer', listener);
  },
  onIntelligenceRefinedAnswerToken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-refined-answer-token', listener);
    return () => ipcRenderer.removeListener('intelligence-refined-answer-token', listener);
  },
  onIntelligenceRefinedAnswer: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-refined-answer', listener);
    return () => ipcRenderer.removeListener('intelligence-refined-answer', listener);
  },
  onIntelligenceRecapToken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-recap-token', listener);
    return () => ipcRenderer.removeListener('intelligence-recap-token', listener);
  },
  onIntelligenceRecap: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-recap', listener);
    return () => ipcRenderer.removeListener('intelligence-recap', listener);
  },
  onIntelligenceFollowUpQuestionsToken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-follow-up-questions-token', listener);
    return () => ipcRenderer.removeListener('intelligence-follow-up-questions-token', listener);
  },
  onIntelligenceFollowUpQuestionsUpdate: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-follow-up-questions-update', listener);
    return () => ipcRenderer.removeListener('intelligence-follow-up-questions-update', listener);
  },
  onIntelligenceManualResult: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-manual-result', listener);
    return () => ipcRenderer.removeListener('intelligence-manual-result', listener);
  },
  onIntelligenceModeChange: (callback: (mode: string) => void) => {
    const listener = (_event: any, data: any) => callback(data.mode);
    ipcRenderer.on('intelligence-mode-changed', listener);
    return () => ipcRenderer.removeListener('intelligence-mode-changed', listener);
  },
  onIntelligenceError: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-error', listener);
    return () => ipcRenderer.removeListener('intelligence-error', listener);
  },

  // Solution Specific Events
  onSolutionStart: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('solution-start', listener);
    return () => ipcRenderer.removeListener('solution-start', listener);
  },
  onSolutionError: (callback: (error: any) => void) => {
    const listener = (_event: any, error: any) => callback(error);
    ipcRenderer.on('solution-error', listener);
    return () => ipcRenderer.removeListener('solution-error', listener);
  },
  onSolutionSuccess: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('solution-success', listener);
    return () => ipcRenderer.removeListener('solution-success', listener);
  },
  onDebugStart: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('debug-start', listener);
    return () => ipcRenderer.removeListener('debug-start', listener);
  },
  onDebugSuccess: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('debug-success', listener);
    return () => ipcRenderer.removeListener('debug-success', listener);
  },
  onDebugError: (callback: (error: any) => void) => {
    const listener = (_event: any, error: any) => callback(error);
    ipcRenderer.on('debug-error', listener);
    return () => ipcRenderer.removeListener('debug-error', listener);
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('processing-no-screenshots', listener);
    return () => ipcRenderer.removeListener('processing-no-screenshots', listener);
  },

  // --- Gemini / Chat ---
  streamGeminiChat: (message: string, imagePath?: string, context?: string) =>
    ipcRenderer.invoke('gemini-chat-stream', message, imagePath, context),
  onGeminiStreamToken: (callback: (token: string) => void) => {
    const listener = (_event: any, token: string) => callback(token);
    ipcRenderer.on('gemini-stream-token', listener);
    return () => ipcRenderer.removeListener('gemini-stream-token', listener);
  },
  onGeminiStreamDone: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('gemini-stream-done', listener);
    return () => ipcRenderer.removeListener('gemini-stream-done', listener);
  },
  onGeminiStreamError: (callback: (error: string) => void) => {
    const listener = (_event: any, error: string) => callback(error);
    ipcRenderer.on('gemini-stream-error', listener);
    return () => ipcRenderer.removeListener('gemini-stream-error', listener);
  },

  // --- Screenshot Management ---
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  takeSelectiveScreenshot: () => ipcRenderer.invoke('take-selective-screenshot'),
  getScreenshots: () => ipcRenderer.invoke('get-screenshots'),
  deleteScreenshot: (path: string) => ipcRenderer.invoke('delete-screenshot', path),
  onScreenshotTaken: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('screenshot-taken', listener);
    return () => ipcRenderer.removeListener('screenshot-taken', listener);
  },
  onScreenshotAttached: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('screenshot-attached', listener);
    return () => ipcRenderer.removeListener('screenshot-attached', listener);
  },

  // --- History & RAG ---
  getRecentMeetings: (limit?: number) => ipcRenderer.invoke('get-recent-meetings', limit),
  getMeetingDetails: (id: string) => ipcRenderer.invoke('get-meeting-details', id),
  updateMeetingTitle: (id: string, title: string) => ipcRenderer.invoke('update-meeting-title', id, title),
  updateMeetingSummary: (id: string, updates: any) => ipcRenderer.invoke('update-meeting-summary', id, updates),
  deleteMeeting: (id: string) => ipcRenderer.invoke('delete-meeting', id),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  searchMeetings: (query: string) => ipcRenderer.invoke('search-meetings', query),
  onSearchToken: (callback: (token: string) => void) => {
    const listener = (_event: any, token: string) => callback(token);
    ipcRenderer.on('search-token', listener);
    return () => ipcRenderer.removeListener('search-token', listener);
  },
  onSearchComplete: (callback: (answer: string) => void) => {
    const listener = (_event: any, answer: string) => callback(answer);
    ipcRenderer.on('search-complete', listener);
    return () => ipcRenderer.removeListener('search-complete', listener);
  },

  // Global RAG
  ragQueryGlobal: (query: string) => ipcRenderer.invoke('rag-query-global', query),
  onRAGStreamChunk: (callback: (data: { chunk: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('rag-stream-chunk', listener);
    return () => ipcRenderer.removeListener('rag-stream-chunk', listener);
  },
  onRAGStreamComplete: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('rag-stream-complete', listener);
    return () => ipcRenderer.removeListener('rag-stream-complete', listener);
  },
  onRAGStreamError: (callback: (data: { error: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('rag-stream-error', listener);
    return () => ipcRenderer.removeListener('rag-stream-error', listener);
  },

  // --- Calendar ---
  getCalendarStatus: () => ipcRenderer.invoke('get-calendar-status').catch(() => ({ connected: false })),
  calendarConnect: () => ipcRenderer.invoke('calendar-connect'),
  calendarRefresh: () => ipcRenderer.invoke('calendar-refresh'),
  getUpcomingEvents: () => ipcRenderer.invoke('get-upcoming-events'),

  // --- Credentials & Config ---
  getCredentials: () => ipcRenderer.invoke('get-credentials'),
  getStoredCredentials: () => ipcRenderer.invoke('get-credentials'), // Alias
  saveCredentials: (creds: any) => ipcRenderer.invoke('save-credentials', creds),
  getCredentialsStatus: () => ipcRenderer.invoke('get-credentials-status'),
  selectServiceAccount: () => ipcRenderer.invoke('select-service-account'),
  testReleaseFetch: () => ipcRenderer.invoke('test-release-fetch'),

  // Specific Key Setters (for AIProvidersSettings.tsx)
  setGeminiApiKey: (key: string) => ipcRenderer.invoke('set-gemini-api-key', key),
  setGroqApiKey: (key: string) => ipcRenderer.invoke('set-groq-api-key', key),
  setOpenaiApiKey: (key: string) => ipcRenderer.invoke('set-openai-api-key', key),
  setClaudeApiKey: (key: string) => ipcRenderer.invoke('set-claude-api-key', key),
  testLlmConnection: (provider: string, key: string) => ipcRenderer.invoke('test-llm-connection', provider, key),

  // LLM Switching
  getCurrentLlmConfig: () => ipcRenderer.invoke('get-current-llm-config'),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  getAvailableOllamaModels: () => ipcRenderer.invoke('get-available-ollama-models'),
  switchToOllama: (model: string, url?: string) => ipcRenderer.invoke('switch-to-ollama', model, url),
  switchToGemini: (apiKey?: string, modelId?: string) => ipcRenderer.invoke('switch-to-gemini', apiKey, modelId),
  forceRestartOllama: () => ipcRenderer.invoke('force-restart-ollama'),
  ensureOllamaRunning: () => ipcRenderer.invoke('ensure-ollama-running'),
  onModelChanged: (callback: (modelId: string) => void) => {
    const listener = (_event: any, modelId: string) => callback(modelId);
    ipcRenderer.on('model-changed', listener);
    return () => ipcRenderer.removeListener('model-changed', listener);
  },

  // --- Settings & Utils ---
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  getSttConfig: () => ipcRenderer.invoke('get-stt-config'),
  setSttProvider: (provider: string) => ipcRenderer.invoke('set-stt-provider', provider),
  setRecognitionLanguage: (lang: string) => ipcRenderer.invoke('set-recognition-language', lang),
  getRecognitionLanguages: () => ipcRenderer.invoke('get-recognition-languages'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  quitApp: () => ipcRenderer.send('window-close'),
  openUrl: (url: string) => ipcRenderer.invoke('open-url', url),
  openExternal: (url: string) => ipcRenderer.invoke('open-url', url),
  getOpenAtLogin: () => ipcRenderer.invoke('get-open-at-login'),
  setOpenAtLogin: (open: boolean) => ipcRenderer.invoke('set-open-at-login', open),
  setWindowMode: (mode: 'launcher' | 'overlay') => ipcRenderer.invoke('set-window-mode', mode),
  updateContentDimensions: (dims: { width: number, height: number }) => ipcRenderer.invoke('update-content-dimensions', dims),

  // --- Undetectable / Disguise ---
  getUndetectable: () => ipcRenderer.invoke('get-undetectable'),
  setUndetectable: (state: boolean) => ipcRenderer.invoke('set-undetectable', state),
  getDisguise: () => ipcRenderer.invoke('get-disguise'),
  setDisguise: (mode: string) => ipcRenderer.invoke('set-disguise', mode),
  onUndetectableChanged: (callback: (state: boolean) => void) => {
    const listener = (_event: any, state: boolean) => callback(state);
    ipcRenderer.on('undetectable-changed', listener);
    return () => ipcRenderer.removeListener('undetectable-changed', listener);
  },
  onDisguiseChanged: (callback: (mode: string) => void) => {
    const listener = (_event: any, mode: string) => callback(mode);
    ipcRenderer.on('disguise-changed', listener);
    return () => ipcRenderer.removeListener('disguise-changed', listener);
  },
  onGroqFastTextChanged: (callback: (state: boolean) => void) => {
    const listener = (_event: any, state: boolean) => callback(state);
    ipcRenderer.on('groq-fast-text-changed', listener);
    return () => ipcRenderer.removeListener('groq-fast-text-changed', listener);
  },

  // --- Keybinds ---
  getKeybinds: () => ipcRenderer.invoke('keybinds:get-all'),
  setKeybind: (id: string, accelerator: string) => ipcRenderer.invoke('keybinds:set', id, accelerator),
  resetKeybinds: () => ipcRenderer.invoke('keybinds:reset'),
  onKeybindsUpdate: (callback: (keybinds: any) => void) => {
    const listener = (_event: any, keybinds: any) => callback(keybinds);
    ipcRenderer.on('keybinds:update', listener);
    return () => ipcRenderer.removeListener('keybinds:update', listener);
  },

  // --- Theme ---
  getThemeMode: () => ipcRenderer.invoke('get-theme-mode'),
  setThemeMode: (mode: string) => ipcRenderer.invoke('set-theme-mode', mode),
  onThemeChanged: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('theme:changed', listener);
    return () => ipcRenderer.removeListener('theme:changed', listener);
  },

  // --- Audio ---
  getNativeAudioStatus: () => ipcRenderer.invoke('get-audio-status'),
  onNativeAudioConnected: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('audio-connected', listener);
    return () => ipcRenderer.removeListener('audio-connected', listener);
  },
  onNativeAudioDisconnected: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('audio-disconnected', listener);
    return () => ipcRenderer.removeListener('audio-disconnected', listener);
  },
  startAudioTest: (deviceId?: string) => ipcRenderer.send('start-audio-test', deviceId),
  stopAudioTest: () => ipcRenderer.send('stop-audio-test'),
  onAudioLevel: (callback: (level: number) => void) => {
    const listener = (_event: any, level: number) => callback(level);
    ipcRenderer.on('audio-level', listener);
    return () => ipcRenderer.removeListener('audio-level', listener);
  },

  // --- Update ---
  checkUpdate: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  restartAndInstall: () => ipcRenderer.invoke('quit-and-install-update'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const listener = (_event: any, info: any) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const listener = (_event: any, info: any) => callback(info);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },

  // --- Donation ---
  getDonationStatus: () => ipcRenderer.invoke('get-donation-status'),
  markDonationToastShown: () => ipcRenderer.invoke('mark-donation-toast-shown'),
  setDonationComplete: () => ipcRenderer.invoke('set-donation-complete'),

  // --- Compatibility / Legacy ---
  onSettingsVisibilityChange: (callback: (isVisible: boolean) => void) => {
    const listener = (_event: any, value: boolean) => callback(value);
    ipcRenderer.on('settings-visibility-changed', listener);
    return () => ipcRenderer.removeListener('settings-visibility-changed', listener);
  },
  onToggleExpand: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('toggle-expand', listener);
    return () => ipcRenderer.removeListener('toggle-expand', listener);
  },
  onSuggestionGenerated: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-suggested-answer', listener);
    return () => ipcRenderer.removeListener('intelligence-suggested-answer', listener);
  },
  onSuggestionError: (callback: (error: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('intelligence-error', listener);
    return () => ipcRenderer.removeListener('intelligence-error', listener);
  },

  // Generic Invoke
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
});
