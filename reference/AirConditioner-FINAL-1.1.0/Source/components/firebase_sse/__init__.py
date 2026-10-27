import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import climate, output, switch, text_sensor
from esphome.const import CONF_ID

DEPENDENCIES = ["wifi", "web_server_base"]
AUTO_LOAD = ["json"]

CONF_API_KEY = "api_key"
CONF_DATABASE_URL = "database_url"
CONF_CLIMATE_ID = "climate_id"
CONF_STATUS = "status"
CONF_FIREBASE_DEVICE_ID = "firebase_device_id"
CONF_PAIRING_CODE = "pairing_code"
CONF_OWNER_EMAIL = "owner_email"
CONF_STATUS_LED = "status_led"

firebase_sse_ns = cg.esphome_ns.namespace("firebase_sse")
FirebaseSSEComponent = firebase_sse_ns.class_(
    "FirebaseSSEComponent", cg.Component, switch.Switch
)

CONFIG_SCHEMA = (
    switch.switch_schema(FirebaseSSEComponent)
    .extend(
        {
            cv.Required(CONF_API_KEY): cv.sensitive(cv.string_strict),
            cv.Required(CONF_DATABASE_URL): cv.url,
            cv.Required(CONF_CLIMATE_ID): cv.use_id(climate.Climate),
            cv.Required(CONF_STATUS): text_sensor.text_sensor_schema(),
            cv.Required(CONF_FIREBASE_DEVICE_ID): text_sensor.text_sensor_schema(),
            cv.Required(CONF_PAIRING_CODE): text_sensor.text_sensor_schema(),
            cv.Required(CONF_OWNER_EMAIL): text_sensor.text_sensor_schema(),
            cv.Required(CONF_STATUS_LED): cv.use_id(output.BinaryOutput),
        }
    )
    .extend(cv.COMPONENT_SCHEMA)
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await switch.register_switch(var, config)

    climate_var = await cg.get_variable(config[CONF_CLIMATE_ID])
    led_var = await cg.get_variable(config[CONF_STATUS_LED])
    status_var = await text_sensor.new_text_sensor(config[CONF_STATUS])
    device_id_var = await text_sensor.new_text_sensor(config[CONF_FIREBASE_DEVICE_ID])
    pairing_var = await text_sensor.new_text_sensor(config[CONF_PAIRING_CODE])
    owner_var = await text_sensor.new_text_sensor(config[CONF_OWNER_EMAIL])

    cg.add(var.set_api_key(config[CONF_API_KEY]))
    cg.add(var.set_database_url(config[CONF_DATABASE_URL]))
    cg.add(var.set_climate(climate_var))
    cg.add(var.set_status_led(led_var))
    cg.add(var.set_status_sensor(status_var))
    cg.add(var.set_device_id_sensor(device_id_var))
    cg.add(var.set_pairing_code_sensor(pairing_var))
    cg.add(var.set_owner_email_sensor(owner_var))

    cg.add_library("LittleFS", None)
    cg.add_library("mobizt/FirebaseClient", "2.2.9")
    cg.add_build_flag("-DENABLE_USER_AUTH")
    cg.add_build_flag("-DENABLE_ID_TOKEN")
    cg.add_build_flag("-DENABLE_DATABASE")
    # FirebaseClient 2.2.9 的部分獨立編譯單元在 Options.h 前載入
    # RTDBResult.h；明確給出與上游預設相同的 SSE timeout。
    cg.add_build_flag("-DFIREBASE_SSE_TIMEOUT_MS=40000")
