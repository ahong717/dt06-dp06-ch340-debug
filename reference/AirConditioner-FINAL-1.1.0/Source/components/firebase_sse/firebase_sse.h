#pragma once

#include <memory>
#include <string>

#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>

#include "esphome/core/component.h"
#include "esphome/components/climate/climate.h"
#include "esphome/components/json/json_util.h"
#include "esphome/components/output/binary_output.h"
#include "esphome/components/switch/switch.h"
#include "esphome/components/text_sensor/text_sensor.h"
#include "esphome/components/web_server_base/web_server_base.h"

namespace esphome {
namespace firebase_sse {

class FirebaseSSEComponent : public Component, public switch_::Switch {
 public:
  void set_api_key(const std::string &value) { this->api_key_ = value.c_str(); }
  void set_database_url(const std::string &value) { this->database_url_ = value.c_str(); }
  void set_climate(climate::Climate *value) { this->climate_ = value; }
  void set_status_led(output::BinaryOutput *value) { this->status_led_ = value; }
  void set_status_sensor(text_sensor::TextSensor *value) { this->status_sensor_ = value; }
  void set_device_id_sensor(text_sensor::TextSensor *value) { this->device_id_sensor_ = value; }
  void set_pairing_code_sensor(text_sensor::TextSensor *value) { this->pairing_code_sensor_ = value; }
  void set_owner_email_sensor(text_sensor::TextSensor *value) { this->owner_email_sensor_ = value; }

  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::AFTER_WIFI; }
  void write_state(bool state) override;

  void regenerate_pairing_code();
  void clear_cloud_owner();
  bool is_connected() const { return this->stream_connected_; }
  const std::string &get_device_id() const { return this->device_id_std_; }
  const std::string &get_pairing_code() const { return this->pairing_code_std_; }
  const std::string &get_owner_email() const { return this->owner_email_std_; }

 protected:
  static FirebaseSSEComponent *instance_;
  static void firebase_result_callback_(AsyncResult &result);
  void process_result_(AsyncResult &result);

  void start_();
  void stop_();
  void start_stream_();
  void save_tokens_();
  bool load_tokens_(String &uid, String &id_token, String &refresh_token);
  void publish_status_(const char *value);
  void publish_device_identity_();
  void load_or_create_local_token_();
  void register_local_api_();
  bool authorize_local_request_(AsyncWebServerRequest *request) const;
  void add_local_headers_(AsyncWebServerResponse *response) const;
  void publish_pairing_();
  void publish_state_();
  void request_owner_profile_();
  void handle_stream_payload_(const String &data_path, const String &payload);
  bool state_changed_() const;
  bool viewer_active_() const;
  void execute_command_(const String &action, const String &mode, float temperature,
                        const String &request_id);
  void send_ack_(const String &request_id, const char *status);
  void update_led_();
  const char *climate_mode_name_() const;

  String api_key_;
  String database_url_;
  climate::Climate *climate_{nullptr};
  output::BinaryOutput *status_led_{nullptr};
  text_sensor::TextSensor *status_sensor_{nullptr};
  text_sensor::TextSensor *device_id_sensor_{nullptr};
  text_sensor::TextSensor *pairing_code_sensor_{nullptr};
  text_sensor::TextSensor *owner_email_sensor_{nullptr};

  BearSSL::WiFiClientSecure auth_ssl_;
  BearSSL::WiFiClientSecure stream_ssl_;
  std::unique_ptr<BearSSL::X509List> trust_anchor_;
  std::unique_ptr<AsyncClientClass> auth_client_;
  std::unique_ptr<AsyncClientClass> stream_client_;
  std::unique_ptr<FirebaseApp> app_;
  std::unique_ptr<RealtimeDatabase> database_;
  std::unique_ptr<UserAccount> signup_user_;
  std::unique_ptr<IDToken> id_token_auth_;

  bool enabled_{false};
  bool firebase_started_{false};
  bool stream_started_{false};
  bool stream_connected_{false};
  bool identity_saved_{false};
  bool state_dirty_{true};
  bool clear_owner_pending_{false};
  bool local_api_registered_{false};
  uint32_t last_state_publish_ms_{0};
  uint32_t last_owner_request_ms_{0};
  uint32_t last_led_change_ms_{0};
  uint64_t viewer_until_ms_{0};
  bool led_state_{false};

  climate::ClimateMode last_published_mode_{climate::CLIMATE_MODE_OFF};
  float last_published_current_temperature_{NAN};
  float last_published_target_temperature_{NAN};
  bool has_published_state_{false};

  String device_id_;
  String pairing_code_;
  String owner_email_;
  String last_request_id_;
  String local_token_;
  std::string device_id_std_;
  std::string pairing_code_std_;
  std::string owner_email_std_;
};

}  // namespace firebase_sse
}  // namespace esphome
