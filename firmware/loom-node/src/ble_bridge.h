#pragma once

#include <Arduino.h>
#include <NimBLEDevice.h>
#include "backlog_store.h"

namespace loom {

struct MobileMessage {
  char clientMessageId[48] = {0};
  char message[MAX_MESSAGE_LENGTH + 1] = {0};
  char kind[16] = {0};
  uint32_t timestamp = 0;
  int32_t latE6 = 0;
  int32_t lonE6 = 0;
};

class BleBridgeCallbacks {
 public:
  virtual bool onMobileMessage(const MobileMessage& message, DataPacket* packet, bool* queued, char* error, size_t errorSize) = 0;
  virtual void onInternetStatus(bool online, uint32_t nowMs) = 0;
  virtual void onBacklogAck(uint32_t senderNodeId, uint32_t seqId) = 0;
};

class BleBridge {
 public:
  void begin(uint32_t nodeId, BleBridgeCallbacks* callbacks);
  void tick(uint32_t nowMs, BacklogStore& backlog);
  bool isValidated() const;
  void notifyNodeStatus(uint16_t rangeToGateway, size_t neighborCount, size_t pendingCount, size_t backlogCount, bool internetPathActive);

 private:
  uint32_t nodeId_ = 0;
  bool validated_ = false;
  char challenge_[17] = {0};
  BleBridgeCallbacks* callbacks_ = nullptr;
  NimBLECharacteristic* validationChar_ = nullptr;
  NimBLECharacteristic* messageAckChar_ = nullptr;
  NimBLECharacteristic* backlogChar_ = nullptr;
  NimBLECharacteristic* nodeStatusChar_ = nullptr;
  uint32_t lastBacklogNotifyMs_ = 0;

  void resetChallenge();
  String identityJson() const;
  String challengeJson() const;
  void handleValidationWrite(const String& json);
  void handleMessageWrite(const String& json);
  void handleBacklogAckWrite(const String& json);
  void handleInternetStatusWrite(const String& json);
  void notifyMessageAck(const char* clientMessageId, bool accepted, const DataPacket& packet, bool queued, const char* error);
  void notifyBacklogItem(const BacklogItem& item);

  friend class ValidationCallbacks;
  friend class MessageCallbacks;
  friend class BacklogAckCallbacks;
  friend class InternetCallbacks;
};

}
