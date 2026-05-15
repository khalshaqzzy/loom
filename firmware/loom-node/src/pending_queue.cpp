#include "pending_queue.h"
#include "message_value.h"

namespace loom {

static bool isExpired(uint32_t nowMs, uint32_t expiresAtMs) {
  return (int32_t)(nowMs - expiresAtMs) >= 0;
}

void PendingQueue::prune(uint32_t nowMs) {
  for (size_t i = 0; i < PENDING_QUEUE_SIZE; i++) {
    if (entries_[i].occupied && isExpired(nowMs, entries_[i].expiresAtMs)) {
      entries_[i].occupied = false;
      if (count_ > 0) count_--;
    }
  }
}

int PendingQueue::findFreeSlot() const {
  for (size_t i = 0; i < PENDING_QUEUE_SIZE; i++) {
    if (!entries_[i].occupied) return (int)i;
  }
  return -1;
}

int PendingQueue::findOldestSlot() const {
  int oldest = -1;
  for (size_t i = 0; i < PENDING_QUEUE_SIZE; i++) {
    if (!entries_[i].occupied) continue;
    if (oldest < 0 || (int32_t)(entries_[i].createdAtMs - entries_[oldest].createdAtMs) < 0) oldest = (int)i;
  }
  return oldest;
}

int PendingQueue::findEvictionSlot() const {
  int oldestSafe = -1;
  for (size_t i = 0; i < PENDING_QUEUE_SIZE; i++) {
    if (!entries_[i].occupied || !isSafeMessageValue(entries_[i].packet.message)) continue;
    if (oldestSafe < 0 || (int32_t)(entries_[i].createdAtMs - entries_[oldestSafe].createdAtMs) < 0) {
      oldestSafe = (int)i;
    }
  }
  return oldestSafe >= 0 ? oldestSafe : findOldestSlot();
}

bool PendingQueue::push(const DataPacket& packet, uint32_t nowMs) {
  prune(nowMs);
  int slot = findFreeSlot();
  if (slot < 0) {
    slot = findEvictionSlot();
    if (slot < 0) return false;
  } else {
    count_++;
  }

  entries_[slot].occupied = true;
  entries_[slot].packet = packet;
  entries_[slot].createdAtMs = nowMs;
  entries_[slot].expiresAtMs = nowMs + PENDING_EXPIRY_MS;
  return true;
}

bool PendingQueue::popReady(DataPacket* out) {
  if (out == nullptr) return false;
  int slot = findOldestSlot();
  if (slot < 0) return false;
  *out = entries_[slot].packet;
  entries_[slot].occupied = false;
  if (count_ > 0) count_--;
  return true;
}

size_t PendingQueue::size() const {
  return count_;
}

}
