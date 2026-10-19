"""Append each accepted sample to the open lap file. The file is not read back."""

import json
import math
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from gt_telemetry.protocol.pedals import PedalSample
from gt_telemetry.tracks import TrackStore, default_database_path

UNKNOWN_TRACK = "неизвестно"
ALLOWED_PAGE_SIZES = (20, 50, 100)
MAX_LAP_SAMPLES = 30000


class LapListItem(TypedDict):
    id: int
    lapNumber: int
    lapTimeMs: int
    trackName: str
    finishedAt: str


class LapListPage(TypedDict):
    total: int
    offset: int
    limit: int
    laps: list[LapListItem]


class LapSample(TypedDict, total=False):
    throttle: float
    brake: float
    speedMps: float
    rpm: float
    gear: int
    x: float
    y: float
    z: float


class LapDetail(TypedDict):
    id: int
    lapNumber: int
    lapTimeMs: int
    trackName: str
    finishedAt: str
    samples: list[LapSample]


class LapRecorder:
    """One open lap file. A finished lap is one database row, not a sample list."""

    def __init__(
        self,
        path: Path | None = None,
        directory: Path | None = None,
        tracks: TrackStore | None = None,
    ) -> None:
        self.path = default_database_path() if path is None else path
        self.directory = self.path.parent / "laps" if directory is None else directory
        self._tracks = tracks if tracks is not None else TrackStore(self.path)
        self._lock = threading.Lock()
        self._armed = False
        self._session_track_name: str | None = None
        self._lap_number: int | None = None
        self._file: Path | None = None
        self._seq = 0
        self._last_x: float | None = None
        self._last_z: float | None = None

    def start(self) -> None:
        with self._lock:
            self._armed = True

    def stop(self) -> None:
        with self._lock:
            self._armed = False
            self._discard()

    def armed(self) -> bool:
        with self._lock:
            return self._armed

    def session_track_name(self) -> str | None:
        with self._lock:
            return self._session_track_name

    def set_session_track_name(self, track_name: str | None) -> None:
        """Pinned override for finished laps. None clears. Unknown names raise ValueError."""
        with self._lock:
            if track_name is None:
                self._session_track_name = None
                return
            known = {item["name"] for item in self._tracks.list_tracks()}
            if track_name not in known:
                raise ValueError("track")
            self._session_track_name = track_name

    def record(self, sample: PedalSample) -> None:
        with self._lock:
            if not self._armed:
                return
            if self._lap_number is not None and sample.lap > self._lap_number:
                if sample.last_lap_ms > 0:
                    self._finish(sample.last_lap_ms)
                else:
                    self._discard()
            if self._file is None or self._lap_number != sample.lap:
                self._open(sample.lap)
            self._append(sample)

    def best_lap_ms(self) -> int | None:
        """Minimum saved lap time, or None when no lap has been stored."""
        with self._lock:
            connection = self._connect()
            try:
                row = connection.execute(
                    "SELECT MIN(lap_time_ms) AS best FROM laps"
                ).fetchone()
            finally:
                connection.close()
            if row is None or row["best"] is None:
                return None
            return int(row["best"])

    def get_lap(self, lap_id: int) -> LapDetail | None:
        """One finished lap with samples from its jsonl file, or None when missing."""
        with self._lock:
            connection = self._connect()
            try:
                row = connection.execute(
                    """
                    SELECT id, lap_number, lap_time_ms, track_name, finished_at, jsonl_path
                    FROM laps
                    WHERE id = ?
                    """,
                    (lap_id,),
                ).fetchone()
                if row is None:
                    return None
                return {
                    "id": int(row["id"]),
                    "lapNumber": int(row["lap_number"]),
                    "lapTimeMs": int(row["lap_time_ms"]),
                    "trackName": str(row["track_name"]),
                    "finishedAt": str(row["finished_at"]),
                    "samples": _samples_from_jsonl(Path(row["jsonl_path"])),
                }
            finally:
                connection.close()

    def list_laps(self, offset: int = 0, limit: int = 20) -> LapListPage:
        """Newest finished laps first. May fill неизвестно from the jsonl last point."""
        with self._lock:
            connection = self._connect()
            try:
                total = int(
                    connection.execute("SELECT COUNT(*) AS n FROM laps").fetchone()["n"]
                )
                rows = connection.execute(
                    """
                    SELECT id, lap_number, lap_time_ms, track_name, finished_at, jsonl_path
                    FROM laps
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                    """,
                    (limit, offset),
                ).fetchall()
                laps: list[LapListItem] = []
                for row in rows:
                    track_name = str(row["track_name"])
                    if track_name == UNKNOWN_TRACK:
                        point = _last_xz_from_jsonl(Path(row["jsonl_path"]))
                        if point is not None:
                            matched = self._tracks.match_track(point[0], point[1])
                            if matched is not None:
                                track_name = matched["name"]
                                connection.execute(
                                    "UPDATE laps SET track_name = ? WHERE id = ?",
                                    (track_name, int(row["id"])),
                                )
                    laps.append(
                        {
                            "id": int(row["id"]),
                            "lapNumber": int(row["lap_number"]),
                            "lapTimeMs": int(row["lap_time_ms"]),
                            "trackName": track_name,
                            "finishedAt": str(row["finished_at"]),
                        }
                    )
                connection.commit()
                return {
                    "total": total,
                    "offset": offset,
                    "limit": limit,
                    "laps": laps,
                }
            finally:
                connection.close()

    def _open(self, lap: int) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        self._lap_number = lap
        self._seq += 1
        self._file = self.directory / f"{lap}-{self._seq}-{time.time_ns()}.jsonl"
        self._last_x = None
        self._last_z = None

    def _append(self, sample: PedalSample) -> None:
        path = self._file
        if path is None:
            return
        self._last_x = sample.position_x
        self._last_z = sample.position_z
        line = {
            "packetId": sample.packet_id,
            "throttle": sample.throttle,
            "brake": sample.brake,
            "speedMps": sample.speed_mps,
            "rpm": sample.rpm,
            "gear": sample.gear,
            "x": sample.position_x,
            "y": sample.position_y,
            "z": sample.position_z,
        }
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(line) + "\n")

    def _finish(self, lap_time_ms: int) -> None:
        path = self._file
        lap_number = self._lap_number
        if path is None or lap_number is None:
            return
        if self._session_track_name is not None:
            track_name = self._session_track_name
        else:
            track_name = UNKNOWN_TRACK
            if self._last_x is not None and self._last_z is not None:
                matched = self._tracks.match_track(self._last_x, self._last_z)
                if matched is not None:
                    track_name = matched["name"]
        finished_at = datetime.now(timezone.utc).isoformat()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                INSERT INTO laps (
                    lap_number, lap_time_ms, track_name, jsonl_path, finished_at
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (lap_number, lap_time_ms, track_name, str(path), finished_at),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        self._file = None
        self._lap_number = None
        self._last_x = None
        self._last_z = None

    def _discard(self) -> None:
        path = self._file
        self._file = None
        self._lap_number = None
        self._last_x = None
        self._last_z = None
        if path is not None:
            path.unlink(missing_ok=True)

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS laps (
                id INTEGER PRIMARY KEY,
                lap_number INTEGER NOT NULL,
                lap_time_ms INTEGER NOT NULL,
                track_name TEXT NOT NULL DEFAULT 'неизвестно',
                jsonl_path TEXT NOT NULL,
                finished_at TEXT NOT NULL
            )
            """
        )
        columns = {
            str(row["name"])
            for row in connection.execute("PRAGMA table_info(laps)").fetchall()
        }
        if "track_name" not in columns:
            connection.execute(
                """
                ALTER TABLE laps
                ADD COLUMN track_name TEXT NOT NULL DEFAULT 'неизвестно'
                """
            )
        return connection


def _finite_number(value: object) -> float | None:
    if (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    ):
        return float(value)
    return None


def _sample_from_line(line: object) -> LapSample | None:
    if not isinstance(line, dict):
        return None
    x = _finite_number(line.get("x"))
    z = _finite_number(line.get("z"))
    if x is None or z is None:
        return None
    sample: LapSample = {"x": x, "z": z}
    throttle = _finite_number(line.get("throttle"))
    if throttle is not None:
        sample["throttle"] = throttle
    brake = _finite_number(line.get("brake"))
    if brake is not None:
        sample["brake"] = brake
    speed = _finite_number(line.get("speedMps"))
    if speed is not None:
        sample["speedMps"] = speed
    rpm = _finite_number(line.get("rpm"))
    if rpm is not None:
        sample["rpm"] = rpm
    y = _finite_number(line.get("y"))
    if y is not None:
        sample["y"] = y
    gear = line.get("gear")
    if isinstance(gear, int) and not isinstance(gear, bool):
        sample["gear"] = gear
    elif isinstance(gear, float) and math.isfinite(gear) and gear == int(gear):
        sample["gear"] = int(gear)
    return sample


def _stride_samples(samples: list[LapSample], max_count: int) -> list[LapSample]:
    if len(samples) <= max_count:
        return samples
    sampled: list[LapSample] = []
    last_index = len(samples) - 1
    last_slot = max_count - 1
    for slot in range(max_count):
        index = round((slot * last_index) / last_slot)
        sampled.append(samples[index])
    return sampled


def _samples_from_jsonl(path: Path) -> list[LapSample]:
    if not path.is_file():
        return []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    samples: list[LapSample] = []
    for raw in lines:
        if not raw.strip():
            continue
        try:
            line = json.loads(raw)
        except json.JSONDecodeError:
            continue
        sample = _sample_from_line(line)
        if sample is not None:
            samples.append(sample)
    return _stride_samples(samples, MAX_LAP_SAMPLES)


def _last_xz_from_jsonl(path: Path) -> tuple[float, float] | None:
    if not path.is_file():
        return None
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    for raw in reversed(lines):
        if not raw.strip():
            continue
        try:
            line = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(line, dict):
            continue
        x = line.get("x")
        z = line.get("z")
        if (
            isinstance(x, (int, float))
            and isinstance(z, (int, float))
            and not isinstance(x, bool)
            and not isinstance(z, bool)
            and math.isfinite(x)
            and math.isfinite(z)
        ):
            return float(x), float(z)
    return None
