import { MockBleClient } from "./mockClient";
import { NativeBleClient } from "./nativeClient";
import type { BleClient } from "./client";
import { BleManager } from "react-native-ble-plx";

let client: BleClient | null = null;

export const getBleClient = (): BleClient => {
  if (client) return client;

  try {
    client = new NativeBleClient(new BleManager());
    return client;
  } catch (error) {
    console.warn("[BLE] Native BLE unavailable, using mock client.", error);
    client = new MockBleClient();
    return client;
  }
};
