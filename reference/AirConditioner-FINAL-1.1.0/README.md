# Air Conditioner Controller FINAL 1.1.0

這是可獨立技術移轉、重新編譯與部署的完整發布包。

## 資料夾

- `Source/`：ESPHome YAML、本機網頁與 Firebase REST Streaming／SSE 元件原始碼。
- `Hosting/public/`：Firebase Hosting PWA；日常操作會在本機直連與雲端連線間自動切換。
- `database.rules.json`：Realtime Database 擁有者、配對、命令與觀看租約規則。
- `Release/`：可直接使用的首次燒錄檔、OTA 更新檔及 SHA-256 校驗碼。
- `Documentation/01-USER-MANUAL.md`：安裝、配網、操作與故障排除。
- `Documentation/02-DESIGN-TRANSFER-SPEC.md`：硬體、韌體、網頁、狀態機、介面契約、編譯與驗收規範。
- `Documentation/03-DT-06-CLOUD-RESOURCE-FIRST-SPEC.md`：早期雲端增量草案，已由完整 `02-DESIGN-TRANSFER-SPEC.md` 取代，不作為獨立封裝依據。

## 使用哪個韌體檔

- 已有 ESPHome 韌體的裝置，從裝置網頁更新：`Release/air-conditioner-final-ota.bin`
- 全新板子第一次以 USB／UART 燒錄：`Release/air-conditioner-final-factory.bin`

請勿把 `factory.bin` 當成網頁 OTA 檔。

## Wi-Fi 配網原則

韌體不預載任何家用 Wi-Fi SSID 或密碼。每片 ESP8285 會把 MAC 位址末三個位元組加入裝置名稱，例如：

```text
air-conditioner-a1b2c3
```

無法連上已儲存的 Wi-Fi 達 30 秒後，裝置以自己的唯一名稱開啟設定 AP；AP 密碼為 `12345678`。

## 原始碼相依關係

三個來源檔必須置於同一資料夾：

```text
air-conditioner-final.yaml
air-conditioner-final.css
air-conditioner-final.js
air-conditioner-final-preview.html
```

YAML 在編譯時將 CSS 與 JavaScript 壓縮並嵌入韌體，裝置網頁不依賴網際網路或外部 CDN。`preview.html` 是離線視覺模板，只用於設計檢視，不參與韌體編譯。

## 核心操作

- 首頁不設獨立開機按鈕。
- 選擇自動、冷氣、暖氣、除濕或送風會直接開機或切換模式。
- 選擇「關閉」會直接關機。
- HAOS Climate、本機頁面及 Firebase PWA 使用相同語意。
- 風量與溫度在關機時停用，選擇運轉模式後才可調整。

## Firebase 與帳號

- 專案：`ESP8266AC`（`esp8266ac-1e0f0`）。
- PWA：`https://esp8266ac-1e0f0.web.app`。
- 使用者以自己的 Email 與自行設定的 AC Cloud 密碼註冊；不是 Google 密碼，也不是 Firebase Console 密碼。
- DT-06 接收遠端命令使用 Firebase Realtime Database REST Streaming／SSE，並未使用 WebSocket。
- 模式或溫度實際改變時立即同步；有人開啟 PWA 時以觀看租約保活，無人觀看且狀態不變時每 15 分鐘回報一次。
- 每台裝置有獨立本機存取權杖。只有裝置擁有者能由 Firebase 讀取，PWA 本機 API 與雲端命令共用 `request_id` 去重。

## 硬體按鍵與提示音

- SW1 是 GPIO0 燒錄鍵，SW2 是 Reset；兩者不是一般功能按鈕。
- GPIO4 LED 顯示 Firebase 連線狀態。
- Midea BEEP 開關已提供本機及 Home Assistant 實體；只有原廠機型與協定實際支援時才會生效。
