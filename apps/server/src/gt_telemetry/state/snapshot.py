"""Latest live snapshot. Older than 1 second is not live."""

import threading
from typing import TypedDict

FRESH_SECONDS = 1.0
MPS_TO_KMH = 3.6


class LiveView(TypedDict):
    connected: bool
    throttle: float | None
    brake: float | None
    speedKmh: float | None
    rpm: float | None
    gear: int | None
    lap: int | None
    lastLapMs: int | None


def _disconnected() -> LiveView:
    return {
        "connected": False,
        "throttle": None,
        "brake": None,
        "speedKmh": None,
        "rpm": None,
        "gear": None,
        "lap": None,
        "lastLapMs": None,
    }


def project_snapshot(
    throttle: float | None,
    brake: float | None,
    received_at: float | None,
    now: float,
    *,
    speed_mps: float | None = None,
    rpm: float | None = None,
    gear: int | None = None,
    lap: int | None = None,
    last_lap_ms: int | None = None,
) -> LiveView:
    """Connected only when a packet was accepted at most 1.0 second ago."""
    if received_at is None or now - received_at > FRESH_SECONDS:
        return _disconnected()
    speed_kmh = None if speed_mps is None else speed_mps * MPS_TO_KMH
    return {
        "connected": True,
        "throttle": throttle,
        "brake": brake,
        "speedKmh": speed_kmh,
        "rpm": rpm,
        "gear": gear,
        "lap": lap,
        "lastLapMs": last_lap_ms,
    }


class SnapshotStore:
    """One slot. Readers always see the latest accepted sample, never a queue."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._throttle: float | None = None
        self._brake: float | None = None
        self._speed_mps: float | None = None
        self._rpm: float | None = None
        self._gear: int | None = None
        self._lap: int | None = None
        self._last_lap_ms: int | None = None
        self._received_at: float | None = None

    def accept(
        self,
        throttle: float,
        brake: float,
        received_at: float,
        *,
        speed_mps: float,
        rpm: float,
        gear: int,
        lap: int,
        last_lap_ms: int,
    ) -> None:
        with self._lock:
            self._throttle = throttle
            self._brake = brake
            self._speed_mps = speed_mps
            self._rpm = rpm
            self._gear = gear
            self._lap = lap
            self._last_lap_ms = last_lap_ms
            self._received_at = received_at

    def view(self, now: float) -> LiveView:
        with self._lock:
            return project_snapshot(
                self._throttle,
                self._brake,
                self._received_at,
                now,
                speed_mps=self._speed_mps,
                rpm=self._rpm,
                gear=self._gear,
                lap=self._lap,
                last_lap_ms=self._last_lap_ms,
            )
