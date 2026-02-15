import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
    Sparkles,
    Pencil,
    MessageSquare,
    RefreshCw,
    Settings,
    ArrowUp,
    ArrowRight,
    HelpCircle,
    ChevronUp,
    ChevronDown,
    CornerDownLeft,
    Mic,
    MicOff,
    Image,
    Camera,
    X,
    LogOut,
    Zap,
    Edit3,
    SlidersHorizontal,
    Ghost,
    Link,
    Code,
    Copy,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import TopPill from './ui/TopPill';
import RollingTranscript from './ui/RollingTranscript';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { analytics, detectProviderType } from '../lib/analytics/analytics.service';
import { useShortcuts } from '../hooks/useShortcuts';

interface Message {
    id: string;
    role: 'user' | 'system' | 'interviewer';
    text: string;
    isStreaming?: boolean;
    hasScreenshot?: boolean;
    screenshotPreview?: string;
    isCode?: boolean;
    intent?: string;
}

interface NativelyInterfaceProps {
    onEndMeeting?: () => void;
}

const NativelyInterface: React.FC<NativelyInterfaceProps> = ({ onEndMeeting }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const { shortcuts, isShortcutPressed } = useShortcuts();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [conversationContext, setConversationContext] = useState<string>('');
    const [isManualRecording, setIsManualRecording] = useState(false);
    const isRecordingRef = useRef(false);  // Ref to track recording state (avoids stale closure)
    const [manualTranscript, setManualTranscript] = useState('');
    const [showTranscript, setShowTranscript] = useState(() => {
        const stored = localStorage.getItem('natively_interviewer_transcript');
        return stored !== 'false';
    });

    // Analytics State
    const requestStartTimeRef = useRef<number | null>(null);

    // Sync transcript setting
    useEffect(() => {
        const handleStorage = () => {
            const stored = localStorage.getItem('natively_interviewer_transcript');
            setShowTranscript(stored !== 'false');
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const [rollingTranscript, setRollingTranscript] = useState('');  // For interviewer rolling text bar
    const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);  // Track if actively speaking
    const [voiceInput, setVoiceInput] = useState('');  // Accumulated user voice input
    const voiceInputRef = useRef<string>('');  // Ref for capturing in async handlers
    const textInputRef = useRef<HTMLInputElement>(null); // Ref for input focus

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Latent Context State (Screenshot attached but not sent)
    const [attachedContext, setAttachedContext] = useState<{ path: string, preview: string } | null>(null);

    // Settings State with Persistence
    const [isUndetectable, setIsUndetectable] = useState(false);
    const [hideChatHidesWidget, setHideChatHidesWidget] = useState(() => {
        const stored = localStorage.getItem('natively_hideChatHidesWidget');
        return stored ? stored === 'true' : true;
    });

    // Model Selection State
    const [currentModel, setCurrentModel] = useState<string>('gemini-3-flash-preview');

    useEffect(() => {
        // Load the persisted default model
        if (window.electronAPI?.invoke) {
            window.electronAPI.invoke('get-default-model')
                .then((result: any) => {
                    if (result && result.model) {
                        setCurrentModel(result.model);
                        // Also set the runtime model to the default
                        window.electronAPI.invoke('set-model', result.model).catch(() => { });
                    }
                })
                .catch((err: any) => console.error("Failed to fetch default model:", err));
        }
    }, []);

    const handleModelSelect = (modelId: string) => {
        setCurrentModel(modelId);
        // Session-only: update runtime but don't persist as default
        window.electronAPI.invoke('set-model', modelId)
            .catch((err: any) => console.error("Failed to set model:", err));
    };

    // Listen for default model changes from Settings
    useEffect(() => {
        if (!window.electronAPI?.onModelChanged) return;
        const unsubscribe = window.electronAPI.onModelChanged((modelId: string) => {
            setCurrentModel(prev => prev === modelId ? prev : modelId);
        });
        return () => unsubscribe();
    }, []);

    // Global State Sync
    useEffect(() => {
        // Fetch initial state
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then(setIsUndetectable);
        }

        if (window.electronAPI?.onUndetectableChanged) {
            const unsubscribe = window.electronAPI.onUndetectableChanged((state) => {
                setIsUndetectable(state);
            });
            return () => unsubscribe();
        }
    }, []);

    // Persist Settings
    useEffect(() => {
        localStorage.setItem('natively_undetectable', String(isUndetectable));
        localStorage.setItem('natively_hideChatHidesWidget', String(hideChatHidesWidget));
    }, [isUndetectable, hideChatHidesWidget]);

    // Auto-resize Window
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                console.log('[NativelyInterface] ResizeObserver:', Math.ceil(rect.width), Math.ceil(rect.height));
                window.electronAPI?.updateContentDimensions({
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height)
                });
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    // Force initial sizing safety check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (contentRef.current) {
                const rect = contentRef.current.getBoundingClientRect();
                window.electronAPI?.updateContentDimensions({
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height)
                });
            }
        }, 600);
        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isExpanded, isProcessing]);

    // Build conversation context from messages
    useEffect(() => {
        const context = messages
            .filter(m => m.role !== 'user' || !m.hasScreenshot)
            .map(m => `${m.role === 'interviewer' ? 'Interviewer' : m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .slice(-20)
            .join('\n');
        setConversationContext(context);
    }, [messages]);

    // Listen for settings window visibility changes
    useEffect(() => {
        if (!window.electronAPI?.onSettingsVisibilityChange) return;
        const unsubscribe = window.electronAPI.onSettingsVisibilityChange((isVisible) => {
            setIsSettingsOpen(isVisible);
        });
        return () => unsubscribe();
    }, []);

    // Sync Window Visibility with Expanded State
    useEffect(() => {
        if (isExpanded) {
            window.electronAPI.showWindow();
        } else {
            setTimeout(() => window.electronAPI.hideWindow(), 400);
        }
    }, [isExpanded]);

    // Keyboard shortcut to toggle expanded state
    useEffect(() => {
        if (!window.electronAPI?.onToggleExpand) return;
        const unsubscribe = window.electronAPI.onToggleExpand(() => {
            setIsExpanded(prev => !prev);
        });
        return () => unsubscribe();
    }, []);

    // Session Reset Listener
    useEffect(() => {
        if (!window.electronAPI?.onSessionReset) return;
        const unsubscribe = window.electronAPI.onSessionReset(() => {
            console.log('[NativelyInterface] Resetting session state...');
            setMessages([]);
            setInputValue('');
            setAttachedContext(null);
            setManualTranscript('');
            setVoiceInput('');
            setIsProcessing(false);
            analytics.trackConversationStarted();
        });
        return () => unsubscribe();
    }, []);

    // Connect to Native Audio Backend
    useEffect(() => {
        const cleanups: (() => void)[] = [];

        window.electronAPI.getNativeAudioStatus().then((status) => {
            setIsConnected(status.connected);
        }).catch(() => setIsConnected(false));

        cleanups.push(window.electronAPI.onNativeAudioConnected(() => {
            setIsConnected(true);
        }));
        cleanups.push(window.electronAPI.onNativeAudioDisconnected(() => {
            setIsConnected(false);
        }));

        cleanups.push(window.electronAPI.onNativeAudioTranscript((transcript) => {
            if (isRecordingRef.current && transcript.speaker === 'user') {
                if (transcript.final) {
                    setVoiceInput(prev => {
                        const updated = prev + (prev ? ' ' : '') + transcript.text;
                        voiceInputRef.current = updated;
                        return updated;
                    });
                    setManualTranscript('');
                } else {
                    setManualTranscript(transcript.text);
                }
                return;
            }

            if (transcript.speaker === 'user') return;
            if (transcript.speaker !== 'interviewer') return;

            setIsInterviewerSpeaking(!transcript.final);
            if (transcript.final) {
                setRollingTranscript(prev => {
                    const separator = prev ? '  ·  ' : '';
                    return prev + separator + transcript.text;
                });
                setTimeout(() => setIsInterviewerSpeaking(false), 3000);
            } else {
                setRollingTranscript(prev => {
                    const lastSeparator = prev.lastIndexOf('  ·  ');
                    const accumulated = lastSeparator >= 0 ? prev.substring(0, lastSeparator + 5) : '';
                    return accumulated + transcript.text;
                });
            }
        }));

        cleanups.push(window.electronAPI.onSuggestionProcessingStart(() => {
            setIsProcessing(true);
            setIsExpanded(true);
        }));

        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswerToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: 'what_to_answer',
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswer((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.answer,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.answer,
                    intent: 'what_to_answer'
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceRefinedAnswerToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === data.intent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: data.intent,
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceRefinedAnswer((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === data.intent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.answer,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.answer,
                    intent: data.intent
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceRecapToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'recap') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: 'recap',
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceRecap((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'recap') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.summary,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.summary,
                    intent: 'recap'
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceFollowUpQuestionsToken((data) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'follow_up_questions') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: 'follow_up_questions',
                    isStreaming: true
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceFollowUpQuestionsUpdate((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'follow_up_questions') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.questions,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.questions,
                    intent: 'follow_up_questions'
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceManualResult((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `🎯 **Answer:**\n\n${data.answer}`
            }]);
        }));

        cleanups.push(window.electronAPI.onIntelligenceError((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `❌ Error (${data.mode}): ${data.error}`
            }]);
        }));

        cleanups.push(window.electronAPI.onScreenshotTaken(async (data) => {
            setIsExpanded(true);
            setIsProcessing(true);
            analytics.trackCommandExecuted('screenshot_analysis');

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                text: 'Analyzing screenshot...',
                hasScreenshot: true,
                screenshotPreview: data.preview
            }]);

            [100, 300, 600].forEach(delay => {
                setTimeout(() => textInputRef.current?.focus(), delay);
            });

            try {
                const result = await window.electronAPI.invoke('analyze-image-file', data.path);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: result.text
                }]);
            } catch (err) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: `Error analyzing screenshot: ${err}`
                }]);
            } finally {
                setIsProcessing(false);
            }
        }));

        if (window.electronAPI.onScreenshotAttached) {
            cleanups.push(window.electronAPI.onScreenshotAttached((data) => {
                setIsExpanded(true);
                setAttachedContext(data);
            }));
        }

        return () => cleanups.forEach(fn => fn());
    }, [isExpanded]);

    // Setup Gemini Stream Listeners
    useEffect(() => {
        const cleanups: (() => void)[] = [];

        cleanups.push(window.electronAPI.onGeminiStreamToken((token) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                    const updated = [...prev];
                    const newText = lastMsg.text + token;
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: newText,
                        isCode: newText.includes('```') || newText.includes('def ') || newText.includes('function ')
                    };
                    return updated;
                }
                return prev;
            });
        }));

        cleanups.push(window.electronAPI.onGeminiStreamDone(() => {
            setIsProcessing(false);
            let latency = 0;
            if (requestStartTimeRef.current) {
                latency = Date.now() - requestStartTimeRef.current;
                requestStartTimeRef.current = null;
            }
            analytics.trackModelUsed({
                model_name: currentModel,
                provider_type: detectProviderType(currentModel),
                latency_ms: latency
            });
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming) {
                    const updated = [...prev];
                    updated[prev.length - 1] = { ...lastMsg, isStreaming: false };
                    return updated;
                }
                return prev;
            });
        }));

        cleanups.push(window.electronAPI.onGeminiStreamError((error) => {
            setIsProcessing(false);
            requestStartTimeRef.current = null;
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        isStreaming: false,
                        text: lastMsg.text + `\n\n[Error: ${error}]`
                    };
                    return updated;
                }
                return [...prev, { id: Date.now().toString(), role: 'system', text: `❌ Error: ${error}` }];
            });
        }));

        return () => cleanups.forEach(fn => fn());
    }, [currentModel]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        analytics.trackCopyAnswer();
    };

    const handleWhatToSay = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('what_to_say');

        const currentAttachment = attachedContext;
        if (currentAttachment) {
            setAttachedContext(null);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                text: 'What should I say about this?',
                hasScreenshot: true,
                screenshotPreview: currentAttachment.preview
            }]);
        }

        try {
            await window.electronAPI.generateWhatToSay(undefined, currentAttachment?.path);
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Error: ${err}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFollowUp = async (intent: string = 'rephrase') => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('follow_up_' + intent);
        try {
            await window.electronAPI.generateFollowUp(intent);
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Error: ${err}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecap = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('recap');
        try {
            await window.electronAPI.generateRecap();
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Error: ${err}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFollowUpQuestions = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('suggest_questions');
        try {
            await window.electronAPI.generateFollowUpQuestions();
        } catch (err) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: `Error: ${err}` }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAnswerNow = async () => {
        if (isManualRecording) {
            isRecordingRef.current = false;
            setIsManualRecording(false);
            setManualTranscript('');
            const currentAttachment = attachedContext;
            setAttachedContext(null);
            const question = voiceInputRef.current.trim();
            setVoiceInput('');
            voiceInputRef.current = '';

            if (!question && !currentAttachment) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', text: '⚠️ No speech detected.' }]);
                return;
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                text: question,
                hasScreenshot: !!currentAttachment,
                screenshotPreview: currentAttachment?.preview
            }, {
                id: (Date.now() + 1).toString(),
                role: 'system',
                text: '',
                isStreaming: true
            }]);

            setIsProcessing(true);
            try {
                let prompt = currentAttachment
                    ? `You are a helper. Analyze the screenshot in context of "${question}". Be concise.`
                    : `Extract the core question and provide a clear, concise answer conversational answer directly.`;

                requestStartTimeRef.current = Date.now();
                await window.electronAPI.streamGeminiChat(question, currentAttachment?.path, prompt, { skipSystemPrompt: true });
            } catch (err) {
                setIsProcessing(false);
                setMessages(prev => prev.slice(0, -1).concat({ id: Date.now().toString(), role: 'system', text: `❌ Error: ${err}` }));
            }
        } else {
            setVoiceInput('');
            voiceInputRef.current = '';
            setManualTranscript('');
            isRecordingRef.current = true;
            setIsManualRecording(true);
        }
    };

    const handleManualSubmit = async () => {
        if (!inputValue.trim() && !attachedContext) return;
        const userText = inputValue;
        const currentAttachment = attachedContext;
        setInputValue('');
        setAttachedContext(null);

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            text: userText || 'Analyze this screenshot',
            hasScreenshot: !!currentAttachment,
            screenshotPreview: currentAttachment?.preview
        }, {
            id: (Date.now() + 1).toString(),
            role: 'system',
            text: '',
            isStreaming: true
        }]);

        setIsExpanded(true);
        setIsProcessing(true);

        try {
            requestStartTimeRef.current = Date.now();
            await window.electronAPI.streamGeminiChat(userText || 'Analyze this screenshot', currentAttachment?.path, conversationContext);
        } catch (err) {
            setIsProcessing(false);
            setMessages(prev => prev.slice(0, -1).concat({ id: Date.now().toString(), role: 'system', text: `❌ Error: ${err}` }));
        }
    };

    const handlersRef = useRef({ handleWhatToSay, handleFollowUp, handleFollowUpQuestions, handleRecap, handleAnswerNow });
    handlersRef.current = { handleWhatToSay, handleFollowUp, handleFollowUpQuestions, handleRecap, handleAnswerNow };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const handlers = handlersRef.current;
            if (isShortcutPressed(e, 'whatToAnswer')) { e.preventDefault(); handlers.handleWhatToSay(); }
            else if (isShortcutPressed(e, 'shorten')) { e.preventDefault(); handlers.handleFollowUp('shorten'); }
            else if (isShortcutPressed(e, 'followUp')) { e.preventDefault(); handlers.handleFollowUpQuestions(); }
            else if (isShortcutPressed(e, 'recap')) { e.preventDefault(); handlers.handleRecap(); }
            else if (isShortcutPressed(e, 'answer')) { e.preventDefault(); handlers.handleAnswerNow(); }
            else if (isShortcutPressed(e, 'scrollUp')) { e.preventDefault(); scrollContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' }); }
            else if (isShortcutPressed(e, 'scrollDown')) { e.preventDefault(); scrollContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' }); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isShortcutPressed]);

    const generalHandlersRef = useRef({
        toggleVisibility: () => window.electronAPI.toggleWindow(),
        processScreenshots: handleWhatToSay,
        resetCancel: async () => {
            if (isProcessing) setIsProcessing(false);
            else { await window.electronAPI.resetIntelligence(); setMessages([]); setAttachedContext(null); setInputValue(''); }
        },
        takeScreenshot: () => window.electronAPI.takeScreenshot(),
        selectiveScreenshot: () => window.electronAPI.takeSelectiveScreenshot()
    });
    generalHandlersRef.current = {
        toggleVisibility: () => window.electronAPI.toggleWindow(),
        processScreenshots: handleWhatToSay,
        resetCancel: async () => {
            if (isProcessing) setIsProcessing(false);
            else { await window.electronAPI.resetIntelligence(); setMessages([]); setAttachedContext(null); setInputValue(''); }
        },
        takeScreenshot: () => window.electronAPI.takeScreenshot(),
        selectiveScreenshot: () => window.electronAPI.takeSelectiveScreenshot()
    };

    useEffect(() => {
        const handleGeneralKeyDown = (e: KeyboardEvent) => {
            const handlers = generalHandlersRef.current;
            const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
            if (isShortcutPressed(e, 'toggleVisibility')) { e.preventDefault(); handlers.toggleVisibility(); }
            else if (isShortcutPressed(e, 'processScreenshots')) { if (!isInput) { e.preventDefault(); handlers.processScreenshots(); } }
            else if (isShortcutPressed(e, 'resetCancel')) { e.preventDefault(); handlers.resetCancel(); }
            else if (isShortcutPressed(e, 'takeScreenshot')) { e.preventDefault(); handlers.takeScreenshot(); }
            else if (isShortcutPressed(e, 'selectiveScreenshot')) { e.preventDefault(); handlers.selectiveScreenshot(); }
        };
        window.addEventListener('keydown', handleGeneralKeyDown);
        return () => window.removeEventListener('keydown', handleGeneralKeyDown);
    }, [isShortcutPressed]);

    const renderMessageText = (msg: Message) => {
        if (msg.isCode || (msg.role === 'system' && msg.text.includes('```'))) {
            const parts = msg.text.split(/(```[\s\S]*?(?:```|$))/g);
            return (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 my-1">
                    <div className="flex items-center gap-2 mb-2 text-purple-300 font-semibold text-xs uppercase tracking-wide">
                        <Code className="w-3.5 h-3.5" /> <span>Code Solution</span>
                    </div>
                    <div className="space-y-2 text-slate-200 text-[13px] leading-relaxed">
                        {parts.map((part, i) => {
                            if (part.startsWith('```')) {
                                const match = part.match(/```(\w*)\s+([\s\S]*?)(?:```|$)/);
                                if (match || part.startsWith('```')) {
                                    const lang = (match && match[1]) || 'python';
                                    const code = (match && match[2]) ? match[2].trim() : part.replace(/^```\w*\s*/, '').replace(/```$/, '').trim();
                                    return (
                                        <div key={i} className="my-3 rounded-lg overflow-hidden border border-white/10 shadow-sm bg-[#0f172a]">
                                            <div className="bg-[#1e293b] px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 font-mono">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500/80" /> {lang}
                                                </div>
                                            </div>
                                            <SyntaxHighlighter language={lang} style={dracula} customStyle={{ margin: 0, borderRadius: 0, fontSize: '12px', background: 'transparent', padding: '12px' }} wrapLongLines={true} showLineNumbers={true}>
                                                {code}
                                            </SyntaxHighlighter>
                                        </div>
                                    );
                                }
                            }
                            return <div key={i} className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{part}</ReactMarkdown></div>;
                        })}
                    </div>
                </div>
            );
        }

        const intentLabels: Record<string, { color: string, icon: any, label: string }> = {
            shorten: { color: 'text-cyan-300', icon: MessageSquare, label: 'Shortened' },
            recap: { color: 'text-indigo-300', icon: RefreshCw, label: 'Recap' },
            follow_up_questions: { color: 'text-[#FFD60A]', icon: HelpCircle, label: 'Follow-Up Questions' },
            what_to_answer: { color: 'text-emerald-400', icon: Sparkles, label: 'Say this' }
        };

        if (msg.intent && intentLabels[msg.intent]) {
            const label = intentLabels[msg.intent];
            return (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 my-1">
                    <div className={`flex items-center gap-2 mb-2 ${label.color} font-semibold text-xs uppercase tracking-wide`}>
                        <label.icon className="w-3.5 h-3.5" /> <span>{label.label}</span>
                    </div>
                    <div className="text-slate-200 text-[13px] leading-relaxed markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown>
                    </div>
                </div>
            );
        }

        return (
            <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown>
            </div>
        );
    };

    return (
        <div ref={contentRef} className="flex flex-col items-center w-fit mx-auto h-fit min-h-0 bg-transparent p-0 rounded-[24px] font-sans text-slate-200 gap-2">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex flex-col items-center gap-2 w-full"
                    >
                        <TopPill
                            expanded={isExpanded}
                            onToggle={() => setIsExpanded(!isExpanded)}
                            onQuit={() => onEndMeeting ? onEndMeeting() : window.electronAPI.close()}
                        />
                        <div className="relative w-[600px] max-w-full bg-[#1E1E1E]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 rounded-[24px] overflow-hidden flex flex-col draggable-area">
                            {(rollingTranscript || isInterviewerSpeaking) && showTranscript && (
                                <RollingTranscript text={rollingTranscript} isActive={isInterviewerSpeaking} />
                            )}
                            {(messages.length > 0 || isManualRecording || isProcessing) && (
                                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[clamp(300px,35vh,450px)] no-drag" style={{ scrollbarWidth: 'none' }}>
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                            <div className={`${msg.role === 'user' ? 'max-w-[72.25%] px-[13.6px] py-[10.2px] bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-[20px] rounded-tr-[4px]' : 'max-w-[85%] px-4 py-3 text-slate-200'} text-[14px] leading-relaxed relative group whitespace-pre-wrap`}>
                                                {msg.role === 'interviewer' && <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-600 font-medium uppercase tracking-wider">Interviewer</div>}
                                                {msg.role === 'user' && msg.hasScreenshot && <div className="flex items-center gap-1 text-[10px] opacity-70 mb-1 border-b border-white/10 pb-1"><Image className="w-2.5 h-2.5" /> <span>Screenshot attached</span></div>}
                                                {msg.role === 'system' && !msg.isStreaming && <button onClick={() => handleCopy(msg.text)} className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-3.5 h-3.5" /></button>}
                                                {renderMessageText(msg)}
                                            </div>
                                        </div>
                                    ))}
                                    {isManualRecording && (
                                        <div className="flex flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            {(manualTranscript || voiceInput) && <div className="max-w-[85%] px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-[18px] rounded-tr-[4px]"><span className="text-[13px] text-emerald-300">{voiceInput}{voiceInput && manualTranscript ? ' ' : ''}{manualTranscript}</span></div>}
                                            <div className="px-3 py-2 flex gap-1.5 items-center"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" /></div>
                                        </div>
                                    )}
                                    {isProcessing && <div className="flex justify-start px-3 py-2 flex gap-1.5"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /></div>}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                            <div className={`flex flex-nowrap justify-center items-center gap-1.5 px-4 pb-3 overflow-x-hidden ${rollingTranscript && showTranscript ? 'pt-1' : 'pt-3'}`}>
                                <button onClick={handleWhatToSay} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 hover:text-slate-200 hover:bg-white/10 transition-all active:scale-95 shrink-0"><Pencil className="w-3 h-3 opacity-70" /> What to answer?</button>
                                <button onClick={() => handleFollowUp('shorten')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 hover:text-slate-200 hover:bg-white/10 transition-all active:scale-95 shrink-0"><MessageSquare className="w-3 h-3 opacity-70" /> Shorten</button>
                                <button onClick={handleRecap} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 hover:text-slate-200 hover:bg-white/10 transition-all active:scale-95 shrink-0"><RefreshCw className="w-3 h-3 opacity-70" /> Recap</button>
                                <button onClick={handleFollowUpQuestions} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 bg-white/5 hover:text-slate-200 hover:bg-white/10 transition-all active:scale-95 shrink-0"><HelpCircle className="w-3 h-3 opacity-70" /> Follow Up Question</button>
                                <button onClick={handleAnswerNow} className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 shrink-0 min-w-[74px] ${isManualRecording ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' : 'bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>{isManualRecording ? <><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Stop</> : <><Zap className="w-3 h-3 opacity-70" /> Answer</>}</button>
                            </div>
                            <div className="p-3 pt-0">
                                {attachedContext && <div className="mb-2 flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-2"><div className="flex items-center gap-3"><img src={attachedContext.preview} alt="Context" className="h-10 w-auto rounded border border-white/20" /><div className="flex flex-col"><span className="text-[11px] font-medium text-white">Screenshot attached</span><span className="text-[10px] text-slate-400">Ask anything or click Answer</span></div></div><button onClick={() => setAttachedContext(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button></div>}
                                <div className="relative group">
                                    <input ref={textInputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} className="w-full bg-[#1E1E1E] hover:bg-[#252525] border border-white/5 focus:border-white/10 focus:ring-1 focus:ring-white/10 rounded-xl pl-3 pr-10 py-2.5 text-slate-200 focus:outline-none transition-all text-[13px] placeholder:text-slate-500" />
                                    {!inputValue && <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-[13px] text-slate-400"><span>Ask anything, or</span><div className="flex items-center gap-1 opacity-80">{(shortcuts.selectiveScreenshot || ['⌘', 'Shift', 'H']).map((key, i) => (<React.Fragment key={i}>{i > 0 && <span>+</span>}<kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] min-w-[20px] text-center">{key}</kbd></React.Fragment>))}</div><span>for selective screenshot</span></div>}
                                </div>
                                <div className="flex items-center justify-between mt-3 px-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={(e) => {
                                                if (!contentRef.current) return;
                                                const contentRect = contentRef.current.getBoundingClientRect();
                                                const buttonRect = e.currentTarget.getBoundingClientRect();
                                                window.electronAPI.invoke('toggle-model-selector', { x: window.screenX + buttonRect.left, y: window.screenY + contentRect.bottom + 8 });
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-lg bg-black/20 text-white/70 hover:bg-white/5 hover:text-white text-xs font-medium w-[140px]"
                                        >
                                            <span className="truncate flex-1">{currentModel}</span>
                                            <ChevronDown size={14} className="shrink-0" />
                                        </button>
                                        <div className="w-px h-3 bg-white/10 mx-1" />
                                        <button onClick={(e) => {
                                            if (!contentRef.current) return;
                                            const contentRect = contentRef.current.getBoundingClientRect();
                                            const buttonRect = e.currentTarget.getBoundingClientRect();
                                            window.electronAPI.invoke('toggle-settings-window', { x: window.screenX + buttonRect.left, y: window.screenY + contentRect.bottom + 8 });
                                        }} className={`w-7 h-7 flex items-center justify-center rounded-lg ${isSettingsOpen ? 'text-white bg-white/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}><SlidersHorizontal className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <button onClick={handleManualSubmit} disabled={!inputValue.trim()} className={`w-7 h-7 rounded-full flex items-center justify-center ${inputValue.trim() ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}><ArrowRight className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NativelyInterface;
