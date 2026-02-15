// electron/rag/RAGManager.ts
// Central orchestrator for RAG pipeline
// Coordinates preprocessing, chunking, embedding, and retrieval

import Database from 'better-sqlite3';
import { LLMHelper } from '../LLMHelper';
import { preprocessTranscript, RawSegment } from './TranscriptPreprocessor';
import { chunkTranscript } from './SemanticChunker';
import { VectorStore } from './VectorStore';
import { EmbeddingPipeline } from './EmbeddingPipeline';
import { RAGRetriever } from './RAGRetriever';
import { buildRAGPrompt, NO_CONTEXT_FALLBACK, NO_GLOBAL_CONTEXT_FALLBACK } from './prompts';

export interface RAGManagerConfig {
    db: Database.Database;
    apiKey?: string;
}

/**
 * RAGManager - Central orchestrator for RAG operations
 */
export class RAGManager {
    private db: Database.Database;
    private vectorStore: VectorStore;
    private embeddingPipeline: EmbeddingPipeline;
    private retriever: RAGRetriever;
    private llmHelper: LLMHelper | null = null;

    constructor(config: RAGManagerConfig) {
        this.db = config.db;
        this.vectorStore = new VectorStore(config.db);
        this.embeddingPipeline = new EmbeddingPipeline(config.db, this.vectorStore);
        this.retriever = new RAGRetriever(this.vectorStore, this.embeddingPipeline);

        if (config.apiKey) {
            this.embeddingPipeline.initialize(config.apiKey);
        }
    }

    /**
     * Set LLM helper for generating responses
     */
    setLLMHelper(llmHelper: LLMHelper): void {
        this.llmHelper = llmHelper;
    }

    /**
     * Initialize embedding pipeline with API key
     */
    initializeEmbeddings(apiKey: string): void {
        this.embeddingPipeline.initialize(apiKey);
    }

    /**
     * Check if RAG is ready for queries
     */
    isReady(): boolean {
        return this.embeddingPipeline.isReady() && this.llmHelper !== null;
    }

    /**
     * Process a meeting after it ends
     * Creates chunks and queues them for embedding
     */
    async processMeeting(
        meetingId: string,
        transcript: RawSegment[],
        summary?: string
    ): Promise<{ chunkCount: number }> {
        console.log(`[RAGManager] Processing meeting ${meetingId} with ${transcript.length} segments`);

        // 1. Preprocess transcript
        const cleaned = preprocessTranscript(transcript);
        console.log(`[RAGManager] Preprocessed to ${cleaned.length} cleaned segments`);

        // 2. Chunk the transcript
        const chunks = chunkTranscript(meetingId, cleaned);
        console.log(`[RAGManager] Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            console.log(`[RAGManager] No chunks to save for meeting ${meetingId}`);
            return { chunkCount: 0 };
        }

        // 3. Save chunks to database
        this.vectorStore.saveChunks(chunks);

        // 4. Save summary if provided
        if (summary) {
            this.vectorStore.saveSummary(meetingId, summary);
        }

        // 5. Queue for embedding (background processing)
        if (this.embeddingPipeline.isReady()) {
            await this.embeddingPipeline.queueMeeting(meetingId);
        } else {
            console.log(`[RAGManager] Embeddings not ready, chunks saved without embeddings`);
        }

        return { chunkCount: chunks.length };
    }

    /**
     * Query meeting with RAG
     */
    async *queryMeeting(
        meetingId: string,
        query: string,
        abortSignal?: AbortSignal
    ): AsyncGenerator<string, void, unknown> {
        if (!this.llmHelper) {
            throw new Error('LLM helper not initialized');
        }

        const hasEmbeddings = this.vectorStore.hasEmbeddings(meetingId);
        if (!hasEmbeddings) {
            throw new Error('NO_MEETING_EMBEDDINGS');
        }

        const context = await this.retriever.retrieve(query, { meetingId });
        if (context.chunks.length === 0) {
            throw new Error('NO_RELEVANT_CONTEXT_FOUND');
        }

        const prompt = buildRAGPrompt(query, context.formattedContext, 'meeting', context.intent);
        const stream = this.llmHelper.streamChat(prompt, undefined, undefined, "");

        for await (const chunk of stream) {
            if (abortSignal?.aborted) break;
            yield chunk;
        }
    }

    /**
     * Query across all meetings (global search)
     */
    async *queryGlobal(
        query: string,
        abortSignal?: AbortSignal
    ): AsyncGenerator<string, void, unknown> {
        if (!this.llmHelper) {
            throw new Error('LLM helper not initialized');
        }

        const context = await this.retriever.retrieveGlobal(query);
        if (context.chunks.length === 0) {
            yield NO_GLOBAL_CONTEXT_FALLBACK;
            return;
        }

        const prompt = buildRAGPrompt(query, context.formattedContext, 'global', context.intent);
        const stream = this.llmHelper.streamChat(prompt, undefined, undefined, "");

        for await (const chunk of stream) {
            if (abortSignal?.aborted) break;
            yield chunk;
        }
    }

    /**
     * Smart query - auto-detects scope
     */
    async *query(
        query: string,
        currentMeetingId?: string,
        abortSignal?: AbortSignal
    ): AsyncGenerator<string, void, unknown> {
        const scope = this.retriever.detectScope(query, currentMeetingId);

        if (scope === 'meeting' && currentMeetingId) {
            yield* this.queryMeeting(currentMeetingId, query, abortSignal);
        } else {
            yield* this.queryGlobal(query, abortSignal);
        }
    }

    /**
     * Get embedding queue status
     */
    getQueueStatus(): { pending: number; processing: number; completed: number; failed: number } {
        return this.embeddingPipeline.getQueueStatus();
    }

    /**
     * Retry pending embeddings
     */
    async retryPendingEmbeddings(): Promise<void> {
        await this.embeddingPipeline.processQueue();
    }

    /**
     * Check if a meeting has been processed for RAG
     */
    isMeetingProcessed(meetingId: string): boolean {
        return this.vectorStore.hasEmbeddings(meetingId);
    }

    /**
     * Delete RAG data for a meeting
     */
    deleteMeetingData(meetingId: string): void {
        this.vectorStore.deleteChunksForMeeting(meetingId);
    }

    /**
     * Manually trigger processing for a meeting
     */
    async reprocessMeeting(meetingId: string): Promise<void> {
        console.log(`[RAGManager] Reprocessing meeting ${meetingId}`);
        this.deleteMeetingData(meetingId);

        const { DatabaseManager } = require('../db/DatabaseManager');
        const meeting = DatabaseManager.getInstance().getMeetingDetails(meetingId);

        if (!meeting) return;
        if (!meeting.transcript || meeting.transcript.length === 0) return;

        const segments = meeting.transcript.map((t: any) => ({
            speaker: t.speaker,
            text: t.text,
            timestamp: t.timestamp
        }));

        let summary: string | undefined;
        if (meeting.detailedSummary) {
            summary = [
                ...(meeting.detailedSummary.overview ? [meeting.detailedSummary.overview] : []),
                ...(meeting.detailedSummary.keyPoints || []),
                ...(meeting.detailedSummary.actionItems || []).map((a: any) => `Action: ${a}`)
            ].join('. ');
        } else if (meeting.summary) {
            summary = meeting.summary;
        }

        await this.processMeeting(meetingId, segments, summary);
    }

    /**
     * Ensure demo meeting is processed
     */
    async ensureDemoMeetingProcessed(): Promise<void> {
        const demoId = 'demo-meeting';
        const { DatabaseManager } = require('../db/DatabaseManager');
        const meeting = DatabaseManager.getInstance().getMeetingDetails(demoId);

        if (!meeting) return;
        if (this.isMeetingProcessed(demoId)) return;

        console.log('[RAGManager] Demo meeting found but not processed. Processing now...');
        await this.reprocessMeeting(demoId);
    }

    /**
     * Cleanup stale queue items
     */
    public cleanupStaleQueueItems(): void {
        try {
            const info = this.db.prepare(`
                DELETE FROM embedding_queue 
                WHERE meeting_id NOT IN (SELECT id FROM meetings)
            `).run();
            if (info.changes > 0) {
                console.log(`[RAGManager] Cleaned up ${info.changes} stale queue items`);
            }
        } catch (error) {
            console.error('[RAGManager] Failed to cleanup stale queue items:', error);
        }
    }
}
