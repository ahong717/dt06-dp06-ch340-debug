# 開發者指南

需求：Windows、Git、Python 3.10 以上
（目前以 Python 3.12 測試）。

安裝 Python 時建議勾選`Add python.exe to PATH`。

複製儲存庫後，在根目錄雙擊 `setup-dev.bat`。

`.venv` 是專案專用的 Python 虛擬環境，不會改壞系統 Python；它被 `.gitignore` 排除，不會提交到 Git。

```powershell
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run.ps1
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run-tests.ps1
```

測試不需要 CH340 或 DT-06。
要產生 EXE，雙擊 `build-exe.bat`，產物在 `build-output\\DT06_Sanyo_AC_Simulator.exe`。
請勿任意修改已驗證的 `midea_protocol.py`。
