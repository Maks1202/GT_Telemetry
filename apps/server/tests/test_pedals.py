"""Pure pedal decode and snapshot freshness. No PlayStation required."""

import math
import struct

from Crypto.Cipher import Salsa20

from gt_telemetry.ingest.receiver import playstation_target
from gt_telemetry.protocol.pedals import (
    MAGIC,
    SALSA20_KEY,
    PacketIdGate,
    decode_datagram,
    decode_plaintext,
    iv_from_seed,
)
from gt_telemetry.state.snapshot import project_snapshot


def _plaintext(
    throttle: int,
    brake: int,
    packet_id: int = 1,
    *,
    speed_mps: float = 0.0,
    rpm: float = 0.0,
    gear: int = 0,
    lap: int = 0,
    last_lap_ms: int = 0,
    position_x: float = 0.0,
    position_y: float = 0.0,
    position_z: float = 0.0,
) -> bytes:
    buffer = bytearray(0x93)
    buffer[0:4] = MAGIC.to_bytes(4, "little")
    buffer[0x70:0x74] = packet_id.to_bytes(4, "little", signed=True)
    buffer[0x91] = throttle
    buffer[0x92] = brake
    struct.pack_into("<f", buffer, 0x04, position_x)
    struct.pack_into("<f", buffer, 0x08, position_y)
    struct.pack_into("<f", buffer, 0x0C, position_z)
    struct.pack_into("<f", buffer, 0x3C, rpm)
    struct.pack_into("<f", buffer, 0x4C, speed_mps)
    struct.pack_into("<h", buffer, 0x74, lap)
    struct.pack_into("<i", buffer, 0x7C, last_lap_ms)
    buffer[0x90] = gear & 0xFF
    return bytes(buffer)


def test_decode_plaintext_buffer() -> None:
    sample = decode_plaintext(
        _plaintext(
            throttle=128,
            brake=255,
            packet_id=9,
            speed_mps=10.0,
            rpm=8000.0,
            gear=0x13,
            lap=-1,
            last_lap_ms=125045,
            position_x=120.5,
            position_y=4.25,
            position_z=-88.0,
        )
    )
    assert sample is not None
    assert sample.packet_id == 9
    assert sample.throttle == 128 / 2.55
    assert sample.brake == 255 / 2.55
    assert sample.speed_mps == 10.0
    assert sample.rpm == 8000.0
    assert sample.gear == 3
    assert sample.lap == -1
    assert sample.last_lap_ms == 125045
    assert sample.position_x == 120.5
    assert sample.position_y == 4.25
    assert sample.position_z == -88.0
    live = project_snapshot(
        sample.throttle,
        sample.brake,
        received_at=2.0,
        now=2.0,
        speed_mps=sample.speed_mps,
        rpm=sample.rpm,
        gear=sample.gear,
        lap=sample.lap,
        last_lap_ms=sample.last_lap_ms,
        position_x=sample.position_x,
        position_y=sample.position_y,
        position_z=sample.position_z,
    )
    assert live["positionX"] == 120.5
    assert live["positionY"] == 4.25
    assert live["positionZ"] == -88.0

    non_finite = decode_plaintext(
        _plaintext(
            throttle=10,
            brake=0,
            position_x=math.nan,
            position_y=math.inf,
            position_z=-math.inf,
        )
    )
    assert non_finite is not None
    view = project_snapshot(
        non_finite.throttle,
        non_finite.brake,
        received_at=1.0,
        now=1.0,
        speed_mps=non_finite.speed_mps,
        rpm=non_finite.rpm,
        gear=non_finite.gear,
        lap=non_finite.lap,
        last_lap_ms=non_finite.last_lap_ms,
        position_x=non_finite.position_x,
        position_y=non_finite.position_y,
        position_z=non_finite.position_z,
    )
    assert view["connected"] is True
    assert view["positionX"] is None
    assert view["positionY"] is None
    assert view["positionZ"] is None


def test_reject_bad_magic() -> None:
    buffer = bytearray(_plaintext(throttle=10, brake=20))
    buffer[0] ^= 0xFF
    assert decode_plaintext(bytes(buffer)) is None


def test_stale_snapshot_after_one_second() -> None:
    gauges = {
        "speed_mps": 10.0,
        "rpm": 8000.0,
        "gear": 0,
        "lap": 7,
        "last_lap_ms": 0,
    }
    fresh = project_snapshot(40.0, 10.0, received_at=0.0, now=1.0, **gauges)
    assert fresh == {
        "connected": True,
        "throttle": 40.0,
        "brake": 10.0,
        "speedKmh": 36.0,
        "rpm": 8000.0,
        "gear": 0,
        "lap": 7,
        "lastLapMs": 0,
        "positionX": None,
        "positionY": None,
        "positionZ": None,
    }
    disconnected = {
        "connected": False,
        "throttle": None,
        "brake": None,
        "speedKmh": None,
        "rpm": None,
        "gear": None,
        "lap": None,
        "lastLapMs": None,
        "positionX": None,
        "positionY": None,
        "positionZ": None,
    }
    stale = project_snapshot(40.0, 10.0, received_at=0.0, now=1.0 + 1e-6, **gauges)
    assert stale == disconnected
    missing = project_snapshot(40.0, 10.0, received_at=None, now=0.0, **gauges)
    assert missing == disconnected


def test_negative_last_lap_stays_numeric_while_connected() -> None:
    view = project_snapshot(
        1.0,
        0.0,
        received_at=1.0,
        now=1.0,
        speed_mps=0.0,
        rpm=900.4,
        gear=0,
        lap=-2,
        last_lap_ms=-5,
    )
    assert view["connected"] is True
    assert view["speedKmh"] == 0.0
    assert view["rpm"] == 900.4
    assert view["gear"] == 0
    assert view["lap"] == -2
    assert view["lastLapMs"] == -5


def test_fresh_snapshot_returns_percents() -> None:
    view = project_snapshot(0.0, 100.0, received_at=5.0, now=5.5)
    assert view["connected"] is True
    assert view["throttle"] == 0.0
    assert view["brake"] == 100.0


def test_packet_id_must_increase_until_reset() -> None:
    gate = PacketIdGate()
    assert gate.accept(1) is True
    assert gate.accept(1) is False
    assert gate.accept(0) is False
    assert gate.accept(2) is True
    gate.reset()
    assert gate.accept(0) is True


def test_broadcast_address_is_not_a_target() -> None:
    assert playstation_target(None) is None
    assert playstation_target("  ") is None
    assert playstation_target("255.255.255.255") is None
    assert playstation_target(" 192.0.2.10 ") == "192.0.2.10"


def test_decrypt_roundtrip_with_seed_at_ciphertext_offset() -> None:
    """Build a datagram whose bytes 0x40:0x44 are the IV seed.

    Salsa20 is a stream cipher, so the plaintext at that offset is the seed
    XORed with the keystream. The decryptor then reads the seed back from the
    ciphertext. This fixture is synthetic. It is not a capture from a console.
    """
    seed = b"\x11\x22\x33\x44"
    plain = bytearray(_plaintext(throttle=128, brake=0, packet_id=4))
    keystream = Salsa20.new(key=SALSA20_KEY, nonce=iv_from_seed(seed)).encrypt(
        bytes(len(plain))
    )
    plain[0x40:0x44] = bytes(
        left ^ right for left, right in zip(seed, keystream[0x40:0x44], strict=True)
    )
    ciphertext = bytes(
        left ^ right for left, right in zip(plain, keystream, strict=True)
    )
    assert ciphertext[0x40:0x44] == seed

    sample = decode_datagram(ciphertext)
    assert sample is not None
    assert sample.packet_id == 4
    assert sample.throttle == 128 / 2.55
    assert sample.brake == 0.0
    assert sample.speed_mps == 0.0
    assert sample.rpm == 0.0
    assert sample.gear == 0
    assert sample.lap == 0
    assert sample.last_lap_ms == 0
