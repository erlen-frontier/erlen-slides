//! Portable project operations for the desktop application.

use serde::de::IgnoredAny;
use serde::Deserialize;
use std::fs;
use std::io::{self, Write};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Serializes the native save dialog and write operation within one app process.
#[derive(Clone, Default)]
pub struct SaveGate(Arc<AtomicBool>);

pub struct SaveGuard(Arc<AtomicBool>);

impl SaveGate {
    pub fn try_enter(&self) -> Option<SaveGuard> {
        self.0
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .ok()
            .map(|_| SaveGuard(self.0.clone()))
    }
}

impl Drop for SaveGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

#[derive(Deserialize)]
struct ProjectShape {
    // IgnoredAny validates each slide without constructing a second copy of
    // large scientific datasets, images, notes or future extension fields.
    slides: Vec<IgnoredAny>,
}

/// Validate a project without rewriting its JSON, then atomically replace the
/// destination. A temporary file in the same directory keeps the previous
/// project intact if validation or writing fails.
pub fn save_project(path: &Path, contents: &str) -> io::Result<()> {
    if !contents.trim_start().starts_with('{') {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "El proyecto no es un objeto JSON",
        ));
    }
    let project: ProjectShape = serde_json::from_str(contents)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if project.slides.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "El proyecto no contiene diapositivas",
        ));
    }

    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() || !metadata.is_file() => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "El destino no es un archivo normal",
            ));
        }
        Ok(_) => (),
        Err(error) if error.kind() == io::ErrorKind::NotFound => (),
        Err(error) => return Err(error),
    }

    if path.file_name().is_none() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Destino inválido",
        ));
    }
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    let mut temporary = tempfile::Builder::new()
        .prefix(".erlen-slides-")
        .tempfile_in(parent)?;
    temporary.write_all(contents.as_bytes())?;
    // Never copy mode bits from an existing file: the new file can inherit a
    // different group or ACL from its directory. Restrict both new and replaced
    // backups to their owner, including the effective POSIX ACL mask.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        temporary
            .as_file()
            .set_permissions(fs::Permissions::from_mode(0o600))?;
    }
    temporary.as_file().sync_all()?;
    temporary.persist(path).map_err(|error| error.error)?;
    Ok(())
}
