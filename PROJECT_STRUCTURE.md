# DT-06 三洋冷氣 UART 模擬器｜專案結構

## 交付內容

- `DT06_三洋冷氣模擬器.exe`：Windows 使用者直接執行的桌面模擬器。
- `README.md`：啟動與操作說明。

## 可維護原始碼

- `simulator-desktop/app.py`：視窗、CH340 串列埠與事件顯示。
- `simulator-desktop/ac_emulator.py`：虛擬冷氣狀態機。
- `simulator-desktop/midea_protocol.py`：Midea/Sanyo UART 封包編解碼；已驗證的核心通訊檔案。
- `simulator-desktop/run.ps1`：開發模式啟動腳本。
- `tests/`：自動測試。

## 獨立網頁版

- `simulator-web/dt06_ac_simulator.html`：使用瀏覽器 Web Serial 的獨立網頁模擬器。

## 韌體參考

- `reference/AirConditioner-FINAL-1.1.0/`：FINAL 韌體、文件與 Release 檔案。
- `firmware-source/`：開發時使用的韌體原始碼副本；不要與 `reference` 混用。

## 不納入 Git 版本的建置快取

- `build-cache/`：PyInstaller 建置產物、建置工具、PlatformIO 套件與 Python 快取。

這些檔案可以重新產生，不是模擬器執行所需的產品原始碼。
