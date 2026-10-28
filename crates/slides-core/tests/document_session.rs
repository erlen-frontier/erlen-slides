use erlen_slides_core::ProjectFiles;
use std::fs;

const FIRST: &str = r#"{"v":1,"meta":{"title":"Original"},"slides":[{"id":"s1","blocks":[{"type":"chart","cientifico":{"fuente":"original"}}]}],"extension":{"keep":true}}"#;
const EDITED: &str = r#"{"v":1,"meta":{"title":"Editada"},"slides":[{"id":"s1","blocks":[{"type":"chart","cientifico":{"fuente":"original"}}]}],"extension":{"keep":true}}"#;

#[test]
fn opens_a_selected_project_and_saves_back_without_losing_data() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("charla.json");
    fs::write(&path, FIRST).unwrap();
    let files = ProjectFiles::default();
    let opened = files.open(&path).unwrap();
    assert_eq!(opened.nombre, "charla.json");
    assert_eq!(opened.contenido, FIRST);
    files.save(opened.id, EDITED).unwrap();
    assert_eq!(fs::read_to_string(path).unwrap(), EDITED);
}

#[test]
fn refuses_to_overwrite_changes_or_a_deleted_file() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("charla.json");
    fs::write(&path, FIRST).unwrap();
    let files = ProjectFiles::default();
    let opened = files.open(&path).unwrap();
    fs::write(&path, "external change").unwrap();
    assert!(files.save(opened.id, EDITED).is_err());
    assert_eq!(fs::read_to_string(&path).unwrap(), "external change");
    fs::remove_file(&path).unwrap();
    assert!(files.save(opened.id, EDITED).is_err());
    assert!(!path.exists());
}

#[test]
fn save_as_keeps_the_previous_project_and_issues_a_distinct_handle() {
    let dir = tempfile::tempdir().unwrap();
    let first = dir.path().join("first.json");
    let second = dir.path().join("second.json");
    fs::write(&first, FIRST).unwrap();
    let files = ProjectFiles::default();
    let opened = files.open(&first).unwrap();
    let saved = files.save_as(&second, EDITED).unwrap();
    assert_ne!(saved.id, opened.id);
    assert_eq!(fs::read_to_string(first).unwrap(), FIRST);
    assert_eq!(fs::read_to_string(second).unwrap(), EDITED);
    files.close(saved.id);
    assert!(files.save(saved.id, FIRST).is_err());
}

#[test]
fn invalid_open_or_save_never_modifies_the_original() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("charla.json");
    fs::write(&path, FIRST).unwrap();
    let files = ProjectFiles::default();
    let opened = files.open(&path).unwrap();
    assert!(files.save(opened.id, "{\"slides\":[]}").is_err());
    assert_eq!(fs::read_to_string(&path).unwrap(), FIRST);
    let invalid = dir.path().join("invalid.json");
    fs::write(&invalid, "not a project").unwrap();
    assert!(files.open(&invalid).is_err());
    assert_eq!(fs::read_to_string(invalid).unwrap(), "not a project");
}

#[cfg(unix)]
#[test]
fn a_symlink_replacing_an_open_project_is_not_followed() {
    use std::os::unix::fs::symlink;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("charla.json");
    let target = dir.path().join("other.json");
    fs::write(&path, FIRST).unwrap();
    fs::write(&target, FIRST).unwrap();
    let files = ProjectFiles::default();
    let opened = files.open(&path).unwrap();
    fs::remove_file(&path).unwrap();
    symlink(&target, &path).unwrap();
    assert!(files.save(opened.id, EDITED).is_err());
    assert_eq!(fs::read_to_string(target).unwrap(), FIRST);
}
