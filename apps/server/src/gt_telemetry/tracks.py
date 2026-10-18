"""Named inner and outer track edges, with height, in SQLite."""

import math
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

MAX_TRACK_POINTS = 20000
MAX_TRACK_NAME = 80
EDGES = ("inner", "outer")


class TrackPointOut(TypedDict):
    x: float
    y: float
    z: float


class TrackSaveResult(TypedDict):
    name: str
    count: int


class TrackLatest(TypedDict):
    name: str
    inner: list[TrackPointOut]
    outer: list[TrackPointOut]


class TrackList(TypedDict):
    tracks: list[TrackLatest]


ON_EDGE_EPS = 1e-6


class TrackRejected(ValueError):
    """The save request does not meet the track contract."""


def default_database_path() -> Path:
    """Repository data/telemetry.sqlite. This file lives in gt_telemetry, so parents[4] is the repo."""
    return Path(__file__).resolve().parents[4] / "data" / "telemetry.sqlite"


def _coordinate(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise TrackRejected("coordinate")
    return float(value)


def _parse_points(raw_points: object) -> list[tuple[float, float, float]]:
    if not isinstance(raw_points, list) or len(raw_points) > MAX_TRACK_POINTS:
        raise TrackRejected("points")
    points: list[tuple[float, float, float]] = []
    for item in raw_points:
        if not isinstance(item, dict):
            raise TrackRejected("point")
        points.append(
            (
                _coordinate(item.get("x")),
                _coordinate(item.get("y")),
                _coordinate(item.get("z")),
            )
        )
    return points


class TrackStore:
    """One SQLite file. Saving an edge replaces that edge and refreshes saved_at."""

    def __init__(self, path: Path | None = None) -> None:
        self.path = default_database_path() if path is None else path
        self._lock = threading.Lock()

    def save_request(self, payload: object) -> TrackSaveResult:
        if not isinstance(payload, dict):
            raise TrackRejected("body")
        name = payload.get("name")
        edge = payload.get("edge")
        if not isinstance(name, str) or not isinstance(edge, str):
            raise TrackRejected("body")
        return self.save(name, edge, _parse_points(payload.get("points")))

    def save(
        self,
        name: str,
        edge: str,
        points: list[tuple[float, float, float]],
    ) -> TrackSaveResult:
        trimmed = name.strip()
        if trimmed == "" or len(trimmed) > MAX_TRACK_NAME:
            raise TrackRejected("name")
        if edge not in EDGES:
            raise TrackRejected("edge")
        if len(points) > MAX_TRACK_POINTS:
            raise TrackRejected("points")
        clean = [(_coordinate(x), _coordinate(y), _coordinate(z)) for x, y, z in points]
        saved_at = datetime.now(timezone.utc).isoformat()
        with self._lock:
            connection = self._connect()
            try:
                connection.execute("BEGIN IMMEDIATE")
                row = connection.execute(
                    "SELECT id FROM tracks WHERE name = ?",
                    (trimmed,),
                ).fetchone()
                if row is None:
                    cursor = connection.execute(
                        "INSERT INTO tracks (name, saved_at) VALUES (?, ?)",
                        (trimmed, saved_at),
                    )
                    track_id = int(cursor.lastrowid)
                else:
                    track_id = int(row["id"])
                    connection.execute(
                        "UPDATE tracks SET saved_at = ? WHERE id = ?",
                        (saved_at, track_id),
                    )
                connection.execute(
                    "DELETE FROM track_points WHERE track_id = ? AND edge = ?",
                    (track_id, edge),
                )
                connection.executemany(
                    """
                    INSERT INTO track_points (track_id, edge, seq, x, y, z)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    [
                        (track_id, edge, seq, x, y, z)
                        for seq, (x, y, z) in enumerate(clean)
                    ],
                )
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                connection.close()
        return {"name": trimmed, "count": len(clean)}

    def latest(self) -> TrackLatest | None:
        with self._lock:
            connection = self._connect()
            try:
                row = connection.execute(
                    """
                    SELECT id, name
                    FROM tracks
                    ORDER BY saved_at DESC, id DESC
                    LIMIT 1
                    """
                ).fetchone()
                if row is None:
                    return None
                return _track_record(connection, row)
            finally:
                connection.close()

    def list_tracks(self) -> list[TrackLatest]:
        with self._lock:
            connection = self._connect()
            try:
                rows = connection.execute(
                    """
                    SELECT id, name
                    FROM tracks
                    ORDER BY name ASC, id ASC
                    """
                ).fetchall()
                return [_track_record(connection, row) for row in rows]
            finally:
                connection.close()

    def match_track(self, x: float, z: float) -> TrackLatest | None:
        if not math.isfinite(x) or not math.isfinite(z):
            return None
        found: TrackLatest | None = None
        for track in self.list_tracks():
            if not _track_contains(track, x, z):
                continue
            if found is not None:
                return None
            found = track
        return found

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                saved_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS track_points (
                track_id INTEGER NOT NULL,
                edge TEXT NOT NULL,
                seq INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                z REAL NOT NULL,
                PRIMARY KEY (track_id, edge, seq),
                CHECK (edge IN ('inner', 'outer'))
            )
            """
        )
        return connection


def _edge_points(
    connection: sqlite3.Connection,
    track_id: int,
    edge: str,
) -> list[TrackPointOut]:
    rows = connection.execute(
        """
        SELECT x, y, z
        FROM track_points
        WHERE track_id = ? AND edge = ?
        ORDER BY seq ASC
        """,
        (track_id, edge),
    ).fetchall()
    return [
        {"x": float(row["x"]), "y": float(row["y"]), "z": float(row["z"])}
        for row in rows
    ]


def _track_record(connection: sqlite3.Connection, row: sqlite3.Row) -> TrackLatest:
    track_id = int(row["id"])
    return {
        "name": str(row["name"]),
        "inner": _edge_points(connection, track_id, "inner"),
        "outer": _edge_points(connection, track_id, "outer"),
    }


def _ring_vertex(track: TrackLatest, index: int) -> tuple[float, float]:
    outer = track["outer"]
    if index < len(outer):
        point = outer[index]
        return point["x"], point["z"]
    inner = track["inner"]
    point = inner[len(inner) - 1 - (index - len(outer))]
    return point["x"], point["z"]


def _on_segment(
    px: float,
    pz: float,
    ax: float,
    az: float,
    bx: float,
    bz: float,
) -> bool:
    along_x = px - ax
    along_z = pz - az
    edge_x = bx - ax
    edge_z = bz - az
    cross = along_x * edge_z - along_z * edge_x
    if abs(cross) > ON_EDGE_EPS:
        return False
    dot = along_x * edge_x + along_z * edge_z
    if dot < 0.0:
        return False
    return dot <= edge_x * edge_x + edge_z * edge_z


def _ray_crosses(
    px: float,
    pz: float,
    ax: float,
    az: float,
    bx: float,
    bz: float,
) -> bool:
    if (az > pz) == (bz > pz):
        return False
    intersection_x = ax + (pz - az) * (bx - ax) / (bz - az)
    return px <= intersection_x


def _track_contains(track: TrackLatest, x: float, z: float) -> bool:
    inner = track["inner"]
    outer = track["outer"]
    if len(inner) < 2 or len(outer) < 2:
        return False
    count = len(outer) + len(inner)
    crossings = 0
    for index in range(count):
        ax, az = _ring_vertex(track, index)
        bx, bz = _ring_vertex(track, (index + 1) % count)
        if _on_segment(x, z, ax, az, bx, bz):
            return True
        if _ray_crosses(x, z, ax, az, bx, bz):
            crossings += 1
    return crossings % 2 == 1
