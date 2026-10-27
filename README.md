# DT-06 FINAL 三洋冷氣 UART 模擬器

這個專案把電腦模擬成冷氣室內機：已燒入 FINAL 韌體的 DT-06 透過
CH340 連到電腦後，程式會在 9600 8N1 接收 DT-06 封包、顯示冷氣動作，
並回傳 Midea/Sanyo UART 狀態封包。

## 啟動

最簡單的方法：直接雙擊專案最外層的：

```text
DT06_三洋冷氣模擬器.exe
```

不需要安裝 Python，也不需要輸入指令。

## 換到另一台電腦開發

第一步：安裝 Git 與 Python 3。

第二步：從 Git 下載本專案後，直接雙擊專案最外層的 `setup-dev.bat`。
這會建立專案自己的 `.venv`、安裝開發套件，並執行自動測試。

第三步：修改原始碼後，直接雙擊 `build-exe.bat`。
新的 EXE 會放在 `build-output\DT06_Sanyo_AC_Simulator.exe`，不會覆蓋 Git 裡的既有第一版 EXE。

這兩個 `.bat` 都是純文字的 Windows 指令檔，檔案內有逐行中文註解；
可以用記事本開啟閱讀，不需要先懂 Python。

原始碼開發模式才使用下面指令：

```powershell
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run.ps1
```

接上 CH340 後按「重新掃描」，選擇顯示 CH340/CH341 的 COM 埠，再按
「連線」。沒有偵測到 CH340 時不會自動選取其他藍牙 COM 埠。

## 畫面與模擬內容

- CH340 連線及 RX/TX 封包燈號與計數。
- 外層 checksum、內層 CRC 與封包同步檢查。
- 電源、模式、設定溫度、室內/室外溫度。
- 自動、靜音、低、中、高、強力風量。
- 上下、左右、雙向擺風。
- 面板燈、蜂鳴提示、ECO/強力/睡眠狀態。
- 冷氣主機端開機/關機定時及獨立倒數。
- 能力查詢、每秒狀態查詢及耗電查詢回應。
- 可調回應延遲或故意不回應，用來驗證 DT-06 的重試與逾時。
- 完整十六進位 UART 封包紀錄與中文動作解讀。

網頁版模擬器位於 `simulator-web\dt06_ac_simulator.html`，與 Python 桌面版是獨立程式，
不能同時連接同一個 COM 埠。FINAL 韌體仍使用板端倒數；本次沒有修改韌體。模擬器已能模擬冷氣
主機端定時，供日後在工程頁加入「板端／機器端倒數」切換時測試。

## 自動驗證

```powershell
powershell -ExecutionPolicy Bypass -File .\simulator-desktop\run-tests.ps1
```

實機端到端驗證仍需要 CH340 顯示為已連線的 COM 埠。
