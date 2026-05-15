#pragma once

#include <Arduino.h>
#include "config.h"

namespace loom {

struct HeartbeatPacket {
  uint32_t nodeId = 0;
  uint16_t rangeToGateway = ROUTE_INFINITY;
  uint16_t heartbeatSeq = 0;
};

struct DataPacket {
  uint32_t senderNodeId = 0;
  uint32_t seqId = 0;
  uint16_t senderRangeToGateway = ROUTE_INFINITY;
  uint16_t forwarderRangeToGateway = ROUTE_INFINITY;
  uint32_t timestamp = 0;
  int32_t latE6 = 0;
  int32_t lonE6 = 0;
  char message[MAX_MESSAGE_LENGTH + 1] = {0};
  uint8_t messageLength = 0;
};

bool encodeHeartbeat(const HeartbeatPacket& packet, uint8_t* out, size_t outSize, size_t* written);
bool decodeHeartbeat(const uint8_t* bytes, size_t size, HeartbeatPacket* out);
bool encodeData(const DataPacket& packet, uint8_t* out, size_t outSize, size_t* written);
bool decodeData(const uint8_t* bytes, size_t size, DataPacket* out);
bool isValidNodeId(uint32_t nodeId);
void setForwarderRange(DataPacket* packet, uint16_t rangeToGateway);

}
