mod commands;
mod library;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            library::init(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::allow_model_dir,
            library::library_list,
            library::library_add_folder,
            library::library_remove_folder,
            library::library_rescan,
            library::library_save_thumbnail,
            library::library_mark_thumbnail_failed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
