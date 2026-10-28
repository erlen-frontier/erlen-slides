use super::{agent_endpoint, request_agent_chat, request_agent_chat_inner, Url};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;

#[test]
fn accepts_only_https_endpoints() {
    assert!(agent_endpoint("https://example.com/v1/chat/completions").is_ok());
    for unsafe_url in [
        "http://example.com/v1/chat/completions",
        "http://127.0.0.1:11434/v1/chat/completions",
        "http://localhost:11434/v1/chat/completions",
        "http://192.168.1.9/v1/chat/completions",
        "file:///etc/passwd",
        "https://usuario:clave@example.com/v1/chat/completions",
        "https://example.com/v1/chat/completions#fragmento",
    ] {
        assert!(agent_endpoint(unsafe_url).is_err(), "{unsafe_url}");
    }
}

#[tokio::test]
async fn sends_json_to_the_provider_and_returns_its_reply() {
    let server = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!(
        "http://{}/v1/chat/completions",
        server.local_addr().unwrap()
    );
    let worker = thread::spawn(move || {
        let (mut socket, _) = server.accept().unwrap();
        socket
            .set_read_timeout(Some(std::time::Duration::from_secs(5)))
            .unwrap();
        let mut request = Vec::new();
        let mut chunk = [0; 4096];
        loop {
            let n = socket.read(&mut chunk).unwrap();
            if n == 0 {
                break;
            }
            request.extend_from_slice(&chunk[..n]);
            let text = String::from_utf8_lossy(&request);
            if let Some(end) = text.find("\r\n\r\n") {
                let length = text[..end]
                    .lines()
                    .find_map(|line| {
                        let (name, value) = line.split_once(':')?;
                        name.eq_ignore_ascii_case("content-length")
                            .then(|| value.trim().parse::<usize>().ok())
                            .flatten()
                    })
                    .unwrap_or(0);
                if request.len() >= end + 4 + length {
                    break;
                }
            }
        }
        let response = r#"{"choices":[{"message":{"role":"assistant","content":"Hola"}}]}"#;
        write!(socket, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", response.len(), response).unwrap();
        String::from_utf8(request).unwrap()
    });
    let request = r#"{"model":"modelo-local","messages":[{"role":"user","content":"Hola"}]}"#;
    let response =
        request_agent_chat_inner(Url::parse(&url).unwrap(), Some("token-de-prueba"), request)
            .await
            .unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&response).unwrap()["choices"][0]["message"]
            ["content"],
        "Hola"
    );
    let sent = worker.join().unwrap();
    assert!(sent
        .to_ascii_lowercase()
        .contains("authorization: bearer token-de-prueba"));
    assert!(sent.contains(request));
}

#[tokio::test]
async fn invalid_payloads_and_keys_are_refused_without_connecting() {
    let url = "https://api.example.invalid/v1/chat/completions";
    assert!(request_agent_chat(url, None, "no es json").await.is_err());
    assert!(request_agent_chat(url, Some("linea\nextra"), "{}")
        .await
        .is_err());
}

#[tokio::test]
async fn redirects_are_not_followed_with_the_user_key() {
    let target = TcpListener::bind("127.0.0.1:0").unwrap();
    let server = TcpListener::bind("127.0.0.1:0").unwrap();
    let redirect = format!("http://{}/otro", target.local_addr().unwrap());
    let url = format!(
        "http://{}/v1/chat/completions",
        server.local_addr().unwrap()
    );
    let worker = thread::spawn(move || {
        let (mut socket, _) = server.accept().unwrap();
        let mut request = [0; 8192];
        let _ = socket.read(&mut request);
        write!(socket, "HTTP/1.1 302 Found\r\nLocation: {redirect}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
    });
    let error = request_agent_chat_inner(Url::parse(&url).unwrap(), Some("clave-de-prueba"), "{}")
        .await
        .unwrap_err();
    worker.join().unwrap();
    target.set_nonblocking(true).unwrap();
    assert!(
        target.accept().is_err(),
        "la clave no debe viajar a la redirección"
    );
    assert!(!error.contains("clave-de-prueba"));
}

#[tokio::test]
async fn rejects_a_response_over_the_limit_even_when_the_server_announces_it() {
    let server = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!(
        "http://{}/v1/chat/completions",
        server.local_addr().unwrap()
    );
    let worker = thread::spawn(move || {
        let (mut socket, _) = server.accept().unwrap();
        let mut request = [0; 8192];
        let _ = socket.read(&mut request);
        write!(
            socket,
            "HTTP/1.1 200 OK\r\nContent-Length: 2097153\r\nConnection: close\r\n\r\n"
        )
        .unwrap();
    });
    let error = request_agent_chat_inner(Url::parse(&url).unwrap(), None, "{}")
        .await
        .unwrap_err();
    worker.join().unwrap();
    assert!(error.contains("tamaño"));
}
