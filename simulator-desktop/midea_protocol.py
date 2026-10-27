"""Midea/Sanyo 0xAC UART framing used by MideaUART 1.1.9."""

from __future__ import annotations

from dataclasses import dataclass

START = 0xAA
APPLIANCE_AC = 0xAC
DEVICE_CONTROL = 0x02
DEVICE_QUERY = 0x03
NETWORK_NOTIFY = 0x0D
QUERY_NETWORK = 0x63


def crc8(data: bytes) -> int:
    """CRC-8/MAXIM, matching MideaUART FrameData::m_calcCRC()."""
    crc = 0
    for value in data:
        crc ^= value
        for _ in range(8):
            crc = ((crc >> 1) ^ 0x8C) if crc & 1 else crc >> 1
    return crc


def with_crc(data: bytes) -> bytes:
    return data + bytes((crc8(data),))


def checksum(data_without_checksum: bytes) -> int:
    return (-sum(data_without_checksum[1:])) & 0xFF


@dataclass(frozen=True)
class Frame:
    appliance: int
    protocol: int
    frame_type: int
    body: bytes
    raw: bytes


def build_frame(frame_type: int, body: bytes, protocol: int = 0) -> bytes:
    header = bytearray((START, 0, APPLIANCE_AC, 0, 0, 0, 0, 0, protocol, frame_type))
    header.extend(body)
    header[1] = len(header)
    header[3] = header[1] ^ header[2]
    header.append(checksum(header))
    return bytes(header)


def parse_frame(raw: bytes) -> Frame:
    if len(raw) < 12:
        raise ValueError("frame is too short")
    if raw[0] != START:
        raise ValueError("invalid start byte")
    if len(raw) != raw[1] + 1:
        raise ValueError("length mismatch")
    if raw[3] != (raw[1] ^ raw[2]):
        raise ValueError("sync byte mismatch")
    if sum(raw[1:]) & 0xFF:
        raise ValueError("outer checksum mismatch")
    body = raw[10:-1]
    if body and crc8(body):
        raise ValueError("body CRC mismatch")
    return Frame(raw[2], raw[8], raw[9], body, raw)


class FrameStream:
    """Incrementally extracts frames and resynchronizes after line noise."""

    def __init__(self) -> None:
        self.buffer = bytearray()

    def feed(self, data: bytes) -> tuple[list[Frame], list[str]]:
        self.buffer.extend(data)
        frames: list[Frame] = []
        errors: list[str] = []
        while self.buffer:
            try:
                start = self.buffer.index(START)
            except ValueError:
                errors.append(f"discarded {len(self.buffer)} non-frame byte(s)")
                self.buffer.clear()
                break
            if start:
                errors.append(f"discarded {start} byte(s) before 0xAA")
                del self.buffer[:start]
            if len(self.buffer) < 2:
                break
            body_length = self.buffer[1]
            total = body_length + 1
            if body_length <= 10:
                errors.append(f"invalid length {body_length}")
                del self.buffer[0]
                continue
            if len(self.buffer) < total:
                break
            candidate = bytes(self.buffer[:total])
            del self.buffer[:total]
            try:
                frames.append(parse_frame(candidate))
            except ValueError as exc:
                errors.append(str(exc))
        return frames, errors


def hex_bytes(data: bytes) -> str:
    return " ".join(f"{value:02X}" for value in data)

