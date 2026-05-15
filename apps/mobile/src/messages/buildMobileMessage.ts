import type { BleMobileMessage, MessageValue } from '@loom/contracts';
import { bleMobileMessageSchema, loomBleProtocol } from '@loom/contracts';
import { compressEmergencyText } from '@loom/decision-tree';
import type { MobileLocation } from '../location/locationService';

export type BuildEmergencyResult =
  | { ok: true; payload: BleMobileMessage; rawText: string; confidence: 'high' | 'medium' }
  | {
      ok: false;
      reason: 'empty' | 'too_long' | 'unsupported' | 'ambiguous';
      suggestions: MessageValue[];
    };

const createClientMessageId = (): string =>
  `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const withLocation = (
  base: Omit<BleMobileMessage, 'lat' | 'lon' | 'latE6' | 'lonE6'>,
  location: MobileLocation | null
): BleMobileMessage => {
  if (!location) return base;
  return {
    ...base,
    lat: location.lat,
    lon: location.lon,
    latE6: location.latE6,
    lonE6: location.lonE6
  };
};

export const buildSafeMobileMessage = (location: MobileLocation | null): BleMobileMessage => {
  const payload = withLocation(
    {
      protocol: loomBleProtocol,
      clientMessageId: createClientMessageId(),
      message: 'fine',
      timestamp: new Date().toISOString(),
      kind: 'safe'
    },
    location
  );

  return bleMobileMessageSchema.parse(payload);
};

export const buildEmergencyMobileMessage = (
  text: string,
  location: MobileLocation | null
): BuildEmergencyResult => {
  const compression = compressEmergencyText(text);
  if (!compression.ok) return compression;

  const payload = withLocation(
    {
      protocol: loomBleProtocol,
      clientMessageId: createClientMessageId(),
      message: compression.message,
      timestamp: new Date().toISOString(),
      kind: 'emergency'
    },
    location
  );

  return {
    ok: true,
    payload: bleMobileMessageSchema.parse(payload),
    rawText: text.trim(),
    confidence: compression.confidence
  };
};
