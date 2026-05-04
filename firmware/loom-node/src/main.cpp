#include <SPI.h>
#include <LoRa.h>

// ── Identity ─────────────────────────────────────────────
// Setiap node harus punya ID unik, daftarkan ke backend via admin API
// POST /api/nodes dengan nodeId ini sebelum deploy
#define NODE_ID         2         // ganti per device (0 - 16777215)
#define ROUTE_INFINITY  65535

// ── Pin LoRa (sisi kiri ESP32 WROOM-32) ─────────────────
#define LORA_SCK        33
#define LORA_MISO       26
#define LORA_MOSI       25
#define LORA_CS         32
#define LORA_RST        27
#define LORA_DIO0       14
#define LORA_FREQ       433E6

// ── LoRa Packet Types (sesuai contracts/constants) ───────
#define PKT_HEARTBEAT   0x01
#define PKT_DATA        0x02
#define PKT_MAGIC       0x4C4D  // "LM"

// ── Message values (sesuai contracts/enums) ──────────────
// fine | needs_rescue | medical_help | food_water
// shelter_needed | trapped | danger | unknown
const char* MESSAGE_VALUE = "fine";  // ganti sesuai status

// ── Interval ─────────────────────────────────────────────
#define HEARTBEAT_INTERVAL_MS   30000   // 30 detik
#define DATA_INTERVAL_MS        60000   // 60 detik

// ── State ─────────────────────────────────────────────────
uint32_t seqId              = 0;
uint16_t rangeToGateway     = ROUTE_INFINITY;  // belum tahu jarak ke gateway
unsigned long lastHeartbeat = 0;
unsigned long lastData      = 0;

// ── Dedup cache (hindari forward packet sendiri) ──────────
#define DEDUP_CACHE_SIZE 16
struct DedupEntry {
  uint32_t senderNodeId;
  uint32_t seqId;
};
DedupEntry dedupCache[DEDUP_CACHE_SIZE];
uint8_t dedupIndex = 0;

bool isDuplicate(uint32_t sender, uint32_t seq) {
  for (int i = 0; i < DEDUP_CACHE_SIZE; i++) {
    if (dedupCache[i].senderNodeId == sender && dedupCache[i].seqId == seq) {
      return true;
    }
  }
  return false;
}

void addToDedup(uint32_t sender, uint32_t seq) {
  dedupCache[dedupIndex % DEDUP_CACHE_SIZE] = {sender, seq};
  dedupIndex++;
}

// ── Bangun packet binary ──────────────────────────────────
// Format DATA packet:
// [2B magic][1B type][3B senderNodeId][4B seqId][2B senderRange][2B forwarderRange]
// [4B timestamp (epoch32)][1B msgLen][NB message]
void sendDataPacket(const char* message, uint16_t senderRange, uint16_t forwarderRange) {
  uint32_t now = (uint32_t)(millis() / 1000);  // epoch relatif, backend pakai receivedAt

  LoRa.beginPacket();

  // Magic
  LoRa.write((PKT_MAGIC >> 8) & 0xFF);
  LoRa.write(PKT_MAGIC & 0xFF);

  // Type
  LoRa.write(PKT_DATA);

  // senderNodeId (3 bytes, little-endian)
  LoRa.write((NODE_ID) & 0xFF);
  LoRa.write((NODE_ID >> 8) & 0xFF);
  LoRa.write((NODE_ID >> 16) & 0xFF);

  // seqId (4 bytes, little-endian)
  LoRa.write((seqId) & 0xFF);
  LoRa.write((seqId >> 8) & 0xFF);
  LoRa.write((seqId >> 16) & 0xFF);
  LoRa.write((seqId >> 24) & 0xFF);

  // senderRangeToGateway (2 bytes)
  LoRa.write((senderRange) & 0xFF);
  LoRa.write((senderRange >> 8) & 0xFF);

  // lastForwarderRangeToGateway (2 bytes)
  LoRa.write((forwarderRange) & 0xFF);
  LoRa.write((forwarderRange >> 8) & 0xFF);

  // timestamp (4 bytes, epoch32)
  LoRa.write((now) & 0xFF);
  LoRa.write((now >> 8) & 0xFF);
  LoRa.write((now >> 16) & 0xFF);
  LoRa.write((now >> 24) & 0xFF);

  // message string (1B len + N bytes)
  uint8_t msgLen = (uint8_t)strlen(message);
  LoRa.write(msgLen);
  LoRa.print(message);

  LoRa.endPacket();

  addToDedup(NODE_ID, seqId);

  Serial.printf("[LORA TX] DATA | nodeId=%d seqId=%d range=%d msg=%s\n",
    NODE_ID, seqId, senderRange, message);

  seqId++;
}

// ── Bangun heartbeat packet ───────────────────────────────
// Format: [2B magic][1B type][3B nodeId][2B rangeToGateway]
void sendHeartbeat() {
  LoRa.beginPacket();

  LoRa.write((PKT_MAGIC >> 8) & 0xFF);
  LoRa.write(PKT_MAGIC & 0xFF);
  LoRa.write(PKT_HEARTBEAT);

  LoRa.write((NODE_ID) & 0xFF);
  LoRa.write((NODE_ID >> 8) & 0xFF);
  LoRa.write((NODE_ID >> 16) & 0xFF);

  LoRa.write((rangeToGateway) & 0xFF);
  LoRa.write((rangeToGateway >> 8) & 0xFF);

  LoRa.endPacket();

  Serial.printf("[LORA TX] HEARTBEAT | nodeId=%d range=%d\n", NODE_ID, rangeToGateway);
}

// ── Terima & forward packet dari node lain ────────────────
// Forward hanya jika rangeToGateway kita < forwarderRange packet
void receiveAndForward() {
  int packetSize = LoRa.parsePacket();
  if (packetSize < 3) return;

  // Baca magic
  uint8_t magicHi = LoRa.read();
  uint8_t magicLo = LoRa.read();
  uint16_t magic = ((uint16_t)magicHi << 8) | magicLo;
  if (magic != PKT_MAGIC) {
    Serial.println("[LORA RX] Bukan paket LOOM, skip");
    return;
  }

  uint8_t pktType = LoRa.read();

  if (pktType == PKT_HEARTBEAT) {
    // Baca nodeId dan rangenya — update info routing
    if (LoRa.available() < 5) return;
    uint32_t srcId = LoRa.read() | ((uint32_t)LoRa.read() << 8) | ((uint32_t)LoRa.read() << 16);
    uint16_t srcRange = LoRa.read() | ((uint16_t)LoRa.read() << 8);
    int rssi = LoRa.packetRssi();

    Serial.printf("[LORA RX] HEARTBEAT | from=%d range=%d rssi=%d\n", srcId, srcRange, rssi);

    // Kalau yang kirim heartbeat adalah gateway (rangeToGateway=0),
    // update range kita ke 1 (satu hop dari gateway)
    if (srcRange == 0) {
      rangeToGateway = 1;
      Serial.printf("[ROUTE] Gateway terdeteksi, rangeToGateway=%d\n", rangeToGateway);
    }

  } else if (pktType == PKT_DATA) {
    // Minimal bytes: 3(nodeId) + 4(seqId) + 2(senderRange) + 2(forwarderRange) = 11
    if (LoRa.available() < 11) return;

    uint32_t srcId = LoRa.read() | ((uint32_t)LoRa.read() << 8) | ((uint32_t)LoRa.read() << 16);
    uint32_t srcSeq = LoRa.read() | ((uint32_t)LoRa.read() << 8) |
                      ((uint32_t)LoRa.read() << 16) | ((uint32_t)LoRa.read() << 24);
    uint16_t senderRange    = LoRa.read() | ((uint16_t)LoRa.read() << 8);
    uint16_t forwarderRange = LoRa.read() | ((uint16_t)LoRa.read() << 8);

    // Baca sisa (timestamp + message)
    uint8_t remaining[64] = {0};
    uint8_t rIdx = 0;
    while (LoRa.available() && rIdx < 63) {
      remaining[rIdx++] = LoRa.read();
    }

    int rssi = LoRa.packetRssi();
    Serial.printf("[LORA RX] DATA | from=%d seq=%d sRange=%d fRange=%d rssi=%d\n",
      srcId, srcSeq, senderRange, forwarderRange, rssi);

    // Jangan forward packet sendiri
    if (srcId == NODE_ID) return;

    // Dedup check
    if (isDuplicate(srcId, srcSeq)) {
      Serial.println("[ROUTE] Duplikat, skip forward");
      return;
    }
    addToDedup(srcId, srcSeq);

    // Forward hanya kalau kita lebih dekat ke gateway
    if (rangeToGateway < forwarderRange) {
      Serial.printf("[ROUTE] Forward packet dari %d (kita range=%d < forwarder=%d)\n",
        srcId, rangeToGateway, forwarderRange);

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
      // Update forwarderRange ke range kita
      LoRa.write(rangeToGateway & 0xFF);
      LoRa.write((rangeToGateway >> 8) & 0xFF);
      // Tulis sisa (timestamp + message)
      for (uint8_t i = 0; i < rIdx; i++) LoRa.write(remaining[i]);
      LoRa.endPacket();

      Serial.printf("[ROUTE] Forwarded packet dari %d seq=%d\n", srcId, srcSeq);
    } else {
      Serial.println("[ROUTE] Skip forward, range kita tidak lebih dekat");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== LOOM Node ===");
  Serial.printf("Node ID: %d\n", NODE_ID);

  // Init SPI custom (sisi kiri)
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);

  // Init LoRa
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("[ERROR] LoRa gagal init!");
    while (true);
  }

  Serial.println("[OK] LoRa ready");
  Serial.println("[OK] Menunggu heartbeat gateway...");
}

void loop() {
  unsigned long now = millis();

  // Terima & forward packet dari node lain
  receiveAndForward();

  // Kirim heartbeat periodik
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeat = now;
  }

  // Kirim data periodik
  if (now - lastData >= DATA_INTERVAL_MS) {
    sendDataPacket(MESSAGE_VALUE, rangeToGateway, rangeToGateway);
    lastData = now;
  }
}
