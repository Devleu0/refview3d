use std::path::Path;

use tauri::{AppHandle, Manager};

/// 프론트엔드가 asset 프로토콜로 읽을 수 있는 확장자.
pub const MODEL_EXTENSIONS: &[&str] = &["obj", "stl", "fbx", "gltf", "glb"];

/// 모델 파일이 있는 폴더를 asset 프로토콜 허용 범위에 추가한다.
///
/// 오류는 화면에서 번역할 수 있게 코드(`code` 또는 `code:detail`)로 돌려준다.
///
/// 처음부터 전체 디스크를 열어두지 않고, 사용자가 고른 모델의
/// 폴더만 연다. 같은 폴더의 텍스처나 .bin 파일도 함께 읽기 위해
/// 폴더 단위(하위 포함)로 허용한다.
#[tauri::command]
pub fn allow_model_dir(app: AppHandle, path: String) -> Result<(), String> {
    let file = Path::new(&path);

    let ext = file
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or("noExtension")?;
    if !MODEL_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("unsupportedExtension:{ext}"));
    }
    if !file.is_file() {
        return Err("fileNotFound".into());
    }

    let dir = file.parent().ok_or("noParentFolder")?;
    app.asset_protocol_scope()
        .allow_directory(dir, true)
        .map_err(|e| e.to_string())
}
