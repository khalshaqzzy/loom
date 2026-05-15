import { compressEmergencyText } from "@loom/decision-tree";

export type ReportType = "aman" | "butuh_bantuan" | "darurat_kritis";

export const buildPayloadMessage = (text: string, reportType: ReportType): string => {
  if (reportType === "aman") return "fine";
  const result = compressEmergencyText(text);
  return result.ok ? result.message : "unknown";
};

export const generateReportId = (): string =>
  `rpt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
