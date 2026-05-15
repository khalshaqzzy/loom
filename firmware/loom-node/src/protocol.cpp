#include "protocol.h"
#include "message_value.h"

namespace loom {

static void writeUint16BE(uint8_t* out, uint16_t value) {
  out[0] = (uint8_t)((value >> 8) & 0xff);
  out[1] = (uint8_t)(value & 0xff);
}

static uint16_t readUint16BE(const uint8_t* in) {
  return ((uint16_t)in[0] << 8) | in[1];
}

static void writeUint24BE(uint8_t* out, uint32_t value) {
  out[0] = (uint8_t)((value >> 16) & 0xff);
  out[1] = (uint8_t)((value >> 8) & 0xff);
  out[2] = (uint8_t)(value & 0xff);
}

static uint32_t readUint24BE(const uint8_t* in) {
  return ((uint32_t)in[0] << 16) | ((uint32_t)in[1] << 8) | in[2];
}

static void writeUint32BE(uint8_t* out, uint32_t value) {
  out[0] = (uint8_t)((value >> 24) & 0xff);
  out[1] = (uint8_t)((value >> 16) & 0xff);
  out[2] = (uint8_t)((value >> 8) & 0xff);
  out[3] = (uint8_t)(value & 0xff);
}

static uint32_t readUint32BE(const uint8_t* in) {
  return ((uint32_t)in[0] << 24) | ((uint32_t)in[1] << 16) | ((uint32_t)in[2] << 8) | in[3];
}

static void writeInt32BE(uint8_t* out, int32_t value) {
  writeUint32BE(out, (uint32_t)value);
}

static int32_t readInt32BE(const uint8_t* in) {
  return (int32_t)readUint32BE(in);
}

bool isValidNodeId(uint32_t nodeId) {
  return nodeId <= 0x00ffffffUL;
}

static bool hasValidAsciiMessage(const uint8_t* bytes, size_t size) {
  if (size == 0 || size > MAX_MESSAGE_LENGTH) return false;
  for (size_t i = 0; i < size; i++) {
    if (bytes[i] < 0x20 || bytes[i] > 0x7e) return false;
  }
  return true;
}

bool encodeHeartbeat(const HeartbeatPacket& packet, uint8_t* out, size_t outSize, size_t* written) {
  if (out == nullptr || written == nullptr || outSize < LORA_HEARTBEAT_PACKET_SIZE) return false;
  if (!isValidNodeId(packet.nodeId)) return false;

  writeUint16BE(out, LORA_MAGIC);
  out[2] = LORA_TYPE_HEARTBEAT;
  writeUint24BE(out + 3, packet.nodeId);
  writeUint16BE(out + 6, packet.rangeToGateway);
  writeUint16BE(out + 8, packet.heartbeatSeq);
  *written = LORA_HEARTBEAT_PACKET_SIZE;
  return true;
}

bool decodeHeartbeat(const uint8_t* bytes, size_t size, HeartbeatPacket* out) {
  if (bytes == nullptr || out == nullptr || size != LORA_HEARTBEAT_PACKET_SIZE) return false;
  if (readUint16BE(bytes) != LORA_MAGIC || bytes[2] != LORA_TYPE_HEARTBEAT) return false;

  HeartbeatPacket packet;
  packet.nodeId = readUint24BE(bytes + 3);
  packet.rangeToGateway = readUint16BE(bytes + 6);
  packet.heartbeatSeq = readUint16BE(bytes + 8);
  if (!isValidNodeId(packet.nodeId)) return false;
  *out = packet;
  return true;
}

bool encodeData(const DataPacket& packet, uint8_t* out, size_t outSize, size_t* written) {
  if (out == nullptr || written == nullptr) return false;
  if (!isValidNodeId(packet.senderNodeId)) return false;
  if (packet.messageLength == 0 || packet.messageLength > MAX_MESSAGE_LENGTH) return false;
  if (!isCanonicalMessageValue(packet.message)) return false;

  size_t packetSize = LORA_DATA_HEADER_SIZE + packet.messageLength;
  if (outSize < packetSize) return false;

  writeUint16BE(out, LORA_MAGIC);
  out[2] = LORA_TYPE_DATA;
  writeUint24BE(out + 3, packet.senderNodeId);
  writeUint32BE(out + 6, packet.seqId);
  writeUint16BE(out + 10, packet.senderRangeToGateway);
  writeUint16BE(out + 12, packet.forwarderRangeToGateway);
  writeUint32BE(out + 14, packet.timestamp);
  writeInt32BE(out + 18, packet.latE6);
  writeInt32BE(out + 22, packet.lonE6);
  memcpy(out + LORA_DATA_HEADER_SIZE, packet.message, packet.messageLength);
  *written = packetSize;
  return true;
}

bool decodeData(const uint8_t* bytes, size_t size, DataPacket* out) {
  if (bytes == nullptr || out == nullptr || size <= LORA_DATA_HEADER_SIZE) return false;
  if (readUint16BE(bytes) != LORA_MAGIC || bytes[2] != LORA_TYPE_DATA) return false;

  size_t messageLength = size - LORA_DATA_HEADER_SIZE;
  if (!hasValidAsciiMessage(bytes + LORA_DATA_HEADER_SIZE, messageLength)) return false;

  DataPacket packet;
  packet.senderNodeId = readUint24BE(bytes + 3);
  packet.seqId = readUint32BE(bytes + 6);
  packet.senderRangeToGateway = readUint16BE(bytes + 10);
  packet.forwarderRangeToGateway = readUint16BE(bytes + 12);
  packet.timestamp = readUint32BE(bytes + 14);
  packet.latE6 = readInt32BE(bytes + 18);
  packet.lonE6 = readInt32BE(bytes + 22);
  packet.messageLength = (uint8_t)messageLength;
  memcpy(packet.message, bytes + LORA_DATA_HEADER_SIZE, messageLength);
  packet.message[messageLength] = '\0';

  if (!isValidNodeId(packet.senderNodeId) || !isCanonicalMessageValue(packet.message)) return false;
  *out = packet;
  return true;
}

void setForwarderRange(DataPacket* packet, uint16_t rangeToGateway) {
  if (packet == nullptr) return;
  packet->forwarderRangeToGateway = rangeToGateway;
}

}
