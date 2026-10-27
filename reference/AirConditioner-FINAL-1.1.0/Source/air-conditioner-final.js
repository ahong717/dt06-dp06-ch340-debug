(() => {
  "use strict";

  const E = {
    climate: ["climate", "Climate"],
    outdoor: ["sensor", "Outdoor Temperature"],
    indoor: ["sensor", "Indoor Temperature"],
    target: ["sensor", "Target Temperature"],
    display: ["switch", "Display Light"],
    beeper: ["switch", "Beeper"],
    firebaseCloud: ["switch", "Firebase Cloud Realtime Sync"],
    firebaseStatus: ["text_sensor", "Firebase Realtime Sync Status"],
    firebaseDeviceId: ["text_sensor", "Firebase Device ID"],
    firebasePairingCode: ["text_sensor", "Firebase Pairing Code"],
    firebaseOwnerEmail: ["text_sensor", "Firebase Owner Email"],
    regeneratePairing: ["button", "Regenerate Firebase Pairing Code"],
    removeOwner: ["button", "Remove Firebase Cloud Owner"],
    factoryReset: ["button", "Factory Reset"],
    minutes: ["number", "Countdown Minutes"],
    timerMode: ["select", "Countdown ON Mode"],
    timerTemp: ["select", "Countdown ON Temperature"],
    timerFan: ["select", "Countdown ON Fan"],
    timerOn: ["button", "倒數後開機 ON"],
    timerOff: ["button", "倒數後關機 OFF"],
    timerCancel: ["button", "Cancel Countdown"],
    remaining: ["text_sensor", "Countdown Remaining"],
    timerStatus: ["text_sensor", "Countdown Status"],
    timerPlan: ["text_sensor", "Countdown Plan"],
    mildewAuto: ["switch", "Mildew Proof Auto"],
    mildewDuration: ["number", "Mildew Proof Duration"],
    mildewDelay: ["number", "Mildew Proof Start Delay"],
    mildewStart: ["button", "Start Mildew Proof"],
    mildewPowerOff: ["button", "Mildew Power Off"],
    mildewCancel: ["button", "Cancel Mildew Proof"],
    mildewActive: ["binary_sensor", "Mildew Proof Status"],
    mildewDelayActive: ["binary_sensor", "Mildew Proof Delay Status"],
    mildewRemaining: ["text_sensor", "Mildew Proof Countdown"],
    logger: ["select", "診斷日誌等級"]
  };

  const fanValues = [
    { zh: "自動", en: "AUTO", key: "AUTO", timer: "自動" },
    { zh: "寂靜", en: "SILENT", key: "Silent", timer: "靜音" },
    { zh: "弱風", en: "LOW", key: "LOW", timer: "低" },
    { zh: "中等", en: "MEDIUM", key: "MEDIUM", timer: "中" },
    { zh: "強風", en: "HIGH", key: "HIGH", timer: "高" },
    { zh: "強力", en: "TURBO", key: "Turbo", timer: "強力" }
  ];

  const modeValues = [
    { zh: "自動運轉", en: "AUTO", key: "HEAT_COOL", timer: "自動" },
    { zh: "冷氣", en: "COOL", key: "COOL", timer: "冷氣" },
    { zh: "除濕", en: "DRY", key: "DRY", timer: "除濕" },
    { zh: "送風", en: "FAN", key: "FAN_ONLY", timer: "送風" },
    { zh: "暖氣", en: "HEAT", key: "HEAT", timer: "暖氣" }
  ];

  const text = {
    zh: {
      title: "冷氣控制",
      connected: "已連線",
      offline: "連線中斷",
      indoor: "室內溫度",
      outdoor: "室外溫度",
      target: "目標溫度",
      currentStatus: "目前狀態",
      running: "運轉中",
      stopped: "已關機",
      modeStatus: "運轉模式",
      noData: "無資料",
      on: "開機",
      off: "關機",
      powerControl: "冷氣控制",
      mobileMain: "主要控制",
      mobileAdvanced: "進階設定",
      mobileSystem: "系統",
      mildewPowerOff: "防霉關機",
      immediatePowerOff: "直接關機",
      timer: "預約開關機",
      schedulePower: "預約開關機",
      timerAction: "時間到",
      minute: "分鐘",
      minutesLater: "分鐘後",
      tensPlus: "十位＋",
      onesPlus: "個位＋",
      tensMinus: "十位－",
      onesMinus: "個位－",
      timedOn: "開機",
      timedOff: "關機",
      cancel: "取消",
      mode: "運轉模式",
      choose: "未選擇",
      auto: "自動",
      autoMode: "自動運轉",
      cool: "冷氣",
      heat: "暖氣",
      fanOnly: "送風",
      dry: "除濕",
      fan: "風量",
      weaker: "－ 減弱",
      stronger: "＋ 增強",
      temperature: "溫度",
      temperatureHint: "拖曳後放開即套用",
      vertical: "上下擺風",
      horizontal: "左右擺風",
      display: "室內機面板顯示",
      displayShort: "面板顯示",
      beeper: "按鍵提示音",
      cloudSettings: "雲端與擁有者",
      cloudEnable: "啟用 Firebase 雲端即時同步",
      cloudStatus: "連線狀態",
      deviceId: "裝置 ID",
      pairingCode: "配對碼（有效 10 分鐘）",
      ownerEmail: "目前擁有者 Email",
      regeneratePairing: "重新產生配對碼",
      removeOwner: "解除雲端綁定",
      factoryReset: "恢復原廠設定",
      swingPanel: "擺風與面板",
      mildew: "防霉",
      mildewAuto: "關機後自動防霉",
      mildewAutoOn: "自動防霉：已啟用",
      mildewAutoOff: "自動防霉：已停用",
      mildewDuration: "運轉時間",
      mildewDelay: "啟動延遲",
      mildewStart: "執行防霉送風",
      mildewCancel: "停止防霉",
      mildewRunning: "防霉送風進行中",
      mildewWaiting: "等待啟動防霉",
      mildewIdle: "目前未執行",
      mildewBannerDetail: "僅送風 · 時間到自動關機",
      second: "秒",
      diagnostic: "診斷記錄",
      logOutput: "顯示診斷記錄",
      logLevel: "記錄詳細程度",
      error: "僅錯誤",
      warning: "警告與錯誤",
      information: "一般資訊",
      debug: "詳細除錯",
      firmwareUpdate: "韌體更新",
      firmwareUpdateHint: "選擇 OTA .bin 韌體檔。更新期間請保持裝置供電。",
      chooseFirmware: "選擇韌體檔",
      installFirmware: "開始更新",
      firmwareMissing: "請先選擇 .bin 韌體檔。",
      firmwareConfirm: "確定要更新韌體嗎？更新期間請勿斷電。",
      firmwareUploading: "正在上傳並更新…",
      timerInstructionsTitle: "預約開關機按鈕說明",
      timerInstructions: "短按為 ±1 分鐘；按住 200ms 後連續 ±1；按住 800ms 後改為 ±10；按住 1300ms 後改為 ±100。範圍為 000～999。開機預覽會列出模式、風量與溫度；送風模式不顯示溫度。",
      timerNeedsTime: "請先設定倒數分鐘。",
      timerNeedsSettings: "倒數開機前請選擇模式與風量；送風模式不需溫度。",
      timerStartedOn: "已設定倒數開機。",
      timerStartedOnDefaults: "已設定倒數開機；未選欄位已自動補上送風、中等與室溫預設值。",
      timerStartedOff: "已設定倒數關機。",
      timerCancelled: "已取消倒數。",
      timerIdle: "預覽：尚未設定倒數動作",
      timerWaitingOn: "等待定時開機",
      timerWaitingOff: "等待定時關機",
      timerRemaining: "剩餘",
      timerPlanOn: "預計開機",
      timerPlanOff: "預計關機",
      sending: "指令傳送中…",
      commandSent: "指令已送出。",
      commandFailed: "指令傳送失敗，請檢查連線。"
    },
    en: {
      title: "AIR CONDITIONER",
      connected: "CONNECTED",
      offline: "DISCONNECTED",
      indoor: "INDOOR",
      outdoor: "OUTDOOR",
      target: "SET TEMP",
      currentStatus: "CURRENT STATUS",
      running: "RUNNING",
      stopped: "POWERED OFF",
      modeStatus: "MODE",
      noData: "N/A",
      on: "POWER ON",
      off: "POWER OFF",
      powerControl: "POWER CONTROL",
      mobileMain: "CONTROL",
      mobileAdvanced: "ADVANCED",
      mobileSystem: "SYSTEM",
      mildewPowerOff: "DRY THEN OFF",
      immediatePowerOff: "POWER OFF",
      timer: "ON/OFF TIMER",
      schedulePower: "ON/OFF TIMER",
      timerAction: "WHEN TIMER ENDS",
      minute: "MIN",
      minutesLater: "MIN LATER",
      tensPlus: "Tens +",
      onesPlus: "Ones +",
      tensMinus: "Tens −",
      onesMinus: "Ones −",
      timedOn: "POWER ON",
      timedOff: "POWER OFF",
      cancel: "CANCEL",
      mode: "MODE",
      choose: "Not selected",
      auto: "AUTO",
      autoMode: "AUTO",
      cool: "COOL",
      heat: "HEAT",
      fanOnly: "FAN",
      dry: "DRY",
      fan: "FAN SPEED",
      weaker: "− Lower",
      stronger: "+ Higher",
      temperature: "TEMPERATURE",
      temperatureHint: "Release the slider to apply",
      vertical: "UP / DOWN",
      horizontal: "LEFT / RIGHT",
      display: "Indoor unit display",
      displayShort: "DISPLAY",
      beeper: "BEEPER",
      cloudSettings: "CLOUD & OWNER",
      cloudEnable: "ENABLE FIREBASE CLOUD SYNC",
      cloudStatus: "CONNECTION STATUS",
      deviceId: "DEVICE ID",
      pairingCode: "PAIRING CODE (10 MINUTES)",
      ownerEmail: "OWNER EMAIL",
      regeneratePairing: "NEW PAIRING CODE",
      removeOwner: "REMOVE CLOUD OWNER",
      factoryReset: "FACTORY RESET",
      swingPanel: "SWING & PANEL",
      mildew: "ANTI-MOLD DRYING",
      mildewAuto: "Automatic drying after shutdown",
      mildewAutoOn: "AUTO DRYING: ON",
      mildewAutoOff: "AUTO DRYING: OFF",
      mildewDuration: "RUN TIME",
      mildewDelay: "START DELAY",
      mildewStart: "START DRYING CYCLE",
      mildewCancel: "Stop drying cycle",
      mildewRunning: "Drying cycle in progress",
      mildewWaiting: "Waiting to start drying cycle",
      mildewIdle: "Not active",
      mildewBannerDetail: "High fan · Powers off automatically",
      second: "SEC",
      diagnostic: "DIAGNOSTICS",
      logOutput: "SHOW DIAGNOSTIC LOG",
      logLevel: "Log Detail Level",
      error: "Errors Only",
      warning: "Warnings & Errors",
      information: "General Information",
      debug: "Detailed Debugging",
      firmwareUpdate: "FIRMWARE UPDATE",
      firmwareUpdateHint: "Choose an OTA .bin file. Keep the device powered during the update.",
      chooseFirmware: "CHOOSE FIRMWARE",
      installFirmware: "INSTALL UPDATE",
      firmwareMissing: "Choose a .bin firmware file first.",
      firmwareConfirm: "Install this firmware now? Keep the device powered during the update.",
      firmwareUploading: "UPLOADING UPDATE…",
      timerInstructionsTitle: "How to set the timer",
      timerInstructions: "Tap to change by 1 minute. Keep holding to change faster: 10 minutes, then 100 minutes at a time. Range: 000–999. For timed power-on, choose the mode, fan speed and temperature. Fan mode does not use a temperature setting.",
      timerNeedsTime: "Set the countdown minutes first.",
      timerNeedsSettings: "Select mode and fan speed; temperature is not required for Fan only.",
      timerStartedOn: "Timed power-on is set.",
      timerStartedOnDefaults: "Timed power-on is set; missing fields used Fan only, Medium and room-temperature defaults.",
      timerStartedOff: "Timed power-off is set.",
      timerCancelled: "Countdown cancelled.",
      timerIdle: "No timer is currently set",
      timerWaitingOn: "Timer active · Power on when time ends",
      timerWaitingOff: "Timer active · Power off when time ends",
      timerRemaining: "Remaining",
      timerPlanOn: "Scheduled power on",
      timerPlanOff: "Scheduled power off",
      sending: "Sending command…",
      commandSent: "Command sent.",
      commandFailed: "Command failed. Check the connection."
    }
  };

  const pageParams = new URLSearchParams(location.search);
  let language = pageParams.get("lang")?.toLowerCase() === "zh" ? "zh" : "en";
  const forceMobile = pageParams.get("mobile") === "1";
  let mobileTab = "main";
  let minutes = 0;
  let pendingMode = null;
  let pendingTemperature = null;
  let pendingFan = null;
  let sliderTemperature = null;
  let lastLogLevel = "INFO";
  let connected = false;
  const states = new Map();
  const logs = [];

  document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
  document.head.insertAdjacentHTML(
    "beforeend",
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  );
  document.body.innerHTML = `
    <main id="app">
      <header>
        <div>
          <h1 data-t="title"></h1>
          <span id="connection" class="connected offline"></span>
        </div>
        <div class="header-actions">
          <span class="version">FINAL 1.1.0</span>
          <button id="language" type="button">English</button>
        </div>
      </header>

      <nav class="mobile-tabs" aria-label="Mobile navigation">
        <button type="button" data-mobile-tab="main" data-t="mobileMain"></button>
        <button type="button" data-mobile-tab="advanced" data-t="mobileAdvanced"></button>
        <button type="button" data-mobile-tab="system" data-t="mobileSystem"></button>
      </nav>

      <div class="grid">
        <section class="card wide status-card">
          <div class="current-status">
            <div><div class="label" data-t="currentStatus"></div><div class="status-value" id="operating-state">—</div></div>
            <div><div class="label" data-t="modeStatus"></div><div class="status-value" id="mode-state">—</div></div>
            <div class="status-extra"><div class="label" data-t="target"></div><div class="status-value" id="status-target">—</div></div>
            <div class="status-extra"><div class="label" data-t="fan"></div><div class="status-value" id="status-fan">—</div></div>
          </div>
          <div class="readings">
            <div><div class="label" data-t="indoor"></div><div class="reading" id="indoor">—</div></div>
            <div><div class="label" data-t="outdoor"></div><div class="reading" id="outdoor">—</div></div>
            <div class="reading-target"><div class="label" data-t="target"></div><div class="reading" id="target-summary">—</div></div>
          </div>
        </section>

        <section id="mildew-banner" class="mildew-banner wide" hidden>
          <div id="mildew-banner-title"></div>
          <div id="mildew-banner-time">—</div>
          <div id="mildew-banner-detail"></div>
        </section>

        <section class="card wide power-timer-card" data-mobile-panel="main advanced">
          <div class="power-timer">
            <div class="control-group" data-mobile-panel="advanced">
              <h2 data-t="schedulePower"></h2>
              <div class="display"><span id="minutes">000</span><small data-t="minutesLater"></small></div>
              <div class="timer-step" aria-label="Adjust countdown time">
                <button class="timer-adjust" type="button" data-minute="1">+1</button>
                <button class="timer-adjust" type="button" data-minute="-1">-1</button>
              </div>
              <div class="timer-settings">
                <label><span data-t="mode"></span>
                  <select id="timer-mode-choice">
                    <option value="">—</option>
                    ${modeValues.map(item => `<option value="${item.key}">${item.zh}</option>`).join("")}
                  </select>
                </label>
                <label><span data-t="fan"></span>
                  <select id="timer-fan-choice">
                    <option value="">—</option>
                    ${fanValues.map((item, index) => `<option value="${index}">${item.zh}</option>`).join("")}
                  </select>
                </label>
                <label><span data-t="temperature"></span>
                  <select id="timer-temperature-choice">
                    <option value="">—</option>
                    ${Array.from({ length: 15 }, (_, index) => `<option value="${index + 16}">${index + 16} °C</option>`).join("")}
                  </select>
                </label>
              </div>
              <div class="timer-action-group">
                <span class="timer-action-label" data-t="timerAction"></span>
                <div class="timer-actions">
                  <button id="timer-on" type="button" data-t="timedOn"></button>
                  <button id="timer-off" type="button" data-t="timedOff"></button>
                  <button id="timer-cancel" type="button" data-t="cancel"></button>
                </div>
              </div>
            </div>
          </div>
          <div class="power-timer-footer" data-mobile-panel="advanced">
            <div id="timer-state" class="timer-preview"></div>
            <details class="requirements-note">
              <summary data-t="timerInstructionsTitle"></summary>
              <span data-t="timerInstructions"></span>
            </details>
          </div>
        </section>

        <section class="card wide mode-card" data-mobile-panel="main">
          <h2 data-t="mode"></h2>
          <div id="mode-buttons" class="choice-grid mode-grid">
            ${modeValues.map(item => `<button type="button" data-mode="${item.key}">${item.en}</button>`).join("")}
            <button type="button" class="mode-off" data-mode="OFF" data-t="off"></button>
          </div>
        </section>

        <section class="card wide fan-card" data-mobile-panel="main">
          <h2 data-t="fan"></h2>
          <div class="display" id="fan-value">—</div>
          <div id="fan-buttons" class="choice-grid fan-grid">
            ${fanValues.map((item, index) => `<button type="button" data-fan-index="${index}">${item.en}</button>`).join("")}
          </div>
        </section>

        <section class="card wide temp-swing-card" data-mobile-panel="main advanced">
          <div class="temp-swing-row">
            <div class="temperature-column" data-mobile-panel="main">
              <h2 data-t="temperature"></h2>
              <div class="display"><span id="temperature-value">—</span><small>°C</small></div>
              <div class="temperature-slider">
                <input id="temperature-slider" type="range" min="16" max="30" step="1" value="24">
                <div class="slider-scale"><span>16°C</span><span data-t="temperatureHint"></span><span>30°C</span></div>
              </div>
            </div>
            <div class="swing-column" data-mobile-panel="advanced">
              <h2 data-t="swingPanel"></h2>
              <div class="swing-panel">
                <button id="vertical" type="button" data-t="vertical"></button>
                <button id="horizontal" type="button" data-t="horizontal"></button>
                <button id="display" type="button" data-t="displayShort"></button>
                <button id="beeper" type="button" data-t="beeper"></button>
              </div>
            </div>
          </div>
        </section>

        <section class="card wide mildew-card" data-mobile-panel="advanced">
          <div class="mildew-column">
            <h2 data-t="mildew"></h2>
            <div class="mildew-header-row">
              <button id="mildew-auto" class="mildew-toggle" type="button" aria-pressed="false"></button>
              <div id="mildew-state" class="mildew-status">—</div>
            </div>
            <div class="mildew-params">
              <div class="mildew-param">
                <div class="label" data-t="mildewDuration"></div>
                <div class="display"><span id="mildew-duration">—</span><small data-t="minute"></small></div>
                <div class="mildew-time-buttons">
                  <button class="mildew-adjust" type="button" data-mildew-target="duration" data-step="1">+1</button>
                  <button class="mildew-adjust" type="button" data-mildew-target="duration" data-step="-1">-1</button>
                </div>
              </div>
              <div class="mildew-param">
                <div class="label" data-t="mildewDelay"></div>
                <div class="display"><span id="mildew-delay">—</span><small data-t="second"></small></div>
                <div class="mildew-time-buttons">
                  <button class="mildew-adjust delay-adjust" type="button" data-mildew-target="delay" data-step="1">+1</button>
                  <button class="mildew-adjust delay-adjust" type="button" data-mildew-target="delay" data-step="-1">-1</button>
                </div>
              </div>
            </div>
            <div class="mildew-actions">
              <button id="mildew-start" type="button" data-t="mildewStart"></button>
              <button id="mildew-cancel" type="button" data-t="off"></button>
            </div>
          </div>
        </section>

        <section class="card wide cloud-card" data-mobile-panel="system">
          <h2 data-t="cloudSettings"></h2>
          <button id="firebase-cloud" class="cloud-toggle" type="button" data-t="cloudEnable"></button>
          <dl class="cloud-details">
            <div><dt data-t="cloudStatus"></dt><dd id="firebase-status">—</dd></div>
            <div><dt data-t="deviceId"></dt><dd id="firebase-device-id">—</dd></div>
            <div><dt data-t="pairingCode"></dt><dd id="firebase-pairing-code">—</dd></div>
            <div><dt data-t="ownerEmail"></dt><dd id="firebase-owner-email">—</dd></div>
          </dl>
          <div class="cloud-actions">
            <button id="regenerate-pairing" type="button" data-t="regeneratePairing"></button>
            <button id="remove-owner" class="danger" type="button" data-t="removeOwner"></button>
            <button id="factory-reset" class="danger" type="button" data-t="factoryReset"></button>
          </div>
        </section>

        <details class="card diagnostic-card" data-mobile-panel="system" open>
          <summary data-t="diagnostic"></summary>
          <div class="diagnostic-controls">
            <button id="log-toggle" type="button" data-t="logOutput"></button>
            <label>
              <span class="label" data-t="logLevel"></span>
              <select id="log-level">
                <option value="ERROR" data-t="error"></option>
                <option value="WARN" data-t="warning"></option>
                <option value="INFO" data-t="information"></option>
                <option value="DEBUG" data-t="debug"></option>
              </select>
            </label>
          </div>
          <section class="firmware-update">
            <h3 data-t="firmwareUpdate"></h3>
            <p data-t="firmwareUpdateHint"></p>
            <form id="firmware-form" method="post" action="/update" enctype="multipart/form-data">
              <label class="firmware-picker">
                <input id="firmware-file" type="file" name="update" accept=".bin,application/octet-stream">
                <span id="firmware-file-label" data-t="chooseFirmware"></span>
              </label>
              <button id="firmware-submit" type="submit" data-t="installFirmware" disabled></button>
            </form>
          </section>
          <div id="logs"></div>
        </details>
      </div>
      <div id="message" class="status-line"></div>
    </main>`;

  const $ = id => document.getElementById(id);
  const mobileMedia = window.matchMedia(
    "(max-width:520px), (hover:none) and (pointer:coarse) and (max-width:900px)"
  );
  const entityPath = (domain, name, action = "") =>
    `/${domain}/${encodeURIComponent(name)}${action ? `/${action}` : ""}`;

  async function post(domain, name, action, params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${entityPath(domain, name, action)}${query ? `?${query}` : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  async function climateSet(parameter, value) {
    await post(E.climate[0], E.climate[1], "set", { [parameter]: value });
  }

  async function refreshEntity(pair) {
    const response = await fetch(`${entityPath(pair[0], pair[1])}?detail=all`);
    if (!response.ok) return;
    const payload = await response.json();
    states.set(entityKey(pair[0], pair[1]), payload);
  }

  async function refreshAfterCommand(...pairs) {
    await new Promise(resolve => setTimeout(resolve, 900));
    await Promise.all(pairs.map(refreshEntity));
    render();
  }

  function entityKey(domain, name) {
    return `${domain}/${name}`;
  }

  function getState(pair) {
    return states.get(entityKey(pair[0], pair[1])) || {};
  }

  function stateKey(payload) {
    const raw = payload.name_id || payload.id || "";
    if (raw.includes("/")) return raw;
    const dash = raw.indexOf("-");
    return dash > 0 ? `${raw.slice(0, dash)}/${raw.slice(dash + 1)}` : raw;
  }

  function isOff() {
    return String(getState(E.climate).mode || "OFF").toUpperCase() === "OFF";
  }

  function liveFanIndex() {
    const climate = getState(E.climate);
    const value = climate.custom_fan_mode || climate.fan_mode || "";
    return fanValues.findIndex(item => item.key.toUpperCase() === String(value).toUpperCase());
  }

  function displayedFanIndex() {
    return liveFanIndex();
  }

  function displayedTemperature() {
    const climate = getState(E.climate);
    const value = Number(climate.target_temperature);
    return Number.isFinite(value) ? value : null;
  }

  function modeLabel(mode) {
    const labels = {
      HEAT_COOL: "autoMode",
      COOL: "cool",
      HEAT: "heat",
      FAN_ONLY: "fanOnly",
      DRY: "dry"
    };
    return mode === "OFF" ? t("stopped") : t(labels[mode] || "noData");
  }

  function t(key) {
    return text[language][key] || key;
  }

  function showMessage(messageKey, error = false) {
    $("message").textContent = t(messageKey);
    $("message").classList.toggle("error", error);
  }

  function renderLabels() {
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
    document.querySelectorAll("[data-t]").forEach(node => {
      node.textContent = t(node.dataset.t);
    });
    $("language").textContent = language === "zh" ? "English" : "中文";
    document.querySelectorAll("[data-mode]").forEach(button => {
      const mode = modeValues.find(item => item.key === button.dataset.mode);
      if (mode) button.textContent = mode[language];
    });
    document.querySelectorAll("[data-fan-index]").forEach(button => {
      const fan = fanValues[Number(button.dataset.fanIndex)];
      if (fan) button.textContent = fan[language];
    });
    Array.from($("timer-mode-choice").options).slice(1).forEach((option, index) => {
      option.textContent = modeValues[index][language];
    });
    Array.from($("timer-fan-choice").options).slice(1).forEach((option, index) => {
      option.textContent = fanValues[index][language];
    });
    const firmwareFile = $("firmware-file")?.files?.[0];
    if (firmwareFile) $("firmware-file-label").textContent = firmwareFile.name;
    document.querySelectorAll("[data-mobile-tab]").forEach(button => {
      const active = button.dataset.mobileTab === mobileTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  }

  function syncMobileLayout() {
    document.body.classList.toggle("mobile-layout", forceMobile || mobileMedia.matches);
    document.body.dataset.mobileTab = mobileTab;
  }

  function render() {
    renderLabels();
    $("connection").textContent = connected ? t("connected") : t("offline");
    $("connection").classList.toggle("offline", !connected);
    $("minutes").textContent = String(minutes).padStart(3, "0");

    const climate = getState(E.climate);
    const mode = String(climate.mode || "OFF").toUpperCase();
    const indoor = Number(climate.current_temperature ?? getState(E.indoor).value);
    const target = Number(climate.target_temperature ?? getState(E.target).value);
    const outdoorState = getState(E.outdoor);
    const outdoor = Number(outdoorState.value);
    $("indoor").textContent = Number.isFinite(indoor) ? `${indoor.toFixed(1)} °C` : t("noData");
    $("target-summary").textContent = Number.isFinite(target) ? `${target.toFixed(0)} °C` : t("noData");
    $("outdoor").textContent =
      Number.isFinite(outdoor) && outdoor >= -40 && outdoor <= 70 && Math.abs(outdoor - 102) > .1
        ? `${outdoor.toFixed(1)} °C`
        : t("noData");

    const temperature = sliderTemperature ?? displayedTemperature();
    $("temperature-value").textContent = temperature == null ? "—" : temperature.toFixed(0);
    $("temperature-slider").value = String(temperature == null ? 24 : temperature);
    const fanIndex = displayedFanIndex();
    $("fan-value").textContent =
      fanIndex == null ? t("choose") : fanIndex < 0 ? t("auto") : fanValues[fanIndex][language];

    const selectedMode = mode;
    const mildewActive = Boolean(getState(E.mildewActive).value);
    const mildewDelayActive = Boolean(getState(E.mildewDelayActive).value);
    $("operating-state").textContent =
      mildewActive ? t("mildewRunning") : mildewDelayActive ? t("mildewWaiting") : mode === "OFF" ? t("stopped") : t("running");
    $("mode-state").textContent = mildewActive ? t("fanOnly") : modeLabel(mode);
    $("status-target").textContent = Number.isFinite(target) ? `${target.toFixed(0)} °C` : t("noData");
    const currentFan = String(climate.custom_fan_mode || climate.fan_mode || "").toUpperCase();
    const statusFanIndex = fanValues.findIndex(item => item.key.toUpperCase() === currentFan);
    $("status-fan").textContent =
      currentFan === "AUTO" ? t("auto") : statusFanIndex >= 0 ? fanValues[statusFanIndex][language] : t("noData");
    document.querySelectorAll("[data-mode]").forEach(button => {
      button.classList.toggle("active", button.dataset.mode === selectedMode);
    });
    document.querySelectorAll("[data-fan-index]").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.fanIndex) === fanIndex);
      button.disabled = mode === "OFF";
    });
    $("temperature-slider").disabled = mode === "OFF" || mode === "FAN_ONLY";

    const swing = String(climate.swing_mode || "OFF").toUpperCase();
    $("vertical").classList.toggle("active", swing === "VERTICAL" || swing === "BOTH");
    $("horizontal").classList.toggle("active", swing === "HORIZONTAL" || swing === "BOTH");
    $("display").classList.toggle("active", Boolean(getState(E.display).value));
    $("beeper").classList.toggle("active", Boolean(getState(E.beeper).value));
    const cloudEnabled = Boolean(getState(E.firebaseCloud).value);
    $("firebase-cloud").classList.toggle("active", cloudEnabled);
    $("firebase-status").textContent = getState(E.firebaseStatus).state || "—";
    $("firebase-device-id").textContent = getState(E.firebaseDeviceId).state || "—";
    $("firebase-pairing-code").textContent = getState(E.firebasePairingCode).state || "—";
    $("firebase-owner-email").textContent = getState(E.firebaseOwnerEmail).state || "—";

    const mildewAuto = Boolean(getState(E.mildewAuto).value);
    const mildewDuration = Number(getState(E.mildewDuration).value);
    const mildewDelay = Number(getState(E.mildewDelay).value);
    const mildewRemaining = getState(E.mildewRemaining).state || "";
    $("mildew-auto").classList.toggle("active", mildewAuto);
    $("mildew-auto").textContent = t(mildewAuto ? "mildewAutoOn" : "mildewAutoOff");
    $("mildew-auto").setAttribute("aria-pressed", String(mildewAuto));
    $("mildew-duration").textContent = Number.isFinite(mildewDuration) ? mildewDuration.toFixed(0) : "—";
    $("mildew-delay").textContent = Number.isFinite(mildewDelay) ? mildewDelay.toFixed(0) : "—";
    $("mildew-state").textContent = mildewActive
      ? `● ${t("mildewRunning")}${mildewRemaining ? `\n${mildewRemaining}` : ""}`
      : mildewDelayActive ? `● ${t("mildewWaiting")}` : `● ${t("mildewIdle")}`;
    $("mildew-start").disabled = mildewActive || mildewDelayActive || mode === "OFF" || mode === "HEAT";
    $("mildew-start").classList.toggle("active", mildewActive || mildewDelayActive);
    const mildewVisible = mildewActive || mildewDelayActive;
    $("mildew-banner").hidden = !mildewVisible;
    $("mildew-banner-title").textContent = mildewActive ? t("mildewRunning") : t("mildewWaiting");
    $("mildew-banner-time").textContent = mildewActive && mildewRemaining ? mildewRemaining : "—";
    $("mildew-banner-detail").textContent = mildewActive ? t("mildewBannerDetail") : "";

    const logger = String(getState(E.logger).value || getState(E.logger).state || "INFO").toUpperCase();
    const logging = logger !== "NONE";
    $("log-toggle").classList.toggle("active", logging);
    $("log-level").disabled = !logging;
    if (logging && ["ERROR", "WARN", "INFO", "DEBUG"].includes(logger)) {
      lastLogLevel = logger;
      $("log-level").value = logger;
    }

    const remaining = getState(E.remaining).state || "";
    const timerStatusRaw = getState(E.timerStatus).state || "";
    const timerPlanRaw = getState(E.timerPlan).state || "";
    const timerStatusKeys = {
      "未設定": "timerIdle",
      "等待定時開機": "timerWaitingOn",
      "等待定時關機": "timerWaitingOff"
    };
    const timerStatus = timerStatusKeys[timerStatusRaw] ? t(timerStatusKeys[timerStatusRaw]) : timerStatusRaw;
    let timerPlan = "";
    if (timerPlanRaw === "OFF") {
      timerPlan = t("timerPlanOff");
    } else if (timerPlanRaw.startsWith("ON|")) {
      const [, planMode, planTemperature, planFan] = timerPlanRaw.split("|");
      const localizedMode = modeLabel(planMode);
      const planFanIndex = fanValues.findIndex(item =>
        item.key.toUpperCase() === planFan.toUpperCase()
      );
      const localizedFan = planFan === "AUTO"
        ? t("auto")
        : planFanIndex >= 0 ? fanValues[planFanIndex][language] : planFan;
      const temperaturePart = planTemperature === "-"
        ? ""
        : ` · ${t("temperature")} ${planTemperature}°C`;
      timerPlan = `${t("timerPlanOn")} · ${localizedMode}${temperaturePart} · ${t("fan")} ${localizedFan}`;
    }
    const remainingLine = remaining ? `${t("timerRemaining")} ${remaining}` : "";
    $("timer-state").textContent =
      [timerStatus, remainingLine, timerPlan].filter(Boolean).join("\n");
    $("timer-on").classList.toggle("active", timerStatusRaw === "等待定時開機");
    $("timer-off").classList.toggle("active", timerStatusRaw === "等待定時關機");
    $("logs").textContent = logs.join("\n");
  }

  async function run(action, successKey = "commandSent") {
    try {
      showMessage("sending");
      await action();
      if (successKey) showMessage(successKey);
    } catch (error) {
      console.error(error);
      showMessage("commandFailed", true);
    }
  }

  function updateMinutes(step) {
    minutes = Math.max(0, Math.min(999, minutes + step));
    render();
  }

  document.querySelectorAll("[data-minute]").forEach(button => {
    const direction = Number(button.dataset.minute);
    let holdStartedAt = 0;
    let holdDelay = null;
    let repeatTimeout = null;
    let repeated = false;

    const stopHold = () => {
      clearTimeout(holdDelay);
      clearTimeout(repeatTimeout);
      holdDelay = null;
      repeatTimeout = null;
    };
    const repeatStep = () => {
      const heldMs = performance.now() - holdStartedAt;
      const amount = heldMs >= 1300 ? 100 : heldMs >= 800 ? 10 : 1;
      const interval = heldMs >= 800 ? 150 : 50;
      updateMinutes(direction * amount);
      repeatTimeout = setTimeout(repeatStep, interval);
    };

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      repeated = false;
      holdStartedAt = performance.now();
      button.setPointerCapture?.(event.pointerId);
      holdDelay = setTimeout(() => {
        repeated = true;
        repeatStep();
      }, 200);
    });
    button.addEventListener("pointerup", event => {
      stopHold();
      if (!repeated) updateMinutes(direction);
      button.releasePointerCapture?.(event.pointerId);
    });
    button.addEventListener("pointercancel", stopHold);
    button.addEventListener("lostpointercapture", stopHold);
  });

  $("language").addEventListener("click", () => {
    language = language === "zh" ? "en" : "zh";
    history.replaceState(null, "", language === "zh" ? "/?lang=zh" : "/");
    render();
  });
  document.querySelectorAll("[data-mobile-tab]").forEach(button => {
    button.addEventListener("click", () => {
      mobileTab = button.dataset.mobileTab;
      syncMobileLayout();
      renderLabels();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  if (mobileMedia.addEventListener) {
    mobileMedia.addEventListener("change", syncMobileLayout);
  }
  syncMobileLayout();

  $("timer-mode-choice").addEventListener("change", event => {
    pendingMode = event.target.value || null;
    $("timer-temperature-choice").disabled = pendingMode === "FAN_ONLY";
  });
  $("timer-fan-choice").addEventListener("change", event => {
    pendingFan = event.target.value === "" ? null : Number(event.target.value);
  });
  $("timer-temperature-choice").addEventListener("change", event => {
    pendingTemperature = event.target.value === "" ? null : Number(event.target.value);
  });

  document.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });
  async function selectMode(mode) {
    await run(async () => {
      if (mode === "OFF") {
        await climateSet("mode", "OFF");
      } else {
        await climateSet("mode", mode);
      }
      await refreshAfterCommand(E.climate);
    });
  }

  document.querySelectorAll("[data-fan-index]").forEach(button => {
    button.addEventListener("click", () => selectFan(Number(button.dataset.fanIndex)));
  });
  async function selectFan(index) {
    if (isOff()) return;
    const fan = fanValues[index];
    await run(async () => {
      await climateSet("fan_mode", fan.key);
      await refreshAfterCommand(E.climate);
    });
  }

  $("temperature-slider").addEventListener("input", event => {
    sliderTemperature = Number(event.target.value);
    $("temperature-value").textContent = sliderTemperature.toFixed(0);
  });
  $("temperature-slider").addEventListener("change", event => {
    const value = Number(event.target.value);
    sliderTemperature = null;
    if (isOff()) return;
    run(async () => {
      await climateSet("target_temperature", value);
      await refreshAfterCommand(E.climate);
    });
  });

  async function toggleSwing(axis) {
    const current = String(getState(E.climate).swing_mode || "OFF").toUpperCase();
    let vertical = current === "VERTICAL" || current === "BOTH";
    let horizontal = current === "HORIZONTAL" || current === "BOTH";
    if (axis === "vertical") vertical = !vertical;
    else horizontal = !horizontal;
    const next = vertical && horizontal ? "BOTH" : vertical ? "VERTICAL" : horizontal ? "HORIZONTAL" : "OFF";
    await run(async () => {
      await climateSet("swing_mode", next);
      await refreshAfterCommand(E.climate);
    });
  }
  $("vertical").addEventListener("click", () => toggleSwing("vertical"));
  $("horizontal").addEventListener("click", () => toggleSwing("horizontal"));

  $("display").addEventListener("click", () => run(async () => {
    const action = getState(E.display).value ? "turn_off" : "turn_on";
    await post(E.display[0], E.display[1], action);
    await refreshAfterCommand(E.display);
  }));

  $("beeper").addEventListener("click", () => run(async () => {
    const action = getState(E.beeper).value ? "turn_off" : "turn_on";
    await post(E.beeper[0], E.beeper[1], action);
    await refreshAfterCommand(E.beeper);
  }));
  $("firebase-cloud").addEventListener("click", () => run(async () => {
    const action = getState(E.firebaseCloud).value ? "turn_off" : "turn_on";
    await post(E.firebaseCloud[0], E.firebaseCloud[1], action);
    await refreshAfterCommand(E.firebaseCloud, E.firebaseStatus, E.firebaseDeviceId,
                              E.firebasePairingCode, E.firebaseOwnerEmail);
  }));
  $("regenerate-pairing").addEventListener("click", () => run(async () => {
    await post(E.regeneratePairing[0], E.regeneratePairing[1], "press");
    await refreshAfterCommand(E.firebasePairingCode);
  }));
  $("remove-owner").addEventListener("click", () => {
    if (!confirm(language === "zh"
      ? "確定解除雲端綁定？Wi-Fi 與 OTA 會保留。"
      : "Remove the cloud owner? Wi-Fi and OTA will be kept.")) return;
    void run(async () => {
      await post(E.removeOwner[0], E.removeOwner[1], "press");
      await refreshAfterCommand(E.firebaseOwnerEmail, E.firebasePairingCode);
    });
  });
  $("factory-reset").addEventListener("click", () => {
    if (!confirm(language === "zh"
      ? "確定恢復原廠設定？這會清除 Wi-Fi、雲端綁定與裝置偏好。"
      : "Factory reset? This clears Wi-Fi, cloud ownership and device preferences.")) return;
    void run(async () => {
      await post(E.factoryReset[0], E.factoryReset[1], "press");
    }, null);
  });

  $("mildew-auto").addEventListener("click", () => run(async () => {
    const action = getState(E.mildewAuto).value ? "turn_off" : "turn_on";
    await post(E.mildewAuto[0], E.mildewAuto[1], action);
    await refreshAfterCommand(E.mildewAuto);
  }));

  document.querySelectorAll(".mildew-adjust").forEach(button => {
    const isDelay = button.dataset.mildewTarget === "delay";
    const pair = isDelay ? E.mildewDelay : E.mildewDuration;
    const output = isDelay ? $("mildew-delay") : $("mildew-duration");
    const direction = Number(button.dataset.step);
    const minimum = isDelay ? 1 : 15;
    const maximum = isDelay ? 10 : 90;
    let nextValue = null;
    let holdStartedAt = 0;
    let holdDelay = null;
    let repeatTimeout = null;
    let repeated = false;
    let committed = false;

    const changeValue = amount => {
      if (nextValue == null) {
        const current = Number(getState(pair).value);
        nextValue = Number.isFinite(current) ? current : minimum;
      }
      nextValue = Math.max(minimum, Math.min(maximum, nextValue + amount));
      output.textContent = String(nextValue);
    };
    const stopHold = () => {
      clearTimeout(holdDelay);
      clearTimeout(repeatTimeout);
      holdDelay = null;
      repeatTimeout = null;
    };
    const repeatStep = () => {
      const heldMs = performance.now() - holdStartedAt;
      const amount = isDelay ? 1 : heldMs >= 800 ? 10 : 1;
      const interval = isDelay ? 200 : heldMs >= 800 ? 150 : 50;
      changeValue(direction * amount);
      repeatTimeout = setTimeout(repeatStep, interval);
    };
    const commit = async () => {
      if (committed || nextValue == null) return;
      committed = true;
      const value = nextValue;
      nextValue = null;
      await run(async () => {
        await post(pair[0], pair[1], "set", { value });
        await refreshAfterCommand(pair);
      });
    };

    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      repeated = false;
      committed = false;
      nextValue = null;
      holdStartedAt = performance.now();
      button.setPointerCapture?.(event.pointerId);
      holdDelay = setTimeout(() => {
        repeated = true;
        repeatStep();
      }, 200);
    });
    button.addEventListener("pointerup", event => {
      stopHold();
      if (!repeated) changeValue(direction);
      button.releasePointerCapture?.(event.pointerId);
      void commit();
    });
    button.addEventListener("pointercancel", () => {
      stopHold();
      nextValue = null;
      render();
    });
    button.addEventListener("lostpointercapture", stopHold);
  });
  $("mildew-start").addEventListener("click", () => run(async () => {
    await post(E.mildewStart[0], E.mildewStart[1], "press");
    await refreshAfterCommand(E.climate, E.mildewActive, E.mildewDelayActive, E.mildewRemaining);
  }));
  $("mildew-cancel").addEventListener("click", () => run(async () => {
    await post(E.mildewCancel[0], E.mildewCancel[1], "press");
    await refreshAfterCommand(E.climate, E.mildewActive, E.mildewDelayActive, E.mildewRemaining);
  }));

  $("timer-on").addEventListener("click", async () => {
    if (minutes <= 0) return showMessage("timerNeedsTime", true);
    const usedDefaults = pendingMode == null || pendingFan == null || pendingTemperature == null;
    const mode = modeValues.find(item => item.key === (pendingMode || "FAN_ONLY"));
    const fanIndex = pendingFan ?? fanValues.findIndex(item => item.key === "MEDIUM");
    const indoor = Number(getState(E.climate).current_temperature ?? getState(E.indoor).value);
    const temperature = pendingTemperature ??
      Math.max(16, Math.min(30, Math.round(Number.isFinite(indoor) ? indoor : 27)));
    await run(async () => {
      await post(E.minutes[0], E.minutes[1], "set", { value: minutes });
      await post(E.timerMode[0], E.timerMode[1], "set", { option: mode.timer });
      await post(E.timerTemp[0], E.timerTemp[1], "set", { option: String(temperature) });
      await post(E.timerFan[0], E.timerFan[1], "set", { option: fanValues[fanIndex].timer });
      await post(E.timerOn[0], E.timerOn[1], "press");
      await refreshAfterCommand(E.timerStatus, E.remaining, E.timerPlan);
      minutes = 0;
      pendingMode = null;
      pendingTemperature = null;
      pendingFan = null;
      $("timer-mode-choice").value = "";
      $("timer-fan-choice").value = "";
      $("timer-temperature-choice").value = "";
      $("timer-temperature-choice").disabled = false;
      render();
    }, usedDefaults ? "timerStartedOnDefaults" : "timerStartedOn");
  });

  $("timer-off").addEventListener("click", async () => {
    if (minutes <= 0) return showMessage("timerNeedsTime", true);
    await run(async () => {
      await post(E.minutes[0], E.minutes[1], "set", { value: minutes });
      await post(E.timerOff[0], E.timerOff[1], "press");
      await refreshAfterCommand(E.timerStatus, E.remaining, E.timerPlan);
      minutes = 0;
      render();
    }, "timerStartedOff");
  });

  $("timer-cancel").addEventListener("click", () => run(async () => {
    await post(E.timerCancel[0], E.timerCancel[1], "press");
    await refreshAfterCommand(E.timerStatus, E.remaining, E.timerPlan);
    minutes = 0;
    pendingMode = null;
    pendingTemperature = null;
    pendingFan = null;
    render();
  }, "timerCancelled"));

  $("log-toggle").addEventListener("click", () => run(async () => {
    const current = String(getState(E.logger).value || getState(E.logger).state || "INFO").toUpperCase();
    const next = current === "NONE" ? lastLogLevel : "NONE";
    await post(E.logger[0], E.logger[1], "set", { option: next });
  }));
  $("log-level").addEventListener("change", event => run(async () => {
    lastLogLevel = event.target.value;
    await post(E.logger[0], E.logger[1], "set", { option: lastLogLevel });
  }));
  $("firmware-file").addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    $("firmware-file-label").textContent = file ? file.name : t("chooseFirmware");
    $("firmware-submit").disabled = !file;
  });
  $("firmware-form").addEventListener("submit", event => {
    const file = $("firmware-file").files && $("firmware-file").files[0];
    if (!file) {
      event.preventDefault();
      showMessage("firmwareMissing", true);
      return;
    }
    if (!window.confirm(t("firmwareConfirm"))) {
      event.preventDefault();
      return;
    }
    $("firmware-submit").disabled = true;
    $("firmware-submit").textContent = t("firmwareUploading");
  });

  const source = new EventSource("/events");
  source.addEventListener("open", () => {
    connected = true;
    render();
  });
  source.addEventListener("error", () => {
    connected = false;
    render();
  });
  source.addEventListener("state", event => {
    try {
      const payload = JSON.parse(event.data);
      const key = stateKey(payload);
      const current = states.get(key) || {};
      states.set(key, Object.assign(current, payload));
      render();
    } catch (error) {
      console.error(error);
    }
  });
  source.addEventListener("log", event => {
    const clean = String(event.data)
      .replace(/\u001b\[[0-9;]*m/g, "")
      .replace(/\r?\n$/, "");
    logs.push(clean);
    if (logs.length > 80) logs.shift();
    render();
  });

  let refreshInProgress = false;
  setInterval(async () => {
    if (document.hidden || refreshInProgress) return;
    refreshInProgress = true;
    try {
      await refreshEntity(E.climate);
      render();
    } catch (error) {
      console.error(error);
    } finally {
      refreshInProgress = false;
    }
  }, 1000);

  render();
})();
