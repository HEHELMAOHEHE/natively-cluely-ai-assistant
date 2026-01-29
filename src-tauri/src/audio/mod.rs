pub mod stt;
use tauri::{AppHandle, Emitter, Manager};
use crate::AppState;
use std::thread;
use tokio::runtime::Runtime;

pub async fn start_audio_pipeline(app: AppHandle, state: tauri::State<'_, AppState>) {
    // Run audio capture in a separate thread to not block UI
    thread::spawn(move || {
        let rt = Runtime::new().unwrap();
        rt.block_on(async {
            println!("Audio: Initializing Capture...");
            
            // 1. Initialize Google STT Client
            // Note: Ensure GOOGLE_APPLICATION_CREDENTIALS env var is set!
            let mut stt = match stt::GoogleSTT::new().await {
                Ok(client) => Some(client),
                Err(e) => {
                    eprintln!("Failed to init STT: {}", e);
                    None 
                }
            };

            // 2. Initialize System Audio Capture (macOS)
            // Using the module provided in your codebase
            let input = match crate::speaker::macos::SpeakerInput::new(None) {
                Ok(i) => i,
                Err(e) => {
                    eprintln!("Failed to init Audio Device: {}", e);
                    return;
                }
            };

            println!("Audio: Stream Started. Listening...");
            
            // 3. Fake Data Emission for Testing UI (Immediate Feedback)
            // Remove this loop once real audio piping is confirmed working
            let app_clone = app.clone();
            tokio::spawn(async move {
                loop {
                    // Simulate receiving a transcript every 3 seconds
                    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                    app_clone.emit("transcript", serde_json::json!({
                        "speaker": "interviewer",
                        "text": "This is a test transcript from Rust backend.",
                        "final": true
                    })).unwrap_or(());
                }
            });
            
            // 4. Real Audio Pipe (Commented out until you verify Google Creds)
            // let stream = input.stream();
            // stt.stream_audio(stream).await.unwrap();
        });
    });
}
