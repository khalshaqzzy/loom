import { messageValueValues, type MessageValue } from "@loom/contracts";
import { emergencyMessageValues, messageValueMetadata } from "./taxonomy";

export type CompressionResult =
  | {
      ok: true;
      message: MessageValue;
      confidence: "high" | "medium";
      matchedKeywords: string[];
    }
  | {
      ok: false;
      reason: "empty" | "too_long" | "unsupported" | "ambiguous";
      suggestions: MessageValue[];
    };

const MAX_INPUT_LENGTH = 280;

export const isSupportedMessageValue = (value: string): value is MessageValue =>
  (messageValueValues as readonly string[]).includes(value);

const normalize = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

export const compressEmergencyText = (input: string): CompressionResult => {
  const normalized = normalize(input);

  if (!normalized) {
    return {
      ok: false,
      reason: "empty",
      suggestions: ["needs_rescue", "medical_help", "food_water"]
    };
  }

  if (normalized.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      reason: "too_long",
      suggestions: ["needs_rescue", "medical_help", "danger"]
    };
  }

  const matches = emergencyMessageValues
    .map((message) => {
      const matchedKeywords = messageValueMetadata[message].keywords.filter((keyword) =>
        normalized.includes(keyword)
      );
      return { message, matchedKeywords };
    })
    .filter((match) => match.matchedKeywords.length > 0)
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);

  if (matches.length === 0) {
    return {
      ok: false,
      reason: "unsupported",
      suggestions: ["needs_rescue", "medical_help", "food_water", "danger"]
    };
  }

  const top = matches[0]!;
  const second = matches[1];

  if (second && second.matchedKeywords.length === top.matchedKeywords.length) {
    return {
      ok: false,
      reason: "ambiguous",
      suggestions: matches.slice(0, 4).map((match) => match.message)
    };
  }

  return {
    ok: true,
    message: top.message,
    confidence: top.matchedKeywords.length > 1 ? "high" : "medium",
    matchedKeywords: top.matchedKeywords
  };
};
