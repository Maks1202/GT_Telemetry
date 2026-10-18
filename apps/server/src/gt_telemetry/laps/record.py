"""Append each accepted sample to the open lap file. The file is not read back."""

import json
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from gt_telemetry.protocol.pedals import PedalSample
from gt_telemetry.tracks import default_database_path


class LapRecorder:
    """One open lap file. A finished lap is one database row, not a sample list."""

    def __init__(self, path: Path | None = None, directory: Path | None = None) -> None:
        self.path = default_database_path() if path is None else path
        self.directory = self.path.parent / "laps" if directory is None else directory
        self._lock = threading.Lock()
        self._lap_number: int | None = None
        self._file: Path | None = None
        self._seq = 0

    def record(self, sample: PedalSample) -> None:
        with self._lock:
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

    def _open(self, lap: int) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        self._lap_number = lap
        self._seq += 1
        self._file = self.directory / f"{lap}-{self._seq}-{time.time_ns()}.jsonl"

    def _append(self, sample: PedalSample) -> None:
        path = self._file
        if path is None:
            return
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
        finished_at = datetime.now(timezone.utc).isoformat()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                """
                INSERT INTO laps (lap_number, lap_time_ms, jsonl_path, finished_at)
                VALUES (?, ?, ?, ?)
                """,
                (lap_number, lap_time_ms, str(path), finished_at),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        self._file = None
        self._lap_number = None

    def _discard(self) -> None:
        path = self._file
        self._file = None
        self._lap_number = None
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
                jsonl_path TEXT NOT NULL,
                finished_at TEXT NOT NULL
            )
            """
        )
        return connection
