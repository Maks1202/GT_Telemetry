"""Latest live snapshot. Older than 1 second is not live."""

import math
import threading
from collections.abc import Callable
from typing import TypedDict

from gt_telemetry.protocol.cars import lookup_car_name

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
    positionX: float | None
    positionY: float | None
    positionZ: float | None
    rotationX: float | None
    rotationY: float | None
    rotationZ: float | None
    rotationW: float | None
    carCode: int | None
    carName: str | None
    bestLapMs: int | None


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
        "positionX": None,
        "positionY": None,
        "positionZ": None,
        "rotationX": None,
        "rotationY": None,
        "rotationZ": None,
        "rotationW": None,
        "carCode": None,
        "carName": None,
        "bestLapMs": None,
    }


def _finite_or_none(value: float | None) -> float | None:
    """JSON must not contain NaN or Infinity."""
    if value is None or not math.isfinite(value):
        return None
    return value


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
    position_x: float | None = None,
    position_y: float | None = None,
    position_z: float | None = None,
    rotation_x: float | None = None,
    rotation_y: float | None = None,
    rotation_z: float | None = None,
    rotation_w: float | None = None,
    car_code: int | None = None,
    best_lap_ms: int | None = None,
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
        "positionX": _finite_or_none(position_x),
        "positionY": _finite_or_none(position_y),
        "positionZ": _finite_or_none(position_z),
        "rotationX": _finite_or_none(rotation_x),
        "rotationY": _finite_or_none(rotation_y),
        "rotationZ": _finite_or_none(rotation_z),
        "rotationW": _finite_or_none(rotation_w),
        "carCode": car_code,
        "carName": lookup_car_name(car_code),
        "bestLapMs": best_lap_ms,
    }


class SnapshotStore:
    """One slot. Readers always see the latest accepted sample, never a queue."""

    def __init__(self, best_lap_ms: Callable[[], int | None] | None = None) -> None:
        self._best_lap_ms = best_lap_ms
        self._lock = threading.Lock()
        self._throttle: float | None = None
        self._brake: float | None = None
        self._speed_mps: float | None = None
        self._rpm: float | None = None
        self._gear: int | None = None
        self._lap: int | None = None
        self._last_lap_ms: int | None = None
        self._position_x: float | None = None
        self._position_y: float | None = None
        self._position_z: float | None = None
        self._rotation_x: float | None = None
        self._rotation_y: float | None = None
        self._rotation_z: float | None = None
        self._rotation_w: float | None = None
        self._car_code: int | None = None
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
        position_x: float,
        position_y: float,
        position_z: float,
        rotation_x: float,
        rotation_y: float,
        rotation_z: float,
        rotation_w: float,
        car_code: int | None,
    ) -> None:
        with self._lock:
            self._throttle = throttle
            self._brake = brake
            self._speed_mps = speed_mps
            self._rpm = rpm
            self._gear = gear
            self._lap = lap
            self._last_lap_ms = last_lap_ms
            self._position_x = position_x
            self._position_y = position_y
            self._position_z = position_z
            self._rotation_x = rotation_x
            self._rotation_y = rotation_y
            self._rotation_z = rotation_z
            self._rotation_w = rotation_w
            self._car_code = car_code
            self._received_at = received_at

    def view(self, now: float) -> LiveView:
        with self._lock:
            view = project_snapshot(
                self._throttle,
                self._brake,
                self._received_at,
                now,
                speed_mps=self._speed_mps,
                rpm=self._rpm,
                gear=self._gear,
                lap=self._lap,
                last_lap_ms=self._last_lap_ms,
                position_x=self._position_x,
                position_y=self._position_y,
                position_z=self._position_z,
                rotation_x=self._rotation_x,
                rotation_y=self._rotation_y,
                rotation_z=self._rotation_z,
                rotation_w=self._rotation_w,
                car_code=self._car_code,
            )
            connected = view["connected"]
        if connected and self._best_lap_ms is not None:
            view["bestLapMs"] = self._best_lap_ms()
        return view
