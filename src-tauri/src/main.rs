#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path;
use tauri::webview::NewWindowResponse;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

/// Only the native dialog chooses the destination; the webview never supplies a path.
#[tauri::command]
async fn guardar_proyecto(
    app: tauri::AppHandle,
    gate: tauri::State<'_, erlen_slides_core::SaveGate>,
    nombre: String,
    contenido: String,
) -> Result<Option<String>, String> {
    let guard = gate
        .try_enter()
        .ok_or("Ya hay una operación de guardado abierta")?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let sugerido = Path::new(&nombre)
            .file_name()
            .and_then(|name| name.to_str())
            .filter(|name| !name.is_empty())
            .unwrap_or("presentacion.json");
        let Some(selected) = app
            .dialog()
            .file()
            .add_filter("Proyecto de Tabula", &["json"])
            .set_file_name(sugerido)
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let path = selected.into_path().map_err(|error| error.to_string())?;
        erlen_slides_core::save_project(&path, &contenido).map_err(|error| error.to_string())?;
        Ok(Some(
            path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("proyecto.json")
                .to_owned(),
        ))
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Close the whole native window, not only its WebView on Linux.
#[tauri::command]
fn cerrar_presentador(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("presentador") {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Connect only to the provider explicitly configured in the chat. The core
/// validates the destination, limits both bodies and never follows redirects.
#[tauri::command]
async fn agente_consulta(
    solicitudes: tauri::State<'_, erlen_slides_core::AgentRequests>,
    solicitud: String,
    url: String,
    clave: String,
    cuerpo: String,
) -> Result<String, String> {
    // Register before allowing any HTTP work to begin. A cancellation that
    // arrives first, or a rejected second request, must not reach a provider.
    let (inicio, mut espera) = tauri::async_runtime::channel::<()>(1);
    let tarea = tauri::async_runtime::spawn(async move {
        espera
            .recv()
            .await
            .ok_or_else(|| "Solicitud cancelada.".to_owned())?;
        erlen_slides_core::request_agent_chat(
            &url,
            (!clave.is_empty()).then_some(clave.as_str()),
            &cuerpo,
        )
        .await
    });
    if let Err(error) = solicitudes.start(&solicitud, tarea.inner().abort_handle()) {
        tarea.abort();
        return Err(error);
    }
    let _ = inicio.try_send(());
    let resultado = tarea.await;
    solicitudes.finish(&solicitud);
    resultado.map_err(|_| "Solicitud cancelada.".to_owned())?
}

#[tauri::command]
fn agente_cancelar(
    solicitudes: tauri::State<'_, erlen_slides_core::AgentRequests>,
    solicitud: String,
) -> Result<(), String> {
    solicitudes.cancel(&solicitud)
}

fn main() {
    tauri::Builder::default()
        .manage(erlen_slides_core::SaveGate::default())
        .manage(erlen_slides_core::AgentRequests::default())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let config = &app.config().app.windows[0];
            tauri::WebviewWindowBuilder::from_config(app, config)?
                .on_new_window(move |url, features| {
                    if url.as_str() == "about:blank" {
                        // The presenter uses window.open and writes its document directly.
                        // A related WebView preserves that same-origin relationship on Linux.
                        let window = tauri::WebviewWindowBuilder::new(
                            &app_handle,
                            "presentador",
                            tauri::WebviewUrl::External(url),
                        )
                        .window_features(features)
                        .inner_size(1180.0, 780.0)
                        .title("Tabula · presentador")
                        .on_navigation(|destination| destination.scheme() == "about")
                        .on_new_window(|_, _| NewWindowResponse::Deny)
                        .build();
                        return match window {
                            Ok(window) => NewWindowResponse::Create { window },
                            Err(error) => {
                                eprintln!("No se pudo abrir la ventana del presentador: {error}");
                                NewWindowResponse::Deny
                            }
                        };
                    }
                    // Do not load remote websites in an application WebView.
                    // Linux desktop environments use xdg-open for the user's browser.
                    if matches!(url.scheme(), "https" | "http") {
                        if let Err(error) = std::process::Command::new("xdg-open")
                            .arg(url.as_str())
                            .spawn()
                        {
                            eprintln!("No se pudo abrir el enlace externo: {error}");
                        }
                    }
                    NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            guardar_proyecto,
            cerrar_presentador,
            agente_consulta,
            agente_cancelar
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Tabula");
}
