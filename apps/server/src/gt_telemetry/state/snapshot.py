"""Latest pedal snapshot. Older than 1 second is not live."""

import threading
from typing import TypedDict

FRESH_SECONDS = 1.0


class LiveView(TypedDict):
    connected: bool
    throttle: float | None
    brake: float | None


def project_snapshot(
    throttle: float | None,
    brake: float | None,
    received_at: float | None,
    now: float,
) -> LiveView:
    """Connected only when a packet was accepted at most 1.0 second ago."""
    if received_at is None or now - received_at > FRESH_SECONDS:
        return {"connected": False, "throttle": None, "brake": None}
    return {"connected": True, "throttle": throttle, "brake": brake}


class SnapshotStore:
    """One slot. Readers always see the latest accepted pedals, never a queue."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._throttle: float | None = None
        self._brake: float | None = None
        self._received_at: float | None = None

    def accept(self, throttle: float, brake: float, received_at: float) -> None:
        with self._lock:
            self._throttle = throttle
            self._brake = brake
            self._received_at = received_at

    def view(self, now: float) -> LiveView:
        with self._lock:
            return project_snapshot(
                self._throttle,
                self._brake,
                self._received_at,
                now,
            )
