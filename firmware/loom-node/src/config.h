#pragma once

#include <Arduino.h>

namespace loom {

static const uint32_t NODE_ID = 2;
static const char* const FIRMWARE_VERSION = "0.1.0";
static const char* const BLE_DEVICE_NAME = "LOOM-Node-2";

static const int LORA_SCK = 33;
static const int LORA_MISO = 26;
static const int LORA_MOSI = 25;
static const int LORA_CS = 32;
static const int LORA_RST = 27;
static const int LORA_DIO0 = 14;
static const long LORA_FREQ = 868E6;

static const char* const LOOM_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
static const char* const LOOM_IDENTITY_CHAR_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914c";
static const char* const LOOM_VALIDATION_CHAR_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914d";
static const char* const LOOM_MESSAGE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
static const char* const LOOM_MESSAGE_ACK_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";
static const char* const LOOM_BACKLOG_STREAM_CHAR_UUID = "5f7e2d00-6c2e-4e68-9b7a-9bc6b193f001";
static const char* const LOOM_BACKLOG_ACK_CHAR_UUID = "5f7e2d00-6c2e-4e68-9b7a-9bc6b193f002";
static const char* const LOOM_INTERNET_STATUS_CHAR_UUID = "cba1d466-344c-4be3-ab3f-189f80dd7518";
static const char* const LOOM_NODE_STATUS_CHAR_UUID = "cba1d466-344c-4be3-ab3f-189f80dd7519";

static const uint16_t ROUTE_INFINITY = 65535;
static const uint16_t LORA_MAGIC = 0xD15A;
static const uint8_t LORA_TYPE_HEARTBEAT = 0x01;
static const uint8_t LORA_TYPE_DATA = 0x02;
static const size_t LORA_HEARTBEAT_PACKET_SIZE = 10;
static const size_t LORA_DATA_HEADER_SIZE = 26;
static const size_t MAX_MESSAGE_LENGTH = 31;
static const size_t MAX_LORA_PACKET_SIZE = 128;

static const uint32_t HEARTBEAT_MIN_MS = 12000;
static const uint32_t HEARTBEAT_MAX_MS = 18000;
static const uint32_t ROUTE_RECOMPUTE_MS = 5000;
static const uint32_t NEIGHBOR_TIMEOUT_MS = 60000;
static const uint32_t INTERNET_PATH_TIMEOUT_MS = 45000;
static const uint32_t DEDUP_EXPIRY_MS = 30UL * 60UL * 1000UL;
static const uint32_t PENDING_EXPIRY_MS = 30UL * 60UL * 1000UL;
static const uint32_t BACKLOG_EXPIRY_MS = 30UL * 60UL * 1000UL;
static const uint32_t FORWARD_DELAY_MIN_MS = 100;
static const uint32_t FORWARD_DELAY_MAX_MS = 1000;

static const size_t DEDUP_CACHE_SIZE = 96;
static const size_t PENDING_QUEUE_SIZE = 16;
static const size_t BACKLOG_STORE_SIZE = 32;
static const size_t NEIGHBOR_TABLE_SIZE = 16;
static const size_t DELAYED_FORWARD_QUEUE_SIZE = 16;

}
