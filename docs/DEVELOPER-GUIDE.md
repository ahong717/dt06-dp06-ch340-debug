# 開發者指南 (Developer Guide)

本指南提供一套可重複的流程，讓新開發者在 Windows 電腦建立環境、執行測試、建置候選 EXE，並在驗證完成後準備正式發布包。

## 1. 環境需求與準備

- **作業系統：** Windows 10 / 11
- **版本控制：** Git
- **Python：** 3.10 以上；本專案已在 Python 3.12 測試
- **硬體驗證才需要：** DT-06、CH340、相容的 UART 線材

安裝 Python 時建議勾選 **Add python.exe to PATH**，讓命令列能找到 Python。若只使用現成 EXE，不需要安裝 Python。

## 2. 第一次建立環境

從 GitHub Clone 儲存庫後，在專案根目錄雙擊 `setup-dev.bat`。

這個腳本會建立 `.venv` 專案專用環境並安裝固定版本的開發套件。`.venv` 是每台電腦自己的工作環境，不需要從 GitHub 下載，也不會修改系統 Python 已安裝的套件。

完成後可用下列指令確認：

```powershell
.\.venv\Scripts\python.exe --version
```

## 3. 日常開發與除錯

所有指令都從專案根目錄執行。

### 啟動桌面模擬器

```powershell
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run.ps1
```

這會以原始 Python 程式啟動桌面模擬器，適合修改程式後快速檢查介面與行為。

### 執行自動測試

```powershell
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run-tests.ps1
```

這些測試檢查協議解析、狀態控制、能力回報、定時與防霉循環狀態機，不需要 DT-06 或 COM 埠。修改 `ac_emulator.py` 或 `midea_protocol.py` 後，應先跑完測試再建置。

`midea_protocol.py` 是 UART 封包編解碼核心。若需求只是新增冷氣狀態或測試行為，優先在 `ac_emulator.py` 與介面層處理；只有協議格式本身改變時才修改它，並且必須同步更新測試。

## 4. 建置候選 EXE

自動測試通過後，雙擊 `build-exe.bat`。候選檔會產生在：

```text
build-output\DT06_Sanyo_AC_Simulator.exe
```

候選 EXE 是由目前原始碼建出的測試版本；它與正式發布包的程式內容相同，但尚未完成必要的硬體驗證，因此不能直接當成正式版本提供下載。

## 5. DT-06 / CH340 實機驗證

將候選 EXE 與已燒錄韌體的 DT-06 連接，依照[硬體驗證指南](HARDWARE-TEST.md)確認 UART、冷氣狀態、遙控器操作與防霉循環。測試結果應記錄在發布說明或測試紀錄中。

## 6. 準備正式發布包

硬體驗證完成後，使用新的版本號執行：

```bat
release-exe.bat 1.1.1
```

腳本會再次執行自動測試，並在 `release\v1.1.1` 產生版本化 EXE、`SHA256.txt` 校驗碼及 `RELEASE-NOTES.txt` 發布說明。

這個動作不會覆蓋根目錄的舊 EXE，也不會自動上傳 GitHub。確認候選 EXE 與硬體測試結果後，將上述檔案上傳到 GitHub Release。

## 7. Commit、Push 與 Release 的差異

| 名稱 | 用途 | 是否代表正式可下載版本 |
|---|---|---|
| Commit | 保存一次原始碼修改 | 否 |
| Push | 將 Commit 同步到 GitHub | 否 |
| GitHub Release | 提供已驗證 EXE 與版本說明 | 是 |

原始碼可以先 Push 作為開發備份，但未完成測試時，不應建立正式 Release 或宣稱 EXE 已驗證。
