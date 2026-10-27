import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / "simulator-desktop"))

from ac_emulator import StabilityCycle, VirtualAirConditioner, decode_timer, encode_timer
from midea_protocol import (
    DEVICE_CONTROL,
    DEVICE_QUERY,
    FrameStream,
    build_frame,
    crc8,
    parse_frame,
    with_crc,
)


class ProtocolTests(unittest.TestCase):
    def test_known_final_status_query(self):
        raw = bytes.fromhex("AA 20 AC 8C 00 00 00 00 00 03 41 81 00 FF 03 FF 00 02 00 00 00 00 00 00 00 00 00 00 00 00 01 71 6E")
        frame = parse_frame(raw)
        self.assertEqual(frame.frame_type, DEVICE_QUERY)
        self.assertEqual(frame.body[0], 0x41)
        self.assertEqual(crc8(frame.body), 0)

    def test_stream_resynchronizes(self):
        query = build_frame(DEVICE_QUERY, with_crc(bytes((0xB5, 0x01, 0x11))))
        parser = FrameStream()
        frames, errors = parser.feed(b"noise" + query[:4])
        self.assertFalse(frames)
        self.assertTrue(errors)
        frames, errors = parser.feed(query[4:])
        self.assertEqual(len(frames), 1)
        self.assertEqual(frames[0].body[0], 0xB5)

    def test_timer_quarter_hour_encoding(self):
        self.assertIsNone(decode_timer(0x7F))
        self.assertEqual(decode_timer(0x81), 15)
        self.assertEqual(decode_timer(0x86), 90)
        self.assertEqual(encode_timer(None), 0x7F)
        self.assertEqual(encode_timer(1), 0x81)
        self.assertEqual(encode_timer(90), 0x86)


class EmulatorTests(unittest.TestCase):
    def setUp(self):
        self.ac = VirtualAirConditioner()

    @staticmethod
    def control_body(*, power=True, mode=2, temp=24.5, fan=80, swing=0x0C, on_timer=0x7F, off_timer=0x7F):
        data = bytearray(24)
        data[0] = 0x40
        data[1] = 0x41 if power else 0x40
        integer = int(temp)
        data[2] = (mode << 5) | (integer - 16) | (0x10 if temp != integer else 0)
        data[3] = fan
        data[4] = on_timer
        data[5] = off_timer
        data[7] = 0x30 | swing
        return with_crc(bytes(data))

    def test_control_is_applied_and_acknowledged(self):
        request = parse_frame(build_frame(DEVICE_CONTROL, self.control_body()))
        response, action = self.ac.handle(request)
        self.assertIsNotNone(response)
        self.assertEqual(action.name, "控制命令")
        self.assertTrue(self.ac.power)
        self.assertEqual(self.ac.mode, 2)
        self.assertEqual(self.ac.target_temperature, 24.5)
        self.assertEqual(self.ac.fan, 80)
        self.assertEqual(self.ac.swing, 0x0C)
        status = parse_frame(response)
        self.assertEqual(status.frame_type, DEVICE_CONTROL)
        self.assertEqual(status.body[0], 0xC0)

    def test_native_off_timer_runs_without_dt06(self):
        request = parse_frame(build_frame(DEVICE_CONTROL, self.control_body(off_timer=0x81)))
        self.ac.handle(request)
        self.assertEqual(self.ac.off_timer_minutes, 15)
        actions = self.ac.advance(15 * 60)
        self.assertFalse(self.ac.power)
        self.assertIsNone(self.ac.off_timer_minutes)
        self.assertEqual(actions[-1].name, "冷氣端定時關機")

    def test_status_query_returns_current_state(self):
        query_data = bytes.fromhex("41 81 00 FF 03 FF 00 02 00 00 00 00 00 00 00 00 00 00 00 00 03 2A")
        query = parse_frame(build_frame(DEVICE_QUERY, with_crc(query_data)))
        response, action = self.ac.handle(query)
        status = parse_frame(response)
        self.assertEqual(action.name, "狀態查詢")
        self.assertEqual(status.body[0], 0xC0)
        self.assertEqual(status.body[-2], 0x2A)

    def test_capabilities_are_reported(self):
        query = parse_frame(build_frame(DEVICE_QUERY, with_crc(bytes((0xB5, 0x01, 0x11)))))
        response, action = self.ac.handle(query)
        capabilities = parse_frame(response)
        self.assertEqual(action.name, "能力查詢")
        self.assertEqual(capabilities.body[0], 0xB5)
        self.assertGreaterEqual(capabilities.body[1], 8)

    def test_stability_cycle_waits_for_dt06_off_before_next_round(self):
        cycle = StabilityCycle(10)
        cycle.start()
        self.assertEqual(cycle.state, StabilityCycle.COOLING)
        self.assertIsNone(cycle.advance(9))
        self.assertEqual(cycle.advance(1), "remote_off")
        self.assertEqual(cycle.state, StabilityCycle.WAITING_DT06)
        self.assertTrue(cycle.observe_dt06_off())
        self.assertEqual(cycle.completed_rounds, 1)
        cycle.begin_next_round()
        self.assertEqual(cycle.round_number, 2)
        self.assertEqual(cycle.state, StabilityCycle.COOLING)


if __name__ == "__main__":
    unittest.main()
