//! Bounded HTTP transport for a model endpoint explicitly chosen by the user.
use reqwest::header::{HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use reqwest::redirect::Policy;
use reqwest::{Client, Url};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tokio::task::AbortHandle;

const MAX_REQUEST: usize = 2 * 1024 * 1024;
const MAX_RESPONSE: u64 = 2 * 1024 * 1024;

/// Tracks user-started requests so cancelling can abort the actual network
/// task, even if cancellation reaches Tauri before registration completes.
#[derive(Default)]
pub struct AgentRequests(Mutex<HashMap<String, (Option<AbortHandle>, Instant)>>);

impl AgentRequests {
    fn valid_id(id: &str) -> bool {
        !id.is_empty()
            && id.len() <= 80
            && id
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
    }

    pub fn start(&self, id: &str, handle: AbortHandle) -> Result<(), String> {
        if !Self::valid_id(id) {
            handle.abort();
            return Err("Identificador de consulta no válido.".into());
        }
        let mut entries = self
            .0
            .lock()
            .map_err(|_| "No se pudo iniciar la consulta.")?;
        entries.retain(|_, (running, at)| {
            running.is_some() || at.elapsed() < Duration::from_secs(180)
        });
        if let Some((previous, _)) = entries.get(id) {
            handle.abort();
            if previous.is_none() {
                entries.remove(id);
                return Err("Solicitud cancelada.".into());
            }
            return Err("Ya existe una consulta con este identificador.".into());
        }
        if entries.values().any(|(running, _)| running.is_some()) {
            handle.abort();
            return Err("Ya hay una consulta al modelo en curso.".into());
        }
        if entries.len() >= 64 {
            handle.abort();
            return Err("Hay demasiadas consultas pendientes.".into());
        }
        entries.insert(id.to_owned(), (Some(handle), Instant::now()));
        Ok(())
    }

    pub fn cancel(&self, id: &str) -> Result<(), String> {
        if !Self::valid_id(id) {
            return Err("Identificador de consulta no válido.".into());
        }
        let mut entries = self
            .0
            .lock()
            .map_err(|_| "No se pudo cancelar la consulta.")?;
        entries.retain(|_, (running, at)| {
            running.is_some() || at.elapsed() < Duration::from_secs(180)
        });
        if let Some((Some(handle), _)) = entries.remove(id) {
            handle.abort();
        } else if entries.len() < 64 {
            entries.insert(id.to_owned(), (None, Instant::now()));
        }
        Ok(())
    }

    pub fn finish(&self, id: &str) {
        if let Ok(mut entries) = self.0.lock() {
            entries.remove(id);
        }
    }
}

/// Accept only the HTTPS endpoint explicitly configured by the person.
/// Credentials are never permitted in the URL, and fragments are not sent.
pub fn agent_endpoint(value: &str) -> Result<Url, String> {
    if value.len() > 2048 {
        return Err("La dirección del proveedor es demasiado larga.".into());
    }
    let url = Url::parse(value.trim()).map_err(|_| "La dirección del proveedor no es válida.")?;
    if !url.username().is_empty() || url.password().is_some() || url.fragment().is_some() {
        return Err("La dirección no puede contener credenciales ni fragmentos.".into());
    }
    if url.host().is_none() || url.scheme() != "https" {
        return Err("Usa una dirección HTTPS de tu proveedor de IA.".into());
    }
    Ok(url)
}

/// Send JSON to an explicit Chat Completions endpoint. Keys and provider
/// responses are not logged, redirects are not followed, and response size is
/// bounded even if the server omits or falsifies Content-Length.
pub async fn request_agent_chat(
    endpoint: &str,
    key: Option<&str>,
    body: &str,
) -> Result<String, String> {
    let url = agent_endpoint(endpoint)?;
    request_agent_chat_inner(url, key, body).await
}

async fn request_agent_chat_inner(
    url: Url,
    key: Option<&str>,
    body: &str,
) -> Result<String, String> {
    if body.len() > MAX_REQUEST {
        return Err("La solicitud al modelo supera el tamaño permitido.".into());
    }
    let json: serde_json::Value =
        serde_json::from_str(body).map_err(|_| "La solicitud al modelo no es JSON válido.")?;
    if !json.is_object() {
        return Err("La solicitud al modelo debe ser un objeto JSON.".into());
    }
    let auth = if let Some(secret) = key.filter(|v| !v.is_empty()) {
        if secret.len() > 4096 {
            return Err("La clave del proveedor es demasiado larga.".into());
        }
        Some(
            HeaderValue::from_str(&format!("Bearer {secret}"))
                .map_err(|_| "La clave del proveedor contiene caracteres no válidos.")?,
        )
    } else {
        None
    };
    let client = Client::builder()
        .redirect(Policy::none())
        .connect_timeout(Duration::from_secs(8))
        .timeout(Duration::from_secs(120))
        .no_proxy()
        .build()
        .map_err(|_| "No se pudo iniciar la conexión con el proveedor.")?;
    let mut request = client
        .post(url)
        .header(CONTENT_TYPE, "application/json")
        .header(ACCEPT, "application/json")
        .body(body.to_owned());
    if let Some(value) = auth {
        request = request.header(AUTHORIZATION, value);
    }
    let mut response = request.send().await.map_err(|error| {
        if error.is_timeout() {
            "El proveedor tardó demasiado en responder."
        } else {
            "No se pudo conectar con el proveedor. Comprueba la dirección y que esté disponible."
        }
        .to_string()
    })?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!(
            "El proveedor respondió con HTTP {}.",
            status.as_u16()
        ));
    }
    if response.content_length().is_some_and(|n| n > MAX_RESPONSE) {
        return Err("La respuesta del proveedor supera el tamaño permitido.".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "No se pudo leer la respuesta del proveedor.")?
    {
        if bytes.len() as u64 + chunk.len() as u64 > MAX_RESPONSE {
            return Err("La respuesta del proveedor supera el tamaño permitido.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let text =
        String::from_utf8(bytes).map_err(|_| "La respuesta del proveedor no es texto válido.")?;
    serde_json::from_str::<serde_json::Value>(&text)
        .map_err(|_| "El proveedor no devolvió JSON válido.")?;
    Ok(text)
}

#[cfg(test)]
mod tests;
