#include <SPI.h>
#include <LoRa.h>

// Pin LoRa (sama)
#define LORA_CS   5
#define LORA_RST  14
#define LORA_DIO0 2
#define LORA_FREQ 433E6  // Harus sama dengan ESP32 #1

#define PIN_OUTPUT 4  // Pin aktuator / relay / LED

void handleCommand(String cmd) {
  Serial.println("[CMD] Execute: " + cmd);

  if (cmd == "ON") {
    digitalWrite(PIN_OUTPUT, HIGH);
    Serial.println("[ACT] Output ON");
  }
  else if (cmd == "OFF") {
    digitalWrite(PIN_OUTPUT, LOW);
    Serial.println("[ACT] Output OFF");
  }
  else {
    Serial.println("[WARN] Unknown command: " + cmd);
  }

  // Kirim ACK balik ke ESP32 #1
  LoRa.beginPacket();
  LoRa.print("ACK:" + cmd);
  LoRa.endPacket();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_OUTPUT, OUTPUT);

  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("[ERROR] LoRa gagal init!");
    while (true);
  }
  Serial.println("[OK] LoRa ready, menunggu perintah...");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }
    int rssi = LoRa.packetRssi();
    Serial.println("[RX] '" + received + "' | RSSI: " + String(rssi) + " dBm");

    handleCommand(received);
  }
}
