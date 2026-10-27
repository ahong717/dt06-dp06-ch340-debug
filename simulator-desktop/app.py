from __future__ import annotations

import queue
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk

from ac_emulator import FANS, MODES, SWINGS, StabilityCycle, VirtualAirConditioner
from midea_protocol import DEVICE_CONTROL, DEVICE_QUERY, FrameStream, hex_bytes, parse_frame

try:
    import serial
    from serial.tools import list_ports
except ImportError:  # Shown cleanly in the UI instead of crashing at import time.
    serial = None
    list_ports = None


class SimulatorApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("DT-06 FINAL｜三洋冷氣 UART 模擬器")
        self.geometry("1420x780")
        self.minsize(1120, 650)
        self.configure(bg="#eef2f7")
        self.ac = VirtualAirConditioner()
        self.events: queue.Queue = queue.Queue()
        self.stop_event = threading.Event()
        self.worker: threading.Thread | None = None
        self.serial_port = None
        self.drop_responses = tk.BooleanVar(value=False)
        self.delay_ms = tk.IntVar(value=0)
        self.drop_response_enabled = False
        self.response_delay_ms = 0
        self.drop_responses.trace_add("write", self._update_fault_settings)
        self.delay_ms.trace_add("write", self._update_fault_settings)
        self.compact_log = tk.BooleanVar(value=True)
        self.cycle_enabled = tk.BooleanVar(value=False)
        self.cycle_run_seconds = tk.IntVar(value=10)
        self.cycle_status = tk.StringVar(value="待機")
        self.cycle_round = tk.StringVar(value="第 0 次")
        self.cycle_remaining = tk.StringVar(value="--")
        self.cycle = StabilityCycle(self.cycle_run_seconds.get())
        self.cycle_last_tick = time.monotonic()
        self.cycle_next_round_job = None
        self.vars = {name: tk.StringVar() for name in (
            "connection", "rx", "tx", "valid", "power", "mode", "target", "indoor",
            "outdoor", "fan", "swing", "display", "preset", "on_timer", "off_timer", "action"
        )}
        self._build_ui()
        self.refresh_ports()
        self._refresh_state()
        self.after(50, self._drain_events)
        self.protocol("WM_DELETE_WINDOW", self._close)

    def _build_ui(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Title.TLabel", font=("Segoe UI", 20, "bold"), background="#eef2f7", foreground="#102a43")
        style.configure("Card.TFrame", background="white", relief="solid", borderwidth=1)
        style.configure("CardTitle.TLabel", font=("Segoe UI", 10), background="white", foreground="#627d98")
        style.configure("CardValue.TLabel", font=("Segoe UI", 16, "bold"), background="white", foreground="#102a43")

        header = ttk.Frame(self, padding=(22, 18), style="Card.TFrame")
        header.pack(fill="x", padx=16, pady=(16, 8))
        ttk.Label(header, text="DT-06 FINAL｜虛擬三洋冷氣", style="Title.TLabel").pack(side="left")
        self.connection_light = tk.Canvas(header, width=20, height=20, bg="white", highlightthickness=0)
        self.connection_light.pack(side="right", padx=(8, 4))
        self.connection_dot = self.connection_light.create_oval(3, 3, 17, 17, fill="#d64545", outline="")
        ttk.Label(header, textvariable=self.vars["connection"], background="white").pack(side="right")

        body = ttk.Frame(self)
        body.pack(fill="both", expand=True, padx=12, pady=4)
        left = ttk.Frame(body)
        left.pack(side="left", fill="both", expand=True)
        right = ttk.Frame(body, width=310, padding=12, style="Card.TFrame")
        right.pack(side="right", fill="y", padx=(8, 0))
        right.pack_propagate(False)

        connection = ttk.Frame(left, padding=14, style="Card.TFrame")
        connection.pack(fill="x", padx=16, pady=8)
        ttk.Label(connection, text="CH340 COM 埠", background="white").pack(side="left")
        self.port_box = ttk.Combobox(connection, width=34, state="readonly")
        self.port_box.pack(side="left", padx=8)
        ttk.Button(connection, text="重新掃描", command=self.refresh_ports).pack(side="left", padx=4)
        self.connect_button = ttk.Button(connection, text="連線", command=self.toggle_connection)
        self.connect_button.pack(side="left", padx=4)
        ttk.Checkbutton(connection, text="故意不回應（測重試/逾時）", variable=self.drop_responses).pack(side="left", padx=16)
        ttk.Label(connection, text="回應延遲 ms", background="white").pack(side="left")
        ttk.Spinbox(connection, from_=0, to=5000, increment=50, width=7, textvariable=self.delay_ms).pack(side="left", padx=5)

        cards = ttk.Frame(left)
        cards.pack(fill="x", padx=12, pady=4)
        for column, (key, title) in enumerate((("rx", "RX 收到"), ("tx", "TX 回傳"), ("valid", "有效封包"), ("action", "最近動作"))):
            card = ttk.Frame(cards, padding=12, style="Card.TFrame")
            card.grid(row=0, column=column, sticky="nsew", padx=4, pady=4)
            cards.columnconfigure(column, weight=1)
            ttk.Label(card, text=title, style="CardTitle.TLabel").pack(anchor="w")
            ttk.Label(card, textvariable=self.vars[key], style="CardValue.TLabel", wraplength=260).pack(anchor="w", pady=(4, 0))

        state = ttk.Frame(left)
        state.pack(fill="x", padx=12)
        items = (("power", "電源"), ("mode", "模式"), ("target", "設定溫度"), ("indoor", "室內溫度"),
                 ("outdoor", "室外溫度"), ("fan", "風量"), ("swing", "擺風"), ("display", "面板燈"),
                 ("preset", "Preset"), ("on_timer", "冷氣端開機定時"), ("off_timer", "冷氣端關機定時"))
        for index, (key, title) in enumerate(items):
            row, column = divmod(index, 4)
            card = ttk.Frame(state, padding=12, style="Card.TFrame")
            card.grid(row=row, column=column, sticky="nsew", padx=4, pady=4)
            state.columnconfigure(column, weight=1)
            ttk.Label(card, text=title, style="CardTitle.TLabel").pack(anchor="w")
            ttk.Label(card, textvariable=self.vars[key], style="CardValue.TLabel").pack(anchor="w", pady=(4, 0))

        controls = ttk.Frame(left, padding=12, style="Card.TFrame")
        controls.pack(fill="x", padx=16, pady=8)
        ttk.Label(controls, text="模擬感測值：", background="white").pack(side="left")
        self.indoor_input = tk.DoubleVar(value=27)
        self.outdoor_input = tk.DoubleVar(value=30)
        ttk.Label(controls, text="室內", background="white").pack(side="left", padx=(10, 2))
        ttk.Spinbox(controls, from_=-20, to=60, increment=0.5, width=7, textvariable=self.indoor_input).pack(side="left")
        ttk.Label(controls, text="室外", background="white").pack(side="left", padx=(10, 2))
        ttk.Spinbox(controls, from_=-40, to=70, increment=0.5, width=7, textvariable=self.outdoor_input).pack(side="left")
        ttk.Button(controls, text="套用並在下次查詢回報", command=self.apply_temperatures).pack(side="left", padx=10)

        log_frame = ttk.Frame(left, padding=8, style="Card.TFrame")
        log_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        log_title = ttk.Frame(log_frame, style="Card.TFrame")
        log_title.pack(fill="x", pady=(0, 6))
        ttk.Label(log_title, text="UART 封包與解讀紀錄", background="white", font=("Segoe UI", 11, "bold")).pack(side="left")
        ttk.Checkbutton(log_title, text="精簡日誌（過濾輪詢查詢）", variable=self.compact_log).pack(side="right")
        self.log = tk.Text(log_frame, height=12, font=("Consolas", 9), bg="#0b1f33", fg="#d9eaf7", insertbackground="white", wrap="none")
        self.log.pack(fill="both", expand=True)

        self._build_remote_panel(right)

    def _build_remote_panel(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="模擬實體遙控器 (IR Remote)", style="CardTitle.TLabel").pack(anchor="w", pady=(2, 12))
        ttk.Button(parent, text="電源 ON / OFF", command=self._remote_power).pack(fill="x", pady=3)
        ttk.Label(parent, text="模式", style="CardTitle.TLabel").pack(anchor="w", pady=(12, 3))
        mode_row = ttk.Frame(parent, style="Card.TFrame")
        mode_row.pack(fill="x")
        for label, mode in (("冷房", 2), ("除濕", 3), ("送風", 5), ("暖房", 4), ("自動", 1)):
            ttk.Button(mode_row, text=label, command=lambda value=mode: self._remote_mode(value)).pack(side="left", expand=True, fill="x", padx=1)
        ttk.Label(parent, text="溫度", style="CardTitle.TLabel").pack(anchor="w", pady=(12, 3))
        temp_row = ttk.Frame(parent, style="Card.TFrame")
        temp_row.pack(fill="x")
        ttk.Button(temp_row, text="▲", command=lambda: self._remote_temperature(1)).pack(side="left", expand=True, fill="x")
        ttk.Label(temp_row, textvariable=self.vars["target"], width=10, anchor="center", background="white").pack(side="left")
        ttk.Button(temp_row, text="▼", command=lambda: self._remote_temperature(-1)).pack(side="left", expand=True, fill="x")
        ttk.Button(parent, text="風量循環（自動→靜音→低→中→高→強力）", command=self._remote_fan).pack(fill="x", pady=3)
        ttk.Button(parent, text="擺風切換", command=self._remote_swing).pack(fill="x", pady=3)

        ttk.Separator(parent).pack(fill="x", pady=14)
        ttk.Checkbutton(parent, text="啟用防霉自動穩定度測試", variable=self.cycle_enabled, command=self._toggle_cycle).pack(anchor="w")
        ttk.Label(parent, text="每輪冷房運轉時間（秒，可修改）", style="CardTitle.TLabel").pack(anchor="w", pady=(10, 3))
        ttk.Spinbox(parent, from_=1, to=3600, width=8, textvariable=self.cycle_run_seconds).pack(anchor="w")
        ttk.Label(parent, textvariable=self.cycle_round, background="white").pack(anchor="w", pady=(12, 2))
        ttk.Label(parent, textvariable=self.cycle_status, background="white", wraplength=270).pack(anchor="w", pady=2)
        ttk.Label(parent, textvariable=self.cycle_remaining, background="white").pack(anchor="w", pady=2)
        ttk.Label(parent, text="流程：遙控開冷房 → 運轉倒數 → 遙控關機 → 等待 DT-06 防霉關機指令 → 下一輪", background="white", wraplength=275).pack(anchor="w", pady=(12, 0))

    def _remote_power(self) -> None:
        self.ac.power = not self.ac.power
        self.ac.last_action = type(self.ac.last_action)("REMOTE 電源", "開機" if self.ac.power else "關機")
        self._append_log("REMOTE", "電源開機" if self.ac.power else "電源關機")
        self._refresh_state()

    def _remote_mode(self, mode: int) -> None:
        self.ac.raw_mode = mode
        self.ac.power = True
        self.ac.last_action = type(self.ac.last_action)("REMOTE 模式", MODES[mode])
        self._append_log("REMOTE", f"模式變更：{MODES[mode]}")
        self._refresh_state()

    def _remote_temperature(self, delta: int) -> None:
        self.ac.target_temperature = max(16.0, min(30.0, self.ac.target_temperature + delta))
        self._append_log("REMOTE", f"溫度變更：{self.ac.target_temperature:.1f} °C")
        self._refresh_state()

    def _remote_fan(self) -> None:
        values = (102, 20, 40, 60, 80, 100)
        try:
            index = values.index(self.ac.fan)
        except ValueError:
            index = 0
        self.ac.fan = values[(index + 1) % len(values)]
        self._append_log("REMOTE", f"風量變更：{FANS[self.ac.fan]}")
        self._refresh_state()

    def _remote_swing(self) -> None:
        values = (0x00, 0x0C, 0x03, 0x0F)
        self.ac.swing = values[(values.index(self.ac.swing) + 1) % len(values)] if self.ac.swing in values else values[0]
        self._append_log("REMOTE", f"擺風變更：{SWINGS[self.ac.swing]}")
        self._refresh_state()

    def _toggle_cycle(self) -> None:
        if not self.cycle_enabled.get():
            self.cycle.stop()
            if self.cycle_next_round_job:
                self.after_cancel(self.cycle_next_round_job)
                self.cycle_next_round_job = None
            self.cycle_status.set("待機")
            self.cycle_remaining.set("--")
            self._append_log("CYCLE", "防霉穩定度測試停止")
            return
        try:
            seconds = max(1, int(self.cycle_run_seconds.get()))
        except (tk.TclError, ValueError):
            self.cycle_enabled.set(False)
            messagebox.showwarning("參數錯誤", "每輪冷房運轉時間必須是 1 秒以上的整數。")
            return
        if not (self.worker and self.worker.is_alive()):
            self.cycle_enabled.set(False)
            messagebox.showwarning("尚未連線", "請先連線 DT-06，再啟用穩定度測試。")
            return
        self.cycle = StabilityCycle(seconds)
        self.cycle.start()
        self.cycle_last_tick = time.monotonic()
        self._remote_mode(2)
        self._append_log("CYCLE", f"第 1 次開始，冷房運轉 {seconds} 秒")
        self._cycle_tick()

    def _cycle_tick(self) -> None:
        if not self.cycle_enabled.get() or not self.cycle.active:
            return
        now = time.monotonic()
        event = self.cycle.advance(now - self.cycle_last_tick)
        self.cycle_last_tick = now
        if event == "remote_off":
            self.ac.power = False
            self.ac.last_action = type(self.ac.last_action)("REMOTE 關機", "等待 DT-06 防霉")
            self._append_log("REMOTE", "冷房時間到，遙控器關機；等待 DT-06 防霉")
            self._refresh_state()
        self._refresh_cycle_ui()
        self.after(100, self._cycle_tick)

    def _observe_cycle_frame(self, frame) -> None:
        if frame.frame_type != DEVICE_CONTROL or len(frame.body) < 2 or frame.body[0] != 0x40:
            return
        if frame.body[1] & 0x01:
            return
        if self.cycle.observe_dt06_off():
            self._append_log("CYCLE", f"第 {self.cycle.completed_rounds} 次防霉完成，進入下一輪")
            self._refresh_cycle_ui()
            self.cycle_next_round_job = self.after(100, self._begin_next_cycle_round)

    def _begin_next_cycle_round(self) -> None:
        self.cycle_next_round_job = None
        if not self.cycle_enabled.get() or not self.cycle.active:
            return
        self.cycle.begin_next_round()
        self.cycle_last_tick = time.monotonic()
        self._remote_mode(2)
        self._refresh_cycle_ui()
        self._append_log("CYCLE", f"第 {self.cycle.round_number} 次開始")

    def _refresh_cycle_ui(self) -> None:
        self.cycle_round.set(f"第 {self.cycle.round_number} 次（完成 {self.cycle.completed_rounds} 次）")
        self.cycle_status.set(self.cycle.state)
        self.cycle_remaining.set(f"剩餘 {self.cycle.remaining_seconds:.1f} 秒" if self.cycle.state == StabilityCycle.COOLING else "")

    def refresh_ports(self) -> None:
        if list_ports is None:
            self.port_box["values"] = ()
            self.vars["connection"].set("缺少 pyserial")
            return
        values = [f"{port.device}｜{port.description}" for port in list_ports.comports()]
        self.port_box["values"] = values
        ch340 = next((i for i, value in enumerate(values) if "CH340" in value.upper() or "CH341" in value.upper()), None)
        if ch340 is None:
            self.port_box.set("")
        else:
            self.port_box.current(ch340)

    def toggle_connection(self) -> None:
        if self.worker and self.worker.is_alive():
            self.stop_event.set()
            return
        if serial is None:
            messagebox.showerror("無法啟動", "缺少 pyserial；請執行 simulator\\run.ps1 安裝/啟動相依環境。")
            return
        selected = self.port_box.get()
        if not selected:
            messagebox.showwarning("尚未選擇", "請接上 CH340 後按重新掃描。")
            return
        port = selected.split("｜", 1)[0]
        if "CH340" not in selected.upper() and "CH341" not in selected.upper():
            if not messagebox.askyesno("不是 CH340", f"{selected}\n看起來不是 CH340，仍要連線嗎？"):
                return
        self.stop_event.clear()
        self.worker = threading.Thread(target=self._serial_worker, args=(port,), daemon=True)
        self.worker.start()

    def _serial_worker(self, port: str) -> None:
        parser = FrameStream()
        last_tick = time.monotonic()
        try:
            with serial.Serial(port, 9600, bytesize=8, parity="N", stopbits=1, timeout=0.05) as connection:
                self.serial_port = connection
                self.events.put(("connected", port))
                while not self.stop_event.is_set():
                    now = time.monotonic()
                    actions = self.ac.advance(now - last_tick)
                    last_tick = now
                    for action in actions:
                        self.events.put(("action", action))
                    incoming = connection.read(256)
                    if not incoming:
                        continue
                    frames, errors = parser.feed(incoming)
                    for error in errors:
                        self.events.put(("error", error))
                    for frame in frames:
                        self.events.put(("rx", frame))
                        response, action = self.ac.handle(frame)
                        self.events.put(("action", action))
                        if response is not None and not self.drop_response_enabled:
                            delay = self.response_delay_ms / 1000.0
                            if delay:
                                time.sleep(delay)
                            connection.write(response)
                            connection.flush()
                            self.events.put(("tx", response))
        except Exception as exc:
            self.events.put(("disconnected", str(exc)))
        finally:
            self.serial_port = None
            self.events.put(("stopped", None))

    def _drain_events(self) -> None:
        while True:
            try:
                kind, payload = self.events.get_nowait()
            except queue.Empty:
                break
            if kind == "connected":
                self.vars["connection"].set(f"已連線 {payload}｜9600 8N1")
                self.connection_light.itemconfigure(self.connection_dot, fill="#1f9d55")
                self.connect_button.configure(text="中斷")
                self._append_log("SYSTEM", f"Connected {payload} at 9600 8N1")
            elif kind == "rx":
                self.vars["rx"].set(str(self.ac.valid_rx))
                self.vars["valid"].set("CRC / Checksum OK")
                self._observe_cycle_frame(payload)
                self._append_frame_log("DT06→AC", payload.raw)
            elif kind == "tx":
                self.vars["tx"].set(str(self.ac.tx_count))
                self._append_frame_log("AC→DT06", payload)
            elif kind == "action":
                self.vars["action"].set(f"{payload.name}｜{payload.detail}")
                if not (self.compact_log.get() and payload.name == "狀態查詢"):
                    self._append_log("DT06→AC", f"{payload.name}: {payload.detail}")
            elif kind == "error":
                self.vars["valid"].set("封包錯誤")
                self._append_log("ERROR", payload)
            elif kind == "disconnected":
                self._append_log("ERROR", payload)
                if self.cycle_enabled.get():
                    self.cycle_enabled.set(False)
                    self.cycle.stop()
                    self._append_log("CYCLE", "連線中斷，穩定度測試停止")
            elif kind == "stopped":
                self.vars["connection"].set("未連線")
                self.connection_light.itemconfigure(self.connection_dot, fill="#d64545")
                self.connect_button.configure(text="連線")
            self._refresh_state()
        self.after(50, self._drain_events)

    def _refresh_state(self) -> None:
        ac = self.ac
        self.vars["connection"].set(self.vars["connection"].get() or "未連線")
        self.vars["rx"].set(self.vars["rx"].get() or "0")
        self.vars["tx"].set(self.vars["tx"].get() or "0")
        self.vars["valid"].set(self.vars["valid"].get() or "等待封包")
        self.vars["power"].set("運轉" if ac.power else "關機")
        self.vars["mode"].set(MODES.get(ac.mode, f"未知 {ac.mode}"))
        self.vars["target"].set(f"{ac.target_temperature:.1f} °C")
        self.vars["indoor"].set(f"{ac.indoor_temperature:.1f} °C")
        self.vars["outdoor"].set(f"{ac.outdoor_temperature:.1f} °C")
        self.vars["fan"].set(FANS.get(ac.fan, str(ac.fan)))
        self.vars["swing"].set(SWINGS.get(ac.swing, f"0x{ac.swing:02X}"))
        self.vars["display"].set("開啟" if ac.display else "關閉")
        self.vars["preset"].set(ac.preset)
        self.vars["on_timer"].set(self._timer_text(ac.on_timer_minutes))
        self.vars["off_timer"].set(self._timer_text(ac.off_timer_minutes))
        self.vars["action"].set(self.vars["action"].get() or "等待 DT-06")

    @staticmethod
    def _timer_text(minutes: float | None) -> str:
        if minutes is None:
            return "未設定"
        return f"剩餘 {max(0, minutes):.0f} 分"

    def apply_temperatures(self) -> None:
        self.ac.indoor_temperature = float(self.indoor_input.get())
        self.ac.outdoor_temperature = float(self.outdoor_input.get())
        self._refresh_state()
        self._append_log("SIM", f"temperatures indoor={self.ac.indoor_temperature}, outdoor={self.ac.outdoor_temperature}")

    def _update_fault_settings(self, *_args) -> None:
        self.drop_response_enabled = bool(self.drop_responses.get())
        try:
            self.response_delay_ms = max(0, int(self.delay_ms.get()))
        except (tk.TclError, ValueError):
            self.response_delay_ms = 0

    def _append_log(self, direction: str, message: str) -> None:
        stamp = time.strftime("%H:%M:%S")
        self.log.insert("end", f"{stamp} [{direction:<9}] {message}\n")
        self.log.see("end")

    def _append_frame_log(self, direction: str, raw: bytes) -> None:
        if self.compact_log.get():
            try:
                frame = parse_frame(raw)
            except ValueError:
                frame = None
            if frame is not None:
                if frame.frame_type == DEVICE_QUERY and frame.body and frame.body[0] == 0x41:
                    return
                if frame.body and frame.body[0] == 0xC0:
                    return
        self._append_log(direction, hex_bytes(raw))

    def _close(self) -> None:
        self.stop_event.set()
        self.destroy()


if __name__ == "__main__":
    SimulatorApp().mainloop()
