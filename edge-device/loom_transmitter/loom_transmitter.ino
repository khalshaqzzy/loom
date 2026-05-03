#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <WebServer.h>

// Pin LoRa
#define LORA_CS   5
#define LORA_RST  14
#define LORA_DIO0 2
#define LORA_FREQ 433E6  // Ganti 868E6 atau 915E6 sesuai modulmu

const char* ssid     = "LOOM";
const char* password = "loom13";

WebServer server(80);

void setup() {
  Serial.begin(115200);

  // Init LoRa
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("[ERROR] LoRa gagal init!");
    while (true);
  }
  Serial.println("[OK] LoRa ready");

  // Init WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[OK] WiFi connected");
  Serial.println("IP: " + WiFi.localIP().toString());

  // Endpoint POST /cmd
  server.on("/cmd", HTTP_POST, []() {
    if (!server.hasArg("command")) {
      server.send(400, "text/plain", "Missing: command");
      return;
    }
    String cmd = server.arg("command");
    Serial.println("[CMD] Received: " + cmd);

    // Kirim via LoRa
    LoRa.beginPacket();
    LoRa.print(cmd);
    LoRa.endPacket();

    server.send(200, "text/plain", "OK: " + cmd);
  });

  // Endpoint GET /ping (untuk cek koneksi)
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "text/plain", "pong");
  });

  server.begin();
  Serial.println("[OK] HTTP server ready");
}

void loop() {
  server.handleClient();

  // Cek kalau ada balasan dari ESP32 #2
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String ack = "";
    while (LoRa.available()) {
      ack += (char)LoRa.read();
    }
    int rssi = LoRa.packetRssi();
    Serial.println("[ACK] From node: " + ack + " | RSSI: " + String(rssi));
  }
}
