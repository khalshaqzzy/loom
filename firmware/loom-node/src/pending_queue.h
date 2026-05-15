#pragma once

#include <Arduino.h>
#include "protocol.h"

namespace loom {

class PendingQueue {
 public:
  bool push(const DataPacket& packet, uint32_t nowMs);
  bool popReady(DataPacket* out);
  void prune(uint32_t nowMs);
  size_t size() const;

 private:
  struct Entry {
    bool occupied = false;
    DataPacket packet;
    uint32_t createdAtMs = 0;
    uint32_t expiresAtMs = 0;
  };

  Entry entries_[PENDING_QUEUE_SIZE];
  size_t count_ = 0;
  int findFreeSlot() const;
  int findEvictionSlot() const;
  int findOldestSlot() const;
};

}
