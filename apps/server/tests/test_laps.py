"""Finished laps in a temporary directory. No PlayStation required."""

import json
import sqlite3
from pathlib import Path

from gt_telemetry.laps.record import LapRecorder
from gt_telemetry.protocol.pedals import PedalSample
from gt_telemetry.state.snapshot import SnapshotStore
from gt_telemetry.tracks import default_database_path


def _sample(
    *,
    packet_id: int = 1,
    throttle: float = 61.0,
    brake: float = 0.0,
    speed_mps: float = 30.0,
    rpm: float = 7000.0,
    gear: int = 4,
    lap: int = 1,
    last_lap_ms: int = 0,
    position_x: float = 1.0,
    position_y: float = 19.5,
    position_z: float = -3.0,
) -> PedalSample:
    return PedalSample(
        packet_id=packet_id,
        throttle=throttle,
        brake=brake,
        speed_mps=speed_mps,
        rpm=rpm,
        gear=gear,
        lap=lap,
        last_lap_ms=last_lap_ms,
        position_x=position_x,
        position_y=position_y,
        position_z=position_z,
        rotation_x=0.0,
        rotation_y=0.0,
        rotation_z=0.0,
        rotation_w=1.0,
        car_code=None,
    )


def _rows(database: Path) -> list[sqlite3.Row]:
    connection = sqlite3.connect(database)
    connection.row_factory = sqlite3.Row
    try:
        return list(connection.execute("SELECT * FROM laps ORDER BY id"))
    finally:
        connection.close()


def test_default_files_live_beside_the_track_database() -> None:
    recorder = LapRecorder()
    assert recorder.path == default_database_path()
    assert recorder.directory == default_database_path().parent / "laps"


def test_finish_lap_stores_one_row_and_the_sample_line(tmp_path: Path) -> None:
    database = tmp_path / "telemetry.sqlite"
    recorder = LapRecorder(database)
    first = _sample(packet_id=11, throttle=61.0, position_y=19.5, lap=1, last_lap_ms=0)
    second = _sample(
        packet_id=12,
        throttle=4.0,
        position_y=1.0,
        lap=2,
        last_lap_ms=90000,
    )
    recorder.record(first)
    recorder.record(second)

    rows = _rows(database)
    assert len(rows) == 1
    assert rows[0]["lap_number"] == 1
    assert rows[0]["lap_time_ms"] == 90000
    line = json.loads(Path(rows[0]["jsonl_path"]).read_text(encoding="utf-8").splitlines()[0])
    assert line["throttle"] == 61.0
    assert line["y"] == 19.5
    assert line["packetId"] == 11

    store = SnapshotStore(best_lap_ms=recorder.best_lap_ms)
    store.accept(
        1.0,
        0.0,
        5.0,
        speed_mps=1.0,
        rpm=1000.0,
        gear=1,
        lap=2,
        last_lap_ms=0,
        position_x=0.0,
        position_y=0.0,
        position_z=0.0,
        rotation_x=0.0,
        rotation_y=0.0,
        rotation_z=0.0,
        rotation_w=1.0,
        car_code=None,
    )
    live = store.view(5.0)
    assert live["connected"] is True
    assert live["lastLapMs"] == 0
    assert live["bestLapMs"] == 90000
    down = store.view(7.0)
    assert down["connected"] is False
    assert down["bestLapMs"] is None


def test_best_lap_is_the_minimum_saved_time(tmp_path: Path) -> None:
    database = tmp_path / "telemetry.sqlite"
    recorder = LapRecorder(database)
    recorder.record(_sample(lap=1, last_lap_ms=0))
    recorder.record(_sample(lap=2, last_lap_ms=90000))
    recorder.record(_sample(lap=3, last_lap_ms=80000))
    recorder.record(_sample(lap=4, last_lap_ms=95000))
    assert recorder.best_lap_ms() == 80000
    times = [row["lap_time_ms"] for row in _rows(database)]
    assert times == [90000, 80000, 95000]


def test_non_positive_last_lap_discards_the_open_file(tmp_path: Path) -> None:
    database = tmp_path / "telemetry.sqlite"
    recorder = LapRecorder(database)
    recorder.record(_sample(packet_id=3, throttle=61.0, lap=1, last_lap_ms=0))
    recorder.record(_sample(packet_id=4, throttle=8.0, lap=2, last_lap_ms=0))
    assert recorder.best_lap_ms() is None
    assert _rows(database) == []
    files = list(recorder.directory.glob("*.jsonl"))
    assert len(files) == 1
    line = json.loads(files[0].read_text(encoding="utf-8").splitlines()[0])
    assert line["packetId"] == 4
    assert line["throttle"] == 8.0


def test_each_accepted_sample_is_appended(tmp_path: Path) -> None:
    database = tmp_path / "telemetry.sqlite"
    recorder = LapRecorder(database)
    recorder.record(_sample(packet_id=1, throttle=10.0, position_y=2.0, lap=1))
    recorder.record(_sample(packet_id=2, throttle=20.0, position_y=3.0, lap=1))
    recorder.record(_sample(packet_id=3, throttle=30.0, lap=2, last_lap_ms=88000))
    rows = _rows(database)
    assert len(rows) == 1
    lines = Path(rows[0]["jsonl_path"]).read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    first = json.loads(lines[0])
    second = json.loads(lines[1])
    assert first["throttle"] == 10.0
    assert first["y"] == 2.0
    assert second["throttle"] == 20.0
    assert second["y"] == 3.0
