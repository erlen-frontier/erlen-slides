use erlen_slides_core::SaveGate;
use std::sync::{Arc, Barrier};
use std::thread;

#[test]
fn only_one_save_can_run_at_a_time_and_the_guard_releases_it() {
    let gate = SaveGate::default();
    let guard = gate.try_enter().expect("first save should start");
    let other_gate = gate.clone();
    let barrier = Arc::new(Barrier::new(2));
    let other_barrier = barrier.clone();
    let attempt = thread::spawn(move || {
        other_barrier.wait();
        other_gate.try_enter().is_none()
    });
    barrier.wait();
    assert!(
        attempt.join().unwrap(),
        "a concurrent save must be rejected"
    );
    drop(guard);
    assert!(gate.try_enter().is_some(), "a later save can start");
}
