"""Pure pedal decode and snapshot freshness. No PlayStation required."""

import math
import struct

from Crypto.Cipher import Salsa20

from gt_telemetry.ingest.receiver import playstation_target
from gt_telemetry.protocol.cars import CAR_NAMES, lookup_car_name
from gt_telemetry.protocol.pedals import (
    MAGIC,
    SALSA20_KEY,
    PacketIdGate,
    body_forward_xz,
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
        "bestLapMs": None,
        "positionX": None,
        "positionY": None,
        "positionZ": None,
        "rotationX": None,
        "rotationY": None,
        "rotationZ": None,
        "rotationW": None,
        "carCode": None,
        "carName": None,
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
        "bestLapMs": None,
        "positionX": None,
        "positionY": None,
        "positionZ": None,
        "rotationX": None,
        "rotationY": None,
        "rotationZ": None,
        "rotationW": None,
        "carCode": None,
        "carName": None,
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


def test_body_forward_xz_identity_and_half_turn() -> None:
    assert body_forward_xz(0, 0, 0, 1) == (0, -1)
    assert body_forward_xz(0, 1, 0, 0) == (0, 1)
    assert body_forward_xz(math.nan, 0, 0, 1) is None
    assert body_forward_xz(0, 0, 0, 0.4) is None


def test_rotation_quaternion_is_read_from_packet_offsets() -> None:
    buffer = bytearray(_plaintext(throttle=10, brake=20))
    struct.pack_into("<f", buffer, 0x1C, 0.25)
    struct.pack_into("<f", buffer, 0x20, -1.5)
    struct.pack_into("<f", buffer, 0x24, 0.5)
    struct.pack_into("<f", buffer, 0x28, 1.0)
    sample = decode_plaintext(bytes(buffer))
    assert sample is not None
    assert sample.rotation_x == 0.25
    assert sample.rotation_y == -1.5
    assert sample.rotation_z == 0.5
    assert sample.rotation_w == 1.0
    live = project_snapshot(
        sample.throttle,
        sample.brake,
        received_at=1.0,
        now=1.0,
        rotation_x=sample.rotation_x,
        rotation_y=math.nan,
        rotation_z=sample.rotation_z,
        rotation_w=sample.rotation_w,
    )
    assert live["connected"] is True
    assert live["rotationX"] == 0.25
    assert live["rotationY"] is None
    assert live["rotationZ"] == 0.5
    assert live["rotationW"] == 1.0


def test_car_code_is_signed_int32_when_plaintext_reaches_0x128() -> None:
    short = bytearray(_plaintext(throttle=51, brake=102, packet_id=3))
    assert len(short) == 0x93
    missing = decode_plaintext(bytes(short))
    assert missing is not None
    assert missing.car_code is None
    assert missing.throttle == 51 / 2.55
    assert missing.brake == 102 / 2.55

    long_buffer = bytearray(short)
    long_buffer.extend(b"\x00" * (0x128 - len(long_buffer)))
    struct.pack_into("<i", long_buffer, 0x124, -424242)
    sample = decode_plaintext(bytes(long_buffer))
    assert sample is not None
    assert len(long_buffer) == 0x128
    assert sample.car_code == -424242
    assert sample.packet_id == 3
    assert sample.throttle == 51 / 2.55
    assert sample.brake == 102 / 2.55

    one_byte_short = decode_plaintext(bytes(long_buffer[:0x127]))
    assert one_byte_short is not None
    assert one_byte_short.car_code is None
    assert one_byte_short.brake == 102 / 2.55


def test_live_view_car_code_is_null_when_absent_or_disconnected() -> None:
    assert CAR_NAMES == {}
    assert lookup_car_name(15) is None
    assert lookup_car_name(15, {"15": "named-in-table"}) == "named-in-table"
    assert lookup_car_name(None, {"15": "named-in-table"}) is None

    absent = project_snapshot(1.0, 2.0, received_at=1.0, now=1.0, car_code=None)
    assert absent["connected"] is True
    assert absent["carCode"] is None
    assert absent["carName"] is None

    present = project_snapshot(1.0, 2.0, received_at=1.0, now=1.0, car_code=-7)
    assert present["carCode"] == -7
    assert present["carName"] is None

    down = project_snapshot(1.0, 2.0, received_at=None, now=1.0, car_code=-7)
    assert down["connected"] is False
    assert down["carCode"] is None
    assert down["carName"] is None


def test_live_view_sends_name_only_from_the_table(monkeypatch) -> None:
    def names(code: int | None) -> str | None:
        if code == 15:
            return "named-in-table"
        return None

    monkeypatch.setattr("gt_telemetry.state.snapshot.lookup_car_name", names)
    named = project_snapshot(0.0, 0.0, received_at=1.0, now=1.0, car_code=15)
    assert named["carCode"] == 15
    assert named["carName"] == "named-in-table"
    unknown = project_snapshot(0.0, 0.0, received_at=1.0, now=1.0, car_code=16)
    assert unknown["carCode"] == 16
    assert unknown["carName"] is None
    stale = project_snapshot(0.0, 0.0, received_at=0.0, now=2.0, car_code=15)
    assert stale["carCode"] is None
    assert stale["carName"] is None


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
