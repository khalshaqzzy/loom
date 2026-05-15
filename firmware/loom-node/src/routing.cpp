#include "routing.h"

namespace loom {

static bool isFresh(uint32_t nowMs, uint32_t lastSeenMs, uint32_t timeoutMs) {
  return (int32_t)(nowMs - lastSeenMs) < (int32_t)timeoutMs;
}

void RoutingTable::begin(uint32_t selfNodeId) {
  selfNodeId_ = selfNodeId;
  Serial.printf("[ROUTE] Init self=%lu range=%u\n", selfNodeId_, rangeToGateway_);
}

void RoutingTable::setInternetPath(bool online, uint32_t nowMs) {
  internetOnline_ = online;
  internetUpdatedAtMs_ = nowMs;
  if (online) {
    rangeToGateway_ = 0;
    Serial.printf("[ROUTE] Internet path fresh at %lu ms, range=0\n", nowMs);
  } else {
    rangeToGateway_ = ROUTE_INFINITY;
    lastRecomputeMs_ = 0;
    Serial.printf("[ROUTE] Internet path offline at %lu ms, range=%u\n", nowMs, rangeToGateway_);
  }
}

bool RoutingTable::internetPathActive(uint32_t nowMs) const {
  return internetOnline_ && isFresh(nowMs, internetUpdatedAtMs_, INTERNET_PATH_TIMEOUT_MS);
}

int RoutingTable::findNeighbor(uint32_t nodeId) const {
  for (size_t i = 0; i < NEIGHBOR_TABLE_SIZE; i++) {
    if (neighbors_[i].occupied && neighbors_[i].nodeId == nodeId) return (int)i;
  }
  return -1;
}

int RoutingTable::findFreeOrEvictionSlot(uint32_t nowMs) const {
  int oldest = 0;
  for (size_t i = 0; i < NEIGHBOR_TABLE_SIZE; i++) {
    if (!neighbors_[i].occupied || !isFresh(nowMs, neighbors_[i].lastSeenMs, NEIGHBOR_TIMEOUT_MS)) {
      return (int)i;
    }
    if ((int32_t)(neighbors_[i].lastSeenMs - neighbors_[oldest].lastSeenMs) < 0) oldest = (int)i;
  }
  return oldest;
}

void RoutingTable::observeHeartbeat(const HeartbeatPacket& packet, int rssi, uint32_t nowMs) {
  if (packet.nodeId == selfNodeId_) return;
  int slot = findNeighbor(packet.nodeId);
  if (slot < 0) slot = findFreeOrEvictionSlot(nowMs);

  neighbors_[slot].occupied = true;
  neighbors_[slot].nodeId = packet.nodeId;
  neighbors_[slot].rangeToGateway = packet.rangeToGateway;
  neighbors_[slot].heartbeatSeq = packet.heartbeatSeq;
  neighbors_[slot].rssi = rssi;
  neighbors_[slot].lastSeenMs = nowMs;
  Serial.printf("[ROUTE] Neighbor upsert node=%lu range=%u hbSeq=%u rssi=%d slot=%d\n",
                packet.nodeId,
                packet.rangeToGateway,
                packet.heartbeatSeq,
                rssi,
                slot);
}

uint16_t RoutingTable::recomputeFromNeighbors(uint32_t nowMs) const {
  uint16_t best = ROUTE_INFINITY;
  for (size_t i = 0; i < NEIGHBOR_TABLE_SIZE; i++) {
    if (!neighbors_[i].occupied || !isFresh(nowMs, neighbors_[i].lastSeenMs, NEIGHBOR_TIMEOUT_MS)) continue;
    if (neighbors_[i].rangeToGateway == ROUTE_INFINITY) continue;
    if (neighbors_[i].rangeToGateway >= ROUTE_INFINITY - 1) continue;
    uint16_t candidate = neighbors_[i].rangeToGateway + 1;
    if (candidate < best) best = candidate;
  }
  return best;
}

bool RoutingTable::tick(uint32_t nowMs) {
  uint16_t previous = rangeToGateway_;
  if (internetOnline_ && !internetPathActive(nowMs)) {
    internetOnline_ = false;
    rangeToGateway_ = ROUTE_INFINITY;
    lastRecomputeMs_ = 0;
    Serial.printf("[ROUTE] Internet path expired at %lu ms, range=%u\n", nowMs, rangeToGateway_);
  }

  if (internetPathActive(nowMs)) {
    rangeToGateway_ = 0;
  } else if (lastRecomputeMs_ == 0 || (int32_t)(nowMs - lastRecomputeMs_) >= (int32_t)ROUTE_RECOMPUTE_MS) {
    rangeToGateway_ = recomputeFromNeighbors(nowMs);
    lastRecomputeMs_ = nowMs;
  }

  bool changed = previous != rangeToGateway_;
  if (changed) {
    Serial.printf("[ROUTE] Range changed %u -> %u at %lu ms\n", previous, rangeToGateway_, nowMs);
  }
  return changed;
}

uint16_t RoutingTable::rangeToGateway(uint32_t nowMs) const {
  if (internetPathActive(nowMs)) return 0;
  return rangeToGateway_;
}

size_t RoutingTable::neighborCount(uint32_t nowMs) const {
  size_t count = 0;
  for (size_t i = 0; i < NEIGHBOR_TABLE_SIZE; i++) {
    if (neighbors_[i].occupied && isFresh(nowMs, neighbors_[i].lastSeenMs, NEIGHBOR_TIMEOUT_MS)) count++;
  }
  return count;
}

}
