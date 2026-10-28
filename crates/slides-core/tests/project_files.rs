use erlen_slides_core::save_project;
use std::fs;

const PROJECT: &str = r#"{
  "v": 1,
  "meta": {"title": "Señal μ", "future": {"keep": true}},
  "slides": [{"id": "s1", "notes": "Notas privadas", "blocks": [{"type": "chart", "data": "1,2\n3,4", "cientifico": {"fuente": "original"}}]}],
  "unknown_extension": [1, 2, 3]
}"#;

#[test]
fn saves_project_bytes_without_dropping_unknown_or_scientific_fields() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("presentación.json");
    save_project(&path, PROJECT).unwrap();
    assert_eq!(fs::read(&path).unwrap(), PROJECT.as_bytes());
    assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
}

#[test]
fn replaces_a_previous_file_only_after_validation() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("deck.json");
    fs::write(&path, b"original").unwrap();
    for invalid in ["{", "[]", "[[1]]", "{}", r#"{"slides":[]}"#] {
        assert!(save_project(&path, invalid).is_err(), "{invalid}");
        assert_eq!(fs::read(&path).unwrap(), b"original");
    }
    save_project(&path, PROJECT).unwrap();
    assert_eq!(fs::read(&path).unwrap(), PROJECT.as_bytes());
    assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
}

#[test]
fn preserves_large_embedded_data_without_rewriting_it() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("large.json");
    let project = format!(
        r#"{{"slides":[{{"image":"data:image/png;base64,{}"}}],"extension":{{"keep":true}}}}"#,
        "A".repeat(8 * 1024 * 1024)
    );
    save_project(&path, &project).unwrap();
    assert_eq!(fs::read_to_string(path).unwrap(), project);
}

#[test]
fn reports_failure_if_parent_directory_does_not_exist() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("missing/deck.json");
    assert!(save_project(&path, PROJECT).is_err());
    assert!(!path.exists());
}

#[cfg(unix)]
#[test]
fn refuses_to_replace_a_symbolic_link_or_modify_its_target() {
    use std::os::unix::fs::symlink;
    let dir = tempfile::tempdir().unwrap();
    let target = dir.path().join("original.json");
    let link = dir.path().join("link.json");
    fs::write(&target, b"original").unwrap();
    symlink(&target, &link).unwrap();
    assert!(save_project(&link, PROJECT).is_err());
    assert!(fs::symlink_metadata(&link)
        .unwrap()
        .file_type()
        .is_symlink());
    assert_eq!(fs::read(&target).unwrap(), b"original");
}

#[cfg(unix)]
#[test]
fn replaces_a_project_with_private_permissions() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("deck.json");
    fs::write(&path, b"original").unwrap();
    fs::set_permissions(&path, fs::Permissions::from_mode(0o640)).unwrap();
    save_project(&path, PROJECT).unwrap();
    assert_eq!(
        fs::metadata(path).unwrap().permissions().mode() & 0o777,
        0o600
    );
}

#[cfg(unix)]
#[test]
fn new_project_is_private() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("deck.json");
    save_project(&path, PROJECT).unwrap();
    assert_eq!(
        fs::metadata(path).unwrap().permissions().mode() & 0o777,
        0o600
    );
}
