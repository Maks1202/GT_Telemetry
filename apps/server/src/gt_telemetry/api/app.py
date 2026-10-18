"""Local HTTP and WebSocket. Pushes the latest snapshot about 10 times a second."""

import asyncio
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from gt_telemetry.state.snapshot import SnapshotStore

PUSH_INTERVAL_SECONDS = 0.1


def create_app(store: SnapshotStore) -> FastAPI:
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

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
