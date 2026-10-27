# 開發者指南

需求：Windows、Git、Python 3.10 以上
（目前以 Python 3.12 測試）。

安裝 Python 時建議勾選`Add python.exe to PATH`。

複製儲存庫後，在根目錄雙擊 `setup-dev.bat`。

`.venv` 是專案專用的 Python 虛擬環境，不會改壞系統 Python。它是每台電腦自己的工作環境，複製專案後由 `setup-dev.bat` 重新建立，不需要從 GitHub 下載。

```powershell
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run.ps1
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run-tests.ps1
```

測試不需要 CH340 或 DT-06。
要產生候選 EXE，雙擊 `build-exe.bat`，產物在 `build-output\\DT06_Sanyo_AC_Simulator.exe`。候選檔只能用於測試，不能直接當成正式發布檔。

## 驗證後發布 EXE

確認候選 EXE 通過自動測試與必要的 UART/CH340 實機測試後，執行：

```bat
release-exe.bat 1.1.1
```

腳本會再次執行自動測試，然後在 `release\\v1.1.1` 產生 EXE、SHA256 紀錄和發布說明。它不會覆蓋根目錄的舊 EXE，也不會自動上傳 GitHub。確認後，將這三個檔案上傳到 GitHub Release，版本號必須與測試結果一致。

GitHub 的 Commit 是開發歷程；GitHub Release 才是提供給一般使用者下載的正式版本。
請勿任意修改已驗證的 `midea_protocol.py`。
