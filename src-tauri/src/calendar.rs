use tauri::{AppHandle, Emitter};
use tiny_http::{Server, Response};
use url::Url;
use std::thread;

const GOOGLE_CLIENT_ID: &str = "YOUR_CLIENT_ID"; // User requested to use env vars in production, but for now exact copy.
// Ideally should be env::var("GOOGLE_CLIENT_ID").unwrap_or(...)
// Attempting to use a placeholder or check if user provided one. 
// The user said: "Use env vars in production". I will stick to their code snippet for fidelity.
const REDIRECT_URI: &str = "http://localhost:11111/auth/callback";
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";

#[tauri::command]
pub async fn calendar_connect(app: AppHandle) -> Result<serde_json::Value, String> {
    // 1. Construct Auth URL
    // Better to use env var for client ID if possible, but adhering to user snippet structure
    let client_id = std::env::var("GOOGLE_CLIENT_ID").unwrap_or_else(|_| "YOUR_CLIENT_ID".to_string());

    let url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline&prompt=consent",
        AUTH_URL, client_id, REDIRECT_URI
    );

    // 2. Open Browser
    if let Err(e) = open::that(&url) {
        return Err(format!("Failed to open browser: {}", e));
    }

    // 3. Start Local Server to catch callback (running in a thread to not block)
    let app_clone = app.clone();
    thread::spawn(move || {
        match Server::http("127.0.0.1:11111") {
            Ok(server) => {
                println!("Calendar: Listening for callback on port 11111...");

                if let Ok(request) = server.recv() {
                    let url_string = format!("http://localhost:11111{}", request.url());
                    if let Ok(parsed_url) = Url::parse(&url_string) {
                         // Extract "code"
                        let code_pair = parsed_url.query_pairs().find(|(key, _)| key == "code");

                        if let Some((_, code)) = code_pair {
                            println!("Calendar: Auth Code received!");
                            
                            // Respond to browser
                            let _ = request.respond(Response::from_string(
                                "Authentication successful! You can close this window and return to Natively."
                            ));

                            // Emit event to React
                            app_clone.emit("calendar-auth-success", code.to_string()).unwrap_or(());
                        }
                    }
                }
            },
            Err(e) => {
                println!("Failed to start calendar auth server: {}", e);
            }
        }
    });

    Ok(serde_json::json!({ "success": true }))
}
