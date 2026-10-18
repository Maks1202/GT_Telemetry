"""Local HTTP and WebSocket. Pushes the latest snapshot about 10 times a second."""

import asyncio
import time
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from gt_telemetry.state.snapshot import SnapshotStore
from gt_telemetry.tracks import TrackLatest, TrackRejected, TrackSaveResult, TrackStore

PUSH_INTERVAL_SECONDS = 0.1
PAGE_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
)


def create_app(store: SnapshotStore, *, database: Path | None = None) -> FastAPI:
    tracks = TrackStore(database)
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
