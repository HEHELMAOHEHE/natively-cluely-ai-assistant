mod audio;
mod db;
mod rag;
mod speaker;
mod commands;
mod intelligence;
mod llm;
mod calendar; // New Module

use tauri::Manager;
use std::sync::Mutex;
use intelligence::IntelligenceManager;
use llm::LLMClient;

use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

pub struct AppState {
    pub intelligence: Mutex<Option<IntelligenceManager>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())

        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .setup(|app| {
            let llm_client = LLMClient::new().ok(); // Handle error gracefully or panic
            if let Some(client) = llm_client {
                let intelligence = IntelligenceManager::new(app.handle().clone(), client);
                app.manage(AppState {
                    intelligence: Mutex::new(Some(intelligence)),
                });
            } else {
                 app.manage(AppState {
                    intelligence: Mutex::new(None),
                });
            }
            
use std::str::FromStr;

            // --- Global Shortcuts ---
            let screenshot_shortcut = Shortcut::from_str("CommandOrControl+H").unwrap();
            let toggle_shortcut = Shortcut::from_str("CommandOrControl+B").unwrap();



            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new().with_handler(move |app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if shortcut == &screenshot_shortcut {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = commands::take_screenshot(app_handle).await;
                            });
                        } else if shortcut == &toggle_shortcut {
                            let win = app.get_webview_window("launcher").or(app.get_webview_window("overlay"));
                            if let Some(w) = win {
                                if w.is_visible().unwrap_or(false) { let _ = w.hide(); } 
                                else { let _ = w.show(); }
                            }
                        }
                    }
                })
                .build(),
            )?;

            app.global_shortcut().register(screenshot_shortcut).unwrap();
            app.global_shortcut().register(toggle_shortcut).unwrap();
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_meeting,
            commands::stop_meeting,
            commands::rag_query,
            commands::get_recent_meetings,
            commands::start_screen_capture, 
            commands::take_screenshot, // New
            commands::what_should_i_say,
            commands::set_window_mode,
            commands::generate_recap, // New
            commands::generate_follow_up_questions, // New
            calendar::calendar_connect,
            commands::set_ignore_cursor_events, // New
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
