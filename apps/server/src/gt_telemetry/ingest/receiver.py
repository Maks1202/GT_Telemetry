"""UDP ingest on its own thread. The web handler never reads this socket."""

import logging
import socket
import threading
import time

from gt_telemetry.protocol.pedals import PacketIdGate, decode_datagram
from gt_telemetry.state.snapshot import SnapshotStore

log = logging.getLogger(__name__)

HEARTBEAT = b"A"
HEARTBEAT_PORT = 33739
BIND_HOST = "0.0.0.0"
BIND_PORT = 33740
RECEIVE_TIMEOUT_SECONDS = 1.0
HEARTBEAT_INTERVAL_SECONDS = 1.0
BROADCAST_IP = "255.255.255.255"


def playstation_target(raw: str | None) -> str | None:
    """Return the console address, or None when it must not be used."""
    if raw is None:
        return None
    text = raw.strip()
    if not text or text == BROADCAST_IP:
        return None
    return text


class UdpIngest:
    def __init__(self, store: SnapshotStore, playstation_ip: str | None) -> None:
        self._store = store
        self._ip = playstation_ip
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._sock: socket.socket | None = None

    def start(self) -> None:
        self._thread = threading.Thread(
            target=self._run,
            name="gt7-udp",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        sock = self._sock
        if sock is not None:
            try:
                sock.close()
            except OSError:
                pass
        if self._thread is not None:
            self._thread.join(timeout=2.0)

    def _send_heartbeat(self, sock: socket.socket) -> None:
        if not self._ip:
            return
        try:
            sock.sendto(HEARTBEAT, (self._ip, HEARTBEAT_PORT))
        except OSError:
            log.warning("heartbeat was not sent")

    def _run(self) -> None:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((BIND_HOST, BIND_PORT))
            sock.settimeout(RECEIVE_TIMEOUT_SECONDS)
            self._sock = sock
            log.info("UDP listening on %s:%s", BIND_HOST, BIND_PORT)
            if self._ip:
                log.info("heartbeat target %s:%s", self._ip, HEARTBEAT_PORT)
            else:
                log.info("no PlayStation address; heartbeat off")
            gate = PacketIdGate()
            last_heartbeat = 0.0
            while not self._stop.is_set():
                now = time.monotonic()
                if self._ip and now - last_heartbeat >= HEARTBEAT_INTERVAL_SECONDS:
                    self._send_heartbeat(sock)
                    last_heartbeat = time.monotonic()
                try:
                    datagram, _addr = sock.recvfrom(4096)
                except TimeoutError:
                    gate.reset()
                    if self._ip and not self._stop.is_set():
                        self._send_heartbeat(sock)
                        last_heartbeat = time.monotonic()
                    continue
                except OSError:
                    if self._stop.is_set():
                        return
                    continue
                sample = decode_datagram(datagram)
                if sample is None or not gate.accept(sample.packet_id):
                    continue
                self._store.accept(sample.throttle, sample.brake, time.monotonic())
        finally:
            self._sock = None
            sock.close()
