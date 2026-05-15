#include "backlog_store.h"
#include "message_value.h"

namespace loom {

static bool isExpired(uint32_t nowMs, uint32_t storedAtMs) {
  return (int32_t)(nowMs - storedAtMs) >= (int32_t)BACKLOG_EXPIRY_MS;
}

int BacklogStore::find(uint32_t senderNodeId, uint32_t seqId) const {
  for (size_t i = 0; i < BACKLOG_STORE_SIZE; i++) {
    if (entries_[i].occupied &&
        entries_[i].packet.senderNodeId == senderNodeId &&
        entries_[i].packet.seqId == seqId) {
      return (int)i;
    }
  }
  return -1;
}

int BacklogStore::findFreeSlot() const {
  for (size_t i = 0; i < BACKLOG_STORE_SIZE; i++) {
    if (!entries_[i].occupied) return (int)i;
  }
  return -1;
}

int BacklogStore::findEvictionSlot() const {
  int oldestAcked = -1;
  int oldestSafe = -1;
  int oldest = -1;
  for (size_t i = 0; i < BACKLOG_STORE_SIZE; i++) {
    if (!entries_[i].occupied) continue;
    if (oldest < 0 || (int32_t)(entries_[i].storedAtMs - entries_[oldest].storedAtMs) < 0) oldest = (int)i;
    if (entries_[i].ackedByMobile &&
        (oldestAcked < 0 || (int32_t)(entries_[i].storedAtMs - entries_[oldestAcked].storedAtMs) < 0)) {
      oldestAcked = (int)i;
    }
    if (isSafeMessageValue(entries_[i].packet.message) &&
        (oldestSafe < 0 || (int32_t)(entries_[i].storedAtMs - entries_[oldestSafe].storedAtMs) < 0)) {
      oldestSafe = (int)i;
    }
  }
  if (oldestAcked >= 0) return oldestAcked;
  if (oldestSafe >= 0) return oldestSafe;
  return oldest;
}

bool BacklogStore::upsert(const DataPacket& packet, uint32_t receivedByNodeId, uint32_t nowMs) {
  prune(nowMs);
  int slot = find(packet.senderNodeId, packet.seqId);
  if (slot < 0) {
    slot = findFreeSlot();
    if (slot < 0) {
      slot = findEvictionSlot();
      if (slot < 0) return false;
    } else {
      count_++;
    }
  }

  entries_[slot].occupied = true;
  entries_[slot].packet = packet;
  entries_[slot].receivedByNodeId = receivedByNodeId;
  entries_[slot].storedAtMs = nowMs;
  entries_[slot].deliveredToMobileAtMs = 0;
  entries_[slot].ackedByMobile = false;
  return true;
}

bool BacklogStore::nextUndelivered(BacklogItem* out, uint32_t nowMs) {
  if (out == nullptr) return false;
  prune(nowMs);
  int selected = -1;
  for (size_t i = 0; i < BACKLOG_STORE_SIZE; i++) {
    if (!entries_[i].occupied || entries_[i].ackedByMobile) continue;
    if (selected < 0 || (int32_t)(entries_[i].storedAtMs - entries_[selected].storedAtMs) < 0) selected = (int)i;
  }
  if (selected < 0) return false;
  *out = entries_[selected];
  return true;
}

bool BacklogStore::markDelivered(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs) {
  int slot = find(senderNodeId, seqId);
  if (slot < 0) return false;
  entries_[slot].deliveredToMobileAtMs = nowMs;
  return true;
}

bool BacklogStore::ack(uint32_t senderNodeId, uint32_t seqId) {
  int slot = find(senderNodeId, seqId);
  if (slot < 0) return false;
  entries_[slot].ackedByMobile = true;
  entries_[slot].occupied = false;
  if (count_ > 0) count_--;
  return true;
}

void BacklogStore::prune(uint32_t nowMs) {
  for (size_t i = 0; i < BACKLOG_STORE_SIZE; i++) {
    if (entries_[i].occupied && entries_[i].ackedByMobile) {
      entries_[i].occupied = false;
      if (count_ > 0) count_--;
    } else if (entries_[i].occupied && isExpired(nowMs, entries_[i].storedAtMs)) {
      entries_[i].occupied = false;
      if (count_ > 0) count_--;
    }
  }
}

size_t BacklogStore::pendingCount() const {
  size_t pending = 0;
  for (size_t i = 0; i < BACKLOG_STORE_SIZE; i++) {
    if (entries_[i].occupied && !entries_[i].ackedByMobile) pending++;
  }
  return pending;
}

size_t BacklogStore::size() const {
  return count_;
}

}
