#include <SPI.h>
#include <LoRa.h>
#include <NimBLEDevice.h>

// ── Identity ─────────────────────────────────────────────
#define NODE_ID         2         // ganti per device, daftarkan ke backend
#define ROUTE_INFINITY  65535

// ── BLE UUIDs (sesuai BleManager.ts mobile app) ──────────
#define LOOM_SERVICE_UUID              "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define LOOM_REPORT_CHAR_UUID          "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define LOOM_INTERNET_STATUS_CHAR_UUID "cba1d466-344c-4be3-ab3f-189f80dd7518"

// ── BLE Device Name (mobile scan cari prefix "LOOM") ─────
#define BLE_DEVICE_NAME "LOOM-Node-2"  // ganti angka sesuai NODE_ID

// ── Pin LoRa (sisi kiri ESP32 WROOM-32) ─────────────────
#define LORA_SCK        33
#define LORA_MISO       26
#define LORA_MOSI       25
#define LORA_CS         32
#define LORA_RST        27
#define LORA_DIO0       14
#define LORA_FREQ       433E6

// ── LoRa Packet Types ─────────────────────────────────────
#define PKT_HEARTBEAT   0x01
#define PKT_DATA        0x02
#define PKT_MAGIC       0x4C4D

// ── Interval ─────────────────────────────────────────────
#define HEARTBEAT_INTERVAL_MS 30000

// ── State ─────────────────────────────────────────────────
uint32_t seqId          = 0;
uint16_t rangeToGateway = ROUTE_INFINITY;
bool hasInternet        = false;
unsigned long lastHeartbeat = 0;

// ── Dedup cache ───────────────────────────────────────────
#define DEDUP_CACHE_SIZE 16
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

// ── Sanitize message value ────────────────────────────────
const char* sanitizeMessage(const char* raw) {
  const char* valid[] = {
    "fine", "needs_rescue", "medical_help", "food_water",
    "shelter_needed", "trapped", "danger", "unknown",
    "critical_medical", "critical_collapse", "critical_flood",
    "critical_fire", "critical_emergency",
    "need_water", "need_food", "need_evacuation", "need_assistance"
  };
  for (const char* v : valid) {
    if (strcmp(raw, v) == 0) return raw;
  }
  return "unknown";
}

// ── Kirim data packet via LoRa ────────────────────────────
void sendLoRaData(const char* message) {
  uint32_t now = (uint32_t)(millis() / 1000);

  LoRa.beginPacket();
  LoRa.write((PKT_MAGIC >> 8) & 0xFF);
  LoRa.write(PKT_MAGIC & 0xFF);
  LoRa.write(PKT_DATA);
  LoRa.write(NODE_ID & 0xFF);
  LoRa.write((NODE_ID >> 8) & 0xFF);
  LoRa.write((NODE_ID >> 16) & 0xFF);
  LoRa.write(seqId & 0xFF);
  LoRa.write((seqId >> 8) & 0xFF);
  LoRa.write((seqId >> 16) & 0xFF);
  LoRa.write((seqId >> 24) & 0xFF);
  LoRa.write(rangeToGateway & 0xFF);
  LoRa.write((rangeToGateway >> 8) & 0xFF);
  LoRa.write(rangeToGateway & 0xFF);
  LoRa.write((rangeToGateway >> 8) & 0xFF);
  LoRa.write(now & 0xFF);
  LoRa.write((now >> 8) & 0xFF);
  LoRa.write((now >> 16) & 0xFF);
  LoRa.write((now >> 24) & 0xFF);
  uint8_t msgLen = (uint8_t)strlen(message);
  LoRa.write(msgLen);
  LoRa.print(message);
  LoRa.endPacket();

  addToDedup(NODE_ID, seqId);
  Serial.printf("[LORA TX] DATA | seqId=%d range=%d msg=%s\n", seqId, rangeToGateway, message);
  seqId++;
}

// ── Kirim heartbeat ───────────────────────────────────────
void sendHeartbeat() {
  LoRa.beginPacket();
  LoRa.write((PKT_MAGIC >> 8) & 0xFF);
  LoRa.write(PKT_MAGIC & 0xFF);
  LoRa.write(PKT_HEARTBEAT);
  LoRa.write(NODE_ID & 0xFF);
  LoRa.write((NODE_ID >> 8) & 0xFF);
  LoRa.write((NODE_ID >> 16) & 0xFF);
  LoRa.write(rangeToGateway & 0xFF);
  LoRa.write((rangeToGateway >> 8) & 0xFF);
  LoRa.endPacket();
  Serial.printf("[LORA TX] HEARTBEAT | range=%d\n", rangeToGateway);
}

// ── Terima & forward LoRa dari node lain ─────────────────
void receiveAndForward() {
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

    if (srcRange == 0) {
      rangeToGateway = 1;
      Serial.println("[ROUTE] Gateway terdeteksi, rangeToGateway=1");
    }

  } else if (pktType == PKT_DATA) {
    if (LoRa.available() < 11) return;

    uint32_t srcId  = LoRa.read() | ((uint32_t)LoRa.read() << 8) | ((uint32_t)LoRa.read() << 16);
    uint32_t srcSeq = LoRa.read() | ((uint32_t)LoRa.read() << 8) |
                      ((uint32_t)LoRa.read() << 16) | ((uint32_t)LoRa.read() << 24);
    uint16_t senderRange    = LoRa.read() | ((uint16_t)LoRa.read() << 8);
    uint16_t forwarderRange = LoRa.read() | ((uint16_t)LoRa.read() << 8);

    uint8_t remaining[64] = {0};
    uint8_t rIdx = 0;
    while (LoRa.available() && rIdx < 63) remaining[rIdx++] = LoRa.read();

    int rssi = LoRa.packetRssi();
    Serial.printf("[LORA RX] DATA | from=%d seq=%d rssi=%d\n", srcId, srcSeq, rssi);

    if (srcId == NODE_ID) return;
    if (isDuplicate(srcId, srcSeq)) { Serial.println("[DEDUP] Skip"); return; }
    addToDedup(srcId, srcSeq);

    if (rangeToGateway < forwarderRange) {
      LoRa.beginPacket();
      LoRa.write((PKT_MAGIC >> 8) & 0xFF);
      LoRa.write(PKT_MAGIC & 0xFF);
      LoRa.write(PKT_DATA);
      LoRa.write(srcId & 0xFF);
      LoRa.write((srcId >> 8) & 0xFF);
      LoRa.write((srcId >> 16) & 0xFF);
      LoRa.write(srcSeq & 0xFF);
      LoRa.write((srcSeq >> 8) & 0xFF);
      LoRa.write((srcSeq >> 16) & 0xFF);
      LoRa.write((srcSeq >> 24) & 0xFF);
      LoRa.write(senderRange & 0xFF);
      LoRa.write((senderRange >> 8) & 0xFF);
      LoRa.write(rangeToGateway & 0xFF);
      LoRa.write((rangeToGateway >> 8) & 0xFF);
      for (uint8_t i = 0; i < rIdx; i++) LoRa.write(remaining[i]);
      LoRa.endPacket();
      Serial.printf("[ROUTE] Forwarded dari %d seq=%d\n", srcId, srcSeq);
    }
  }
}

// ── BLE Callbacks ─────────────────────────────────────────
class ReportCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) override {
    std::string val = pChar->getValue();
    if (val.empty()) return;

    Serial.println("[BLE RX] Report: " + String(val.c_str()));

    // Parse field "message" dari JSON mobile
    // Mobile kirim hasil buildPayloadMessage: "fine" | "medical_help" | dll
    String json = String(val.c_str());
    char msgVal[32] = "unknown";

    int mi = json.indexOf("\"message\":\"");
    if (mi >= 0) {
      int start = mi + 11;
      int end   = json.indexOf("\"", start);
      if (end > start) {
        json.substring(start, end).toCharArray(msgVal, sizeof(msgVal));
      }
    }

    const char* safeMsg = sanitizeMessage(msgVal);
    Serial.printf("[BLE] Message: %s\n", safeMsg);

    // Forward ke gateway via LoRa
    sendLoRaData(safeMsg);
  }
};

class InternetStatusCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) override {
    std::string val = pChar->getValue();
    if (val.empty()) return;
    hasInternet = (val[0] == 1);
    Serial.printf("[BLE RX] Internet: %s\n", hasInternet ? "online" : "offline");
  }
};

// ── Setup BLE ─────────────────────────────────────────────
void setupBLE() {
  NimBLEDevice::init(BLE_DEVICE_NAME);

  NimBLEServer*  pServer  = NimBLEDevice::createServer();
  NimBLEService* pService = pServer->createService(LOOM_SERVICE_UUID);

  NimBLECharacteristic* pReport = pService->createCharacteristic(
    LOOM_REPORT_CHAR_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  pReport->setCallbacks(new ReportCallback());

  NimBLECharacteristic* pInternet = pService->createCharacteristic(
    LOOM_INTERNET_STATUS_CHAR_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  pInternet->setCallbacks(new InternetStatusCallback());

  pService->start();

  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(LOOM_SERVICE_UUID);
  pAdv->start();

  Serial.println("[OK] BLE advertising: " BLE_DEVICE_NAME);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== LOOM Node ===");
  Serial.printf("Node ID: %d\n", NODE_ID);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("[ERROR] LoRa gagal init!");
    while (true);
  }
  Serial.println("[OK] LoRa ready");

  setupBLE();

  Serial.println("[OK] Siap terima laporan dari HP via BLE");
  Serial.println("[OK] Menunggu heartbeat gateway via LoRa...");
}

void loop() {
  unsigned long now = millis();

  receiveAndForward();

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = now;
  }
}