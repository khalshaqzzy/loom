#pragma once

#include <Arduino.h>
#include "config.h"

namespace loom {

class DedupCache {
 public:
  bool has(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs);
  void add(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs);
  void prune(uint32_t nowMs);

 private:
  struct Entry {
    bool occupied = false;
    uint32_t senderNodeId = 0;
    uint32_t seqId = 0;
    uint32_t expiresAtMs = 0;
  };

  Entry entries_[DEDUP_CACHE_SIZE];
  int findSlotForWrite(uint32_t nowMs) const;
};

}
