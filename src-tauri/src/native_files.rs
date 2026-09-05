use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const MAX_ARCHIVE_BYTES: u64 = 16 * 1024 * 1024;
const MAX_PNG_BYTES: usize = 64 * 1024 * 1024;
const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";

#[derive(Default)]
pub struct NativeFileState {
    associations: Mutex<HashMap<String, PathBuf>>,
    active_writes: Mutex<HashSet<String>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeOpenedFile {
    contents: String,
    display_name: String,
    path: String,
    handle: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeSavedFile {
    display_name: String,
    path: String,
    handle: Option<String>,
}

fn display_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("xdrate-music.xdrate.json")
        .to_owned()
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn ensure_regular_file(path: &Path) -> Result<fs::Metadata, String> {
    let metadata = fs::symlink_metadata(path).map_err(|_| "read-failed".to_owned())?;
    if !metadata.file_type().is_file() || metadata.file_type().is_symlink() {
        return Err("unsupported".to_owned());
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
        if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            return Err("unsupported".to_owned());
        }
    }
    Ok(metadata)
}

fn read_utf8_with_limit(path: &Path, limit: u64) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|_| "read-failed".to_owned())?;
    let mut bytes = Vec::new();
    file.take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "read-failed".to_owned())?;
    if bytes.len() as u64 > limit {
        return Err("file-too-large".to_owned());
    }
    String::from_utf8(bytes).map_err(|_| "invalid-data".to_owned())
}

fn is_supported_archive_path(path: &Path) -> bool {
    let name = display_name(path).to_ascii_lowercase();
    name.ends_with(".xdrate.json") || name.ends_with(".json")
}

fn sanitized_name(suggested_name: &str, fallback: &str) -> String {
    Path::new(suggested_name)
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or(fallback)
        .to_owned()
}

fn with_archive_extension(mut path: PathBuf) -> PathBuf {
    if !display_name(&path)
        .to_ascii_lowercase()
        .ends_with(".xdrate.json")
    {
        path.set_extension("xdrate.json");
    }
    path
}

fn with_png_extension(mut path: PathBuf) -> PathBuf {
    if path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        != Some("png".to_owned())
    {
        path.set_extension("png");
    }
    path
}

fn validate_archive_contents(contents: &str) -> Result<(), String> {
    if contents.len() as u64 > MAX_ARCHIVE_BYTES {
        return Err("file-too-large".to_owned());
    }
    let value: serde_json::Value =
        serde_json::from_str(contents).map_err(|_| "invalid-data".to_owned())?;
    if value.get("format").and_then(|item| item.as_str()) != Some("xdrate-music-archive")
        || value.get("schemaVersion").and_then(|item| item.as_u64()) != Some(2)
        || value
            .get("workspace")
            .and_then(|item| item.as_object())
            .is_none()
    {
        return Err("invalid-data".to_owned());
    }
    Ok(())
}

fn register_path(state: &NativeFileState, path: PathBuf) -> Result<String, String> {
    let handle = Uuid::new_v4().to_string();
    state
        .associations
        .lock()
        .map_err(|_| "write-failed".to_owned())?
        .insert(handle.clone(), path);
    Ok(handle)
}

fn saved_file(path: PathBuf, handle: Option<String>) -> NativeSavedFile {
    NativeSavedFile {
        display_name: display_name(&path),
        path: display_path(&path),
        handle,
    }
}

fn temporary_sibling(path: &Path) -> Result<PathBuf, String> {
    let parent = path.parent().ok_or_else(|| "write-failed".to_owned())?;
    let name = display_name(path);
    Ok(parent.join(format!(".{name}.{}.tmp", Uuid::new_v4())))
}

#[cfg(windows)]
fn replace_file(temp_path: &Path, target_path: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    let temp: Vec<u16> = temp_path.as_os_str().encode_wide().chain(Some(0)).collect();
    let target: Vec<u16> = target_path
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();
    let result = unsafe {
        MoveFileExW(
            temp.as_ptr(),
            target.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if result == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_file(temp_path: &Path, target_path: &Path) -> std::io::Result<()> {
    fs::rename(temp_path, target_path)
}

fn atomic_write_with<F>(path: &Path, bytes: &[u8], replace: F) -> Result<(), String>
where
    F: FnOnce(&Path, &Path) -> std::io::Result<()>,
{
    let temp_path = temporary_sibling(path)?;
    let result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temp_path)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        replace(&temp_path, path)
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
        return Err("write-failed".to_owned());
    }
    Ok(())
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    atomic_write_with(path, bytes, replace_file)
}

fn begin_write(state: &NativeFileState, handle: &str) -> Result<(), String> {
    let mut active = state
        .active_writes
        .lock()
        .map_err(|_| "write-failed".to_owned())?;
    if !active.insert(handle.to_owned()) {
        return Err("write-failed".to_owned());
    }
    Ok(())
}

fn end_write(state: &NativeFileState, handle: &str) {
    if let Ok(mut active) = state.active_writes.lock() {
        active.remove(handle);
    }
}

#[tauri::command]
pub async fn native_open_archive(
    app: AppHandle,
    state: State<'_, NativeFileState>,
    max_bytes: Option<u64>,
) -> Result<Option<NativeOpenedFile>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Open XDRate archive")
        .add_filter("XDRate archive", &["json"])
        .blocking_pick_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|_| "unsupported".to_owned())?;
    if !is_supported_archive_path(&path) {
        return Err("unsupported".to_owned());
    }
    let limit = max_bytes
        .unwrap_or(MAX_ARCHIVE_BYTES)
        .min(MAX_ARCHIVE_BYTES);
    let metadata = ensure_regular_file(&path)?;
    if metadata.len() > limit {
        return Err("file-too-large".to_owned());
    }
    let contents = read_utf8_with_limit(&path, limit)?;
    let handle = register_path(&state, path.clone())?;
    Ok(Some(NativeOpenedFile {
        contents,
        display_name: display_name(&path),
        path: display_path(&path),
        handle,
    }))
}

#[tauri::command]
pub async fn native_save_archive_as(
    app: AppHandle,
    state: State<'_, NativeFileState>,
    contents: String,
    suggested_name: String,
) -> Result<Option<NativeSavedFile>, String> {
    validate_archive_contents(&contents)?;
    let file_name = sanitized_name(&suggested_name, "xdrate-music.xdrate.json");
    let selected = app
        .dialog()
        .file()
        .set_title("Save XDRate archive")
        .set_file_name(file_name)
        .add_filter("XDRate archive", &["json"])
        .blocking_save_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = with_archive_extension(selected.into_path().map_err(|_| "unsupported".to_owned())?);
    atomic_write(&path, contents.as_bytes())?;
    let handle = register_path(&state, path.clone())?;
    Ok(Some(saved_file(path, Some(handle))))
}

#[tauri::command]
pub async fn native_save_archive(
    state: State<'_, NativeFileState>,
    handle: String,
    contents: String,
) -> Result<NativeSavedFile, String> {
    validate_archive_contents(&contents)?;
    let path = state
        .associations
        .lock()
        .map_err(|_| "write-failed".to_owned())?
        .get(&handle)
        .cloned()
        .ok_or_else(|| "invalid-handle".to_owned())?;
    match ensure_regular_file(&path) {
        Ok(_) => {}
        Err(reason) if reason == "read-failed" => return Err("target-missing".to_owned()),
        Err(reason) => return Err(reason),
    }
    begin_write(&state, &handle)?;
    let result = atomic_write(&path, contents.as_bytes());
    end_write(&state, &handle);
    result?;
    Ok(saved_file(path, Some(handle)))
}

#[tauri::command]
pub async fn native_save_png(
    app: AppHandle,
    bytes: Vec<u8>,
    suggested_name: String,
) -> Result<Option<NativeSavedFile>, String> {
    if bytes.len() > MAX_PNG_BYTES {
        return Err("file-too-large".to_owned());
    }
    if bytes.len() < PNG_SIGNATURE.len() || &bytes[..PNG_SIGNATURE.len()] != PNG_SIGNATURE {
        return Err("invalid-data".to_owned());
    }
    let file_name = sanitized_name(&suggested_name, "XDRate.png");
    let selected = app
        .dialog()
        .file()
        .set_title("Save XDRate image")
        .set_file_name(file_name)
        .add_filter("PNG image", &["png"])
        .blocking_save_file();
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = with_png_extension(selected.into_path().map_err(|_| "unsupported".to_owned())?);
    atomic_write(&path, &bytes)?;
    Ok(Some(saved_file(path, None)))
}

#[cfg(test)]
mod tests {
    use super::{
        atomic_write, atomic_write_with, is_supported_archive_path, read_utf8_with_limit,
        sanitized_name, validate_archive_contents,
    };
    use std::fs;

    #[test]
    fn archive_validation_requires_the_v2_archive_envelope() {
        assert!(validate_archive_contents(
            r#"{"format":"xdrate-music-archive","schemaVersion":2,"workspace":{}}"#
        )
        .is_ok());
        assert_eq!(
            validate_archive_contents("{}"),
            Err("invalid-data".to_owned())
        );
    }

    #[test]
    fn archive_extension_policy_is_explicit() {
        assert!(is_supported_archive_path(std::path::Path::new(
            "rating.xdrate.json"
        )));
        assert!(is_supported_archive_path(std::path::Path::new(
            "rating.json"
        )));
        assert!(!is_supported_archive_path(std::path::Path::new(
            "rating.txt"
        )));
    }

    #[test]
    fn suggested_names_cannot_escape_the_user_selected_directory() {
        assert_eq!(
            sanitized_name("../outside.json", "fallback.json"),
            "outside.json"
        );
        assert_eq!(
            sanitized_name("C:\\private\\outside.json", "fallback.json"),
            "outside.json"
        );
    }

    #[test]
    fn archive_reads_are_bounded_even_if_the_file_changes_after_metadata_check() {
        let directory = std::env::temp_dir().join(format!("xdrate-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&directory).expect("create temp directory");
        let target = directory.join("archive.json");
        fs::write(&target, b"123456").expect("seed file");
        assert_eq!(
            read_utf8_with_limit(&target, 5),
            Err("file-too-large".to_owned())
        );
        fs::remove_dir_all(directory).expect("remove temp directory");
    }

    #[test]
    fn atomic_write_replaces_a_complete_file_and_leaves_no_temp_file() {
        let directory = std::env::temp_dir().join(format!("xdrate-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&directory).expect("create temp directory");
        let target = directory.join("archive.json");
        fs::write(&target, b"old").expect("seed file");
        atomic_write(&target, b"new complete contents").expect("atomic replacement");
        assert_eq!(
            fs::read(&target).expect("read target"),
            b"new complete contents"
        );
        assert_eq!(fs::read_dir(&directory).expect("list directory").count(), 1);
        fs::remove_dir_all(directory).expect("remove temp directory");
    }

    #[test]
    fn failed_atomic_replacement_preserves_the_existing_target() {
        let directory = std::env::temp_dir().join(format!("xdrate-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&directory).expect("create temp directory");
        let target = directory.join("archive.json");
        fs::write(&target, b"known-good").expect("seed file");

        let result = atomic_write_with(&target, b"incomplete-new-data", |_temp, _target| {
            Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "simulated read-only or disk failure",
            ))
        });

        assert_eq!(result, Err("write-failed".to_owned()));
        assert_eq!(fs::read(&target).expect("read target"), b"known-good");
        assert_eq!(fs::read_dir(&directory).expect("list directory").count(), 1);
        fs::remove_dir_all(directory).expect("remove temp directory");
    }
}
