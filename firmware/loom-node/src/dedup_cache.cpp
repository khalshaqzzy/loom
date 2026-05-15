#include "dedup_cache.h"

namespace loom {

static bool isExpired(uint32_t nowMs, uint32_t expiresAtMs) {
  return (int32_t)(nowMs - expiresAtMs) >= 0;
}

void DedupCache::prune(uint32_t nowMs) {
  for (size_t i = 0; i < DEDUP_CACHE_SIZE; i++) {
    if (entries_[i].occupied && isExpired(nowMs, entries_[i].expiresAtMs)) {
      entries_[i].occupied = false;
    }
  }
}

bool DedupCache::has(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs) {
  prune(nowMs);
  for (size_t i = 0; i < DEDUP_CACHE_SIZE; i++) {
    if (entries_[i].occupied &&
        entries_[i].senderNodeId == senderNodeId &&
        entries_[i].seqId == seqId) {
      return true;
    }
  }
  return false;
}

int DedupCache::findSlotForWrite(uint32_t nowMs) const {
  int oldest = 0;
  for (size_t i = 0; i < DEDUP_CACHE_SIZE; i++) {
    if (!entries_[i].occupied || isExpired(nowMs, entries_[i].expiresAtMs)) return (int)i;
    if ((int32_t)(entries_[i].expiresAtMs - entries_[oldest].expiresAtMs) < 0) oldest = (int)i;
  }
  return oldest;
}

void DedupCache::add(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs) {
  int slot = findSlotForWrite(nowMs);
  entries_[slot].occupied = true;
  entries_[slot].senderNodeId = senderNodeId;
  entries_[slot].seqId = seqId;
  entries_[slot].expiresAtMs = nowMs + DEDUP_EXPIRY_MS;
}

}
