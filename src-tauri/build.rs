fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["guardar_proyecto", "cerrar_presentador"]),
    ))
    .expect("failed to build desktop application");
}
