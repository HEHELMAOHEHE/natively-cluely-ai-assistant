use reqwest::Client;
use serde_json::json;
use anyhow::{Result, anyhow, Context};
use std::env;
use std::time::Duration;
use tokio::time::sleep;

// Model Constants
const GROQ_MODEL: &str = "llama-3.3-70b-versatile";
const GEMINI_FLASH_MODEL: &str = "gemini-3-flash-preview";
const GEMINI_PRO_MODEL: &str = "gemini-3-pro-preview";
const OLLAMA_MODEL: &str = "llama3.2";

#[derive(Clone)]
pub struct LLMClient {
    http_client: Client,
    google_api_key: String,
    groq_api_key: String,
    ollama_url: String,
}

impl LLMClient {
    pub fn new() -> Result<Self> {
        Ok(Self {
            http_client: Client::new(),
            google_api_key: env::var("GEMINI_API_KEY")
                .or_else(|_| env::var("GOOGLE_API_KEY"))
                .unwrap_or_default(),
            groq_api_key: env::var("GROQ_API_KEY").unwrap_or_default(),
            ollama_url: env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".to_string()),
        })
    }

    /// The Master Function: Tries Groq, falls back to Gemini Flash, then Gemini Pro, then Ollama
    pub async fn generate_smart(&self, system_prompt_groq: &str, system_prompt_gemini: &str, user_content: &str) -> Result<String> {
        // 1. Try Groq First
        if !self.groq_api_key.is_empty() {
            println!("[LLM] Attempting Groq ({})", GROQ_MODEL);
            match self.with_retry(|| self.call_groq(system_prompt_groq, user_content)).await {
                Ok(response) => return Ok(response),
                Err(e) => println!("[LLM] Groq failed: {}. Falling back...", e),
            }
        } else {
            println!("[LLM] No Groq API key found. Skipping.");
        }

        // 2. Fallback to Gemini Flash
        if !self.google_api_key.is_empty() {
            println!("[LLM] Using Gemini Flash ({}) Fallback...", GEMINI_FLASH_MODEL);
            match self.with_retry(|| self.call_gemini(GEMINI_FLASH_MODEL, system_prompt_gemini, user_content)).await {
                Ok(response) => return Ok(response),
                Err(e) => println!("[LLM] Gemini Flash failed: {}. Falling back...", e),
            }

            // 3. Fallback to Gemini Pro
            println!("[LLM] Using Gemini Pro ({}) Fallback...", GEMINI_PRO_MODEL);
            match self.with_retry(|| self.call_gemini(GEMINI_PRO_MODEL, system_prompt_gemini, user_content)).await {
                Ok(response) => return Ok(response),
                Err(e) => println!("[LLM] Gemini Pro failed: {}. Falling back to Ollama...", e),
            }
        } else {
             println!("[LLM] No Gemini API key found. Skipping.");
        }
        
        // 4. Fallback to Ollama
        println!("[LLM] Using Ollama ({}) Fallback...", OLLAMA_MODEL);
        self.call_ollama(system_prompt_gemini, user_content).await
    }

    /// Retry logic with exponential backoff
    async fn with_retry<F, Fut, T>(&self, f: F) -> Result<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T>>,
    {
        let mut retries = 3;
        let mut delay_ms = 400;

        loop {
            match f().await {
                Ok(val) => return Ok(val),
                Err(e) => {
                    // Only retry on specific errors if possible, or just retry all for robustness in this context
                    // For now, we assume transient errors are worth retrying.
                    // Checking for "503" or "overloaded" in string representation is a simple heuristic
                    let err_str = e.to_string();
                    if retries > 0 && (err_str.contains("503") || err_str.contains("overloaded") || err_str.contains("timeout")) {
                        println!("[LLM] Retryable error: {}. Retrying in {}ms...", err_str, delay_ms);
                        sleep(Duration::from_millis(delay_ms)).await;
                        delay_ms *= 2;
                        retries -= 1;
                    } else {
                        return Err(e);
                    }
                }
            }
        }
    }

    async fn call_groq(&self, system_prompt: &str, content: &str) -> Result<String> {
        let url = "https://api.groq.com/openai/v1/chat/completions";
        let body = json!({
            "model": GROQ_MODEL,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": content }
            ],
            "temperature": 0.3,
            "max_tokens": 8192,
            "stream": false
        });

        let res = self.http_client.post(url)
            .header("Authorization", format!("Bearer {}", self.groq_api_key))
            .json(&body)
            .send()
            .await
            .context("Failed to send Groq request")?;

        if !res.status().is_success() {
            return Err(anyhow!("Groq Status: {}", res.status()));
        }

        let json: serde_json::Value = res.json().await.context("Failed to parse Groq JSON")?;
        Ok(json["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string())
    }

    async fn call_gemini(&self, model: &str, system_prompt: &str, content: &str) -> Result<String> {
        // Construct URL for v1alpha/beta
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model,
            self.google_api_key
        );

        // Combine system prompt and content
        let full_prompt = format!("{}\n\nCONTEXT/USER INPUT:\n{}", system_prompt, content);

        let body = json!({
            "contents": [{
                "parts": [{ "text": full_prompt }]
            }]
        });

        let res = self.http_client.post(&url).json(&body).send().await.context("Failed to send Gemini request")?;
        
        if !res.status().is_success() {
             let status = res.status();
             let error_text = res.text().await.unwrap_or_default();
             return Err(anyhow!("Gemini API error ({}): {}", status, error_text));
        }
        
        let json: serde_json::Value = res.json().await.context("Failed to parse Gemini JSON")?;
        
        // Extract text safely
        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or(anyhow!("Gemini response missing text candidate"))?;
            
        Ok(text.to_string())
    }
    
    async fn call_ollama(&self, system: &str, content: &str) -> Result<String> {
        let url = format!("{}/api/generate", self.ollama_url);
        let body = json!({
            "model": OLLAMA_MODEL, 
            "prompt": format!("{}\n\n{}", system, content),
            "stream": false
        });
    
        let res = self.http_client.post(&url).json(&body).send().await.context("Failed to connect to Ollama")?;
        
        if !res.status().is_success() {
            return Err(anyhow!("Ollama Status: {}", res.status()));
        }
        
        let json: serde_json::Value = res.json().await.context("Failed to parse Ollama JSON")?;
        
        Ok(json["response"].as_str().unwrap_or("").to_string())
    }
}
