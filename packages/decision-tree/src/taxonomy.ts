import type { MessageValue } from "@loom/contracts";

export type MessageValueMetadata = {
  label: string;
  severity: "safe" | "help" | "urgent";
  keywords: string[];
};

export const messageValueMetadata: Record<MessageValue, MessageValueMetadata> = {
  fine: {
    label: "Aman",
    severity: "safe",
    keywords: ["aman", "selamat", "baik", "safe", "fine", "ok"]
  },
  needs_rescue: {
    label: "Butuh penyelamatan",
    severity: "urgent",
    keywords: ["rescue", "tolong", "evakuasi", "jemput", "selamatkan", "bantuan segera"]
  },
  medical_help: {
    label: "Bantuan medis",
    severity: "urgent",
    keywords: ["medis", "obat", "dokter", "luka", "sakit", "patah", "berdarah", "injured", "medicine"]
  },
  food_water: {
    label: "Makanan atau air",
    severity: "help",
    keywords: ["air", "minum", "makanan", "makan", "lapar", "haus", "food", "water"]
  },
  shelter_needed: {
    label: "Butuh tempat berlindung",
    severity: "help",
    keywords: ["shelter", "mengungsi", "tenda", "rumah rusak", "tempat tinggal", "berlindung"]
  },
  trapped: {
    label: "Terjebak",
    severity: "urgent",
    keywords: ["terjebak", "terperangkap", "tertimbun", "stuck", "trapped", "runtuh"]
  },
  danger: {
    label: "Bahaya sekitar",
    severity: "urgent",
    keywords: ["bahaya", "banjir", "api", "kebakaran", "longsor", "gas", "danger", "fire", "flood"]
  },
  unknown: {
    label: "Tidak diketahui",
    severity: "help",
    keywords: ["unknown"]
  }
};

export const emergencyMessageValues = [
  "needs_rescue",
  "medical_help",
  "food_water",
  "shelter_needed",
  "trapped",
  "danger"
] as const satisfies MessageValue[];
