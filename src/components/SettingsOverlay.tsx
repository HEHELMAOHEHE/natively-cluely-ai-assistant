import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import packageJson from '../../package.json';
import {
    X, Mic, Speaker, Monitor, Keyboard, User, LifeBuoy, LogOut, Upload,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    Camera, RotateCcw, Eye, Layout, MessageSquare, Crop,
    ChevronDown, Check, BadgeCheck, Power, Palette, Calendar, Ghost, Sun, Moon, RefreshCw, Info, Globe, FlaskConical, Terminal, Settings, Activity, ExternalLink, Trash2,
    Sparkles, Pencil
} from 'lucide-react';
import { analytics } from '../lib/analytics/analytics.service';
import { AboutSection } from './AboutSection';
import { AIProvidersSettings } from './settings/AIProvidersSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { useShortcuts } from '../hooks/useShortcuts';
import { KeyRecorder } from './ui/KeyRecorder';


interface CustomSelectProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    options: MediaDeviceInfo[];
    onChange: (value: string) => void;
    placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, icon, value, options, onChange, placeholder = "Select device" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.deviceId === value)?.label || placeholder;

    return (
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle" ref={containerRef}>
            {label && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-text-secondary">{icon}</span>
                    <label className="text-xs font-medium text-text-primary uppercase tracking-wide">{label}</label>
                </div>
            )}

            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary flex items-center justify-between hover:bg-bg-elevated transition-colors"
                >
                    <span className="truncate pr-4">{selectedLabel}</span>
                    <ChevronDown size={14} className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-bg-elevated border border-border-subtle rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto animated fadeIn">
                        <div className="p-1 space-y-0.5">
                            {options.map((device) => (
                                <button
                                    key={device.deviceId}
                                    onClick={() => {
                                        onChange(device.deviceId);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between group transition-colors ${value === device.deviceId ? 'bg-bg-input hover:bg-bg-elevated text-text-primary' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                >
                                    <span className="truncate">{device.label || `Device ${device.deviceId.slice(0, 5)}...`}</span>
                                    {value === device.deviceId && <Check size={14} className="text-accent-primary" />}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500 italic">No devices found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

interface ProviderOption {
    id: string;
    label: string;
    badge?: string | null;
    recommended?: boolean;
    desc: string;
    color: string;
    icon: React.ReactNode;
}

interface ProviderSelectProps {
    value: string;
    options: ProviderOption[];
    onChange: (value: string) => void;
}

const ProviderSelect: React.FC<ProviderSelectProps> = ({ value, options, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find(o => o.id === value);

    const getBadgeStyle = (color?: string) => {
        switch (color) {
            case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'orange': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'purple': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'teal': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
            case 'cyan': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
            case 'indigo': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            case 'green': return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getIconStyle = (color?: string, isSelectedItem: boolean = false) => {
        if (isSelectedItem) return 'bg-accent-primary text-white shadow-sm';
        switch (color) {
            case 'blue': return 'bg-blue-500/10 text-blue-600';
            case 'orange': return 'bg-orange-500/10 text-orange-600';
            case 'purple': return 'bg-purple-500/10 text-purple-600';
            case 'teal': return 'bg-teal-500/10 text-teal-600';
            case 'cyan': return 'bg-cyan-500/10 text-cyan-600';
            case 'indigo': return 'bg-indigo-500/10 text-indigo-600';
            case 'green': return 'bg-green-500/10 text-green-600';
            default: return 'bg-gray-500/10 text-gray-600';
        }
    };

    return (
        <div ref={containerRef} className="relative z-20 font-sans">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full group bg-bg-input border border-border-subtle hover:border-border-muted shadow-sm rounded-xl p-2.5 pr-3.5 flex items-center justify-between transition-all duration-200 outline-none focus:ring-2 focus:ring-accent-primary/20 ${isOpen ? 'ring-2 ring-accent-primary/20 border-accent-primary/50' : 'hover:shadow-md'}`}
            >
                {selected ? (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-300 ${getIconStyle(selected.color)}`}>
                            {selected.icon}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">{selected.label}</span>
                                {selected.badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ml-2 ${getBadgeStyle(selected.badge === 'Saved' ? 'green' : selected.color)}`}>{selected.badge}</span>}
                                {selected.recommended && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ml-2 ${getBadgeStyle(selected.color)}`}>Recommended</span>}
                            </div>
                            <span className="text-[11px] text-text-tertiary truncate block leading-tight mt-0.5">{selected.desc}</span>
                        </div>
                    </div>
                ) : <span className="text-text-secondary px-2 text-sm">Select Provider</span>}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary transition-transform duration-300 group-hover:bg-bg-surface ${isOpen ? 'rotate-180 bg-bg-surface text-text-primary' : ''}`}>
                    <ChevronDown size={14} strokeWidth={2.5} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 w-full mt-2 bg-bg-elevated border border-border-subtle rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-0.5"
                    >
                        {options.map(option => {
                            const isSelected = value === option.id;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => { onChange(option.id); setIsOpen(false); }}
                                    className={`w-full rounded-[10px] p-2 flex items-center gap-3 transition-all duration-200 group relative ${isSelected ? 'bg-accent-primary/10' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getIconStyle(option.color, false)}`}>
                                        {option.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[13px] font-medium ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>{option.label}</span>
                                                {option.badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${getBadgeStyle(option.badge === 'Saved' ? 'green' : option.color)}`}>{option.badge}</span>}
                                            </div>
                                            {isSelected && <Check size={14} className="text-accent-primary" strokeWidth={3} />}
                                        </div>
                                        <span className={`text-[11px] block truncate text-text-tertiary`}>{option.desc}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('general');
    const { shortcuts, updateShortcut, resetShortcuts } = useShortcuts();

    // UI State
    const [isUndetectable, setIsUndetectable] = useState(false);
    const [disguiseMode, setDisguiseMode] = useState<'terminal' | 'settings' | 'activity' | 'none'>('none');
    const [openOnLogin, setOpenOnLogin] = useState(false);
    const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'uptodate' | 'error'>('idle');
    const [showTranscript, setShowTranscript] = useState(() => localStorage.getItem('natively_interviewer_transcript') !== 'false');

    // STT State
    const [sttProvider, setSttProvider] = useState<'google' | 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson'>('google');
    const [googleServiceAccountPath, setGoogleServiceAccountPath] = useState<string | null>(null);
    const [sttGroqKey, setSttGroqKey] = useState('');
    const [sttOpenaiKey, setSttOpenaiKey] = useState('');
    const [sttDeepgramKey, setSttDeepgramKey] = useState('');
    const [sttElevenLabsKey, setSttElevenLabsKey] = useState('');
    const [sttAzureKey, setSttAzureKey] = useState('');
    const [sttAzureRegion, setSttAzureRegion] = useState('eastus');
    const [sttIbmKey, setSttIbmKey] = useState('');
    const [groqSttModel, setGroqSttModel] = useState('whisper-large-v3-turbo');
    const [recognitionLanguage, setRecognitionLanguage] = useState('auto');
    const [languageOptions, setLanguageOptions] = useState<any[]>([]);

    // STT Test/Save Status
    const [sttTestStatus, setSttTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [sttTestError, setSttTestError] = useState('');
    const [sttSaving, setSttSaving] = useState(false);
    const [sttSaved, setSttSaved] = useState(false);

    // Stored Credentials Status
    const [hasStoredSttGroqKey, setHasStoredSttGroqKey] = useState(false);
    const [hasStoredSttOpenaiKey, setHasStoredSttOpenaiKey] = useState(false);
    const [hasStoredDeepgramKey, setHasStoredDeepgramKey] = useState(false);
    const [hasStoredElevenLabsKey, setHasStoredElevenLabsKey] = useState(false);
    const [hasStoredAzureKey, setHasStoredAzureKey] = useState(false);
    const [hasStoredIbmWatsonKey, setHasStoredIbmWatsonKey] = useState(false);

    // Audio Devices State
    const [selectedInput, setSelectedInput] = useState('');
    const [selectedOutput, setSelectedOutput] = useState('');
    const [inputDevices, setInputDevices] = useState<any[]>([]);
    const [outputDevices, setOutputDevices] = useState<any[]>([]);
    const [micLevel, setMicLevel] = useState(0);
    const [useLegacyAudio, setUseLegacyAudio] = useState(false);

    // Calendar
    const [calendarStatus, setCalendarStatus] = useState<{ connected: boolean; email?: string }>({ connected: false });
    const [isCalendarsLoading, setIsCalendarsLoading] = useState(false);

    // Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // --- Effects & Logic ---

    useEffect(() => {
        if (!isOpen) return;

        // Sync State
        // @ts-ignore
        window.electronAPI.getUndetectable?.().then(setIsUndetectable);
        // @ts-ignore
        window.electronAPI.getOpenAtLogin?.().then(setOpenOnLogin);
        // @ts-ignore
        window.electronAPI.getThemeMode?.().then(({ mode }) => setThemeMode(mode));
        // @ts-ignore
        window.electronAPI.getCalendarStatus?.().then(setCalendarStatus);

        // STT Config
        // @ts-ignore
        window.electronAPI.getSttConfig?.().then((config: any) => {
            if (config) {
                if (config.provider) setSttProvider(config.provider);
                if (config.googleServiceAccountPath) setGoogleServiceAccountPath(config.googleServiceAccountPath);
                if (config.groqSttModel) setGroqSttModel(config.groqSttModel);
                if (config.azureRegion) setSttAzureRegion(config.azureRegion);
            }
        });

        // Credentials Status
        // @ts-ignore
        window.electronAPI.getStoredCredentials?.().then((creds: any) => {
            if (creds) {
                setHasStoredSttGroqKey(creds.hasGroqSttKey);
                setHasStoredSttOpenaiKey(creds.hasOpenaiSttKey);
                setHasStoredDeepgramKey(creds.hasDeepgramKey);
                setHasStoredElevenLabsKey(creds.hasElevenLabsKey);
                setHasStoredAzureKey(creds.hasAzureKey);
                setHasStoredIbmWatsonKey(creds.hasIbmWatsonKey);
            }
        });

        // Audio Devices
        const loadDevices = async () => {
            try {
                // @ts-ignore
                const inputs = await window.electronAPI.getInputDevices?.() || [];
                // @ts-ignore
                const outputs = await window.electronAPI.getOutputDevices?.() || [];

                const format = (d: any) => ({
                    deviceId: d.id,
                    label: d.name,
                    kind: 'audioinput' as MediaDeviceKind,
                    groupId: '',
                    toJSON: () => d
                });

                const fInputs = inputs.map(format);
                const fOutputs = outputs.map(format);
                setInputDevices(fInputs);
                setOutputDevices(fOutputs);

                const savedInput = localStorage.getItem('preferredInputDeviceId');
                const savedOutput = localStorage.getItem('preferredOutputDeviceId');

                if (savedInput && inputs.find((d: any) => d.id === savedInput)) setSelectedInput(savedInput);
                else if (inputs.length > 0) setSelectedInput(inputs[0].id);

                if (savedOutput && outputs.find((d: any) => d.id === savedOutput)) setSelectedOutput(savedOutput);
                else if (outputs.length > 0) setSelectedOutput(outputs[0].id);
            } catch (e) { console.error("Load devices error", e); }
        };
        loadDevices();

        const legacy = localStorage.getItem('useLegacyAudioBackend') === 'true';
        setUseLegacyAudio(legacy);

        // Languages
        const loadLangs = async () => {
            // @ts-ignore
            if (!window.electronAPI.getRecognitionLanguages) return;
            // @ts-ignore
            const langs = await window.electronAPI.getRecognitionLanguages();
            const order = [
                { key: 'english-india', label: 'English (India)' },
                { key: 'english-us', label: 'English (United States)' },
                { key: 'english-uk', label: 'English (United Kingdom)' },
                { key: 'english-au', label: 'English (Australia)' },
                { key: 'english-ca', label: 'English (Canada)' },
            ];
            const options = [{ deviceId: 'auto', label: 'Auto (Recommended)', kind: 'audioinput' as MediaDeviceKind, groupId: '', toJSON: () => ({}) }];
            order.forEach(({ key, label }) => {
                if (langs[key]) options.push({ deviceId: key, label, kind: 'audioinput' as MediaDeviceKind, groupId: '', toJSON: () => ({}) });
            });
            setLanguageOptions(options);
            const stored = localStorage.getItem('natively_recognition_language') || 'auto';
            setRecognitionLanguage(stored);
        };
        loadLangs();

    }, [isOpen]);

    // IPC Listeners
    useEffect(() => {
        const unsubs: any[] = [];
        // @ts-ignore
        if (window.electronAPI.onUndetectableChanged) unsubs.push(window.electronAPI.onUndetectableChanged(setIsUndetectable));
        // @ts-ignore
        if (window.electronAPI.onDisguiseChanged) unsubs.push(window.electronAPI.onDisguiseChanged(setDisguiseMode));

        if (isOpen) {
            // @ts-ignore
            unsubs.push(window.electronAPI.onUpdateChecking?.(() => setUpdateStatus('checking')));
            // @ts-ignore
            unsubs.push(window.electronAPI.onUpdateAvailable?.(() => setUpdateStatus('available')));
            // @ts-ignore
            unsubs.push(window.electronAPI.onUpdateNotAvailable?.(() => { setUpdateStatus('uptodate'); setTimeout(() => setUpdateStatus('idle'), 3000); }));
            // @ts-ignore
            unsubs.push(window.electronAPI.onUpdateError?.(() => { setUpdateStatus('error'); setTimeout(() => setUpdateStatus('idle'), 3000); }));
        }

        return () => unsubs.forEach(u => typeof u === 'function' && u());
    }, [isOpen]);

    // Mic Monitoring
    useEffect(() => {
        if (isOpen && activeTab === 'audio') {
            let mounted = true;
            const start = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedInput ? { deviceId: { exact: selectedInput } } : true });
                    if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
                    streamRef.current = stream;
                    const ctx = new AudioContext();
                    const analyser = ctx.createAnalyser();
                    const source = ctx.createMediaStreamSource(stream);
                    analyser.fftSize = 256;
                    source.connect(analyser);
                    audioContextRef.current = ctx;
                    analyserRef.current = analyser;
                    const data = new Uint8Array(analyser.frequencyBinCount);
                    let smooth = 0;
                    const loop = () => {
                        if (!mounted || !analyserRef.current) return;
                        analyserRef.current.getByteTimeDomainData(data);
                        let sum = 0;
                        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
                        const rms = Math.sqrt(sum / data.length);
                        const db = 20 * Math.log10(rms || 0.000001);
                        const target = Math.max(0, Math.min(100, (db + 60) * 2));
                        smooth = smooth * 0.8 + target * 0.2;
                        setMicLevel(smooth);
                        rafRef.current = requestAnimationFrame(loop);
                    };
                    loop();
                } catch (e) { console.error("Mic error", e); }
            };
            start();
            return () => {
                mounted = false;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                if (audioContextRef.current) audioContextRef.current.close();
                if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                setMicLevel(0);
            };
        }
    }, [isOpen, activeTab, selectedInput]);

    // --- Handlers ---
    const handleCheckForUpdates = () => {
        if (updateStatus === 'checking') return;
        setUpdateStatus('checking');
        // @ts-ignore
        window.electronAPI.checkForUpdates?.().catch(() => { setUpdateStatus('error'); setTimeout(() => setUpdateStatus('idle'), 3000); });
    };

    const handleSetTheme = (mode: any) => {
        setThemeMode(mode);
        // @ts-ignore
        window.electronAPI.setThemeMode?.(mode);
    };

    const handleSttProviderChange = (provider: any) => {
        setSttProvider(provider);
        // @ts-ignore
        window.electronAPI.setSttProvider?.(provider);
    };

    const handleSttKeySubmit = async (provider: string, key: string) => {
        setSttSaving(true);
        try {
            const creds: any = {};
            if (provider === 'groq') creds.groqSttApiKey = key;
            else if (provider === 'openai') creds.openAiSttApiKey = key;
            else if (provider === 'deepgram') creds.deepgramApiKey = key;
            else if (provider === 'elevenlabs') creds.elevenLabsApiKey = key;
            else if (provider === 'azure') { creds.azureApiKey = key; creds.azureRegion = sttAzureRegion; }
            else if (provider === 'ibmwatson') creds.ibmWatsonApiKey = key;

            // @ts-ignore
            const res = await window.electronAPI.saveCredentials(creds);

            if (res.success) {
                setSttSaved(true);
                const map: any = { groq: setHasStoredSttGroqKey, openai: setHasStoredSttOpenaiKey, deepgram: setHasStoredDeepgramKey, elevenlabs: setHasStoredElevenLabsKey, azure: setHasStoredAzureKey, ibmwatson: setHasStoredIbmWatsonKey };
                map[provider]?.(true);
                setTimeout(() => setSttSaved(false), 2000);
            }
        } catch (e) { console.error(e); } finally { setSttSaving(false); }
    };

    const handleRemoveSttKey = async (provider: string) => {
        if (!confirm("Remove API Key?")) return;
        try {
            // @ts-ignore
            const res = await (window.electronAPI as any).removeSttApiKey(provider);
            if (res.success) {
                const map: any = { groq: setHasStoredSttGroqKey, openai: setHasStoredSttOpenaiKey, deepgram: setHasStoredDeepgramKey, elevenlabs: setHasStoredElevenLabsKey, azure: setHasStoredAzureKey, ibmwatson: setHasStoredIbmWatsonKey };
                map[provider]?.(false);
            }
        } catch (e) { console.error(e); }
    };

    const handleLanguageChange = (key: string) => {
        setRecognitionLanguage(key);
        localStorage.setItem('natively_recognition_language', key);
        // @ts-ignore
        window.electronAPI.setRecognitionLanguage?.(key === 'auto' ? 'english-us' : key);
    };

    const handleTestSttConnection = async () => {
        setSttTestStatus('testing');
        try {
            const keyMap: any = { groq: sttGroqKey, openai: sttOpenaiKey, deepgram: sttDeepgramKey, elevenlabs: sttElevenLabsKey, azure: sttAzureKey, ibmwatson: sttIbmKey };
            // @ts-ignore
            const res = await (window.electronAPI as any).testSttConnection(sttProvider, keyMap[sttProvider] || '', sttAzureRegion);
            if (res?.success) {
                setSttTestStatus('success');
                setTimeout(() => setSttTestStatus('idle'), 3000);
            } else {
                setSttTestStatus('error');
                setSttTestError(res?.error || 'Failed');
            }
        } catch (e: any) { setSttTestStatus('error'); setSttTestError(e.message); }
    };

    // --- Render ---
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-bg-elevated w-full max-w-4xl h-[85vh] rounded-2xl border border-border-subtle shadow-2xl flex overflow-hidden">

                        {/* Sidebar */}
                        <div className="w-64 bg-bg-sidebar flex flex-col border-r border-border-subtle">
                            <div className="p-6">
                                <h2 className="font-semibold text-text-tertiary text-[10px] uppercase tracking-[0.2em] mb-4">Settings</h2>
                                <nav className="space-y-1">
                                    {[
                                        { id: 'general', label: 'General', icon: <Monitor size={16} /> },
                                        { id: 'ai-providers', label: 'AI Providers', icon: <FlaskConical size={16} /> },
                                        { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
                                        { id: 'audio', label: 'Audio', icon: <Mic size={16} /> },
                                        { id: 'keybinds', label: 'Keybinds', icon: <Keyboard size={16} /> },
                                        { id: 'about', label: 'About', icon: <Info size={16} /> },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-bg-item-active text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                                        >
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            <div className="mt-auto p-6 border-t border-border-subtle">
                                <button onClick={onClose} className="w-full bg-bg-input hover:bg-bg-elevated border border-border-subtle text-text-primary py-2 rounded-lg text-xs font-bold transition-all">Close</button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-bg-main p-8 custom-scrollbar">

                            {activeTab === 'general' && (
                                <div className="space-y-8 animated fadeIn">
                                    <div className="bg-bg-card rounded-xl p-5 border border-border-subtle flex items-center justify-between mb-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Terminal size={18} className="text-text-primary" />
                                                <h3 className="text-sm font-bold text-text-primary">Disguise Mode</h3>
                                            </div>
                                            <p className="text-xs text-text-secondary">Camouflage the assistant window</p>
                                        </div>
                                        <select
                                            value={disguiseMode}
                                            onChange={(e) => {
                                                const val = e.target.value as any;
                                                setDisguiseMode(val);
                                                // @ts-ignore
                                                window.electronAPI.setDisguise?.(val);
                                            }}
                                            className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none"
                                        >
                                            <option value="none">None</option>
                                            <option value="terminal">Terminal</option>
                                            <option value="settings">Settings</option>
                                            <option value="activity">Activity Monitor</option>
                                        </select>
                                    </div>

                                    <div className="bg-bg-card rounded-xl p-5 border border-border-subtle flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Ghost size={18} className="text-text-primary" />
                                                <h3 className="text-sm font-bold text-text-primary">Undetectable Mode</h3>
                                            </div>
                                            <p className="text-xs text-text-secondary">Hide the assistant from screen sharing apps</p>
                                        </div>
                                        {/* @ts-ignore */}
                                        <div onClick={() => { const ns = !isUndetectable; setIsUndetectable(ns); window.electronAPI.setUndetectable?.(ns); }} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${isUndetectable ? 'bg-accent-primary' : 'bg-bg-input border border-border-muted'}`}>
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isUndetectable ? 'translate-x-4' : ''}`} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { label: 'Open at Login', icon: <Power size={18} />, value: openOnLogin, setter: (v: boolean) => { setOpenOnLogin(v); (window.electronAPI as any).setOpenAtLogin?.(v); } },
                                            { label: 'Show Interviewer Transcript', icon: <MessageSquare size={18} />, value: showTranscript, setter: (v: boolean) => { setShowTranscript(v); localStorage.setItem('natively_interviewer_transcript', String(v)); window.dispatchEvent(new Event('storage')); } },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-bg-input flex items-center justify-center text-text-tertiary">{item.icon}</div>
                                                    <span className="text-sm font-medium text-text-primary">{item.label}</span>
                                                </div>
                                                <div onClick={() => item.setter(!item.value)} className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${item.value ? 'bg-accent-primary' : 'bg-bg-input border border-border-muted'}`}>
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${item.value ? 'translate-x-4' : ''}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="h-px bg-border-subtle" />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-bg-input flex items-center justify-center text-text-tertiary"><Palette size={18} /></div>
                                                <span className="text-sm font-medium text-text-primary">Theme</span>
                                            </div>
                                            <select value={themeMode} onChange={(e) => handleSetTheme(e.target.value)} className="bg-bg-input border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none">
                                                <option value="system">System</option>
                                                <option value="light">Light</option>
                                                <option value="dark">Dark</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-bg-input flex items-center justify-center text-text-tertiary"><RefreshCw size={18} className={updateStatus === 'checking' ? 'animate-spin' : ''} /></div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-text-primary">Check for Updates</span>
                                                    <span className="text-[10px] text-text-tertiary">Current: v{packageJson.version}</span>
                                                </div>
                                            </div>
                                            <button onClick={handleCheckForUpdates} disabled={updateStatus === 'checking'} className="bg-accent-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-accent-primary/20">
                                                {updateStatus === 'checking' ? 'Checking...' : updateStatus === 'available' ? 'Update Now' : 'Check Now'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ai-providers' && <AIProvidersSettings />}

                            {activeTab === 'calendar' && (
                                <div className="space-y-6 animated fadeIn h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                                        <Calendar size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary mb-2">Visible Calendars</h3>
                                        <p className="text-xs text-text-secondary max-w-xs mx-auto mb-6">Upcoming meetings are synchronized from these calendars</p>
                                    </div>
                                    <div className="bg-bg-card rounded-2xl p-6 border border-border-subtle w-full max-w-sm">
                                        {calendarStatus.connected ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center text-text-primary font-bold">{calendarStatus.email?.[0].toUpperCase()}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-text-primary truncate">{calendarStatus.email}</p>
                                                        <p className="text-[10px] text-green-500 font-medium">Connected</p>
                                                    </div>
                                                </div>
                                                {/* @ts-ignore */}
                                                <button onClick={async () => { setIsCalendarsLoading(true); await window.electronAPI.calendarDisconnect?.(); window.electronAPI.getCalendarStatus?.().then(setCalendarStatus); setIsCalendarsLoading(false); }} className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all">{isCalendarsLoading ? '...' : 'Disconnect'}</button>
                                            </div>
                                        ) : (
                                            /* @ts-ignore */
                                            <button onClick={async () => { setIsCalendarsLoading(true); const res = await window.electronAPI.calendarConnect?.(); if (res?.success) window.electronAPI.getCalendarStatus?.().then(setCalendarStatus); setIsCalendarsLoading(false); }} className="w-full bg-accent-primary hover:bg-accent-secondary text-white py-3 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all">
                                                {isCalendarsLoading ? 'Connecting...' : <><Calendar size={14} /> Connect Google Calendar</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audio' && (
                                <div className="space-y-8 animated fadeIn">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary mb-3 px-1 uppercase tracking-wider text-[10px]">Speech Recognition</h3>
                                            <div className="bg-bg-card rounded-xl border border-border-subtle p-5 space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">Speech Provider</label>
                                                    <ProviderSelect
                                                        value={sttProvider}
                                                        onChange={handleSttProviderChange}
                                                        options={[
                                                            { id: 'google', label: 'Google Cloud', badge: googleServiceAccountPath ? 'Saved' : null, recommended: true, desc: 'gRPC streaming', color: 'blue', icon: <Mic size={14} /> },
                                                            { id: 'groq', label: 'Groq Whisper', badge: hasStoredSttGroqKey ? 'Saved' : null, recommended: true, desc: 'Fastest REST', color: 'orange', icon: <Mic size={14} /> },
                                                            { id: 'deepgram', label: 'Deepgram Nova-2', badge: hasStoredDeepgramKey ? 'Saved' : null, recommended: true, desc: 'High accuracy', color: 'purple', icon: <Mic size={14} /> },
                                                            { id: 'openai', label: 'OpenAI Whisper', badge: hasStoredSttOpenaiKey ? 'Saved' : null, desc: 'Standard API', color: 'green', icon: <Mic size={14} /> },
                                                            { id: 'elevenlabs', label: 'ElevenLabs', badge: hasStoredElevenLabsKey ? 'Saved' : null, desc: 'Premium quality', color: 'cyan', icon: <Mic size={14} /> },
                                                            { id: 'azure', label: 'Azure Speech', badge: hasStoredAzureKey ? 'Saved' : null, desc: 'Enterprise grade', color: 'blue', icon: <Mic size={14} /> },
                                                            { id: 'ibmwatson', label: 'IBM Watson', badge: hasStoredIbmWatsonKey ? 'Saved' : null, desc: 'Watson AX', color: 'indigo', icon: <Mic size={14} /> },
                                                        ]}
                                                    />
                                                </div>

                                                {/* Google Service Account Pick */}
                                                {sttProvider === 'google' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">Service Account JSON</label>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-secondary truncate flex items-center">
                                                                {googleServiceAccountPath ? googleServiceAccountPath.split(/[/\\]/).pop() : "No file selected"}
                                                            </div>
                                                            {/* @ts-ignore */}
                                                            <button onClick={async () => { const res = await window.electronAPI.selectServiceAccount(); if (res.success) setGoogleServiceAccountPath(res.path); }} className="px-4 py-2 bg-bg-elevated hover:bg-bg-input border border-border-subtle rounded-lg text-xs font-bold text-text-primary transition-colors">Select File</button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Recognition Language */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">Preferred Accent / Language</label>
                                                    <div className="relative">
                                                        <select
                                                            value={recognitionLanguage}
                                                            onChange={(e) => handleLanguageChange(e.target.value)}
                                                            className="w-full appearance-none bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-colors cursor-pointer"
                                                        >
                                                            {languageOptions.map((opt) => (
                                                                <option key={opt.deviceId} value={opt.deviceId}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                                                    </div>
                                                </div>

                                                {sttProvider !== 'google' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest pl-1">API Key</label>
                                                        <div className="flex gap-2">
                                                            <input type="password" value={
                                                                sttProvider === 'groq' ? sttGroqKey :
                                                                    sttProvider === 'openai' ? sttOpenaiKey :
                                                                        sttProvider === 'deepgram' ? sttDeepgramKey :
                                                                            sttProvider === 'elevenlabs' ? sttElevenLabsKey :
                                                                                sttProvider === 'azure' ? sttAzureKey :
                                                                                    sttProvider === 'ibmwatson' ? sttIbmKey : ''
                                                            } onChange={(e) => {
                                                                const v = e.target.value;
                                                                if (sttProvider === 'groq') setSttGroqKey(v);
                                                                else if (sttProvider === 'openai') setSttOpenaiKey(v);
                                                                else if (sttProvider === 'deepgram') setSttDeepgramKey(v);
                                                                else if (sttProvider === 'elevenlabs') setSttElevenLabsKey(v);
                                                                else if (sttProvider === 'azure') setSttAzureKey(v);
                                                                else if (sttProvider === 'ibmwatson') setSttIbmKey(v);
                                                            }} placeholder="••••••••••••" className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-primary" />
                                                            <button onClick={() => {
                                                                const keys: any = { groq: sttGroqKey, openai: sttOpenaiKey, deepgram: sttDeepgramKey, elevenlabs: sttElevenLabsKey, azure: sttAzureKey, ibmwatson: sttIbmKey };
                                                                handleSttKeySubmit(sttProvider, keys[sttProvider]);
                                                            }} className="px-4 py-2 bg-accent-primary text-white rounded-lg text-xs font-bold">{sttSaving ? '...' : 'Save'}</button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-2">
                                                    <button onClick={handleTestSttConnection} className="text-[10px] text-text-tertiary hover:text-text-primary flex items-center gap-1.5 font-bold uppercase tracking-wider transition-all">
                                                        <Activity size={12} /> {sttTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                                    </button>
                                                    {sttTestStatus === 'success' && <span className="text-[10px] text-green-500 font-bold">✓ Success</span>}
                                                    {sttTestStatus === 'error' && <span className="text-[10px] text-red-400 font-bold">⚠ Failed</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-border-subtle" />

                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary mb-3 px-1 uppercase tracking-wider text-[10px]">Devices & Levels</h3>
                                            <div className="space-y-4">
                                                <CustomSelect label="Input Device" icon={<Mic size={16} />} value={selectedInput} options={inputDevices} onChange={(id) => { setSelectedInput(id); localStorage.setItem('preferredInputDeviceId', id); }} placeholder="Default Mic" />
                                                <div className="px-1">
                                                    <div className="flex justify-between text-[10px] text-text-tertiary uppercase font-black tracking-widest mb-2"><span>Input Level</span></div>
                                                    <div className="h-1.5 bg-bg-input rounded-full overflow-hidden border border-border-subtle"><motion.div animate={{ width: `${micLevel}%` }} className="h-full bg-accent-primary" /></div>
                                                </div>
                                                <CustomSelect label="Output Device" icon={<Speaker size={16} />} value={selectedOutput} options={outputDevices} onChange={(id) => { setSelectedOutput(id); localStorage.setItem('preferredOutputDeviceId', id); }} placeholder="Default Output" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'keybinds' && (
                                <div className="space-y-8 animated fadeIn">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-text-primary mb-1">Keyboard Shortcuts</h3>
                                            <p className="text-xs text-text-secondary">Custom triggers for Natively actions.</p>
                                        </div>
                                        <button onClick={resetShortcuts} className="text-xs text-text-tertiary hover:text-red-400 font-bold transition-all flex items-center gap-1"><RotateCcw size={12} /> Reset</button>
                                    </div>
                                    <div className="space-y-6">
                                        {[
                                            { g: 'General', k: ['toggleVisibility', 'takeScreenshot'] },
                                            { g: 'Intelligence', k: ['whatToAnswer', 'followUp', 'answer'] },
                                        ].map(group => (
                                            <div key={group.g} className="space-y-3">
                                                <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest px-1">{group.g}</h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {group.k.map(key => (
                                                        <div key={key} className="bg-bg-card rounded-xl p-3 border border-border-subtle flex items-center justify-between">
                                                            <span className="text-sm font-medium text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                            {/* @ts-ignore */}
                                                            <KeyRecorder currentKeys={(shortcuts as any)[key]} onSave={(v) => updateShortcut(key as any, v)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'about' && <AboutSection />}

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsOverlay;
