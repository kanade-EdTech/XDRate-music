mod native_files;

use native_files::NativeFileState;

const WINDOWS_APP_USER_MODEL_ID: &str = "XDRate.Music";

#[cfg(windows)]
fn set_windows_app_user_model_id() -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::SetCurrentProcessExplicitAppUserModelID;

    let app_id: Vec<u16> = std::ffi::OsStr::new(WINDOWS_APP_USER_MODEL_ID)
        .encode_wide()
        .chain(Some(0))
        .collect();
    let result = unsafe { SetCurrentProcessExplicitAppUserModelID(app_id.as_ptr()) };
    if result < 0 {
        Err("failed to set Windows AppUserModelID".to_owned())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn set_windows_app_user_model_id() -> Result<(), String> {
    Ok(())
}

fn is_allowed_navigation(url: &tauri::Url) -> bool {
    if url.scheme() == "tauri" {
        return true;
    }
    if matches!(url.scheme(), "http" | "https") && url.host_str() == Some("tauri.localhost") {
        return true;
    }
    cfg!(debug_assertions)
        && url.scheme() == "http"
        && matches!(url.host_str(), Some("localhost") | Some("127.0.0.1"))
        && url.port() == Some(1420)
}

fn navigation_policy<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("navigation-policy")
        .on_navigation(|_webview, url| is_allowed_navigation(url))
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    set_windows_app_user_model_id().expect("failed to apply XDRate.Music AppUserModelID");
    tauri::Builder::default()
        .plugin(navigation_policy())
        .plugin(tauri_plugin_dialog::init())
        .manage(NativeFileState::default())
        .invoke_handler(tauri::generate_handler![
            native_files::native_open_archive,
            native_files::native_save_archive_as,
            native_files::native_save_archive,
            native_files::native_save_png
        ])
        .run(tauri::generate_context!())
        .expect("failed to run XDRate Music desktop shell");
}

#[cfg(test)]
mod tests {
    use super::{is_allowed_navigation, WINDOWS_APP_USER_MODEL_ID};

    #[test]
    fn windows_app_user_model_id_is_the_frozen_release_identity() {
        assert_eq!(WINDOWS_APP_USER_MODEL_ID, "XDRate.Music");
    }

    #[test]
    fn navigation_policy_allows_only_packaged_and_exact_dev_origins() {
        assert!(is_allowed_navigation(
            &"tauri://localhost/index.html".parse().expect("tauri URL")
        ));
        assert!(is_allowed_navigation(
            &"http://tauri.localhost/index.html"
                .parse()
                .expect("Windows Tauri URL")
        ));
        assert!(!is_allowed_navigation(
            &"https://example.com/".parse().expect("remote URL")
        ));
        assert!(!is_allowed_navigation(
            &"file:///C:/private/archive.json".parse().expect("file URL")
        ));
        assert!(!is_allowed_navigation(
            &"javascript:alert(1)".parse().expect("javascript URL")
        ));
    }
}
