//! Session-bound file references; the UI cannot supply filesystem paths.
use crate::{save_project, validate_project};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const MAX_PROJECT_BYTES: u64 = 128 * 1024 * 1024;

#[derive(Clone, Default)]
pub struct ProjectFiles(Arc<Mutex<Session>>);

#[derive(Default)]
struct Session {
    next: u64,
    files: HashMap<u64, ProjectFile>,
}

struct ProjectFile {
    path: PathBuf,
    fingerprint: [u8; 32],
}

#[derive(Serialize)]
pub struct ProjectReference {
    pub id: u64,
    pub nombre: String,
}

#[derive(Serialize)]
pub struct OpenedProject {
    pub id: u64,
    pub nombre: String,
    pub contenido: String,
}

fn fingerprint(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}

fn read_file(path: &Path) -> io::Result<String> {
    let meta = fs::symlink_metadata(path)?;
    if meta.file_type().is_symlink() || !meta.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "El proyecto no es un archivo normal",
        ));
    }
    if meta.len() > MAX_PROJECT_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "El proyecto supera 128 MiB",
        ));
    }
    let mut bytes = Vec::new();
    File::open(path)?
        .take(MAX_PROJECT_BYTES + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > MAX_PROJECT_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "El proyecto supera 128 MiB",
        ));
    }
    String::from_utf8(bytes)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "El archivo no es UTF-8"))
}

impl ProjectFiles {
    fn insert(&self, path: &Path, contents: &str) -> io::Result<ProjectReference> {
        let mut session = self
            .0
            .lock()
            .map_err(|_| io::Error::other("No se puede acceder a la sesión de archivos"))?;
        session.next = session
            .next
            .checked_add(1)
            .ok_or_else(|| io::Error::other("Demasiados archivos"))?;
        let id = session.next;
        session.files.insert(
            id,
            ProjectFile {
                path: path.to_owned(),
                fingerprint: fingerprint(contents.as_bytes()),
            },
        );
        Ok(ProjectReference {
            id,
            nombre: path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("proyecto.json")
                .to_owned(),
        })
    }

    pub fn open(&self, path: &Path) -> io::Result<OpenedProject> {
        let contenido = read_file(path)?;
        validate_project(&contenido)?;
        let reference = self.insert(path, &contenido)?;
        Ok(OpenedProject {
            id: reference.id,
            nombre: reference.nombre,
            contenido,
        })
    }

    pub fn save_as(&self, path: &Path, contents: &str) -> io::Result<ProjectReference> {
        if contents.len() as u64 > MAX_PROJECT_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "El proyecto supera 128 MiB",
            ));
        }
        save_project(path, contents)?;
        self.insert(path, contents)
    }

    pub fn save(&self, id: u64, contents: &str) -> io::Result<()> {
        if contents.len() as u64 > MAX_PROJECT_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "El proyecto supera 128 MiB",
            ));
        }
        let mut session = self
            .0
            .lock()
            .map_err(|_| io::Error::other("No se puede acceder a la sesión de archivos"))?;
        let file = session.files.get_mut(&id).ok_or_else(|| {
            io::Error::new(io::ErrorKind::NotFound, "El archivo ya no está abierto")
        })?;
        let actual = read_file(&file.path).map_err(|_| io::Error::other("El archivo cambió o ya no está disponible. Usa Guardar como para conservar tus cambios."))?;
        if fingerprint(actual.as_bytes()) != file.fingerprint {
            return Err(io::Error::other(
                "El archivo cambió fuera de Tabula. Usa Guardar como para conservar tus cambios.",
            ));
        }
        save_project(&file.path, contents)?;
        file.fingerprint = fingerprint(contents.as_bytes());
        Ok(())
    }

    pub fn close(&self, id: u64) {
        if let Ok(mut session) = self.0.lock() {
            session.files.remove(&id);
        }
    }
}
