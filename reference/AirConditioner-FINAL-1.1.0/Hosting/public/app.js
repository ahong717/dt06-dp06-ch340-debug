import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(error =>
      console.warn("PWA service worker registration failed", error)
    );
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyAuxjukZV-UVmX6adDLl9KWQB-aOlEQ5-Q",
  authDomain: "esp8266ac-1e0f0.firebaseapp.com",
  databaseURL: "https://esp8266ac-1e0f0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "esp8266ac-1e0f0",
  storageBucket: "esp8266ac-1e0f0.firebasestorage.app",
  messagingSenderId: "789832585158",
  appId: "1:789832585158:web:743cdbefb734f47c7b6cc7"
};

const DATABASE_URL = firebaseConfig.databaseURL;
const auth = getAuth(initializeApp(firebaseConfig));
await setPersistence(auth, browserLocalPersistence);

const $ = id => document.getElementById(id);
let authMode = "login";
let currentUser = null;
let deviceIds = [];
let selectedDeviceId = "";
let deviceSnapshot = {};
let commandPending = false;
let stream = null;
let streamRefreshTimer = null;
let viewerLeaseTimer = null;
let cloudConnected = false;
let localBase = "";
let localRefreshTimer = null;
let localFailures = 0;

function setMessage(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle("error", error);
}

function friendlyError(error) {
  const messages = {
    "auth/invalid-credential": "Email 或密碼不正確。",
    "auth/email-already-in-use": "這個 Email 已經註冊。",
    "auth/invalid-email": "Email 格式不正確。",
    "auth/weak-password": "密碼強度不足，請至少使用六個字元。",
    "auth/too-many-requests": "嘗試次數過多，請稍後再試。"
  };
  return messages[error?.code] || "操作失敗，請檢查網路後重試。";
}

async function token(force = false) {
  if (!currentUser) throw new Error("尚未登入");
  return currentUser.getIdToken(force);
}

async function rest(path, options = {}) {
  const idToken = await token(options.forceToken);
  const response = await fetch(`${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(idToken)}`, {
    method: options.method || "GET",
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  if (!response.ok) throw new Error(`Firebase REST ${response.status}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === "register";
  $("show-login").classList.toggle("active", !register);
  $("show-register").classList.toggle("active", register);
  $("confirm-row").hidden = !register;
  $("password-confirm").required = register;
  $("password").autocomplete = register ? "new-password" : "current-password";
  $("auth-submit").textContent = register ? "建立帳號" : "登入";
  setMessage($("auth-message"), "");
}

$("show-login").addEventListener("click", () => setAuthMode("login"));
$("show-register").addEventListener("click", () => setAuthMode("register"));

$("auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    $("auth-submit").disabled = true;
    if (authMode === "register") {
      if (password !== $("password-confirm").value) {
        setMessage($("auth-message"), "兩次輸入的密碼不同。", true);
        return;
      }
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      setMessage($("auth-message"), "帳號已建立，驗證信已寄出。");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    setMessage($("auth-message"), friendlyError(error), true);
  } finally {
    $("auth-submit").disabled = false;
  }
});

$("forgot-password").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return setMessage($("auth-message"), "請先填入 Email。", true);
  try {
    await sendPasswordResetEmail(auth, email);
    setMessage($("auth-message"), "密碼重設信已寄出。");
  } catch (error) {
    setMessage($("auth-message"), friendlyError(error), true);
  }
});

function closeStream() {
  if (stream) stream.close();
  stream = null;
  clearTimeout(streamRefreshTimer);
  clearInterval(viewerLeaseTimer);
  viewerLeaseTimer = null;
  cloudConnected = false;
  renderConnection();
}

function renderConnection() {
  const chip = $("connection-chip");
  chip.textContent = localBase ? "本機直連" : cloudConnected ? "雲端連線" : "未連線";
  chip.classList.toggle("offline", !localBase && !cloudConnected);
}

function stopLocalConnection() {
  localBase = "";
  localFailures = 0;
  clearInterval(localRefreshTimer);
  localRefreshTimer = null;
  renderConnection();
}

async function fetchWithTimeout(url, options = {}, timeout = 900) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, mode: "cors", targetAddressSpace: "local", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function localCandidates() {
  const state = deviceSnapshot.state || {};
  const candidates = [];
  if (/^[a-z0-9-]+\.local$/i.test(state.local_host || "")) candidates.push(`http://${state.local_host}`);
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(state.local_ip || "")) {
    candidates.push(`http://${state.local_ip}`);
  }
  return [...new Set(candidates)];
}

async function refreshLocalState() {
  if (!localBase || document.hidden) return;
  try {
    const localToken = deviceSnapshot.meta?.local_access_token;
    if (!localToken) throw new Error("Local token unavailable");
    const response = await fetchWithTimeout(`${localBase}/api/state`, {
      headers: { "X-DT06-Token": localToken }
    }, 900);
    if (!response.ok) throw new Error(`Local HTTP ${response.status}`);
    const state = await response.json();
    deviceSnapshot.state = { ...(deviceSnapshot.state || {}), ...state };
    localFailures = 0;
    renderDevice();
  } catch {
    localFailures += 1;
    if (localFailures >= 3) stopLocalConnection();
  }
}

async function detectLocalConnection() {
  stopLocalConnection();
  if (!selectedDeviceId || document.hidden) return false;
  const localToken = deviceSnapshot.meta?.local_access_token;
  if (!localToken) return false;
  for (const candidate of localCandidates()) {
    try {
      const response = await fetchWithTimeout(`${candidate}/api/state`, {
        headers: { "X-DT06-Token": localToken }
      }, 800);
      if (!response.ok) continue;
      const state = await response.json();
      localBase = candidate;
      deviceSnapshot.state = { ...(deviceSnapshot.state || {}), ...state };
      renderConnection();
      renderDevice();
      localRefreshTimer = setInterval(refreshLocalState, 1000);
      return true;
    } catch {
      // 下一個 .local／最近 IP；全部失敗時自然保留 Firebase。
    }
  }
  return false;
}

function mergeAtPath(target, path, data) {
  if (path === "/") return data || {};
  const parts = path.split("/").filter(Boolean);
  const output = structuredClone(target || {});
  let cursor = output;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      if (data === null) delete cursor[part];
      else cursor[part] = data;
    } else {
      cursor[part] = cursor[part] && typeof cursor[part] === "object" ? cursor[part] : {};
      cursor = cursor[part];
    }
  });
  return output;
}

async function connectDeviceStream(deviceId) {
  closeStream();
  if (!deviceId || !currentUser) return;
  const idToken = await token(true);
  const url = `${DATABASE_URL}/devices/${encodeURIComponent(deviceId)}.json?auth=${encodeURIComponent(idToken)}`;
  stream = new EventSource(url);
  stream.addEventListener("open", () => {
    cloudConnected = true;
    renderConnection();
  });
  stream.addEventListener("error", () => {
    cloudConnected = false;
    renderConnection();
  });
  const applyEvent = event => {
    try {
      const payload = JSON.parse(event.data);
      deviceSnapshot = mergeAtPath(deviceSnapshot, payload.path, payload.data);
      renderDevice();
    } catch (error) {
      console.error(error);
    }
  };
  stream.addEventListener("put", applyEvent);
  stream.addEventListener("patch", applyEvent);
  stream.addEventListener("auth_revoked", () => void connectDeviceStream(deviceId));
  streamRefreshTimer = setTimeout(() => void connectDeviceStream(deviceId), 50 * 60 * 1000);
  const renewViewerLease = () => rest(`devices/${deviceId}/command/viewer_until`, {
    method: "PUT",
    body: Date.now() + 90 * 1000
  }).catch(error => console.warn("Viewer lease update failed", error));
  await renewViewerLease();
  viewerLeaseTimer = setInterval(renewViewerLease, 60 * 1000);
}

async function loadDevices() {
  const index = await rest(`userDevices/${currentUser.uid}`).catch(() => null);
  deviceIds = index ? Object.keys(index) : [];
  $("device-select").replaceChildren(...deviceIds.map(id => new Option(id, id)));
  if (!deviceIds.length) {
    selectedDeviceId = "";
    deviceSnapshot = {};
    $("empty-state").hidden = false;
    $("control-view").hidden = true;
    closeStream();
    return;
  }
  selectedDeviceId = deviceIds.includes(selectedDeviceId) ? selectedDeviceId : deviceIds[0];
  $("device-select").value = selectedDeviceId;
  $("empty-state").hidden = true;
  $("control-view").hidden = false;
  deviceSnapshot = await rest(`devices/${selectedDeviceId}`).catch(async () => {
    await rest(`userDevices/${currentUser.uid}/${selectedDeviceId}`, { method: "DELETE" });
    return {};
  });
  await connectDeviceStream(selectedDeviceId);
  await detectLocalConnection();
  renderDevice();
}

function renderDevice() {
  const state = deviceSnapshot.state || {};
  const off = String(state.mode || "OFF").toUpperCase() === "OFF";
  const target = Number(state.target_temperature);
  const room = Number(state.current_temperature);
  $("running-label").textContent = off ? "冷氣已關閉" : "冷氣運轉中";
  $("target-temperature").textContent = Number.isFinite(target) ? target.toFixed(0) : "26";
  $("room-temperature").textContent = Number.isFinite(room) ? room.toFixed(1) : "—";
  $("mode-value").textContent = state.mode || "—";
  $("updated-value").textContent = state.updated_at
    ? new Date(state.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
  document.querySelectorAll("[data-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
  $("temp-down").disabled = off || state.mode === "FAN_ONLY";
  $("temp-up").disabled = off || state.mode === "FAN_ONLY";
}

function requestId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sendCommand(action, extra = {}) {
  if (!selectedDeviceId || commandPending) return;
  commandPending = true;
  document.querySelectorAll("[data-mode]").forEach(button => { button.disabled = true; });
  try {
    const id = requestId();
    if (localBase) {
      try {
        const params = new URLSearchParams({ request_id: id });
        if (action === "set_mode") params.set("mode", String(extra.mode));
        if (action === "set_temperature") params.set("target_temperature", String(extra.temperature));
        const response = await fetchWithTimeout(
          `${localBase}/api/control?${params}`,
          {
            method: "POST",
            headers: { "X-DT06-Token": deviceSnapshot.meta?.local_access_token || "" }
          },
          1200
        );
        if (!response.ok) throw new Error(`Local HTTP ${response.status}`);
        showToast("已透過家中網路送出指令。");
        setTimeout(refreshLocalState, 500);
        return;
      } catch {
        stopLocalConnection();
      }
    }
    await rest(`devices/${selectedDeviceId}/command/request`, {
      method: "PUT",
      body: {
        action,
        request_id: id,
        issued_at: { ".sv": "timestamp" },
        ...extra
      }
    });
    showToast("指令已送出，等待冷氣回報。");
  } catch {
    showToast("指令傳送失敗，請檢查連線。");
  } finally {
    commandPending = false;
    document.querySelectorAll("[data-mode]").forEach(button => { button.disabled = false; });
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (localBase) void refreshLocalState();
  else void detectLocalConnection();
});

function changeTemperature(delta) {
  const current = Number(deviceSnapshot.state?.target_temperature) || 26;
  void sendCommand("set_temperature", { temperature: Math.max(16, Math.min(30, current + delta)) });
}
$("temp-down").addEventListener("click", () => changeTemperature(-1));
$("temp-up").addEventListener("click", () => changeTemperature(1));

document.querySelectorAll("[data-mode]").forEach(button => {
  button.addEventListener("click", () => {
    void sendCommand("set_mode", { mode: button.dataset.mode });
  });
});

function showToast(text) {
  $("app-message").textContent = text;
  $("app-message").hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { $("app-message").hidden = true; }, 3200);
}

function openPairing() {
  setMessage($("pair-message"), "");
  $("pairing-dialog").showModal();
}
$("open-pairing").addEventListener("click", openPairing);
$("add-device").addEventListener("click", openPairing);

$("pairing-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser.emailVerified) {
    return setMessage($("pair-message"), "請先完成 Email 驗證，再重新登入。", true);
  }
  const deviceId = $("pair-device-id").value.trim();
  const code = $("pair-code").value.trim();
  try {
    await rest(`deviceOwners/${deviceId}/${currentUser.uid}`, { method: "PUT", body: code });
    await rest(`devices/${deviceId}/owner_profile`, {
      method: "PUT",
      body: { uid: currentUser.uid, email: currentUser.email }
    });
    await rest(`userDevices/${currentUser.uid}/${deviceId}`, { method: "PUT", body: true });
    selectedDeviceId = deviceId;
    $("pairing-dialog").close();
    await loadDevices();
    showToast("配對完成。");
  } catch {
    setMessage($("pair-message"), "配對失敗。請確認裝置 ID、配對碼及十分鐘有效時間。", true);
  }
});

async function removeSelectedDevice() {
  if (!selectedDeviceId) return;
  if (!confirm("確定解除這台冷氣的雲端綁定？Wi‑Fi 與 OTA 不會被清除。")) return;
  try {
    await rest(`devices/${selectedDeviceId}/owner_profile`, { method: "DELETE" });
    await rest(`deviceOwners/${selectedDeviceId}/${currentUser.uid}`, { method: "DELETE" });
    await rest(`userDevices/${currentUser.uid}/${selectedDeviceId}`, { method: "DELETE" });
    selectedDeviceId = "";
    $("account-dialog").close();
    await loadDevices();
    showToast("已解除雲端綁定。");
  } catch {
    setMessage($("account-message"), "解除失敗，請稍後重試。", true);
  }
}

$("remove-device").addEventListener("click", () => void removeSelectedDevice());
$("device-select").addEventListener("change", async event => {
  selectedDeviceId = event.target.value;
  $("account-dialog").close();
  await loadDevices();
});
$("account-button").addEventListener("click", () => $("account-dialog").showModal());
$("logout").addEventListener("click", () => void signOut(auth));
$("resend-verification").addEventListener("click", async () => {
  await sendEmailVerification(currentUser);
  setMessage($("account-message"), "驗證信已重新寄出。");
});
document.querySelectorAll(".close-dialog").forEach(button => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

const localPreview = ["127.0.0.1", "localhost"].includes(location.hostname)
  && new URLSearchParams(location.search).get("preview") === "1";

if (localPreview) {
  $("auth-view").hidden = true;
  $("app-view").hidden = false;
  $("empty-state").hidden = true;
  $("control-view").hidden = false;
  $("connection-chip").textContent = "已連線";
  $("connection-chip").classList.remove("offline");
  deviceSnapshot = {
    state: {
      mode: "COOL",
      current_temperature: 27.2,
      target_temperature: 26,
      updated_at: Date.now()
    }
  };
  renderDevice();
} else {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (!user) {
      closeStream();
      $("auth-view").hidden = false;
      $("app-view").hidden = true;
      return;
    }
    await user.reload();
    currentUser = auth.currentUser;
    $("auth-view").hidden = true;
    $("app-view").hidden = false;
    $("account-email").textContent = currentUser.email || "—";
    $("verify-notice").hidden = currentUser.emailVerified;
    await loadDevices();
  });
}
