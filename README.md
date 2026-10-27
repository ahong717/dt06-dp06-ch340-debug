# DT-06 FINAL 三洋冷氣 UART 模擬器

這個專案把 Windows 電腦模擬成三洋冷氣室內機：已燒入 FINAL 韌體的 DT-06
透過 CH340 接到電腦，桌面程式接收 DT-06 的 UART 封包、顯示冷氣狀態，並回傳冷氣狀態封包。

## 先選你要做什麼

| 目的 | 從哪裡開始 |
|---|---|
| 只想使用已打包程式 | [一般使用者指南](docs/USER-GUIDE.md) |
| 在另一台電腦修改、測試、重新建置 | [開發者指南](docs/DEVELOPER-GUIDE.md) |
| 接 DT-06 + CH340 做實機驗證 | [硬體驗證指南](docs/HARDWARE-TEST.md) |
| 查看每個檔案放在哪裡 | [專案結構](PROJECT_STRUCTURE.md) |

## 最快啟動

直接雙擊根目錄的 `DT06_三洋冷氣模擬器.exe`，不需要 Python。第一次使用 CH340 的電腦可能需要
WCH 官方 CH340/CH341 驅動；裝置管理員應看到 USB-SERIAL CH340/CH341 及 COM 編號。

若 Windows 顯示 SmartScreen 警告，確認檔案來源後按「其他資訊」→「仍要執行」。

## 開發與測試入口

第一次在新電腦建立環境：雙擊 `setup-dev.bat`。修改程式後：雙擊 `build-exe.bat`，產物在
`build-output\\DT06_Sanyo_AC_Simulator.exe`。詳細步驟請看[開發者指南](docs/DEVELOPER-GUIDE.md)。

## 目前模擬範圍

電源、冷房/除濕/送風/暖房/自動、溫度、風量、擺風、面板燈、定時、能力查詢、狀態查詢、耗電查詢、
UART 封包紀錄，以及可選的實體遙控器模擬與防霉穩定度循環測試。

`simulator-web/` 是獨立瀏覽器版，不能和桌面版同時開啟同一個 COM 埠。Firebase 不屬於目前 DT-06
模擬器功能，本專案不依賴它；韌體也未在本次修改範圍內。
