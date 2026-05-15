#pragma once

#include <Arduino.h>
#include "protocol.h"

namespace loom {

struct BacklogItem {
  bool occupied = false;
  DataPacket packet;
  uint32_t receivedByNodeId = 0;
  uint32_t storedAtMs = 0;
  uint32_t deliveredToMobileAtMs = 0;
  bool ackedByMobile = false;
};

class BacklogStore {
 public:
  bool upsert(const DataPacket& packet, uint32_t receivedByNodeId, uint32_t nowMs);
  bool nextUndelivered(BacklogItem* out, uint32_t nowMs);
  bool markDelivered(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs);
  bool ack(uint32_t senderNodeId, uint32_t seqId);
  void prune(uint32_t nowMs);
  size_t pendingCount() const;
  size_t size() const;

 private:
  BacklogItem entries_[BACKLOG_STORE_SIZE];
  size_t count_ = 0;
  int find(uint32_t senderNodeId, uint32_t seqId) const;
  int findFreeSlot() const;
  int findEvictionSlot() const;
};

}
