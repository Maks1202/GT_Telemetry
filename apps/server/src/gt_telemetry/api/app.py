"""Local HTTP and WebSocket. Pushes the latest snapshot about 10 times a second."""

import asyncio
import time
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from gt_telemetry.laps.record import ALLOWED_PAGE_SIZES, LapListPage, LapRecorder
from gt_telemetry.state.snapshot import SnapshotStore
from gt_telemetry.tracks import TrackLatest, TrackList, TrackRejected, TrackSaveResult, TrackStore

PUSH_INTERVAL_SECONDS = 0.1
PAGE_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
)


def create_app(
    store: SnapshotStore,
    laps: LapRecorder | None = None,
    *,
    database: Path | None = None,
) -> FastAPI:
    tracks = TrackStore(database)
    recorder = laps if laps is not None else LapRecorder(database)
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(PAGE_ORIGINS),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/recording")
    def recording_state() -> dict[str, bool]:
        return {"armed": recorder.armed()}

    @app.post("/api/recording/start")
    def recording_start() -> dict[str, bool]:
        recorder.start()
        return {"armed": True}

    @app.post("/api/recording/stop")
    def recording_stop() -> dict[str, bool]:
        recorder.stop()
        return {"armed": False}

    @app.post("/api/track")
    def save_track(payload: dict = Body()) -> TrackSaveResult:
        try:
            return tracks.save_request(payload)
        except TrackRejected as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/api/track/latest")
    def latest_track() -> TrackLatest:
        latest = tracks.latest()
        if latest is None:
            raise HTTPException(status_code=404, detail="no track")
        return latest

    @app.get("/api/tracks")
    def list_saved_tracks() -> TrackList:
        return {"tracks": tracks.list_tracks()}

    @app.get("/api/laps")
    def list_finished_laps(offset: int = 0, limit: int = 20) -> LapListPage:
        if offset < 0 or limit not in ALLOWED_PAGE_SIZES:
            raise HTTPException(status_code=400, detail="page")
        return recorder.list_laps(offset, limit)

    @app.websocket("/ws")
    async def live_socket(websocket: WebSocket) -> None:
        await websocket.accept()
        try:
            while True:
                await websocket.send_json(store.view(time.monotonic()))
                await asyncio.sleep(PUSH_INTERVAL_SECONDS)
        except WebSocketDisconnect:
            return

    return app
