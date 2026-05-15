#pragma once

#include <Arduino.h>
#include "protocol.h"

namespace loom {

class RoutingTable {
 public:
  void begin(uint32_t selfNodeId);
  void setInternetPath(bool online, uint32_t nowMs);
  bool internetPathActive(uint32_t nowMs) const;
  void observeHeartbeat(const HeartbeatPacket& packet, int rssi, uint32_t nowMs);
  bool tick(uint32_t nowMs);
  uint16_t rangeToGateway(uint32_t nowMs) const;
  size_t neighborCount(uint32_t nowMs) const;

 private:
  struct Neighbor {
    bool occupied = false;
    uint32_t nodeId = 0;
    uint16_t rangeToGateway = ROUTE_INFINITY;
    uint16_t heartbeatSeq = 0;
    int rssi = 0;
    uint32_t lastSeenMs = 0;
  };

  uint32_t selfNodeId_ = 0;
  uint16_t rangeToGateway_ = ROUTE_INFINITY;
  bool internetOnline_ = false;
  uint32_t internetUpdatedAtMs_ = 0;
  uint32_t lastRecomputeMs_ = 0;
  Neighbor neighbors_[NEIGHBOR_TABLE_SIZE];

  int findNeighbor(uint32_t nodeId) const;
  int findFreeOrEvictionSlot(uint32_t nowMs) const;
  uint16_t recomputeFromNeighbors(uint32_t nowMs) const;
};

}
