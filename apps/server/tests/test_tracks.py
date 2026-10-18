"""Track edge saves in a temporary SQLite file. No PlayStation required."""

import asyncio
import json
import math
from pathlib import Path

from gt_telemetry.api.app import create_app
from gt_telemetry.state.snapshot import SnapshotStore
from gt_telemetry.tracks import TrackRejected, TrackStore, default_database_path


def _invoke(app: object, method: str, path: str, payload: object | None = None) -> tuple[int, object]:
    body = b"" if payload is None else json.dumps(payload).encode()
    status = {"code": 0}
    chunks: list[bytes] = []

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message: dict[str, object]) -> None:
        kind = message["type"]
        if kind == "http.response.start":
            status["code"] = int(message["status"])
        elif kind == "http.response.body":
            chunk = message.get("body", b"")
            if isinstance(chunk, bytes) and chunk:
                chunks.append(chunk)

    scope = {
        "type": "http",
        "asgi": {"spec_version": "2.3", "version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [
            (b"host", b"127.0.0.1:8787"),
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
        ],
        "client": ("127.0.0.1", 5000),
        "server": ("127.0.0.1", 8787),
    }
    asyncio.run(app(scope, receive, send))
    raw = b"".join(chunks)
    return status["code"], json.loads(raw) if raw else None


def test_database_lives_in_repository_data() -> None:
    repo = Path(__file__).resolve().parents[3]
    assert default_database_path() == repo / "data" / "telemetry.sqlite"


def test_reject_empty_name(tmp_path: Path) -> None:
    app = create_app(SnapshotStore(), database=tmp_path / "telemetry.sqlite")
    status, _body = _invoke(
        app,
        "POST",
        "/api/track",
        {"name": "   ", "edge": "inner", "points": [{"x": 1, "y": 2, "z": 3}]},
    )
    assert status == 400
    status, _body = _invoke(
        app,
        "POST",
        "/api/track",
        {"name": "a" * 81, "edge": "outer", "points": [{"x": 1, "y": 2, "z": 3}]},
    )
    assert status == 400
    status, _body = _invoke(app, "GET", "/api/track/latest")
    assert status == 404
    store = TrackStore(tmp_path / "telemetry.sqlite")
    try:
        store.save_request(
            {
                "name": "Spa",
                "edge": "inner",
                "points": [{"x": math.nan, "y": 0.0, "z": 1.0}],
            }
        )
    except TrackRejected:
        return
    raise AssertionError("non-finite coordinate was stored")


def test_replace_edge(tmp_path: Path) -> None:
    app = create_app(SnapshotStore(), database=tmp_path / "telemetry.sqlite")
    status, _body = _invoke(
        app,
        "POST",
        "/api/track",
        {
            "name": "Spa",
            "edge": "inner",
            "points": [
                {"x": 1.0, "y": 2.0, "z": 3.0},
                {"x": 4.0, "y": 5.0, "z": 6.0},
            ],
        },
    )
    assert status == 200
    status, _body = _invoke(
        app,
        "POST",
        "/api/track",
        {"name": "Spa", "edge": "outer", "points": [{"x": 7.0, "y": 8.0, "z": 9.0}]},
    )
    assert status == 200
    status, _body = _invoke(
        app,
        "POST",
        "/api/track",
        {"name": "Old", "edge": "inner", "points": [{"x": 0.0, "y": 0.0, "z": 0.0}]},
    )
    assert status == 200
    status, latest = _invoke(app, "GET", "/api/track/latest")
    assert status == 200
    assert isinstance(latest, dict)
    assert latest["name"] == "Old"
    status, saved = _invoke(
        app,
        "POST",
        "/api/track",
        {
            "name": "Spa",
            "edge": "inner",
            "points": [{"x": 10.5, "y": 11.25, "z": -12.5}],
        },
    )
    assert status == 200
    assert saved == {"name": "Spa", "count": 1}
    status, latest = _invoke(app, "GET", "/api/track/latest")
    assert status == 200
    assert latest == {
        "name": "Spa",
        "inner": [{"x": 10.5, "y": 11.25, "z": -12.5}],
        "outer": [{"x": 7.0, "y": 8.0, "z": 9.0}],
    }


def test_round_trip_xyz(tmp_path: Path) -> None:
    app = create_app(SnapshotStore(), database=tmp_path / "telemetry.sqlite")
    status, saved = _invoke(
        app,
        "POST",
        "/api/track",
        {
            "name": "  Trial  ",
            "edge": "outer",
            "points": [
                {"x": 120.5, "y": 4.25, "z": -88.0},
                {"x": 0.0, "y": -1.5, "z": 3.0},
            ],
        },
    )
    assert status == 200
    assert saved == {"name": "Trial", "count": 2}
    status, latest = _invoke(app, "GET", "/api/track/latest")
    assert status == 200
    assert latest == {
        "name": "Trial",
        "inner": [],
        "outer": [
            {"x": 120.5, "y": 4.25, "z": -88.0},
            {"x": 0.0, "y": -1.5, "z": 3.0},
        ],
    }
