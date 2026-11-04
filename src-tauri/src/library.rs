//! 모델 라이브러리: 등록한 폴더의 모델 파일 목록과 썸네일 인덱스.
//!
//! - 목록은 SQLite(앱 데이터 폴더의 library.db)에 둔다.
//! - 폴더는 notify로 감시해 파일이 추가·삭제·수정되면 다시 맞추고 `library-changed` 이벤트를 보낸다.
//! - 썸네일은 프론트엔드가 Three.js로 그려 보내면 앱 데이터 폴더의 thumbs/<id>.png로 저장한다.
//!   파일 수정 시각(modified)과 썸네일을 만든 시각(thumb_modified)이 다르면 다시 만들어야 한다.

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, UNIX_EPOCH};

use notify_debouncer_mini::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::WalkDir;

use crate::commands::MODEL_EXTENSIONS;

pub const CHANGED_EVENT: &str = "library-changed";

pub struct Library {
    conn: Mutex<Connection>,
    thumbs_dir: PathBuf,
    watcher: Mutex<Option<Debouncer<RecommendedWatcher>>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    id: i64,
    path: String,
    model_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelEntry {
    id: i64,
    folder_id: i64,
    path: String,
    name: String,
    format: String,
    size: i64,
    modified: i64,
    /// 최신 썸네일 파일 경로. 없거나 원본보다 오래됐으면 None
    thumb: Option<String>,
    /// 썸네일 만들기에 실패한 파일 (원본이 바뀔 때까지 다시 시도하지 않는다)
    thumb_failed: bool,
}

#[derive(Serialize)]
pub struct Snapshot {
    folders: Vec<Folder>,
    models: Vec<ModelEntry>,
}

type CmdResult<T> = Result<T, String>;

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

impl Library {
    pub fn open(data_dir: &Path) -> CmdResult<Self> {
        std::fs::create_dir_all(data_dir).map_err(err)?;
        let thumbs_dir = data_dir.join("thumbs");
        std::fs::create_dir_all(&thumbs_dir).map_err(err)?;
        let conn = Connection::open(data_dir.join("library.db")).map_err(err)?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             CREATE TABLE IF NOT EXISTS folders (
                 id INTEGER PRIMARY KEY,
                 path TEXT NOT NULL UNIQUE
             );
             CREATE TABLE IF NOT EXISTS models (
                 id INTEGER PRIMARY KEY,
                 folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
                 path TEXT NOT NULL UNIQUE,
                 name TEXT NOT NULL,
                 format TEXT NOT NULL,
                 size INTEGER NOT NULL,
                 modified INTEGER NOT NULL,
                 thumb_modified INTEGER,
                 thumb_failed INTEGER NOT NULL DEFAULT 0
             );
             CREATE INDEX IF NOT EXISTS models_folder ON models(folder_id);",
        )
        .map_err(err)?;
        Ok(Self { conn: Mutex::new(conn), thumbs_dir, watcher: Mutex::new(None) })
    }

    pub fn thumbs_dir(&self) -> &Path {
        &self.thumbs_dir
    }

    fn thumb_path(&self, id: i64) -> PathBuf {
        self.thumbs_dir.join(format!("{id}.png"))
    }

    fn folders(&self) -> CmdResult<Vec<(i64, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, path FROM folders ORDER BY path").map_err(err)?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(err)?;
        rows.collect::<Result<_, _>>().map_err(err)
    }

    fn snapshot(&self) -> CmdResult<Snapshot> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT f.id, f.path, COUNT(m.id) FROM folders f
                 LEFT JOIN models m ON m.folder_id = f.id GROUP BY f.id ORDER BY f.path",
            )
            .map_err(err)?;
        let folders = stmt
            .query_map([], |r| Ok(Folder { id: r.get(0)?, path: r.get(1)?, model_count: r.get(2)? }))
            .map_err(err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(err)?;

        let mut stmt = conn
            .prepare(
                "SELECT id, folder_id, path, name, format, size, modified, thumb_modified, thumb_failed
                 FROM models ORDER BY name COLLATE NOCASE",
            )
            .map_err(err)?;
        let models = stmt
            .query_map([], |r| {
                let id: i64 = r.get(0)?;
                let modified: i64 = r.get(6)?;
                let thumb_modified: Option<i64> = r.get(7)?;
                let thumb = (thumb_modified == Some(modified)).then(|| self.thumb_path(id).to_string_lossy().into_owned());
                Ok(ModelEntry {
                    id,
                    folder_id: r.get(1)?,
                    path: r.get(2)?,
                    name: r.get(3)?,
                    format: r.get(4)?,
                    size: r.get(5)?,
                    modified,
                    thumb,
                    thumb_failed: r.get::<_, i64>(8)? != 0,
                })
            })
            .map_err(err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(err)?;
        Ok(Snapshot { folders, models })
    }

    /// 폴더를 훑어 DB를 디스크와 맞춘다. 새 파일은 추가, 사라진 파일은 삭제,
    /// 크기·수정 시각이 바뀐 파일은 썸네일을 무효로 한다.
    fn sync_folder(&self, folder_id: i64, root: &Path) -> CmdResult<()> {
        let mut found: Vec<(String, String, String, i64, i64)> = Vec::new();
        for entry in WalkDir::new(root).follow_links(false).into_iter().filter_map(Result::ok) {
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            let Some(ext) = path.extension().and_then(|e| e.to_str()).map(str::to_ascii_lowercase) else {
                continue;
            };
            if !MODEL_EXTENSIONS.contains(&ext.as_str()) {
                continue;
            }
            let Ok(meta) = entry.metadata() else { continue };
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map_or(0, |d| d.as_millis() as i64);
            let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
            found.push((path.to_string_lossy().into_owned(), name, ext, meta.len() as i64, modified));
        }

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction().map_err(err)?;
        let mut removed_ids = Vec::new();
        {
            let mut existing = tx.prepare("SELECT id, path FROM models WHERE folder_id = ?1").map_err(err)?;
            let rows: Vec<(i64, String)> = existing
                .query_map([folder_id], |r| Ok((r.get(0)?, r.get(1)?)))
                .map_err(err)?
                .collect::<Result<_, _>>()
                .map_err(err)?;
            let found_paths: std::collections::HashSet<&str> = found.iter().map(|f| f.0.as_str()).collect();
            for (id, path) in rows {
                if !found_paths.contains(path.as_str()) {
                    tx.execute("DELETE FROM models WHERE id = ?1", [id]).map_err(err)?;
                    removed_ids.push(id);
                }
            }

            let mut upsert = tx
                .prepare(
                    "INSERT INTO models (folder_id, path, name, format, size, modified) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                     ON CONFLICT(path) DO UPDATE SET
                         size = excluded.size,
                         modified = excluded.modified,
                         thumb_failed = CASE WHEN models.modified = excluded.modified THEN models.thumb_failed ELSE 0 END
                     WHERE models.size != excluded.size OR models.modified != excluded.modified",
                )
                .map_err(err)?;
            for (path, name, ext, size, modified) in &found {
                upsert.execute(params![folder_id, path, name, ext, size, modified]).map_err(err)?;
            }
        }
        tx.commit().map_err(err)?;
        drop(conn);
        for id in removed_ids {
            let _ = std::fs::remove_file(self.thumb_path(id));
        }
        Ok(())
    }

    fn sync_all(&self) -> CmdResult<()> {
        for (id, path) in self.folders()? {
            self.sync_folder(id, Path::new(&path))?;
        }
        Ok(())
    }

    /// 변경된 경로가 속한 등록 폴더만 다시 맞춘다.
    fn sync_paths(&self, changed: &[PathBuf]) -> CmdResult<bool> {
        let mut any = false;
        for (id, root) in self.folders()? {
            let root = PathBuf::from(root);
            if changed.iter().any(|p| p.starts_with(&root)) {
                self.sync_folder(id, &root)?;
                any = true;
            }
        }
        Ok(any)
    }
}

/// 앱 시작 시: DB를 열고, 등록 폴더를 asset 허용 범위에 넣고, 감시를 시작한 뒤 백그라운드에서 다시 맞춘다.
pub fn init(app: &AppHandle) -> CmdResult<()> {
    let data_dir = app.path().app_local_data_dir().map_err(err)?;
    let library = Library::open(&data_dir)?;
    app.asset_protocol_scope().allow_directory(library.thumbs_dir(), false).map_err(err)?;
    let folders = library.folders()?;
    app.manage(library);

    for (_, path) in &folders {
        let _ = app.asset_protocol_scope().allow_directory(path, true);
    }
    start_watcher(app, folders.iter().map(|f| PathBuf::from(&f.1)))?;

    let handle = app.clone();
    std::thread::spawn(move || {
        if handle.state::<Library>().sync_all().is_ok() {
            let _ = handle.emit(CHANGED_EVENT, ());
        }
    });
    Ok(())
}

fn start_watcher(app: &AppHandle, roots: impl Iterator<Item = PathBuf>) -> CmdResult<()> {
    let handle = app.clone();
    let mut debouncer = new_debouncer(Duration::from_millis(600), move |res: DebounceEventResult| {
        let Ok(events) = res else { return };
        let paths: Vec<PathBuf> = events.into_iter().map(|e| e.path).collect();
        if let Ok(true) = handle.state::<Library>().sync_paths(&paths) {
            let _ = handle.emit(CHANGED_EVENT, ());
        }
    })
    .map_err(err)?;
    for root in roots {
        // 외장 드라이브가 빠진 경우 등은 건너뛰고 계속한다.
        let _ = debouncer.watcher().watch(&root, RecursiveMode::Recursive);
    }
    *app.state::<Library>().watcher.lock().unwrap() = Some(debouncer);
    Ok(())
}

fn normalized(path: &str) -> String {
    path.trim_end_matches(['\\', '/']).to_lowercase()
}

#[tauri::command]
pub fn library_list(library: State<'_, Library>) -> CmdResult<Snapshot> {
    library.snapshot()
}

#[tauri::command]
pub fn library_add_folder(app: AppHandle, library: State<'_, Library>, path: String) -> CmdResult<Snapshot> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err("폴더를 찾을 수 없습니다".into());
    }
    // 겹치는 폴더를 둘 다 등록하면 같은 파일이 두 번 잡히므로 막는다.
    let new_key = normalized(&path);
    for (_, existing) in library.folders()? {
        let key = normalized(&existing);
        if key == new_key {
            return Err("이미 등록된 폴더입니다".into());
        }
        if new_key.starts_with(&format!("{key}\\")) || new_key.starts_with(&format!("{key}/")) {
            return Err(format!("이미 등록된 폴더 안에 있습니다: {existing}"));
        }
        if key.starts_with(&format!("{new_key}\\")) || key.starts_with(&format!("{new_key}/")) {
            return Err(format!("이미 등록된 폴더를 포함합니다: {existing}. 그 폴더를 먼저 빼 주세요."));
        }
    }

    let id = {
        let conn = library.conn.lock().unwrap();
        conn.execute("INSERT INTO folders (path) VALUES (?1)", [&path]).map_err(err)?;
        conn.last_insert_rowid()
    };
    app.asset_protocol_scope().allow_directory(&root, true).map_err(err)?;
    library.sync_folder(id, &root)?;
    if let Some(watcher) = library.watcher.lock().unwrap().as_mut() {
        let _ = watcher.watcher().watch(&root, RecursiveMode::Recursive);
    }
    library.snapshot()
}

#[tauri::command]
pub fn library_remove_folder(library: State<'_, Library>, id: i64) -> CmdResult<Snapshot> {
    let (path, model_ids) = {
        let conn = library.conn.lock().unwrap();
        let path: Option<String> =
            conn.query_row("SELECT path FROM folders WHERE id = ?1", [id], |r| r.get(0)).optional().map_err(err)?;
        let mut stmt = conn.prepare("SELECT id FROM models WHERE folder_id = ?1").map_err(err)?;
        let ids: Vec<i64> = stmt.query_map([id], |r| r.get(0)).map_err(err)?.collect::<Result<_, _>>().map_err(err)?;
        conn.execute("DELETE FROM folders WHERE id = ?1", [id]).map_err(err)?;
        (path, ids)
    };
    if let (Some(path), Some(watcher)) = (path, library.watcher.lock().unwrap().as_mut()) {
        let _ = watcher.watcher().unwatch(Path::new(&path));
    }
    for model_id in model_ids {
        let _ = std::fs::remove_file(library.thumb_path(model_id));
    }
    library.snapshot()
}

#[tauri::command]
pub fn library_rescan(library: State<'_, Library>) -> CmdResult<Snapshot> {
    library.sync_all()?;
    library.snapshot()
}

/// 썸네일 PNG 저장. 본문은 PNG 바이트, 헤더 `x-model-id`(모델 id)와 `x-modified`(만들 때 기준으로 삼은 수정 시각).
/// 그 사이 파일이 지워졌거나 다시 바뀌었으면 저장하지 않고 None을 돌려준다(다음 목록에서 새로 만든다).
#[tauri::command]
pub fn library_save_thumbnail(library: State<'_, Library>, request: tauri::ipc::Request<'_>) -> CmdResult<Option<String>> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("썸네일 데이터가 없습니다".into());
    };
    let header = |name: &str| -> CmdResult<i64> {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse().ok())
            .ok_or_else(|| format!("{name} 헤더가 없습니다"))
    };
    let id = header("x-model-id")?;
    let modified = header("x-modified")?;
    if !bytes.starts_with(b"\x89PNG") {
        return Err("PNG가 아닙니다".into());
    }
    let conn = library.conn.lock().unwrap();
    let updated = conn
        .execute(
            "UPDATE models SET thumb_modified = ?2, thumb_failed = 0 WHERE id = ?1 AND modified = ?2",
            params![id, modified],
        )
        .map_err(err)?;
    if updated == 0 {
        return Ok(None);
    }
    let path = library.thumb_path(id);
    std::fs::write(&path, bytes).map_err(err)?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// 썸네일을 만들 수 없는 파일(손상 등)로 표시해 원본이 바뀔 때까지 다시 시도하지 않는다.
#[tauri::command]
pub fn library_mark_thumbnail_failed(library: State<'_, Library>, id: i64, modified: i64) -> CmdResult<()> {
    let conn = library.conn.lock().unwrap();
    conn.execute("UPDATE models SET thumb_failed = 1 WHERE id = ?1 AND modified = ?2", params![id, modified])
        .map_err(err)?;
    Ok(())
}
