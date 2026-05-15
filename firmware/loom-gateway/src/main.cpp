#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h> 

// ── Identity ─────────────────────────────────────────────
#define GATEWAY_NODE_ID   1       // daftarkan ke backend via POST /api/nodes

// ── WiFi (konek ke internet) ──────────────────────────────
const char* WIFI_SSID     = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";

// ── Backend API ───────────────────────────────────────────
const char* API_BURST_URL = "http://api.loomnetwork.site/api/ingest/burst";

// ── Pin LoRa (sisi kiri ESP32 WROOM-32) ─────────────────
#define LORA_SCK        33
#define LORA_MISO       26
#define LORA_MOSI       25
#define LORA_CS         32
#define LORA_RST        27
#define LORA_DIO0       14
#define LORA_FREQ       868E6

// ── LoRa Packet Types ─────────────────────────────────────
#define PKT_HEARTBEAT   0x01
#define PKT_DATA        0x02
#define PKT_MAGIC       0x4C4D

// ── Interval ─────────────────────────────────────────────
#define HEARTBEAT_INTERVAL_MS 15000

// ── Dedup cache ───────────────────────────────────────────
#define DEDUP_CACHE_SIZE 32
struct DedupEntry { uint32_t senderNodeId; uint32_t seqId; };
DedupEntry dedupCache[DEDUP_CACHE_SIZE];
uint8_t dedupIndex = 0;

bool isDuplicate(uint32_t sender, uint32_t seq) {
  for (int i = 0; i < DEDUP_CACHE_SIZE; i++) {
    if (dedupCache[i].senderNodeId == sender && dedupCache[i].seqId == seq) return true;
  }
  return false;
}
void addToDedup(uint32_t sender, uint32_t seq) {
  dedupCache[dedupIndex % DEDUP_CACHE_SIZE] = {sender, seq};
  dedupIndex++;
}

// ── POST data ke backend ──────────────────────────────────
void postToBackend(uint32_t senderNodeId, uint32_t srcSeq,
                   const char* message, uint16_t senderRange,
                   uint16_t forwarderRange) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi tidak terhubung, skip POST");
    return;
  }

  // Timestamp placeholder — backend pakai receivedByBackendAt sebagai fallback
  char timestamp[32];
  unsigned long sec = millis() / 1000;
  snprintf(timestamp, sizeof(timestamp),
    "2026-01-01T%02lu:%02lu:%02luZ",
    (sec / 3600) % 24, (sec / 60) % 60, sec % 60
  );

  // JSON sesuai burstIngestRequestSchema
  char body[512];
  snprintf(body, sizeof(body),
    "{"
      "\"uploaderType\":\"gateway_node\","
      "\"uploaderNodeId\":%d,"
      "\"messages\":[{"
        "\"senderNodeId\":%d,"
        "\"seqId\":%d,"
        "\"senderRangeToGateway\":%d,"
        "\"lastForwarderRangeToGateway\":%d,"
        "\"timestamp\":\"%s\","
        "\"message\":\"%s\","
        "\"source\":\"lora_mesh\","
        "\"receivedByNodeId\":%d"
      "}]"
    "}",
    GATEWAY_NODE_ID,
    senderNodeId, srcSeq, senderRange, forwarderRange,
    timestamp, message,
    GATEWAY_NODE_ID
  );

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, "https://api.loomnetwork.site/api/ingest/burst");
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("[HTTP] POST %d | nodeId=%d seqId=%d msg=%s\n",
      code, senderNodeId, srcSeq, message);
  } else {
    Serial.printf("[HTTP] Error: %s\n", http.errorToString(code).c_str());
  }
  http.end();
}

// ── Kirim heartbeat (rangeToGateway = 0) ─────────────────
void sendHeartbeat() {
  LoRa.beginPacket();
  LoRa.write((PKT_MAGIC >> 8) & 0xFF);
  LoRa.write(PKT_MAGIC & 0xFF);
  LoRa.write(PKT_HEARTBEAT);
  LoRa.write(GATEWAY_NODE_ID & 0xFF);
  LoRa.write((GATEWAY_NODE_ID >> 8) & 0xFF);
  LoRa.write((GATEWAY_NODE_ID >> 16) & 0xFF);
  LoRa.write(0x00);   // rangeToGateway = 0
  LoRa.write(0x00);
  LoRa.endPacket();
  Serial.println("[LORA TX] HEARTBEAT gateway");
}

// ── Terima paket LoRa dari node ───────────────────────────
void receiveLoRa() {
  int packetSize = LoRa.parsePacket();
  if (packetSize < 3) return;

  uint8_t magicHi = LoRa.read();
  uint8_t magicLo = LoRa.read();
  uint16_t magic  = ((uint16_t)magicHi << 8) | magicLo;
  if (magic != PKT_MAGIC) return;

  uint8_t pktType = LoRa.read();

  if (pktType == PKT_HEARTBEAT) {
    if (LoRa.available() < 5) return;
    uint32_t srcId    = LoRa.read() | ((uint32_t)LoRa.read() << 8) | ((uint32_t)LoRa.read() << 16);
    uint16_t srcRange = LoRa.read() | ((uint16_t)LoRa.read() << 8);
    int rssi = LoRa.packetRssi();
    Serial.printf("[LORA RX] HEARTBEAT | from=%d range=%d rssi=%d\n", srcId, srcRange, rssi);

  } else if (pktType == PKT_DATA) {
    if (LoRa.available() < 11) return;

    uint32_t srcId  = LoRa.read() | ((uint32_t)LoRa.read() << 8) | ((uint32_t)LoRa.read() << 16);
    uint32_t srcSeq = LoRa.read() | ((uint32_t)LoRa.read() << 8) |
                      ((uint32_t)LoRa.read() << 16) | ((uint32_t)LoRa.read() << 24);
    uint16_t senderRange    = LoRa.read() | ((uint16_t)LoRa.read() << 8);
    uint16_t forwarderRange = LoRa.read() | ((uint16_t)LoRa.read() << 8);

    // Buang timestamp (4 bytes) — backend pakai receivedByBackendAt
    if (LoRa.available() >= 4) {
      LoRa.read(); LoRa.read(); LoRa.read(); LoRa.read();
    }

    // Baca message string
    char message[64] = "unknown";
    if (LoRa.available() >= 1) {
      uint8_t msgLen = LoRa.read();
      if (msgLen > 0 && msgLen < 63 && LoRa.available() >= msgLen) {
        for (uint8_t i = 0; i < msgLen; i++) message[i] = (char)LoRa.read();
        message[msgLen] = '\0';
      }
    }

    int rssi = LoRa.packetRssi();
    Serial.printf("[LORA RX] DATA | from=%d seq=%d sRange=%d fRange=%d msg=%s rssi=%d\n",
      srcId, srcSeq, senderRange, forwarderRange, message, rssi);

    // Dedup
    if (isDuplicate(srcId, srcSeq)) {
      Serial.println("[DEDUP] Duplikat, skip");
      return;
    }
    addToDedup(srcId, srcSeq);

    // POST ke backend
    postToBackend(srcId, srcSeq, message, senderRange, forwarderRange);
  }
}

unsigned long lastHeartbeat = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== LOOM Gateway ===");
  Serial.printf("Gateway Node ID: %d\n", GATEWAY_NODE_ID);

  // Init LoRa
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("[ERROR] LoRa gagal init!");
    while (true);
  }
  Serial.println("[OK] LoRa ready");

  // Init WiFi (client — konek ke internet)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("[OK] WiFi connected: " + WiFi.localIP().toString());

  // Heartbeat pertama
  sendHeartbeat();
  lastHeartbeat = millis();

  Serial.println("[OK] Siap terima data dari node via LoRa");
}

void loop() {
  receiveLoRa();

  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
}