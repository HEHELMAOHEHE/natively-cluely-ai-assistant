import { LLMHelper } from './LLMHelper';
import { RAGManager } from './rag/RAGManager';
import { DatabaseManager } from './db/DatabaseManager';
import { CredentialsManager } from './services/CredentialsManager';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export class ProcessingHelper {
  private dbManager: DatabaseManager;
  private llmHelper: LLMHelper;
  private ragManager: RAGManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;

    // Initialize LLMHelper (singleton)
    this.llmHelper = LLMHelper.getInstance();

    // Initialize RAGManager with database instance 
    this.ragManager = new RAGManager((this.dbManager as any).db);

    // Load stored credentials if available
    this.loadStoredCredentials();
  }

  public async loadStoredCredentials() {
    try {
      const creds = CredentialsManager.getInstance().getAllCredentials() as any;
      if (creds.geminiApiKey) {
        this.llmHelper.initialize({ geminiKey: creds.geminiApiKey });

        // Also initialize RAG Embedding pipeline
        (this.ragManager as any).initializeEmbeddings(creds.geminiApiKey);
      }
    } catch (error) {
      console.error('[ProcessingHelper] Failed to load stored credentials:', error);
    }
  }

  /**
   * Analyze a screenshot and provide insights
   */
  async analyzeScreenshot(imagePath: string, prompt: string): Promise<string> {
    const result = await (this.llmHelper as any).analyzeImageFile(imagePath);
    return result.text;
  }

  /**
   * Accessor for RAG Manager
   */
  getRagManager(): RAGManager {
    return this.ragManager;
  }

  /**
   * Accessor for LLM Helper
   */
  getLLMHelper(): LLMHelper {
    return this.llmHelper;
  }

  /**
   * Cancel ongoing LLM requests
   */
  public cancelOngoingRequests() {
    console.log("[ProcessingHelper] Cancelling ongoing requests (Placeholder)");
    // TODO: Implement cancellation logic in LLMHelper and call it here
  }

  /**
   * Process screenshots (Called from shortcuts)
   */
  public async processScreenshots() {
    console.log("[ProcessingHelper] Processing screenshots (Placeholder)");
    // TODO: Implement screenshot processing logic. 
    // This requires access to AppState or ScreenshotHelper to get images.
  }

  /**
   * Clean up resources
   */
  destroy() {
    if ((this.ragManager as any).destroy) {
      (this.ragManager as any).destroy();
    }
  }
}
