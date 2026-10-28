use erlen_slides_core::AgentRequests;
use std::future::pending;

#[tokio::test]
async fn cancel_stops_the_in_flight_request() {
    let requests = AgentRequests::default();
    let task = tokio::spawn(async { pending::<()>().await });
    requests.start("request-1", task.abort_handle()).unwrap();
    requests.cancel("request-1").unwrap();
    assert!(task.await.unwrap_err().is_cancelled());
}

#[tokio::test]
async fn cancellation_before_registration_stops_the_request() {
    let requests = AgentRequests::default();
    requests.cancel("request-2").unwrap();
    let task = tokio::spawn(async { pending::<()>().await });
    assert!(requests.start("request-2", task.abort_handle()).is_err());
    assert!(task.await.unwrap_err().is_cancelled());
}

#[tokio::test]
async fn a_second_request_cannot_run_while_the_first_is_active() {
    let requests = AgentRequests::default();
    let first = tokio::spawn(async { pending::<()>().await });
    requests
        .start("request-first", first.abort_handle())
        .unwrap();
    let second = tokio::spawn(async { pending::<()>().await });
    assert!(requests
        .start("request-second", second.abort_handle())
        .is_err());
    assert!(second.await.unwrap_err().is_cancelled());
    requests.cancel("request-first").unwrap();
    assert!(first.await.unwrap_err().is_cancelled());
}
