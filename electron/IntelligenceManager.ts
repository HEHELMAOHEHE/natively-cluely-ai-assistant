// IntelligenceManager.ts
// Central orchestrator for the 5-mode intelligence layer
// Uses mode-specific LLMs for Natively-style interview copilot

import { EventEmitter } from 'events';
import { LLMHelper } from './LLMHelper';

export interface TranscriptSegment {
    marker?: string;
    speaker: string;
    text: string;
    timestamp: number;
    final: boolean;
    confidence?: number;
}

export interface SuggestionTrigger {
    context: string;
    lastQuestion: string;
    confidence: number;
}

import { AnswerLLM, AssistLLM, FollowUpLLM, RecapLLM, FollowUpQuestionsLLM, WhatToAnswerLLM, prepareTranscriptForWhatToAnswer, GROQ_TITLE_PROMPT, GROQ_SUMMARY_JSON_PROMPT, buildTemporalContext, AssistantResponse, classifyIntent } from './llm';
import { desktopCapturer, app } from 'electron';
import { DatabaseManager, Meeting } from './db/DatabaseManager';
const crypto = require('crypto');

export const GEMINI_FLASH_MODEL = "gemini-3-flash-preview";

// Refinement intent detection (refined to avoid false positives)
function detectRefinementIntent(userText: string): { isRefinement: boolean; intent: string } {
    const lowercased = userText.toLowerCase().trim();
    const refinementPatterns = [
        { pattern: /make it shorter|shorten this|be brief/i, intent: 'shorten' },
        { pattern: /make it longer|expand on this|elaborate more/i, intent: 'expand' },
        { pattern: /rephrase that|say it differently|put it another way/i, intent: 'rephrase' },
        { pattern: /give me an example|provide an instance/i, intent: 'add_example' },
        { pattern: /make it more confident|be more assertive|sound stronger/i, intent: 'more_confident' },
        { pattern: /make it casual|be less formal|sound relaxed/i, intent: 'more_casual' },
        { pattern: /make it formal|be more professional|sound professional/i, intent: 'more_formal' },
        { pattern: /simplify this|make it simpler|explain specifically/i, intent: 'simplify' },
    ];

    for (const { pattern, intent } of refinementPatterns) {
        if (pattern.test(lowercased)) {
            return { isRefinement: true, intent };
        }
    }

    return { isRefinement: false, intent: '' };
}

// Context item matching Swift ContextManager structure
export interface ContextItem {
    role: 'interviewer' | 'user' | 'assistant';
    text: string;
    timestamp: number;
}

// Mode types
export type IntelligenceMode = 'idle' | 'assist' | 'what_to_say' | 'follow_up' | 'recap' | 'manual' | 'follow_up_questions';

// Events emitted by IntelligenceManager
export interface IntelligenceModeEvents {
    'assist_update': (insight: string) => void;
    'suggested_answer': (answer: string, question: string, confidence: number) => void;
    'suggested_answer_token': (token: string, question: string, confidence: number) => void;
    'refined_answer': (answer: string, intent: string) => void;
    'refined_answer_token': (token: string, intent: string) => void;
    'recap': (summary: string) => void;
    'recap_token': (token: string) => void;
    'follow_up_questions_update': (questions: string) => void;
    'follow_up_questions_token': (token: string) => void;
    'manual_answer_started': () => void;
    'manual_answer_result': (answer: string, question: string) => void;
    'mode_changed': (mode: IntelligenceMode) => void;
    'error': (error: Error, mode: IntelligenceMode) => void;
}

/**
 * IntelligenceManager - Central orchestrator for all intelligence modes
 */
export class IntelligenceManager extends EventEmitter {
    private contextItems: ContextItem[] = [];
    private readonly contextWindowDuration: number = 120; // 120 seconds
    private readonly maxContextItems: number = 500;
    private lastAssistantMessage: string | null = null;
    private assistantResponseHistory: AssistantResponse[] = [];
    private fullTranscript: TranscriptSegment[] = [];
    private fullUsage: any[] = [];
    private lastInterimInterviewer: TranscriptSegment | null = null;

    private currentMeetingMetadata: {
        title?: string;
        calendarEventId?: string;
        source?: 'manual' | 'calendar';
    } | null = null;

    private activeMode: IntelligenceMode = 'idle';
    private assistCancellationToken: AbortController | null = null;

    private answerLLM: AnswerLLM | null = null;
    private assistLLM: AssistLLM | null = null;
    private followUpLLM: FollowUpLLM | null = null;
    private recapLLM: RecapLLM | null = null;
    private followUpQuestionsLLM: FollowUpQuestionsLLM | null = null;
    private whatToAnswerLLM: WhatToAnswerLLM | null = null;

    private llmHelper: LLMHelper;
    private lastTranscriptTime: number = 0;
    private lastTriggerTime: number = 0;
    private readonly triggerCooldown: number = 3000; // 3 seconds

    constructor(llmHelper: LLMHelper) {
        super();
        this.llmHelper = llmHelper;
        this.initializeLLMs();
    }

    public initializeLLMs(): void {
        console.log(`[IntelligenceManager] Initializing LLMs with LLMHelper`);
        this.answerLLM = new AnswerLLM(this.llmHelper);
        this.assistLLM = new AssistLLM(this.llmHelper);
        this.followUpLLM = new FollowUpLLM(this.llmHelper);
        this.recapLLM = new RecapLLM(this.llmHelper);
        this.followUpQuestionsLLM = new FollowUpQuestionsLLM(this.llmHelper);
        this.whatToAnswerLLM = new WhatToAnswerLLM(this.llmHelper);
    }

    public setMeetingMetadata(metadata: any) {
        this.currentMeetingMetadata = metadata;
    }

    public addTranscript(segment: TranscriptSegment, skipRefinementCheck: boolean = false): void {
        if (!segment.final) {
            if (segment.speaker !== 'user' && segment.speaker !== 'assistant') {
                this.lastInterimInterviewer = segment;
            }
            return;
        }

        const role = this.mapSpeakerToRole(segment.speaker);
        const text = segment.text.trim();

        if (!text) return;

        const lastItem = this.contextItems[this.contextItems.length - 1];
        if (lastItem &&
            lastItem.role === role &&
            Math.abs(lastItem.timestamp - segment.timestamp) < 500 &&
            lastItem.text === text) {
            return;
        }

        this.contextItems.push({
            role,
            text,
            timestamp: segment.timestamp
        });

        this.evictOldEntries();
        this.lastTranscriptTime = Date.now();

        const isInternalPrompt = text.startsWith("You are a real-time interview assistant") ||
            text.startsWith("You are a helper") ||
            text.startsWith("CONTEXT:");

        if (!isInternalPrompt) {
            this.fullTranscript.push(segment);
            if (this.fullTranscript.length > 2000) {
                this.fullTranscript = this.fullTranscript.slice(-2000);
            }
        }

        if (!skipRefinementCheck && role === 'user' && this.lastAssistantMessage) {
            const { isRefinement, intent } = detectRefinementIntent(text);
            if (isRefinement) {
                this.runFollowUp(intent, text);
            }
        }
    }

    public addAssistantMessage(text: string): void {
        if (!text) return;
        const cleanText = text.trim();
        if (cleanText.length < 10) return;

        this.contextItems.push({
            role: 'assistant',
            text: cleanText,
            timestamp: Date.now()
        });

        this.fullTranscript.push({
            speaker: 'assistant',
            text: cleanText,
            timestamp: Date.now(),
            final: true,
            confidence: 1.0
        });

        if (this.fullTranscript.length > 2000) {
            this.fullTranscript = this.fullTranscript.slice(-2000);
        }

        this.lastAssistantMessage = cleanText;

        this.assistantResponseHistory.push({
            text: cleanText,
            timestamp: Date.now(),
            questionContext: this.getLastInterviewerTurn() || 'unknown'
        });

        if (this.assistantResponseHistory.length > 10) {
            this.assistantResponseHistory = this.assistantResponseHistory.slice(-10);
        }

        this.evictOldEntries();
    }

    public getContext(lastSeconds: number = 120): ContextItem[] {
        const cutoff = Date.now() - (lastSeconds * 1000);
        return this.contextItems.filter(item => item.timestamp >= cutoff);
    }

    public getLastAssistantMessage(): string | null {
        return this.lastAssistantMessage;
    }

    public getFormattedContext(lastSeconds: number = 120): string {
        const items = this.getContext(lastSeconds);
        return items.map(item => {
            const label = item.role === 'interviewer' ? 'INTERVIEWER' :
                item.role === 'user' ? 'ME' :
                    'ASSISTANT (PREVIOUS SUGGESTION)';
            return `[${label}]: ${item.text}`;
        }).join('\n');
    }

    public getLastInterviewerTurn(): string | null {
        for (let i = this.contextItems.length - 1; i >= 0; i--) {
            if (this.contextItems[i].role === 'interviewer') {
                return this.contextItems[i].text;
            }
        }
        return null;
    }

    private mapSpeakerToRole(speaker: string): 'interviewer' | 'user' | 'assistant' {
        if (speaker === 'user') return 'user';
        if (speaker === 'assistant') return 'assistant';
        return 'interviewer';
    }

    private evictOldEntries(): void {
        const cutoff = Date.now() - (this.contextWindowDuration * 1000);
        this.contextItems = this.contextItems.filter(item => item.timestamp >= cutoff);
        if (this.contextItems.length > this.maxContextItems) {
            this.contextItems = this.contextItems.slice(-this.maxContextItems);
        }
    }

    private setMode(mode: IntelligenceMode): void {
        this.activeMode = mode;
        this.emit('mode_changed', mode);
    }

    // --- Mode Executors ---
    async runAssistMode(): Promise<string | null> {
        if (this.activeMode !== 'idle' && this.activeMode !== 'assist') return null;
        if (this.assistCancellationToken) this.assistCancellationToken.abort();

        this.assistCancellationToken = new AbortController();
        this.setMode('assist');

        try {
            if (!this.assistLLM) {
                this.setMode('idle');
                return null;
            }
            const context = this.getFormattedContext(60);
            if (!context) {
                this.setMode('idle');
                return null;
            }
            const insight = await this.assistLLM.generate(context);
            if (this.assistCancellationToken?.signal.aborted) return null;
            if (insight) this.emit('assist_update', insight);
            this.setMode('idle');
            return insight;
        } catch (error) {
            if ((error as Error).name === 'AbortError') return null;
            this.emit('error', error as Error, 'assist');
            this.setMode('idle');
            return null;
        }
    }

    async runWhatShouldISay(question?: string, confidence: number = 0.8, imagePath?: string): Promise<string | null> {
        const now = Date.now();
        if (now - this.lastTriggerTime < this.triggerCooldown) return null;
        if (this.assistCancellationToken) this.assistCancellationToken.abort();

        this.setMode('what_to_say');
        this.lastTriggerTime = now;

        try {
            if (!this.whatToAnswerLLM) {
                if (!this.answerLLM) {
                    this.setMode('idle');
                    return "Please configure your API Keys in Settings.";
                }
                const context = this.getFormattedContext(180);
                const answer = await this.answerLLM.generate(question || '', context);
                if (answer) {
                    this.addAssistantMessage(answer);
                    this.emit('suggested_answer', answer, question || 'inferred', confidence);
                }
                this.setMode('idle');
                return answer;
            }

            const contextItems = this.getContext(180);
            if (this.lastInterimInterviewer) {
                contextItems.push({
                    role: 'interviewer',
                    text: this.lastInterimInterviewer.text,
                    timestamp: this.lastInterimInterviewer.timestamp
                });
            }

            const transcriptTurns = contextItems.map(item => ({
                role: item.role as any,
                text: item.text,
                timestamp: item.timestamp
            }));

            const preparedTranscript = prepareTranscriptForWhatToAnswer(transcriptTurns, 12);
            const temporalContext = buildTemporalContext(contextItems, this.assistantResponseHistory, 180);
            const intentResult = classifyIntent(this.getLastInterviewerTurn(), preparedTranscript, this.assistantResponseHistory.length);

            let fullAnswer = "";
            const stream = this.whatToAnswerLLM.generateStream(preparedTranscript, temporalContext, intentResult, imagePath);

            for await (const token of stream) {
                this.emit('suggested_answer_token', token, question || 'inferred', confidence);
                fullAnswer += token;
            }

            if (!fullAnswer || fullAnswer.trim().length < 5) {
                fullAnswer = "Could you repeat that?";
            }

            this.addAssistantMessage(fullAnswer);
            this.emit('suggested_answer', fullAnswer, question || 'What to Answer', confidence);
            this.setMode('idle');
            return fullAnswer;
        } catch (error) {
            this.emit('error', error as Error, 'what_to_say');
            this.setMode('idle');
            return "Could you repeat that?";
        }
    }

    async runFollowUp(intent: string, userRequest?: string): Promise<string | null> {
        if (!this.lastAssistantMessage) return null;
        this.setMode('follow_up');

        try {
            if (!this.followUpLLM) {
                this.setMode('idle');
                return null;
            }
            const context = this.getFormattedContext(60);
            let fullRefined = "";
            const stream = this.followUpLLM.generateStream(this.lastAssistantMessage, userRequest || intent, context);

            for await (const token of stream) {
                this.emit('refined_answer_token', token, intent);
                fullRefined += token;
            }

            if (fullRefined) {
                this.addAssistantMessage(fullRefined);
                this.emit('refined_answer', fullRefined, intent);
            }
            this.setMode('idle');
            return fullRefined;
        } catch (error) {
            this.emit('error', error as Error, 'follow_up');
            this.setMode('idle');
            return null;
        }
    }

    async runRecap(): Promise<string | null> {
        this.setMode('recap');
        try {
            if (!this.recapLLM) {
                this.setMode('idle');
                return null;
            }
            const context = this.getFormattedContext(120);
            if (!context) {
                this.setMode('idle');
                return null;
            }
            let fullSummary = "";
            const stream = this.recapLLM.generateStream(context);
            for await (const token of stream) {
                this.emit('recap_token', token);
                fullSummary += token;
            }
            if (fullSummary) this.emit('recap', fullSummary);
            this.setMode('idle');
            return fullSummary;
        } catch (error) {
            this.emit('error', error as Error, 'recap');
            this.setMode('idle');
            return null;
        }
    }

    async runFollowUpQuestions(): Promise<string | null> {
        this.setMode('follow_up_questions');
        try {
            if (!this.followUpQuestionsLLM) {
                this.setMode('idle');
                return null;
            }
            const context = this.getFormattedContext(120);
            if (!context) {
                this.setMode('idle');
                return null;
            }
            let fullQuestions = "";
            const stream = this.followUpQuestionsLLM.generateStream(context);
            for await (const token of stream) {
                this.emit('follow_up_questions_token', token);
                fullQuestions += token;
            }
            if (fullQuestions) this.emit('follow_up_questions_update', fullQuestions);
            this.setMode('idle');
            return fullQuestions;
        } catch (error) {
            this.emit('error', error as Error, 'follow_up_questions');
            this.setMode('idle');
            return null;
        }
    }

    async runManualAnswer(question: string): Promise<string | null> {
        this.emit('manual_answer_started');
        this.setMode('manual');
        try {
            if (!this.answerLLM) {
                this.setMode('idle');
                return null;
            }
            const context = this.getFormattedContext(120);
            const answer = await this.answerLLM.generate(question, context);
            if (answer) {
                this.addAssistantMessage(answer);
                this.emit('manual_answer_result', answer, question);
            }
            this.setMode('idle');
            return answer;
        } catch (error) {
            this.emit('error', error as Error, 'manual');
            this.setMode('idle');
            return null;
        }
    }

    public clearQueues(): void {
        this.contextItems = [];
        this.assistantResponseHistory = [];
        this.fullTranscript = [];
        this.lastAssistantMessage = null;
    }

    public getView(): string { return "default"; }
    public getScreenshotQueue(): string[] { return []; }
    public getExtraScreenshotQueue(): string[] { return []; }
    public getIntelligenceManager(): IntelligenceManager { return this; }
    public logUsage(type: string, question: string, answer: string): void { }

    public getCurrentMeetingId(): string | null {
        return this.currentMeetingMetadata?.calendarEventId || null;
    }
}
