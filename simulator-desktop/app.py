from __future__ import annotations

import queue
import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk

from ac_emulator import FANS, MODES, SWINGS, VirtualAirConditioner
from midea_protocol import FrameStream, hex_bytes

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
        self.geometry("1120x760")
        self.minsize(940, 650)
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

        connection = ttk.Frame(self, padding=14, style="Card.TFrame")
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

        cards = ttk.Frame(self)
        cards.pack(fill="x", padx=12, pady=4)
        for column, (key, title) in enumerate((("rx", "RX 收到"), ("tx", "TX 回傳"), ("valid", "有效封包"), ("action", "最近動作"))):
            card = ttk.Frame(cards, padding=12, style="Card.TFrame")
            card.grid(row=0, column=column, sticky="nsew", padx=4, pady=4)
            cards.columnconfigure(column, weight=1)
            ttk.Label(card, text=title, style="CardTitle.TLabel").pack(anchor="w")
            ttk.Label(card, textvariable=self.vars[key], style="CardValue.TLabel", wraplength=260).pack(anchor="w", pady=(4, 0))

        state = ttk.Frame(self)
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

        controls = ttk.Frame(self, padding=12, style="Card.TFrame")
        controls.pack(fill="x", padx=16, pady=8)
        ttk.Label(controls, text="模擬感測值：", background="white").pack(side="left")
        self.indoor_input = tk.DoubleVar(value=27)
        self.outdoor_input = tk.DoubleVar(value=30)
        ttk.Label(controls, text="室內", background="white").pack(side="left", padx=(10, 2))
        ttk.Spinbox(controls, from_=-20, to=60, increment=0.5, width=7, textvariable=self.indoor_input).pack(side="left")
        ttk.Label(controls, text="室外", background="white").pack(side="left", padx=(10, 2))
        ttk.Spinbox(controls, from_=-40, to=70, increment=0.5, width=7, textvariable=self.outdoor_input).pack(side="left")
        ttk.Button(controls, text="套用並在下次查詢回報", command=self.apply_temperatures).pack(side="left", padx=10)

        log_frame = ttk.Frame(self, padding=8, style="Card.TFrame")
        log_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        ttk.Label(log_frame, text="UART 封包與解讀紀錄", background="white", font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(0, 6))
        self.log = tk.Text(log_frame, height=12, font=("Consolas", 9), bg="#0b1f33", fg="#d9eaf7", insertbackground="white", wrap="none")
        self.log.pack(fill="both", expand=True)

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
                self._append_log("DT06→AC", hex_bytes(payload.raw))
            elif kind == "tx":
                self.vars["tx"].set(str(self.ac.tx_count))
                self._append_log("AC→DT06", hex_bytes(payload))
            elif kind == "action":
                self.vars["action"].set(f"{payload.name}｜{payload.detail}")
                self._append_log("ACTION", f"{payload.name}: {payload.detail}")
            elif kind == "error":
                self.vars["valid"].set("封包錯誤")
                self._append_log("ERROR", payload)
            elif kind == "disconnected":
                self._append_log("ERROR", payload)
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

    def _close(self) -> None:
        self.stop_event.set()
        self.destroy()


if __name__ == "__main__":
    SimulatorApp().mainloop()
