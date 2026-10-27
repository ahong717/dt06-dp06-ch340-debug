#include "firebase_sse.h"

#include <cmath>
#include <ctime>

#include "esphome/core/log.h"

namespace esphome {
namespace firebase_sse {

static const char *const TAG = "firebase_sse";
static const char *const TOKEN_FILE = "/firebase-auth.txt";
static const char *const LOCAL_TOKEN_FILE = "/local-access-token.txt";
static const char *const HOSTING_ORIGIN = "https://esp8266ac-1e0f0.web.app";

// Google Trust Services GTS Root R1, valid through 2036-06-22.
static const char GTS_ROOT_R1[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFVzCCAz+gAwIBAgINAgPlk28xsBNJiGuiFzANBgkqhkiG9w0BAQwFADBHMQsw
CQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExMQzEU
MBIGA1UEAxMLR1RTIFJvb3QgUjEwHhcNMTYwNjIyMDAwMDAwWhcNMzYwNjIyMDAw
MDAwWjBHMQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZp
Y2VzIExMQzEUMBIGA1UEAxMLR1RTIFJvb3QgUjEwggIiMA0GCSqGSIb3DQEBAQUA
A4ICDwAwggIKAoICAQC2EQKLHuOhd5s73L+UPreVp0A8of2C+X0yBoJx9vaMf/vo
27xqLpeXo4xL+Sv2sfnOhB2x+cWX3u+58qPpvBKJXqeqUqv4IyfLpLGcY9vXmX7w
Cl7raKb0xlpHDU0QM+NOsROjyBhsS+z8CZDfnWQpJSMHobTSPS5g4M/SCYe7zUjw
TcLCeoiKu7rPWRnWr4+wB7CeMfGCwcDfLqZtbBkOtdh+JhpFAz2weaSUKK0Pfybl
qAj+lug8aJRT7oM6iCsVlgmy4HqMLnXWnOunVmSPlk9orj2XwoSPwLxAwAtcvfaH
szVsrBhQf4TgTM2S0yDpM7xSma8ytSmzJSq0SPly4cpk9+aCEI3oncKKiPo4Zor8
Y/kB+Xj9e1x3+naH+uzfsQ55lVe0vSbv1gHR6xYKu44LtcXFilWr06zqkUspzBmk
MiVOKvFlRNACzqrOSbTqn3yDsEB750Orp2yjj32JgfpMpf/VjsPOS+C12LOORc92
wO1AK/1TD7Cn1TsNsYqiA94xrcx36m97PtbfkSIS5r762DL8EGMUUXLeXdYWk70p
aDPvOmbsB4om3xPXV2V4J95eSRQAogB/mqghtqmxlbCluQ0WEdrHbEg8QOB+DVrN
VjzRlwW5y0vtOUucxD/SVRNuJLDWcfr0wbrM7Rv1/oFB2ACYPTrIrnqYNxgFlQID
AQABo0IwQDAOBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E
FgQU5K8rJnEaK0gnhS9SZizv8IkTcT4wDQYJKoZIhvcNAQEMBQADggIBAJ+qQibb
C5u+/x6Wki4+omVKapi6Ist9wTrYggoGxval3sBOh2Z5ofmmWJyq+bXmYOfg6LEe
QkEzCzc9zolwFcq1JKjPa7XSQCGYzyI0zzvFIoTgxQ6KfF2I5DUkzps+GlQebtuy
h6f88/qBVRRiClmpIgUxPoLW7ttXNLwzldMXG+gnoot7TiYaelpkttGsN/H9oPM4
7HLwEXWdyzRSjeZ2axfG34arJ45JK3VmgRAhpuo+9K4l/3wV3s6MJT/KYnAK9y8J
ZgfIPxz88NtFMN9iiMG1D53Dn0reWVlHxYciNuaCp+0KueIHoI17eko8cdLiA6Ef
MgfdG+RCzgwARWGAtQsgWSl4vflVy2PFPEz0tv/bal8xa5meLMFrUKTX5hgUvYU/
Z6tGn6D/Qqc6f1zLXbBwHSs09dR2CQzreExZBfMzQsNhFRAbd03OIozUhfJFfbdT
6u9AWpQKXCBfTkBdYiJ23//OYb2MI3jSNwLgjt7RETeJ9r/tSQdirpLsQBqvFAnZ
0E6yove+7u7Y/9waLd64NnHi/Hm3lCXRSHNboTXns5lndcEZOitHTtNCjv0xyBZm
2tIMPNuzjsmhDYAPexZ3FL//2wmUspO8IFgV6dtxQ/PeEMMA3KgqlbbC1j+Qa3bb
bP6MvPJwNQzcmRk13NfIRmPVNnGuV/u3gm3c
-----END CERTIFICATE-----
)EOF";

FirebaseSSEComponent *FirebaseSSEComponent::instance_ = nullptr;

void FirebaseSSEComponent::setup() {
  instance_ = this;
  LittleFS.begin();
  this->load_or_create_local_token_();
  this->publish_state(false);
  this->publish_status_("Disabled");
  if (this->status_led_ != nullptr)
    this->status_led_->turn_off();

  if (this->climate_ != nullptr) {
    this->climate_->add_on_state_callback(
        [this](climate::Climate &) { this->state_dirty_ = true; });
  }
}

void FirebaseSSEComponent::dump_config() {
  ESP_LOGCONFIG(TAG, "Firebase RTDB REST Streaming/SSE:");
  ESP_LOGCONFIG(TAG, "  Database: %s", this->database_url_.c_str());
  ESP_LOGCONFIG(TAG, "  Enabled: %s", YESNO(this->enabled_));
  ESP_LOGCONFIG(TAG, "  TLS verification: GTS Root R1");
}

void FirebaseSSEComponent::write_state(bool state) {
  this->enabled_ = state;
  this->publish_state(state);
  if (state)
    this->start_();
  else
    this->stop_();
}

void FirebaseSSEComponent::start_() {
  if (this->firebase_started_ || WiFi.status() != WL_CONNECTED)
    return;
  if (time(nullptr) < 1704067200) {
    this->publish_status_("Waiting for secure time");
    return;
  }

  this->publish_status_("Connecting");
  this->trust_anchor_.reset(new BearSSL::X509List(GTS_ROOT_R1));
  this->auth_ssl_.setTrustAnchors(this->trust_anchor_.get());
  this->stream_ssl_.setTrustAnchors(this->trust_anchor_.get());
  this->auth_ssl_.setBufferSizes(4096, 1024);
  this->stream_ssl_.setBufferSizes(4096, 1024);
  this->auth_client_.reset(new AsyncClientClass(this->auth_ssl_));
  this->stream_client_.reset(new AsyncClientClass(this->stream_ssl_));
  this->app_.reset(new FirebaseApp());
  this->database_.reset(new RealtimeDatabase());

  String stored_uid;
  String stored_token;
  String stored_refresh;
  if (this->load_tokens_(stored_uid, stored_token, stored_refresh)) {
    this->device_id_ = stored_uid;
    this->id_token_auth_.reset(new IDToken(this->api_key_, stored_token, 3000, stored_refresh));
    initializeApp(*this->auth_client_, *this->app_, getAuth(*this->id_token_auth_),
                  firebase_result_callback_, "authTask");
  } else {
    this->signup_user_.reset(new UserAccount(this->api_key_));
    signup(*this->auth_client_, *this->app_, getAuth(*this->signup_user_),
           firebase_result_callback_, "signupTask");
  }

  this->app_->getApp<RealtimeDatabase>(*this->database_);
  this->database_->url(this->database_url_);
  this->firebase_started_ = true;
  this->identity_saved_ = false;
}

void FirebaseSSEComponent::stop_() {
  this->stream_connected_ = false;
  this->stream_started_ = false;
  if (this->stream_client_ != nullptr)
    this->stream_client_->stopAsync(true);
  if (this->auth_client_ != nullptr)
    this->auth_client_->stopAsync(true);
  this->stream_ssl_.stop();
  this->auth_ssl_.stop();
  if (this->app_ != nullptr)
    deinitializeApp(*this->app_);
  this->database_.reset();
  this->app_.reset();
  this->id_token_auth_.reset();
  this->signup_user_.reset();
  this->stream_client_.reset();
  this->auth_client_.reset();
  this->trust_anchor_.reset();
  this->firebase_started_ = false;
  this->publish_status_("Disabled");
  if (this->status_led_ != nullptr)
    this->status_led_->turn_off();
}

void FirebaseSSEComponent::loop() {
  if (!this->local_api_registered_)
    this->register_local_api_();
  if (!this->enabled_) {
    this->update_led_();
    return;
  }
  if (!this->firebase_started_) {
    this->start_();
    this->update_led_();
    return;
  }

  this->app_->loop();
  if (this->app_->ready()) {
    if (this->device_id_.isEmpty())
      this->device_id_ = this->app_->getUid();
    if (!this->identity_saved_ && !this->device_id_.isEmpty()) {
      this->save_tokens_();
      this->publish_device_identity_();
      this->publish_pairing_();
      this->identity_saved_ = true;
    }
    if (!this->stream_started_)
      this->start_stream_();

    const uint32_t now = millis();
    const uint32_t heartbeat_interval = this->viewer_active_() ? 30000UL : 900000UL;
    if (this->state_dirty_ || now - this->last_state_publish_ms_ >= heartbeat_interval)
      this->publish_state_();
    if (now - this->last_owner_request_ms_ >= 60000)
      this->request_owner_profile_();
  }
  this->update_led_();
}

void FirebaseSSEComponent::start_stream_() {
  if (this->stream_client_ == nullptr || this->database_ == nullptr || this->device_id_.isEmpty())
    return;
  this->stream_client_->setSSEFilters("get,put,patch,keep-alive,cancel,auth_revoked");
  const String path = "/devices/" + this->device_id_ + "/command";
  this->database_->get(*this->stream_client_, path, firebase_result_callback_, true, "commandStream");
  this->stream_started_ = true;
  this->publish_status_("Connecting");
}

void FirebaseSSEComponent::firebase_result_callback_(AsyncResult &result) {
  if (instance_ != nullptr)
    instance_->process_result_(result);
}

void FirebaseSSEComponent::process_result_(AsyncResult &result) {
  if (!result.isResult())
    return;
  if (result.isError()) {
    ESP_LOGW(TAG, "%s: %s (%d)", result.uid().c_str(), result.error().message().c_str(),
             result.error().code());
    if (result.uid() == "commandStream") {
      this->stream_connected_ = false;
      this->publish_status_("Reconnecting");
    }
  }
  if (!result.available())
    return;

  if (result.uid() == "commandStream") {
    RealtimeDatabaseResult &stream = result.to<RealtimeDatabaseResult>();
    if (!stream.isStream())
      return;
    this->stream_connected_ = true;
    this->publish_status_("Connected");
    const String event = stream.event();
    if (event == "put" || event == "patch")
      this->handle_stream_payload_(stream.dataPath(), stream.to<String>());
    return;
  }

  if (result.uid() == "ownerProfile") {
    String payload = result.c_str();
    json::parse_json(std::string(payload.c_str()), [this](JsonObject root) -> bool {
      const char *email = root["email"] | "";
      this->owner_email_ = email;
      this->owner_email_std_ = email;
      if (this->owner_email_sensor_ != nullptr)
        this->owner_email_sensor_->publish_state(this->owner_email_std_);
      return true;
    });
  }
}

void FirebaseSSEComponent::handle_stream_payload_(const String &data_path, const String &payload) {
  if (payload == "null" || payload.isEmpty())
    return;
  if (data_path == "/viewer_until") {
    this->viewer_until_ms_ = strtoull(payload.c_str(), nullptr, 10);
    return;
  }
  if (payload[0] != '{')
    return;
  json::parse_json(std::string(payload.c_str()), [this](JsonObject root) -> bool {
    if (root["viewer_until"].is<uint64_t>())
      this->viewer_until_ms_ = root["viewer_until"].as<uint64_t>();
    JsonObject command = root["request"].is<JsonObject>()
                             ? root["request"].as<JsonObject>()
                             : root;
    const char *action = command["action"] | "";
    const char *request_id = command["request_id"] | "";
    const char *mode = command["mode"] | "";
    const float temperature = command["temperature"] | NAN;
    if (strlen(action) == 0 || strlen(request_id) == 0 || this->last_request_id_ == request_id)
      return true;
    this->last_request_id_ = request_id;
    this->execute_command_(action, mode, temperature, request_id);
    return true;
  });
}

void FirebaseSSEComponent::execute_command_(const String &action, const String &mode,
                                             float temperature, const String &request_id) {
  if (this->climate_ == nullptr) {
    this->send_ack_(request_id, "failed");
    return;
  }
  auto call = this->climate_->make_call();
  if (action == "set_temperature" && std::isfinite(temperature)) {
    call.set_target_temperature(temperature);
  } else if (action == "set_mode") {
    if (mode == "OFF")
      call.set_mode(climate::CLIMATE_MODE_OFF);
    else if (mode == "HEAT_COOL")
      call.set_mode(climate::CLIMATE_MODE_HEAT_COOL);
    else if (mode == "COOL")
      call.set_mode(climate::CLIMATE_MODE_COOL);
    else if (mode == "HEAT")
      call.set_mode(climate::CLIMATE_MODE_HEAT);
    else if (mode == "DRY")
      call.set_mode(climate::CLIMATE_MODE_DRY);
    else if (mode == "FAN_ONLY")
      call.set_mode(climate::CLIMATE_MODE_FAN_ONLY);
    else {
      this->send_ack_(request_id, "rejected");
      return;
    }
  } else {
    this->send_ack_(request_id, "rejected");
    return;
  }
  call.perform();
  this->state_dirty_ = true;
  this->send_ack_(request_id, "accepted");
}

void FirebaseSSEComponent::send_ack_(const String &request_id, const char *status) {
  if (this->database_ == nullptr || this->auth_client_ == nullptr)
    return;
  String json = "{\"request_id\":\"" + request_id + "\",\"status\":\"" + status +
                "\",\"executed_at\":{\".sv\":\"timestamp\"}}";
  const String path = "/devices/" + this->device_id_ + "/ack";
  this->database_->set<object_t>(*this->auth_client_, path, object_t(json.c_str()),
                                firebase_result_callback_, "ackWrite");
  const String command_path = "/devices/" + this->device_id_ + "/command/request";
  this->database_->remove(*this->auth_client_, command_path, firebase_result_callback_, "commandClear");
}

void FirebaseSSEComponent::publish_state_() {
  if (this->database_ == nullptr || this->auth_client_ == nullptr || this->climate_ == nullptr)
    return;
  const uint32_t now = millis();
  const uint32_t heartbeat_interval = this->viewer_active_() ? 30000UL : 900000UL;
  const bool heartbeat_due = !this->has_published_state_ ||
                             now - this->last_state_publish_ms_ >= heartbeat_interval;
  if (!this->state_changed_() && !heartbeat_due) {
    this->state_dirty_ = false;
    return;
  }
  String json = "{\"mode\":\"";
  json += this->climate_mode_name_();
  json += "\",\"current_temperature\":";
  json += std::isfinite(this->climate_->current_temperature)
              ? String(this->climate_->current_temperature, 1)
              : "null";
  json += ",\"target_temperature\":";
  json += std::isfinite(this->climate_->target_temperature)
              ? String(this->climate_->target_temperature, 1)
              : "null";
  json += ",\"local_ip\":\"";
  json += WiFi.localIP().toString();
  json += "\",\"local_host\":\"";
  json += WiFi.hostname();
  json += ".local\"";
  json += ",\"updated_at\":{\".sv\":\"timestamp\"}}";
  const String path = "/devices/" + this->device_id_ + "/state";
  this->database_->set<object_t>(*this->auth_client_, path, object_t(json.c_str()),
                                firebase_result_callback_, "stateWrite");
  this->last_published_mode_ = this->climate_->mode;
  this->last_published_current_temperature_ = this->climate_->current_temperature;
  this->last_published_target_temperature_ = this->climate_->target_temperature;
  this->has_published_state_ = true;
  this->state_dirty_ = false;
  this->last_state_publish_ms_ = now;
}

bool FirebaseSSEComponent::state_changed_() const {
  if (!this->has_published_state_ || this->climate_ == nullptr)
    return true;
  const auto changed_float = [](float current, float previous) {
    if (std::isfinite(current) != std::isfinite(previous))
      return true;
    return std::isfinite(current) && fabsf(current - previous) >= 0.05f;
  };
  return this->climate_->mode != this->last_published_mode_ ||
         changed_float(this->climate_->current_temperature,
                       this->last_published_current_temperature_) ||
         changed_float(this->climate_->target_temperature,
                       this->last_published_target_temperature_);
}

bool FirebaseSSEComponent::viewer_active_() const {
  const time_t now = time(nullptr);
  return now > 1704067200 && this->viewer_until_ms_ > static_cast<uint64_t>(now) * 1000ULL;
}

void FirebaseSSEComponent::publish_pairing_() {
  this->regenerate_pairing_code();
  if (this->database_ == nullptr || this->auth_client_ == nullptr)
    return;
  String json = "{\"code\":\"" + this->pairing_code_ +
                "\",\"created_at\":{\".sv\":\"timestamp\"}}";
  const String path = "/devices/" + this->device_id_ + "/pairing";
  this->database_->set<object_t>(*this->auth_client_, path, object_t(json.c_str()),
                                firebase_result_callback_, "pairingWrite");
}

void FirebaseSSEComponent::regenerate_pairing_code() {
  char code[9];
  snprintf(code, sizeof(code), "%08lu", static_cast<unsigned long>(os_random() % 100000000UL));
  this->pairing_code_ = code;
  this->pairing_code_std_ = code;
  if (this->pairing_code_sensor_ != nullptr)
    this->pairing_code_sensor_->publish_state(this->pairing_code_std_);
}

void FirebaseSSEComponent::request_owner_profile_() {
  if (this->database_ == nullptr || this->auth_client_ == nullptr)
    return;
  const String path = "/devices/" + this->device_id_ + "/owner_profile";
  this->database_->get(*this->auth_client_, path, firebase_result_callback_, false, "ownerProfile");
  this->last_owner_request_ms_ = millis();
}

void FirebaseSSEComponent::clear_cloud_owner() {
  if (!this->enabled_ || this->database_ == nullptr || this->auth_client_ == nullptr ||
      this->device_id_.isEmpty())
    return;
  this->database_->remove(*this->auth_client_, "/deviceOwners/" + this->device_id_,
                          firebase_result_callback_, "ownerClear");
  this->database_->remove(*this->auth_client_, "/devices/" + this->device_id_ + "/owner_profile",
                          firebase_result_callback_, "profileClear");
  this->owner_email_ = "";
  this->owner_email_std_.clear();
  if (this->owner_email_sensor_ != nullptr)
    this->owner_email_sensor_->publish_state("");
  this->publish_pairing_();
}

void FirebaseSSEComponent::publish_device_identity_() {
  this->device_id_std_ = this->device_id_.c_str();
  if (this->device_id_sensor_ != nullptr)
    this->device_id_sensor_->publish_state(this->device_id_std_);
  if (this->database_ != nullptr && this->auth_client_ != nullptr) {
    String json = "{\"local_access_token\":\"" + this->local_token_ + "\"}";
    this->database_->update<object_t>(*this->auth_client_,
                                     "/devices/" + this->device_id_ + "/meta",
                                     object_t(json.c_str()), firebase_result_callback_, "metaWrite");
  }
}

void FirebaseSSEComponent::load_or_create_local_token_() {
  File file = LittleFS.open(LOCAL_TOKEN_FILE, "r");
  if (file) {
    this->local_token_ = file.readStringUntil('\n');
    this->local_token_.trim();
    file.close();
  }
  if (this->local_token_.length() == 32)
    return;
  char token[33];
  snprintf(token, sizeof(token), "%08lx%08lx%08lx%08lx",
           static_cast<unsigned long>(os_random()), static_cast<unsigned long>(os_random()),
           static_cast<unsigned long>(os_random()), static_cast<unsigned long>(os_random()));
  this->local_token_ = token;
  file = LittleFS.open(LOCAL_TOKEN_FILE, "w");
  if (file) {
    file.println(this->local_token_);
    file.close();
  }
}

bool FirebaseSSEComponent::authorize_local_request_(AsyncWebServerRequest *request) const {
  if (!request->hasHeader("X-DT06-Token"))
    return false;
  return request->getHeader("X-DT06-Token")->value() == this->local_token_;
}

void FirebaseSSEComponent::add_local_headers_(AsyncWebServerResponse *response) const {
  response->addHeader("Access-Control-Allow-Origin", HOSTING_ORIGIN);
  response->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response->addHeader("Access-Control-Allow-Headers", "Content-Type,X-DT06-Token");
  response->addHeader("Access-Control-Allow-Private-Network", "true");
  response->addHeader("Cache-Control", "no-store");
}

void FirebaseSSEComponent::register_local_api_() {
  auto *base = web_server_base::global_web_server_base;
  if (base == nullptr || base->get_server() == nullptr)
    return;
  auto *server = base->get_server();
  server->on("/api/ping", HTTP_OPTIONS, [this](AsyncWebServerRequest *request) {
    auto *response = request->beginResponse(204);
    this->add_local_headers_(response);
    request->send(response);
  });
  server->on("/api/ping", HTTP_GET, [this](AsyncWebServerRequest *request) {
    if (!this->authorize_local_request_(request)) {
      auto *response = request->beginResponse(401, "application/json", "{\"ok\":false}");
      this->add_local_headers_(response);
      request->send(response);
      return;
    }
    auto *response = request->beginResponse(200, "application/json", "{\"ok\":true}");
    this->add_local_headers_(response);
    request->send(response);
  });
  server->on("/api/state", HTTP_OPTIONS, [this](AsyncWebServerRequest *request) {
    auto *response = request->beginResponse(204);
    this->add_local_headers_(response);
    request->send(response);
  });
  server->on("/api/state", HTTP_GET, [this](AsyncWebServerRequest *request) {
    if (!this->authorize_local_request_(request) || this->climate_ == nullptr) {
      auto *response = request->beginResponse(401, "application/json", "{\"ok\":false}");
      this->add_local_headers_(response);
      request->send(response);
      return;
    }
    String json = "{\"mode\":\"";
    json += this->climate_mode_name_();
    json += "\",\"current_temperature\":";
    json += std::isfinite(this->climate_->current_temperature)
                ? String(this->climate_->current_temperature, 1)
                : "null";
    json += ",\"target_temperature\":";
    json += std::isfinite(this->climate_->target_temperature)
                ? String(this->climate_->target_temperature, 1)
                : "null";
    json += "}";
    auto *response = request->beginResponse(200, "application/json", json);
    this->add_local_headers_(response);
    request->send(response);
  });
  server->on("/api/control", HTTP_OPTIONS, [this](AsyncWebServerRequest *request) {
    auto *response = request->beginResponse(204);
    this->add_local_headers_(response);
    request->send(response);
  });
  server->on("/api/control", HTTP_POST, [this](AsyncWebServerRequest *request) {
    if (!this->authorize_local_request_(request)) {
      auto *response = request->beginResponse(401, "application/json", "{\"status\":\"unauthorized\"}");
      this->add_local_headers_(response);
      request->send(response);
      return;
    }
    const String request_id = request->hasParam("request_id")
                                  ? request->getParam("request_id")->value()
                                  : String();
    const String mode = request->hasParam("mode") ? request->getParam("mode")->value() : String();
    const float temperature = request->hasParam("target_temperature")
                                  ? request->getParam("target_temperature")->value().toFloat()
                                  : NAN;
    if (request_id.isEmpty() || request_id == this->last_request_id_) {
      auto *response = request->beginResponse(request_id.isEmpty() ? 400 : 200,
                                              "application/json",
                                              request_id.isEmpty() ? "{\"status\":\"rejected\"}"
                                                                   : "{\"status\":\"duplicate\"}");
      this->add_local_headers_(response);
      request->send(response);
      return;
    }
    this->last_request_id_ = request_id;
    const String action = !mode.isEmpty() ? "set_mode" : "set_temperature";
    this->execute_command_(action, mode, temperature, request_id);
    auto *response = request->beginResponse(202, "application/json", "{\"status\":\"accepted\"}");
    this->add_local_headers_(response);
    request->send(response);
  });
  this->local_api_registered_ = true;
  ESP_LOGI(TAG, "Secure local PWA API registered");
}

void FirebaseSSEComponent::publish_status_(const char *value) {
  if (this->status_sensor_ != nullptr)
    this->status_sensor_->publish_state(value);
}

void FirebaseSSEComponent::save_tokens_() {
  if (this->app_ == nullptr || this->app_->getUid().isEmpty() || this->app_->getRefreshToken().isEmpty())
    return;
  File file = LittleFS.open(TOKEN_FILE, "w");
  if (!file)
    return;
  file.println(this->app_->getUid());
  file.println(this->app_->getToken());
  file.println(this->app_->getRefreshToken());
  file.close();
}

bool FirebaseSSEComponent::load_tokens_(String &uid, String &id_token, String &refresh_token) {
  if (!LittleFS.exists(TOKEN_FILE))
    return false;
  File file = LittleFS.open(TOKEN_FILE, "r");
  if (!file)
    return false;
  uid = file.readStringUntil('\n');
  id_token = file.readStringUntil('\n');
  refresh_token = file.readStringUntil('\n');
  file.close();
  uid.trim();
  id_token.trim();
  refresh_token.trim();
  return !uid.isEmpty() && !id_token.isEmpty() && !refresh_token.isEmpty();
}

void FirebaseSSEComponent::update_led_() {
  if (this->status_led_ == nullptr)
    return;
  if (!this->enabled_) {
    this->status_led_->turn_off();
    return;
  }
  if (this->stream_connected_) {
    this->status_led_->turn_on();
    return;
  }
  const uint32_t interval = this->identity_saved_ ? 1000 : 250;
  if (millis() - this->last_led_change_ms_ >= interval) {
    this->last_led_change_ms_ = millis();
    this->led_state_ = !this->led_state_;
    this->status_led_->set_state(this->led_state_);
  }
}

const char *FirebaseSSEComponent::climate_mode_name_() const {
  if (this->climate_ == nullptr)
    return "OFF";
  switch (this->climate_->mode) {
    case climate::CLIMATE_MODE_HEAT_COOL:
      return "HEAT_COOL";
    case climate::CLIMATE_MODE_COOL:
      return "COOL";
    case climate::CLIMATE_MODE_HEAT:
      return "HEAT";
    case climate::CLIMATE_MODE_FAN_ONLY:
      return "FAN_ONLY";
    case climate::CLIMATE_MODE_DRY:
      return "DRY";
    default:
      return "OFF";
  }
}

}  // namespace firebase_sse
}  // namespace esphome
