fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "guardar_proyecto",
            "abrir_archivo_proyecto",
            "guardar_archivo_proyecto_como",
            "guardar_archivo_proyecto",
            "cerrar_archivo_proyecto",
            "cerrar_presentador",
            "agente_consulta",
            "agente_cancelar",
        ]),
    ))
    .expect("failed to build desktop application");
}
