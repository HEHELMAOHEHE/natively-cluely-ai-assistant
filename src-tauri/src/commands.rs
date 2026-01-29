use tauri::{command, AppHandle, Manager, Window, Emitter, State}; // Added State, Emitter
use crate::AppState;
use serde::Serialize;
use xcap::Monitor;
use std::io::Cursor;
use base64::{Engine as _, engine::general_purpose};
use image::ImageFormat;
use crate::rag::VectorStore; // Assuming this module exists as seen in file listing

#[derive(Serialize)]
pub struct ApiResponse {
    success: bool,
    error: Option<String>,
}

#[command]
pub async fn set_window_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let launcher = app.get_webview_window("launcher").ok_or("Launcher window not found")?;
    let overlay = app.get_webview_window("overlay").ok_or("Overlay window not found")?;

    if mode == "overlay" {
        launcher.hide().map_err(|e| e.to_string())?;
        overlay.show().map_err(|e| e.to_string())?;
        overlay.set_focus().map_err(|e| e.to_string())?;
    } else {
        overlay.hide().map_err(|e| e.to_string())?;
        launcher.show().map_err(|e| e.to_string())?;
        launcher.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn start_meeting(app: AppHandle, state: State<'_, AppState>) -> Result<ApiResponse, String> {
    println!("Backend: Starting Meeting Sequence...");
    crate::audio::start_audio_pipeline(app.clone(), state).await;
    Ok(ApiResponse { success: true, error: None })
}

#[derive(Serialize, Debug)]
pub struct Meeting {
    id: String,
    title: String,
    date: String,
    duration: String,
    summary: String,
}

#[command]
pub async fn stop_meeting(app: AppHandle, state: State<'_, AppState>) -> Result<ApiResponse, String> {
    println!("Stopping meeting and saving data...");

    // 1. Get Transcript from Intelligence Manager
    let manager_guard = state.intelligence.lock().map_err(|e| e.to_string())?;
    let manager = manager_guard.as_ref().ok_or("Intelligence Manager not initialized".to_string())?;
    let transcript = manager.get_context_text();

    // 2. Save to SQLite
    let db_path = app.path().app_data_dir().unwrap().join("natively.db");
    
    let meeting_id = uuid::Uuid::new_v4().to_string();
    
    {
        let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
        // Create table if not exists (temporary safety)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                title TEXT,
                date TEXT,
                duration TEXT,
                content TEXT,
                summary TEXT
            )",
            [],
        ).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO meetings (id, title, date, duration, content, summary) VALUES (?1, ?2, datetime('now'), ?3, ?4, ?5)",
            rusqlite::params![meeting_id, "Processing...", "0 min", transcript, ""],
        ).map_err(|e| e.to_string())?;
    }

    println!("Meeting saved with ID: {}", meeting_id);
    
    // Emit initial update so UI shows "Processing..."
    app.emit("meetings-updated", ()).map_err(|e| e.to_string())?;

    // Background Processing Task
    let app_clone = app.clone();
    let db_path_clone = db_path.clone();
    let meeting_id_clone = meeting_id.clone();
    
    tauri::async_runtime::spawn(async move {
        // Simulate processing time (e.g. generating summary)
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

        // Update Title to "New Meeting" (or generate real title later)
        if let Ok(conn) = rusqlite::Connection::open(&db_path_clone) {
            let _ = conn.execute(
                "UPDATE meetings SET title = ?1 WHERE id = ?2",
                rusqlite::params!["New Meeting", meeting_id_clone],
            );
        }

        // Emit final update
        let _ = app_clone.emit("meetings-updated", ());
    });

    Ok(ApiResponse { success: true, error: None })
}

#[command]
pub async fn rag_query(query: String) -> Result<String, String> {
    println!("Querying RAG: {}", query);
    Ok("RAG Result Placeholder".to_string())
}

#[command]
pub async fn get_recent_meetings(app: AppHandle) -> Result<Vec<Meeting>, String> {
    let db_path = app.path().app_data_dir().unwrap().join("natively.db");
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // Ensure table exists just in case
    conn.execute(
        "CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            title TEXT,
            date TEXT,
            duration TEXT,
            content TEXT,
            summary TEXT
        )",
        [],
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, title, date, duration, summary FROM meetings ORDER BY date DESC LIMIT 20").map_err(|e| e.to_string())?;
    
    let meeting_iter = stmt.query_map([], |row| {
        Ok(Meeting {
            id: row.get(0)?,
            title: row.get(1)?,
            date: row.get(2)?,
            duration: row.get(3).unwrap_or("0 min".to_string()),
            summary: row.get(4).unwrap_or("".to_string()),
        })
    }).map_err(|e| e.to_string())?;

    let mut meetings = Vec::new();
    for meeting in meeting_iter {
        meetings.push(meeting.map_err(|e| e.to_string())?);
    }
    
    Ok(meetings)
}

#[command]
pub async fn start_screen_capture() -> Result<(), String> {
    // This seems to be the old/placeholder command. The new one is take_screenshot
    println!("Starting screen capture (placeholder)...");
    Ok(())
}

#[command]
pub async fn take_screenshot(app: AppHandle) -> Result<String, String> {
    // 1. Identify and Hide Visible Windows
    let launcher = app.get_webview_window("launcher");
    let overlay = app.get_webview_window("overlay");
    
    let mut visible_windows = Vec::new();

    if let Some(w) = &launcher {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
            visible_windows.push("launcher");
        }
    }
    if let Some(w) = &overlay {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
             visible_windows.push("overlay");
        }
    }

    // Slight delay to ensure windows are gone (animation/commit frame)
    std::thread::sleep(std::time::Duration::from_millis(250));

    // 2. Capture Primary Monitor
    // Wrap in closure to ensure restoration happens even on error (mostly)
    let image_data = (|| -> Result<Vec<u8>, String> {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        let monitor = monitors.first().ok_or("No monitor found")?;
        let image = monitor.capture_image().map_err(|e| e.to_string())?;

        let mut bytes: Vec<u8> = Vec::new();
        image.write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        Ok(bytes)
    })();

    // 3. Restore Windows
    for win_name in visible_windows {
         if let Some(w) = app.get_webview_window(win_name) {
            // Restore visibility
            let _ = w.show();
            // If it was the overlay, ensure it's focused if it was active
            // Note: Simplification, ideally we track focus too.
        }
    }

    let bytes = image_data?;
    let base64_string = general_purpose::STANDARD.encode(&bytes);
    let data_uri = format!("data:image/png;base64,{}", base64_string);

    // 4. Emit event to frontend
    app.emit("screenshot-taken", serde_json::json!({
        "path": "memory",
        "preview": data_uri
    })).map_err(|e| e.to_string())?;

    Ok(data_uri)
}


#[command]
pub async fn what_should_i_say(state: State<'_, AppState>) -> Result<String, String> {
    let manager = {
        let intelligence = state.intelligence.lock().map_err(|e| e.to_string())?;
        intelligence.as_ref().ok_or("Intelligence Manager not initialized".to_string())?.clone()
    };
    
    manager.run_what_should_i_say().await.map_err(|e| e.to_string())
}

#[command]
pub async fn generate_recap(state: State<'_, AppState>) -> Result<String, String> {
    let manager = {
        let intelligence = state.intelligence.lock().map_err(|e| e.to_string())?;
        intelligence.as_ref().ok_or("Intelligence Manager not initialized".to_string())?.clone()
    };
    manager.run_recap().await.map_err(|e| e.to_string())
}

#[command]
pub async fn generate_follow_up_questions(state: State<'_, AppState>) -> Result<String, String> {
    let manager = {
        let intelligence = state.intelligence.lock().map_err(|e| e.to_string())?;
        intelligence.as_ref().ok_or("Intelligence Manager not initialized".to_string())?.clone()
    };
    manager.run_follow_up_questions().await.map_err(|e| e.to_string())
}

#[command]
pub async fn set_ignore_cursor_events(app: AppHandle, ignore: bool) -> Result<(), String> {
    let overlay = app.get_webview_window("overlay").ok_or("Overlay window not found")?;
    overlay.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())?;
    Ok(())
}
