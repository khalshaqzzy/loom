export const MAX_NODE_ID = 16_777_215;
export const ROUTE_INFINITY = 65_535;

export const LORA_PACKET_MAGIC = 0x4c4d;
export const LORA_PACKET_TYPES = {
  HEARTBEAT: 0x01,
  DATA: 0x02
} as const;

export const MAX_INGEST_BATCH_SIZE = 100;
export const PUBLIC_LOOKUP_GENERIC_FAILURE =
  "Unable to find message history for the provided details.";
