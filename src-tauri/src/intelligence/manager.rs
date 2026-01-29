use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use crate::llm::{LLMClient, prompts};
use tauri::{AppHandle, Emitter};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TranscriptSegment {
    pub speaker: String,
    pub text: String,
    pub timestamp: u64,
    pub is_final: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ContextItem {
    pub role: String, // "interviewer", "user", "assistant"
    pub text: String,
    pub timestamp: u64,
}

#[derive(Clone)]
pub struct IntelligenceManager {
    llm_client: LLMClient,
    context: Arc<Mutex<VecDeque<ContextItem>>>,
    app_handle: AppHandle,
    last_assistant_message: Arc<Mutex<Option<String>>>,
}

impl IntelligenceManager {
    pub fn new(app_handle: AppHandle, llm_client: LLMClient) -> Self {
        Self {
            llm_client,
            context: Arc::new(Mutex::new(VecDeque::new())),
            app_handle,
            last_assistant_message: Arc::new(Mutex::new(None)),
        }
    }

    pub fn add_transcript(&self, segment: TranscriptSegment) {
        if !segment.is_final { return; }
        
        let mut ctx = self.context.lock().unwrap();
        
        // Map speaker to role
        let role = if segment.speaker == "user" { "user" } else { "interviewer" };
        
        ctx.push_back(ContextItem {
            role: role.to_string(),
            text: segment.text.clone(),
            timestamp: segment.timestamp,
        });
        
        self.evict_old_entries(&mut ctx);
    }

    fn evict_old_entries(&self, ctx: &mut VecDeque<ContextItem>) {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        let cutoff = now.saturating_sub(120 * 1000); // 120 seconds window
        
        while let Some(item) = ctx.front() {
            if item.timestamp < cutoff {
                ctx.pop_front();
            } else {
                break;
            }
        }
    }
    
    pub fn get_context_text(&self) -> String {
        let mut ctx = self.context.lock().unwrap();
        // Evict before reading to ensure freshness
        self.evict_old_entries(&mut ctx);
        
        ctx.iter().map(|i| {
            let label = match i.role.as_str() {
                "interviewer" => "INTERVIEWER",
                "user" => "ME",
                _ => "ASSISTANT"
            };
            format!("[{}]: {}", label, i.text)
        }).collect::<Vec<_>>().join("\n")
    }

    // Button: "What should I say?" / Solve
    pub async fn run_what_should_i_say(&self) -> anyhow::Result<String> {
        let context = self.get_context_text();
        
        // Use Groq WhatToAnswer or Gemini WhatToAnswer
        // The implementation_plan.md says "Port IntelligenceManager.ts"
        // TypeScript logic: 
        // 1. Prepare transcript
        // 2. Call LLM
        // 3. Emit event
        
        let response = self.llm_client.generate_smart(
            prompts::GROQ_WHAT_TO_ANSWER_PROMPT, 
            prompts::WHAT_TO_ANSWER_PROMPT, 
            &context
        ).await?;

        // Add to context
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64;
        {
            let mut ctx = self.context.lock().unwrap();
            ctx.push_back(ContextItem {
                role: "assistant".to_string(),
                text: response.clone(),
                timestamp: now,
            });
        }
        
        // Update last message anchor for follow-ups
        {
            let mut last = self.last_assistant_message.lock().unwrap();
            *last = Some(response.clone());
        }
        
        // Emit event to frontend
        self.app_handle.emit("suggested_answer", &response)?;
        
        Ok(response)
    }

    // Button: "Recap"
    pub async fn run_recap(&self) -> anyhow::Result<String> {
        let context = self.get_context_text();
        let response = self.llm_client.generate_smart(
            prompts::GROQ_RECAP_PROMPT,
            prompts::RECAP_MODE_PROMPT,
            &context
        ).await?;
        
        self.app_handle.emit("recap_result", &response)?;
        Ok(response)
    }

    // Button: "Follow Up Questions" (Suggestions for user to ask)
    pub async fn run_follow_up_questions(&self) -> anyhow::Result<String> {
        let context = self.get_context_text();
        let response = self.llm_client.generate_smart(
            prompts::GROQ_FOLLOW_UP_QUESTIONS_PROMPT,
            prompts::FOLLOW_UP_QUESTIONS_MODE_PROMPT,
            &context
        ).await?;
        
        self.app_handle.emit("follow_up_questions_result", &response)?;
        Ok(response)
    }

    // Mode: Follow Up (Refinement of previous answer)
    // e.g. "Make it shorter"
    pub async fn run_follow_up(&self, refinement_instruction: String) -> anyhow::Result<String> {
        let last_msg = {
            let lock = self.last_assistant_message.lock().unwrap();
            lock.clone()
        };

        if let Some(previous_answer) = last_msg {
            // Context injection
            let context = format!("PREVIOUS ANSWER:\n{}\n\nUSER INSTRUCTION:\n{}", previous_answer, refinement_instruction);
            
            let response = self.llm_client.generate_smart(
                prompts::GROQ_FOLLOWUP_PROMPT,
                prompts::FOLLOWUP_MODE_PROMPT,
                &context
            ).await?;
            
            // Update last message logic? Or treat as new?
            // Usually refinement REPLACES the last suggestion.
            self.app_handle.emit("item-refined", &response)?; // Event name parity check needed later
            Ok(response)
        } else {
             Err(anyhow::anyhow!("No previous assistant message to refine"))
        }
    }
}
