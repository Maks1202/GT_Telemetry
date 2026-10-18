"""GT7 packet decode. Salsa20, magic, pedals, gauges, and car position."""

import math
import struct
from dataclasses import dataclass

from Crypto.Cipher import Salsa20

MAGIC = 0x47375330
SALSA20_KEY = b"Simulator Interface Packet GT7 ver 0.0"[:32]
IV_XOR = 0xDEADBEAF
IV_SEED_OFFSET = 0x40
POSITION_X_OFFSET = 0x04
POSITION_Y_OFFSET = 0x08
POSITION_Z_OFFSET = 0x0C
ROTATION_X_OFFSET = 0x1C
ROTATION_Y_OFFSET = 0x20
ROTATION_Z_OFFSET = 0x24
ROTATION_W_OFFSET = 0x28
RPM_OFFSET = 0x3C
SPEED_OFFSET = 0x4C
PACKET_ID_OFFSET = 0x70
LAP_OFFSET = 0x74
LAST_LAP_OFFSET = 0x7C
GEAR_OFFSET = 0x90
GEAR_MASK = 0x0F
THROTTLE_OFFSET = 0x91
BRAKE_OFFSET = 0x92
CAR_CODE_OFFSET = 0x124
CAR_CODE_MIN_LENGTH = CAR_CODE_OFFSET + 4
MIN_PLAINTEXT_LENGTH = BRAKE_OFFSET + 1

assert len(SALSA20_KEY) == 32


@dataclass(frozen=True)
class PedalSample:
    packet_id: int
    throttle: float
    brake: float
    speed_mps: float
    rpm: float
    gear: int
    lap: int
    last_lap_ms: int
    position_x: float
    position_y: float
    position_z: float
    rotation_x: float
    rotation_y: float
    rotation_z: float
    rotation_w: float
    car_code: int | None


def iv_from_seed(seed: bytes) -> bytes:
    """8-byte Salsa20 IV from the 4-byte seed at datagram offset 0x40."""
    iv1 = int.from_bytes(seed, "little")
    iv2 = iv1 ^ IV_XOR
    return iv2.to_bytes(4, "little") + iv1.to_bytes(4, "little")


def decrypt_datagram(datagram: bytes) -> bytes | None:
    """Decrypt one received datagram. The IV seed is ciphertext bytes 0x40:0x44."""
    if len(datagram) < IV_SEED_OFFSET + 4:
        return None
    seed = datagram[IV_SEED_OFFSET : IV_SEED_OFFSET + 4]
    cipher = Salsa20.new(key=SALSA20_KEY, nonce=iv_from_seed(seed))
    return cipher.decrypt(datagram)


def decode_plaintext(buffer: bytes) -> PedalSample | None:
    """Read pedals and gauges from an already decrypted packet. Drop a bad magic."""
    if len(buffer) < MIN_PLAINTEXT_LENGTH:
        return None
    magic = int.from_bytes(buffer[0:4], "little")
    if magic != MAGIC:
        return None
    packet_id = int.from_bytes(
        buffer[PACKET_ID_OFFSET : PACKET_ID_OFFSET + 4],
        "little",
        signed=True,
    )
    throttle = buffer[THROTTLE_OFFSET] / 2.55
    brake = buffer[BRAKE_OFFSET] / 2.55
    speed_mps = struct.unpack_from("<f", buffer, SPEED_OFFSET)[0]
    rpm = struct.unpack_from("<f", buffer, RPM_OFFSET)[0]
    gear = buffer[GEAR_OFFSET] & GEAR_MASK
    lap = struct.unpack_from("<h", buffer, LAP_OFFSET)[0]
    last_lap_ms = struct.unpack_from("<i", buffer, LAST_LAP_OFFSET)[0]
    position_x = struct.unpack_from("<f", buffer, POSITION_X_OFFSET)[0]
    position_y = struct.unpack_from("<f", buffer, POSITION_Y_OFFSET)[0]
    position_z = struct.unpack_from("<f", buffer, POSITION_Z_OFFSET)[0]
    rotation_x = struct.unpack_from("<f", buffer, ROTATION_X_OFFSET)[0]
    rotation_y = struct.unpack_from("<f", buffer, ROTATION_Y_OFFSET)[0]
    rotation_z = struct.unpack_from("<f", buffer, ROTATION_Z_OFFSET)[0]
    rotation_w = struct.unpack_from("<f", buffer, ROTATION_W_OFFSET)[0]
    car_code = None
    if len(buffer) >= CAR_CODE_MIN_LENGTH:
        car_code = struct.unpack_from("<i", buffer, CAR_CODE_OFFSET)[0]
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
        rotation_x=rotation_x,
        rotation_y=rotation_y,
        rotation_z=rotation_z,
        rotation_w=rotation_w,
        car_code=car_code,
    )


def body_forward_xz(
    x: float,
    y: float,
    z: float,
    w: float,
) -> tuple[float, float] | None:
    """World XZ of the car nose. Local -Z, quaternion x, y, z, w."""
    if not (
        math.isfinite(x)
        and math.isfinite(y)
        and math.isfinite(z)
        and math.isfinite(w)
    ):
        return None
    n2 = x * x + y * y + z * z + w * w
    if n2 < 0.25:
        return None
    scale = 1.0 / math.sqrt(n2)
    x *= scale
    y *= scale
    z *= scale
    w *= scale
    forward_x = -2 * (x * z + w * y)
    forward_z = -(1 - 2 * (x * x + y * y))
    return (forward_x, forward_z)


def decode_datagram(datagram: bytes) -> PedalSample | None:
    plain = decrypt_datagram(datagram)
    if plain is None:
        return None
    return decode_plaintext(plain)


class PacketIdGate:
    """Accept only a strictly newer int32. Reset after a socket timeout."""

    def __init__(self) -> None:
        self._last: int | None = None

    def reset(self) -> None:
        self._last = None

    def accept(self, packet_id: int) -> bool:
        if self._last is not None and packet_id <= self._last:
            return False
        self._last = packet_id
        return True
