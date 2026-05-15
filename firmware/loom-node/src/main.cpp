#include <Arduino.h>
#include <esp_system.h>
#include <SPI.h>
#include <LoRa.h>
#include "backlog_store.h"
#include "ble_bridge.h"
#include "config.h"
#include "dedup_cache.h"
#include "pending_queue.h"
#include "protocol.h"
#include "routing.h"

using namespace loom;

namespace {

DedupCache dedupCache;
PendingQueue pendingQueue;
BacklogStore backlogStore;
RoutingTable routing;
BleBridge bleBridge;

uint32_t nextSeqId = 1;
uint16_t heartbeatSeq = 0;
uint32_t nextHeartbeatMs = 0;
uint32_t lastStatusNotifyMs = 0;

struct DelayedForward {
  bool occupied = false;
  DataPacket packet;
  uint32_t sendAtMs = 0;
};

DelayedForward forwardQueue[DELAYED_FORWARD_QUEUE_SIZE];

bool sendDataPacket(const DataPacket& packet);

uint32_t nowSeconds() {
  return (uint32_t)(millis() / 1000);
}

void scheduleNextHeartbeat(uint32_t nowMs) {
  nextHeartbeatMs = nowMs + random(HEARTBEAT_MIN_MS, HEARTBEAT_MAX_MS + 1);
  Serial.printf("[SCHED] Next heartbeat in %lu ms\n", nextHeartbeatMs - nowMs);
}

int findForwardSlot(uint32_t nowMs) {
  int oldest = 0;
  for (size_t i = 0; i < DELAYED_FORWARD_QUEUE_SIZE; i++) {
    if (!forwardQueue[i].occupied) return (int)i;
    if ((int32_t)(forwardQueue[i].sendAtMs - forwardQueue[oldest].sendAtMs) < 0) oldest = (int)i;
  }
  return oldest;
}

void scheduleForward(const DataPacket& packet, uint32_t nowMs) {
  int slot = findForwardSlot(nowMs);
  forwardQueue[slot].occupied = true;
  forwardQueue[slot].packet = packet;
  forwardQueue[slot].sendAtMs = nowMs + random(FORWARD_DELAY_MIN_MS, FORWARD_DELAY_MAX_MS + 1);
  Serial.printf("[ROUTE] Scheduled forward sender=%lu seq=%lu at +%lu ms\n",
                packet.senderNodeId,
                packet.seqId,
                forwardQueue[slot].sendAtMs - nowMs);
}

void processForwardQueue(uint32_t nowMs) {
  for (size_t i = 0; i < DELAYED_FORWARD_QUEUE_SIZE; i++) {
    if (!forwardQueue[i].occupied || (int32_t)(nowMs - forwardQueue[i].sendAtMs) < 0) continue;
    DataPacket packet = forwardQueue[i].packet;
    setForwarderRange(&packet, routing.rangeToGateway(nowMs));
    if (sendDataPacket(packet)) {
      Serial.printf("[LORA TX] FORWARD sender=%lu seq=%lu range=%u\n",
                    packet.senderNodeId,
                    packet.seqId,
                    packet.forwarderRangeToGateway);
    } else {
      Serial.printf("[LORA TX] FORWARD failed sender=%lu seq=%lu\n", packet.senderNodeId, packet.seqId);
    }
    forwardQueue[i].occupied = false;
  }
}

bool sendHeartbeatPacket() {
  uint8_t bytes[LORA_HEARTBEAT_PACKET_SIZE];
  size_t written = 0;
  HeartbeatPacket packet;
  packet.nodeId = NODE_ID;
  packet.rangeToGateway = routing.rangeToGateway(millis());
  packet.heartbeatSeq = ++heartbeatSeq;

  if (!encodeHeartbeat(packet, bytes, sizeof(bytes), &written)) {
    Serial.println("[LORA TX] HEARTBEAT encode failed");
    return false;
  }
  LoRa.beginPacket();
  LoRa.write(bytes, written);
  LoRa.endPacket();
  Serial.printf("[LORA TX] HEARTBEAT range=%u seq=%u\n", packet.rangeToGateway, packet.heartbeatSeq);
  return true;
}

bool sendDataPacket(const DataPacket& packet) {
  uint8_t bytes[MAX_LORA_PACKET_SIZE];
  size_t written = 0;
  if (!encodeData(packet, bytes, sizeof(bytes), &written)) {
    Serial.println("[LORA TX] DATA encode failed");
    return false;
  }
  LoRa.beginPacket();
  LoRa.write(bytes, written);
  LoRa.endPacket();
  return true;
}

void flushPending(uint32_t nowMs) {
  if (routing.rangeToGateway(nowMs) == ROUTE_INFINITY) return;
  DataPacket packet;
  while (pendingQueue.popReady(&packet)) {
    packet.senderRangeToGateway = routing.rangeToGateway(nowMs);
    packet.forwarderRangeToGateway = packet.senderRangeToGateway;
    if (sendDataPacket(packet)) {
      Serial.printf("[PENDING] Flushed sender=%lu seq=%lu range=%u\n",
                    packet.senderNodeId,
                    packet.seqId,
                    packet.senderRangeToGateway);
    } else {
      pendingQueue.push(packet, nowMs);
      Serial.printf("[PENDING] Requeued sender=%lu seq=%lu after TX failure\n",
                    packet.senderNodeId,
                    packet.seqId);
      return;
    }
  }
}

void handleHeartbeat(const uint8_t* bytes, size_t size, int rssi, uint32_t nowMs) {
  HeartbeatPacket packet;
  if (!decodeHeartbeat(bytes, size, &packet)) {
    Serial.println("[LORA RX] Invalid heartbeat");
    return;
  }
  routing.observeHeartbeat(packet, rssi, nowMs);
  Serial.printf("[LORA RX] HEARTBEAT from=%lu range=%u seq=%u rssi=%d\n",
                packet.nodeId,
                packet.rangeToGateway,
                packet.heartbeatSeq,
                rssi);
}

void handleData(const uint8_t* bytes, size_t size, int rssi, uint32_t nowMs) {
  DataPacket packet;
  if (!decodeData(bytes, size, &packet)) {
    Serial.println("[LORA RX] Invalid DATA");
    return;
  }
  if (packet.senderNodeId == NODE_ID) {
    Serial.printf("[LORA RX] Ignored own DATA seq=%lu\n", packet.seqId);
    return;
  }
  if (dedupCache.has(packet.senderNodeId, packet.seqId, nowMs)) {
    Serial.printf("[DEDUP] sender=%lu seq=%lu\n", packet.senderNodeId, packet.seqId);
    return;
  }

  dedupCache.add(packet.senderNodeId, packet.seqId, nowMs);
  bool stored = backlogStore.upsert(packet, NODE_ID, nowMs);
  Serial.printf("[LORA RX] DATA sender=%lu seq=%lu sRange=%u fRange=%u msg=%s rssi=%d\n",
                packet.senderNodeId,
                packet.seqId,
                packet.senderRangeToGateway,
                packet.forwarderRangeToGateway,
                packet.message,
                rssi);
  Serial.printf("[BACKLOG] Store received sender=%lu seq=%lu result=%s pending=%u\n",
                packet.senderNodeId,
                packet.seqId,
                stored ? "ok" : "failed",
                (unsigned)backlogStore.pendingCount());

  uint16_t selfRange = routing.rangeToGateway(nowMs);
  if (selfRange != ROUTE_INFINITY && selfRange < packet.forwarderRangeToGateway) {
    scheduleForward(packet, nowMs);
  } else {
    Serial.printf("[ROUTE] Forward denied selfRange=%u packetForwarderRange=%u\n",
                  selfRange,
                  packet.forwarderRangeToGateway);
  }
}

void pollLoRa(uint32_t nowMs) {
  int packetSize = LoRa.parsePacket();
  if (packetSize <= 0) return;
  Serial.printf("[LORA RX] Packet bytes=%d\n", packetSize);
  if (packetSize > (int)MAX_LORA_PACKET_SIZE) {
    while (LoRa.available()) LoRa.read();
    Serial.println("[LORA RX] Packet too large");
    return;
  }

  uint8_t bytes[MAX_LORA_PACKET_SIZE];
  size_t index = 0;
  while (LoRa.available() && index < sizeof(bytes)) {
    bytes[index++] = (uint8_t)LoRa.read();
  }
  if (index < 3) return;

  uint8_t packetType = bytes[2];
  int rssi = LoRa.packetRssi();
  if (packetType == LORA_TYPE_HEARTBEAT) {
    handleHeartbeat(bytes, index, rssi, nowMs);
  } else if (packetType == LORA_TYPE_DATA) {
    handleData(bytes, index, rssi, nowMs);
  } else {
    Serial.printf("[LORA RX] Unknown packet type=0x%02x size=%u\n", packetType, (unsigned)index);
  }
}

class AppCallbacks : public BleBridgeCallbacks {
 public:
  bool onMobileMessage(const MobileMessage& message, DataPacket* out, bool* queued, char* error, size_t errorSize) override {
    if (out == nullptr || queued == nullptr) return false;
    DataPacket packet;
    packet.senderNodeId = NODE_ID;
    packet.seqId = nextSeqId++;
    packet.senderRangeToGateway = routing.rangeToGateway(millis());
    packet.forwarderRangeToGateway = packet.senderRangeToGateway;
    packet.timestamp = message.timestamp == 0 ? nowSeconds() : message.timestamp;
    packet.latE6 = message.latE6;
    packet.lonE6 = message.lonE6;
    packet.messageLength = (uint8_t)strlen(message.message);
    strlcpy(packet.message, message.message, sizeof(packet.message));

    uint32_t nowMs = millis();
    dedupCache.add(packet.senderNodeId, packet.seqId, nowMs);
    bool stored = backlogStore.upsert(packet, NODE_ID, nowMs);
    Serial.printf("[BACKLOG] Store origin seq=%lu result=%s pending=%u\n",
                  packet.seqId,
                  stored ? "ok" : "failed",
                  (unsigned)backlogStore.pendingCount());

    if (packet.senderRangeToGateway == ROUTE_INFINITY) {
      *queued = true;
      if (!pendingQueue.push(packet, nowMs)) {
        strlcpy(error, "pending_full", errorSize);
        Serial.printf("[PENDING] Queue failed origin seq=%lu size=%u\n",
                      packet.seqId,
                      (unsigned)pendingQueue.size());
        return false;
      }
      Serial.printf("[PENDING] Queued origin seq=%lu msg=%s size=%u\n",
                    packet.seqId,
                    packet.message,
                    (unsigned)pendingQueue.size());
    } else {
      *queued = false;
      if (!sendDataPacket(packet)) {
        strlcpy(error, "lora_send_failed", errorSize);
        return false;
      }
      Serial.printf("[BLE] Broadcast origin seq=%lu range=%u msg=%s\n",
                    packet.seqId,
                    packet.senderRangeToGateway,
                    packet.message);
    }

    *out = packet;
    return true;
  }

  void onInternetStatus(bool online, uint32_t nowMs) override {
    routing.setInternetPath(online, nowMs);
    Serial.printf("[BLE] Internet path %s\n", online ? "online" : "offline");
  }

  void onBacklogAck(uint32_t senderNodeId, uint32_t seqId) override {
    bool acked = backlogStore.ack(senderNodeId, seqId);
    Serial.printf("[BLE] Backlog ack sender=%lu seq=%lu result=%s pending=%u\n",
                  senderNodeId,
                  seqId,
                  acked ? "ok" : "not_found",
                  (unsigned)backlogStore.pendingCount());
  }
};

AppCallbacks appCallbacks;

void notifyStatus(uint32_t nowMs, bool force = false) {
  if (!force && (int32_t)(nowMs - lastStatusNotifyMs) < 3000) return;
  bleBridge.notifyNodeStatus(
    routing.rangeToGateway(nowMs),
    routing.neighborCount(nowMs),
    pendingQueue.size(),
    backlogStore.pendingCount(),
    routing.internetPathActive(nowMs)
  );
  lastStatusNotifyMs = nowMs;
}

}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== LOOM Node Firmware ===");
  Serial.printf("Node ID: %lu\n", NODE_ID);
  Serial.printf("Firmware: %s\n", FIRMWARE_VERSION);
  Serial.printf("LoRa magic=0x%04x freq=%ld pins sck=%d miso=%d mosi=%d cs=%d rst=%d dio0=%d\n",
                LORA_MAGIC,
                LORA_FREQ,
                LORA_SCK,
                LORA_MISO,
                LORA_MOSI,
                LORA_CS,
                LORA_RST,
                LORA_DIO0);
  Serial.printf("Route infinity=%u heartbeat=%lu-%lu ms recompute=%lu ms neighborTimeout=%lu ms\n",
                ROUTE_INFINITY,
                HEARTBEAT_MIN_MS,
                HEARTBEAT_MAX_MS,
                ROUTE_RECOMPUTE_MS,
                NEIGHBOR_TIMEOUT_MS);
  Serial.printf("Queue sizes dedup=%u pending=%u backlog=%u forward=%u\n",
                (unsigned)DEDUP_CACHE_SIZE,
                (unsigned)PENDING_QUEUE_SIZE,
                (unsigned)BACKLOG_STORE_SIZE,
                (unsigned)DELAYED_FORWARD_QUEUE_SIZE);

  randomSeed((uint32_t)esp_random());
  routing.begin(NODE_ID);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("[ERROR] LoRa init failed");
    while (true) delay(1000);
  }
  Serial.println("[OK] LoRa ready");

  bleBridge.begin(NODE_ID, &appCallbacks);
  Serial.println("[OK] BLE advertising");

  scheduleNextHeartbeat(millis());
  notifyStatus(millis(), true);
}

void loop() {
  uint32_t nowMs = millis();

  pollLoRa(nowMs);
  bool routeChanged = routing.tick(nowMs);

  if ((int32_t)(nowMs - nextHeartbeatMs) >= 0) {
    sendHeartbeatPacket();
    scheduleNextHeartbeat(nowMs);
  }

  pendingQueue.prune(nowMs);
  backlogStore.prune(nowMs);
  dedupCache.prune(nowMs);
  flushPending(nowMs);
  processForwardQueue(nowMs);
  bleBridge.tick(nowMs, backlogStore);
  notifyStatus(nowMs, routeChanged);
}
