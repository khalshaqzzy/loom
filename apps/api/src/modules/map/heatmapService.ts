import type { HeatmapPoint } from "@loom/contracts";
import type { MeshMessageDocument } from "../../db/documents";

export const aggregateHeatmapPoints = (messages: MeshMessageDocument[]): HeatmapPoint[] => {
  const grouped = new Map<string, { message: MeshMessageDocument; count: number }>();

  for (const message of messages) {
    if (message.lat === null || message.lon === null) {
      continue;
    }

    const key = `${message.lat}:${message.lon}:${message.message}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { message, count: 1 });
      continue;
    }

    existing.count += 1;
    if (message.timestamp > existing.message.timestamp) {
      existing.message = message;
    }
  }

  return [...grouped.values()].map(({ message, count }) => ({
    lat: message.lat as number,
    lon: message.lon as number,
    weight: count,
    message: message.message,
    count,
    latestTimestamp: message.timestamp.toISOString()
  }));
};
