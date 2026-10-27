"""Stateful virtual Midea/Sanyo air-conditioner UART endpoint."""

from __future__ import annotations

from dataclasses import dataclass
import math

from midea_protocol import (
    DEVICE_CONTROL,
    DEVICE_QUERY,
    Frame,
    build_frame,
    with_crc,
)

MODES = {0: "關機", 1: "自動", 2: "冷房", 3: "除濕", 4: "暖房", 5: "送風"}
FANS = {20: "靜音", 40: "低", 60: "中", 80: "高", 100: "強力", 102: "自動"}
SWINGS = {0x00: "停止", 0x03: "左右", 0x0C: "上下", 0x0F: "上下＋左右"}


def decode_timer(value: int) -> int | None:
    if not value & 0x80:
        return None
    return ((value >> 2) & 0x1F) * 60 + (value & 0x03) * 15


def encode_timer(minutes: float | None) -> int:
    if minutes is None:
        return 0x7F
    quarters = max(1, min(127, math.ceil(minutes / 15.0)))
    return 0x80 | quarters


@dataclass
class Action:
    name: str
    detail: str


class VirtualAirConditioner:
    def __init__(self) -> None:
        self.power = False
        self.raw_mode = 2
        self.target_temperature = 26.0
        self.indoor_temperature = 27.0
        self.outdoor_temperature = 30.0
        self.fan = 102
        self.swing = 0
        self.display = True
        self.preset = "一般"
        self.on_timer_minutes: float | None = None
        self.off_timer_minutes: float | None = None
        self.last_action = Action("待機", "等待 DT-06 封包")
        self.valid_rx = 0
        self.tx_count = 0

    @property
    def mode(self) -> int:
        return self.raw_mode if self.power else 0

    def advance(self, seconds: float) -> list[Action]:
        actions: list[Action] = []
        elapsed_minutes = max(0.0, seconds) / 60.0
        if self.on_timer_minutes is not None:
            self.on_timer_minutes -= elapsed_minutes
            if self.on_timer_minutes <= 0:
                self.on_timer_minutes = None
                self.power = True
                actions.append(Action("冷氣端定時開機", f"進入{MODES.get(self.raw_mode, '未知')}模式"))
        if self.off_timer_minutes is not None:
            self.off_timer_minutes -= elapsed_minutes
            if self.off_timer_minutes <= 0:
                self.off_timer_minutes = None
                self.power = False
                actions.append(Action("冷氣端定時關機", "冷氣主機自行完成關機"))
        if actions:
            self.last_action = actions[-1]
        return actions

    def handle(self, frame: Frame) -> tuple[bytes | None, Action]:
        self.valid_rx += 1
        body = frame.body
        if not body:
            action = Action("空封包", "未回應")
            return None, action

        if frame.frame_type == DEVICE_CONTROL and body[0] == 0x40:
            action = self._apply_control(body)
            response = self._status_response(frame)
        elif frame.frame_type == DEVICE_QUERY and body[0] == 0x41:
            if len(body) > 1 and body[1] == 0x61:
                self.display = not self.display
                action = Action("面板燈切換", "開啟" if self.display else "關閉")
            elif len(body) > 1 and body[1] == 0x21:
                action = Action("耗電查詢", "回傳模擬耗電")
                response = self._power_response(frame)
                self.last_action = action
                self.tx_count += 1
                return response, action
            else:
                action = Action("狀態查詢", "回傳完整冷氣狀態")
            response = self._status_response(frame)
        elif frame.frame_type == DEVICE_QUERY and body[0] == 0xB5:
            action = Action("能力查詢", "回傳模式、溫度、風量、擺風、燈光與蜂鳴能力")
            response = self._capabilities_response(frame)
        else:
            action = Action("未支援封包", f"type=0x{frame.frame_type:02X}, id=0x{body[0]:02X}")
            response = None

        self.last_action = action
        if response is not None:
            self.tx_count += 1
        return response, action

    def _apply_control(self, body: bytes) -> Action:
        if len(body) < 11:
            return Action("控制封包過短", f"只有 {len(body)} bytes")
        old = (self.power, self.raw_mode, self.target_temperature, self.fan, self.swing)
        self.power = bool(body[1] & 0x01)
        self.raw_mode = (body[2] >> 5) & 0x07
        self.target_temperature = 16.0 + (body[2] & 0x0F) + (0.5 if body[2] & 0x10 else 0.0)
        self.fan = body[3]
        self.on_timer_minutes = decode_timer(body[4])
        self.off_timer_minutes = decode_timer(body[5])
        self.swing = body[7] & 0x0F
        self.preset = (
            "ECO" if body[9] & 0x90 else
            "強力" if (body[8] & 0x20 or body[10] & 0x02) else
            "睡眠" if body[10] & 0x01 else
            "一般"
        )
        beeper = bool(body[1] & 0x40)
        new = (self.power, self.raw_mode, self.target_temperature, self.fan, self.swing)
        changes: list[str] = []
        labels = ("電源", "模式", "溫度", "風量", "擺風")
        for label, before, after in zip(labels, old, new):
            if before != after:
                changes.append(label)
        if self.on_timer_minutes is not None:
            changes.append(f"冷氣端開機定時 {self.on_timer_minutes:.0f} 分")
        if self.off_timer_minutes is not None:
            changes.append(f"冷氣端關機定時 {self.off_timer_minutes:.0f} 分")
        if beeper:
            changes.append("蜂鳴")
        detail = "、".join(changes) if changes else "狀態沒有改變"
        return Action("控制命令", detail)

    def _status_body(self, sequence: int = 0) -> bytes:
        data = bytearray(24)
        data[0] = 0xC0
        data[1] = 0x01 if self.power else 0x00
        integer = int(self.target_temperature)
        data[2] = ((self.raw_mode & 0x07) << 5) | max(0, min(14, integer - 16))
        if self.target_temperature - integer >= 0.25:
            data[2] |= 0x10
        data[3] = self.fan
        data[4] = encode_timer(self.on_timer_minutes)
        data[5] = encode_timer(self.off_timer_minutes)
        data[7] = 0x30 | (self.swing & 0x0F)
        if self.preset == "強力":
            data[8] |= 0x20
            data[10] |= 0x02
        elif self.preset == "ECO":
            data[9] |= 0x10
        elif self.preset == "睡眠":
            data[10] |= 0x01
        data[11] = max(0, min(255, 50 + round(self.indoor_temperature * 2)))
        data[12] = max(0, min(255, 50 + round(self.outdoor_temperature * 2)))
        data[13] = max(0, min(31, integer - 12))
        data[23] = sequence & 0xFF
        return with_crc(bytes(data))

    def _status_response(self, request: Frame) -> bytes:
        sequence = request.body[-2] if len(request.body) >= 2 else 0
        return build_frame(request.frame_type, self._status_body(sequence), request.protocol)

    def _power_response(self, request: Frame) -> bytes:
        data = bytearray(24)
        data[0] = 0xC1
        watts_tenths = 0 if not self.power else {20: 180, 40: 260, 60: 420, 80: 650, 100: 900, 102: 350}.get(self.fan, 350)
        value = watts_tenths
        for index in (18, 17, 16):
            pair = value % 100
            data[index] = ((pair // 10) << 4) | (pair % 10)
            value //= 100
        return build_frame(request.frame_type, with_crc(bytes(data)), request.protocol)

    def _capabilities_response(self, request: Frame) -> bytes:
        entries = (
            (0x0214, bytes((1,))),             # auto/cool/dry/heat
            (0x0215, bytes((1,))),             # vertical + horizontal swing
            (0x0225, bytes((32, 60, 32, 60, 32, 60, 1))),
            (0x0224, bytes((1,))),             # display light
            (0x022C, bytes((1,))),             # buzzer
            (0x0212, bytes((1,))),             # eco
            (0x021A, bytes((1,))),             # turbo cool + heat
            (0x0213, bytes((1,))),             # freeze protection
        )
        data = bytearray((0xB5, len(entries)))
        for capability_id, value in entries:
            data.extend((capability_id & 0xFF, capability_id >> 8, len(value)))
            data.extend(value)
        data.extend((0, 0))
        return build_frame(request.frame_type, with_crc(bytes(data)), request.protocol)

