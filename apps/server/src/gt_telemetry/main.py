"""Process entry. UDP ingest and the local live API."""

import logging
import os

import uvicorn

from gt_telemetry.api.app import create_app
from gt_telemetry.ingest.receiver import UdpIngest, playstation_target
from gt_telemetry.state.snapshot import SnapshotStore

HTTP_HOST = "127.0.0.1"
HTTP_PORT = 8787


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    target = playstation_target(os.environ.get("GT7_PLAYSTATION_IP"))
    store = SnapshotStore()
    ingest = UdpIngest(store, target)
    ingest.start()
    try:
        uvicorn.run(
            create_app(store),
            host=HTTP_HOST,
            port=HTTP_PORT,
            log_level="info",
        )
    finally:
        ingest.stop()


if __name__ == "__main__":
    main()
