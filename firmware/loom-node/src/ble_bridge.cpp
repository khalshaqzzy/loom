#include "ble_bridge.h"
#include <ArduinoJson.h>
#include <math.h>
#include <time.h>
#include "config.h"
#include "message_value.h"

namespace loom {

static int64_t daysFromCivil(int y, unsigned m, unsigned d) {
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = (unsigned)(y - era * 400);
  const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + (int64_t)doe - 719468;
}

static uint32_t parseIsoOrNow(const char* value) {
  if (value == nullptr || value[0] == '\0') return (uint32_t)(millis() / 1000);
  int y, mo, d, h, mi, s;
  if (sscanf(value, "%d-%d-%dT%d:%d:%d", &y, &mo, &d, &h, &mi, &s) == 6) {
    int64_t epoch = daysFromCivil(y, (unsigned)mo, (unsigned)d) * 86400LL + h * 3600L + mi * 60L + s;
    if (epoch > 0 && epoch <= 0xffffffffLL) return (uint32_t)epoch;
  }
  return (uint32_t)(millis() / 1000);
}

static String epochToIso(uint32_t epoch) {
  time_t raw = (time_t)epoch;
  struct tm tmValue;
  gmtime_r(&raw, &tmValue);
  char out[25];
  snprintf(out, sizeof(out), "%04d-%02d-%02dT%02d:%02d:%02d.000Z",
           tmValue.tm_year + 1900,
           tmValue.tm_mon + 1,
           tmValue.tm_mday,
           tmValue.tm_hour,
           tmValue.tm_min,
           tmValue.tm_sec);
  return String(out);
}

static bool parseBacklogId(const char* backlogId, uint32_t* senderNodeId, uint32_t* seqId) {
  if (backlogId == nullptr || senderNodeId == nullptr || seqId == nullptr) return false;
  char* end = nullptr;
  uint32_t sender = strtoul(backlogId, &end, 10);
  if (end == nullptr || *end != ':') return false;
  uint32_t seq = strtoul(end + 1, &end, 10);
  if (end == nullptr || *end != '\0') return false;
  *senderNodeId = sender;
  *seqId = seq;
  return true;
}

class ValidationCallbacks : public NimBLECharacteristicCallbacks {
 public:
  explicit ValidationCallbacks(BleBridge* bridge) : bridge_(bridge) {}
  void onRead(NimBLECharacteristic* pChar) override { Serial.println("[BLE RX] Validation characteristic read"); }
  void onWrite(NimBLECharacteristic* pChar) override { bridge_->handleValidationWrite(String(pChar->getValue().c_str())); }
 private:
  BleBridge* bridge_;
};

class MessageCallbacks : public NimBLECharacteristicCallbacks {
 public:
  explicit MessageCallbacks(BleBridge* bridge) : bridge_(bridge) {}
  void onWrite(NimBLECharacteristic* pChar) override { bridge_->handleMessageWrite(String(pChar->getValue().c_str())); }
 private:
  BleBridge* bridge_;
};

class BacklogAckCallbacks : public NimBLECharacteristicCallbacks {
 public:
  explicit BacklogAckCallbacks(BleBridge* bridge) : bridge_(bridge) {}
  void onWrite(NimBLECharacteristic* pChar) override { bridge_->handleBacklogAckWrite(String(pChar->getValue().c_str())); }
 private:
  BleBridge* bridge_;
};

class InternetCallbacks : public NimBLECharacteristicCallbacks {
 public:
  explicit InternetCallbacks(BleBridge* bridge) : bridge_(bridge) {}
  void onWrite(NimBLECharacteristic* pChar) override { bridge_->handleInternetStatusWrite(String(pChar->getValue().c_str())); }
 private:
  BleBridge* bridge_;
};

void BleBridge::resetChallenge() {
  static const char alphabet[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (size_t i = 0; i < 12; i++) {
    challenge_[i] = alphabet[random(0, (int)strlen(alphabet))];
  }
  challenge_[12] = '\0';
  if (validationChar_ != nullptr) {
    validationChar_->setValue(challengeJson().c_str());
  }
  Serial.printf("[BLE] Validation challenge refreshed: %s\n", challenge_);
}

String BleBridge::identityJson() const {
  StaticJsonDocument<192> doc;
  doc["protocol"] = "loom-ble-v1";
  doc["nodeId"] = nodeId_;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  JsonArray capabilities = doc.createNestedArray("capabilities");
  capabilities.add("lora_v2");
  capabilities.add("backlog_stream");
  capabilities.add("internet_status");
  String out;
  serializeJson(doc, out);
  return out;
}

String BleBridge::challengeJson() const {
  StaticJsonDocument<80> doc;
  doc["challenge"] = challenge_;
  String out;
  serializeJson(doc, out);
  return out;
}

void BleBridge::begin(uint32_t nodeId, BleBridgeCallbacks* callbacks) {
  nodeId_ = nodeId;
  callbacks_ = callbacks;
  validated_ = false;
  resetChallenge();

  NimBLEDevice::init(BLE_DEVICE_NAME);
  Serial.printf("[BLE] Init device=%s service=%s\n", BLE_DEVICE_NAME, LOOM_SERVICE_UUID);
  NimBLEServer* server = NimBLEDevice::createServer();
  NimBLEService* service = server->createService(LOOM_SERVICE_UUID);

  NimBLECharacteristic* identityChar = service->createCharacteristic(LOOM_IDENTITY_CHAR_UUID, NIMBLE_PROPERTY::READ);
  identityChar->setValue(identityJson().c_str());
  Serial.printf("[BLE] Identity ready uuid=%s node=%lu\n", LOOM_IDENTITY_CHAR_UUID, nodeId_);

  validationChar_ = service->createCharacteristic(
    LOOM_VALIDATION_CHAR_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
  );
  validationChar_->setCallbacks(new ValidationCallbacks(this));
  validationChar_->setValue(challengeJson().c_str());
  Serial.printf("[BLE] Validation ready uuid=%s\n", LOOM_VALIDATION_CHAR_UUID);

  NimBLECharacteristic* messageChar = service->createCharacteristic(
    LOOM_MESSAGE_CHAR_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  messageChar->setCallbacks(new MessageCallbacks(this));
  Serial.printf("[BLE] Message write ready uuid=%s\n", LOOM_MESSAGE_CHAR_UUID);

  messageAckChar_ = service->createCharacteristic(LOOM_MESSAGE_ACK_CHAR_UUID, NIMBLE_PROPERTY::NOTIFY);
  backlogChar_ = service->createCharacteristic(LOOM_BACKLOG_STREAM_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  backlogChar_->setValue("{}");
  Serial.printf("[BLE] Message ack notify uuid=%s\n", LOOM_MESSAGE_ACK_CHAR_UUID);
  Serial.printf("[BLE] Backlog stream ready uuid=%s\n", LOOM_BACKLOG_STREAM_CHAR_UUID);

  NimBLECharacteristic* backlogAckChar = service->createCharacteristic(LOOM_BACKLOG_ACK_CHAR_UUID, NIMBLE_PROPERTY::WRITE);
  backlogAckChar->setCallbacks(new BacklogAckCallbacks(this));
  Serial.printf("[BLE] Backlog ack ready uuid=%s\n", LOOM_BACKLOG_ACK_CHAR_UUID);

  NimBLECharacteristic* internetChar = service->createCharacteristic(
    LOOM_INTERNET_STATUS_CHAR_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  internetChar->setCallbacks(new InternetCallbacks(this));
  Serial.printf("[BLE] Internet status ready uuid=%s\n", LOOM_INTERNET_STATUS_CHAR_UUID);

  nodeStatusChar_ = service->createCharacteristic(LOOM_NODE_STATUS_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  Serial.printf("[BLE] Node status ready uuid=%s\n", LOOM_NODE_STATUS_CHAR_UUID);
  service->start();

  NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(LOOM_SERVICE_UUID);
  advertising->start();
  Serial.println("[BLE] Advertising started");
}

bool BleBridge::isValidated() const {
  return validated_;
}

void BleBridge::handleValidationWrite(const String& json) {
  Serial.printf("[BLE RX] Validation payload bytes=%u\n", json.length());
  StaticJsonDocument<160> doc;
  DeserializationError err = deserializeJson(doc, json);
  bool ok = !err &&
            doc["nodeId"].is<uint32_t>() &&
            doc["challenge"].is<const char*>() &&
            doc["nodeId"].as<uint32_t>() == nodeId_ &&
            strcmp(doc["challenge"].as<const char*>(), challenge_) == 0;

  validated_ = ok;
  Serial.printf("[BLE] Validation %s node=%lu\n", ok ? "accepted" : "rejected", doc["nodeId"] | 0UL);
  StaticJsonDocument<96> response;
  response["validated"] = ok;
  response["nodeId"] = nodeId_;
  if (!ok) response["error"] = "validation_failed";
  String out;
  serializeJson(response, out);
  validationChar_->setValue(out.c_str());
  validationChar_->notify();
  Serial.printf("[BLE TX] Validation response: %s\n", out.c_str());
}

void BleBridge::handleMessageWrite(const String& json) {
  Serial.printf("[BLE RX] Message payload bytes=%u validated=%s\n", json.length(), validated_ ? "yes" : "no");
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, json);

  MobileMessage incoming;
  DataPacket packet;
  bool queued = false;
  char error[40] = {0};

  if (!validated_) {
    strlcpy(error, "not_validated", sizeof(error));
    Serial.println("[BLE] Message rejected: not_validated");
    notifyMessageAck("", false, packet, false, error);
    return;
  }

  if (err || !doc["clientMessageId"].is<const char*>() || !doc["message"].is<const char*>()) {
    strlcpy(error, "invalid_payload", sizeof(error));
    Serial.printf("[BLE] Message rejected: invalid_payload parse=%s\n", err ? err.c_str() : "missing_fields");
    notifyMessageAck("", false, packet, false, error);
    return;
  }

  strlcpy(incoming.clientMessageId, doc["clientMessageId"].as<const char*>(), sizeof(incoming.clientMessageId));
  strlcpy(incoming.message, doc["message"].as<const char*>(), sizeof(incoming.message));
  strlcpy(incoming.kind, doc["kind"] | "emergency", sizeof(incoming.kind));
  incoming.timestamp = parseIsoOrNow(doc["timestamp"] | "");
  if (doc["latE6"].is<int32_t>() && doc["lonE6"].is<int32_t>()) {
    incoming.latE6 = doc["latE6"].as<int32_t>();
    incoming.lonE6 = doc["lonE6"].as<int32_t>();
  } else if (doc["lat"].is<float>() && doc["lon"].is<float>()) {
    incoming.latE6 = (int32_t)lroundf(doc["lat"].as<float>() * 1000000.0f);
    incoming.lonE6 = (int32_t)lroundf(doc["lon"].as<float>() * 1000000.0f);
  }

  if (!isCanonicalMessageValue(incoming.message)) {
    strlcpy(error, "unsupported_message", sizeof(error));
    Serial.printf("[BLE] Message rejected: unsupported_message value=%s\n", incoming.message);
    notifyMessageAck(incoming.clientMessageId, false, packet, false, error);
    return;
  }

  Serial.printf("[BLE] Message accepted for processing client=%s msg=%s kind=%s ts=%lu latE6=%ld lonE6=%ld\n",
                incoming.clientMessageId,
                incoming.message,
                incoming.kind,
                incoming.timestamp,
                incoming.latE6,
                incoming.lonE6);

  bool accepted = callbacks_ != nullptr &&
                  callbacks_->onMobileMessage(incoming, &packet, &queued, error, sizeof(error));
  notifyMessageAck(incoming.clientMessageId, accepted, packet, queued, accepted ? nullptr : error);
}

void BleBridge::notifyMessageAck(const char* clientMessageId, bool accepted, const DataPacket& packet, bool queued, const char* error) {
  if (messageAckChar_ == nullptr) return;
  StaticJsonDocument<224> doc;
  doc["clientMessageId"] = clientMessageId == nullptr ? "" : clientMessageId;
  doc["accepted"] = accepted;
  if (accepted) {
    doc["senderNodeId"] = packet.senderNodeId;
    doc["seqId"] = packet.seqId;
    doc["queued"] = queued;
    doc["rangeToGateway"] = packet.senderRangeToGateway;
  } else {
    doc["error"] = error == nullptr || error[0] == '\0' ? "rejected" : error;
  }
  String out;
  serializeJson(doc, out);
  messageAckChar_->setValue(out.c_str());
  messageAckChar_->notify();
  Serial.printf("[BLE TX] Message ack: %s\n", out.c_str());
}

void BleBridge::handleBacklogAckWrite(const String& json) {
  Serial.printf("[BLE RX] Backlog ack payload bytes=%u\n", json.length());
  StaticJsonDocument<384> doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err || callbacks_ == nullptr || !doc["backlogIds"].is<JsonArray>()) {
    Serial.printf("[BLE] Backlog ack ignored parse=%s\n", err ? err.c_str() : "missing_backlogIds");
    return;
  }
  for (JsonVariant id : doc["backlogIds"].as<JsonArray>()) {
    uint32_t sender = 0;
    uint32_t seq = 0;
    if (parseBacklogId(id.as<const char*>(), &sender, &seq)) {
      Serial.printf("[BLE] Backlog ack parsed sender=%lu seq=%lu\n", sender, seq);
      callbacks_->onBacklogAck(sender, seq);
    } else {
      Serial.printf("[BLE] Backlog ack invalid id=%s\n", id.as<const char*>());
    }
  }
}

void BleBridge::handleInternetStatusWrite(const String& json) {
  if (callbacks_ == nullptr) return;
  Serial.printf("[BLE RX] Internet status payload bytes=%u\n", json.length());
  StaticJsonDocument<192> doc;
  DeserializationError err = deserializeJson(doc, json);
  if (err) {
    if (json.length() == 1) {
      bool online = json[0] == 1;
      Serial.printf("[BLE] Internet legacy byte online=%s\n", online ? "true" : "false");
      callbacks_->onInternetStatus(online, millis());
    } else {
      Serial.printf("[BLE] Internet status ignored parse=%s\n", err.c_str());
    }
    return;
  }
  if (!doc["online"].is<bool>()) {
    Serial.println("[BLE] Internet status ignored: missing online");
    return;
  }
  bool online = doc["online"].as<bool>();
  Serial.printf("[BLE] Internet status online=%s installation=%s\n",
                online ? "true" : "false",
                doc["mobileInstallationId"] | "");
  callbacks_->onInternetStatus(online, millis());
}

void BleBridge::notifyBacklogItem(const BacklogItem& item) {
  if (backlogChar_ == nullptr) return;
  StaticJsonDocument<512> doc;
  String backlogId = String(item.packet.senderNodeId) + ":" + String(item.packet.seqId);
  doc["backlogId"] = backlogId;
  doc["senderNodeId"] = item.packet.senderNodeId;
  doc["seqId"] = item.packet.seqId;
  doc["senderRangeToGateway"] = item.packet.senderRangeToGateway;
  doc["lastForwarderRangeToGateway"] = item.packet.forwarderRangeToGateway;
  doc["timestamp"] = epochToIso(item.packet.timestamp);
  doc["latE6"] = item.packet.latE6;
  doc["lonE6"] = item.packet.lonE6;
  doc["message"] = item.packet.message;
  doc["receivedByNodeId"] = item.receivedByNodeId;
  doc["source"] = "lora_mesh";
  String out;
  serializeJson(doc, out);
  backlogChar_->setValue(out.c_str());
  backlogChar_->notify();
  Serial.printf("[BLE TX] Backlog item id=%s bytes=%u\n", backlogId.c_str(), out.length());
}

void BleBridge::tick(uint32_t nowMs, BacklogStore& backlog) {
  if (!validated_ || (int32_t)(nowMs - lastBacklogNotifyMs_) < 1000) return;
  BacklogItem item;
  if (backlog.nextUndelivered(&item, nowMs)) {
    Serial.printf("[BLE] Backlog notify pending sender=%lu seq=%lu\n",
                  item.packet.senderNodeId,
                  item.packet.seqId);
    notifyBacklogItem(item);
    backlog.markDelivered(item.packet.senderNodeId, item.packet.seqId, nowMs);
    lastBacklogNotifyMs_ = nowMs;
  }
}

void BleBridge::notifyNodeStatus(uint16_t rangeToGateway, size_t neighborCount, size_t pendingCount, size_t backlogCount, bool internetPathActive) {
  if (nodeStatusChar_ == nullptr) return;
  StaticJsonDocument<192> doc;
  doc["nodeId"] = nodeId_;
  doc["validated"] = validated_;
  doc["rangeToGateway"] = rangeToGateway;
  doc["neighborCount"] = neighborCount;
  doc["pendingCount"] = pendingCount;
  doc["backlogCount"] = backlogCount;
  doc["internetPathActive"] = internetPathActive;
  String out;
  serializeJson(doc, out);
  nodeStatusChar_->setValue(out.c_str());
  nodeStatusChar_->notify();
  Serial.printf("[BLE TX] Node status range=%u neighbors=%u pending=%u backlog=%u internet=%s validated=%s\n",
                rangeToGateway,
                (unsigned)neighborCount,
                (unsigned)pendingCount,
                (unsigned)backlogCount,
                internetPathActive ? "true" : "false",
                validated_ ? "true" : "false");
}

}
