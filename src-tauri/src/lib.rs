use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, WebviewWindow};

struct BackendProcess(Mutex<Option<Child>>);

#[tauri::command]
fn window_minimize(window: WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn window_maximize(window: WebviewWindow) {
    let _ = window.maximize();
}

#[tauri::command]
fn window_close(window: WebviewWindow) {
    let _ = window.close();
}

#[tauri::command]
fn window_maximize_toggle(window: WebviewWindow) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn window_init(window: WebviewWindow) -> serde_json::Value {
    let size = window.inner_size().unwrap_or_default();
    let is_maximized = window.is_maximized().unwrap_or(false);
    
    serde_json::json!({
        "width": size.width,
        "height": size.height,
        "minimizable": true,
        "maximizable": true,
        "isMaximized": is_maximized,
        "platform": std::env::consts::OS
    })
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Start the Python backend process (only in release mode)
fn start_backend(app: &AppHandle) -> Option<Child> {
    // Only start backend in release mode - in dev mode, run it separately
    if cfg!(debug_assertions) {
        println!("Running in dev mode - backend should be started separately");
        return None;
    }
    
    let resource_path = app.path().resource_dir().ok()?;
    
    #[cfg(target_os = "windows")]
    let backend_name = "sonosano-backend.exe";
    #[cfg(not(target_os = "windows"))]
    let backend_name = "sonosano-backend";
    
    let backend_path = resource_path.join("backend").join(backend_name);
    
    if backend_path.exists() {
        match Command::new(&backend_path).spawn() {
            Ok(child) => {
                println!("Backend started successfully at {:?}", backend_path);
                Some(child)
            }
            Err(e) => {
                eprintln!("Failed to start backend: {}", e);
                None
            }
        }
    } else {
        eprintln!("Backend not found at {:?}", backend_path);
        None
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            // Start the backend process (only in release mode)
            let backend = start_backend(app.handle());
            let state: State<BackendProcess> = app.state();
            *state.0.lock().unwrap() = backend;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill backend when main window is closed
                let state: State<BackendProcess> = window.state();
                let mut guard = state.0.lock().unwrap();
                if let Some(ref mut child) = *guard {
                    let _ = child.kill();
                    println!("Backend process killed");
                }
                *guard = None;
            }
        })
        .invoke_handler(tauri::generate_handler![
            window_minimize,
            window_maximize,
            window_close,
            window_maximize_toggle,
            window_init,
            get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
