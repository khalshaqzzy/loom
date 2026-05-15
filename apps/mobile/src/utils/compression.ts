/**
 * compression.ts
 * Membangun payload message sesuai decision tree LOOM.
 */

export type ReportType = 'aman' | 'butuh_bantuan' | 'darurat_kritis';

/**
 * Mengubah teks dan tipe laporan menjadi canonical value
 * sesuai decision tree LOOM.
 */
export function buildPayloadMessage(text: string, reportType: ReportType): string {
  if (reportType === 'aman') return 'fine';

  const lower = text.toLowerCase();

  if (reportType === 'darurat_kritis') {
    if (lower.includes('luka') || lower.includes('medis') || lower.includes('dokter')) return 'critical_medical';
    if (lower.includes('gempa') || lower.includes('runtuh') || lower.includes('tertimbun')) return 'critical_collapse';
    if (lower.includes('banjir') || lower.includes('hanyut')) return 'critical_flood';
    if (lower.includes('kebakaran') || lower.includes('api') || lower.includes('bakar')) return 'critical_fire';
    return 'critical_emergency';
  }

  // butuh_bantuan
  if (lower.includes('luka') || lower.includes('medis') || lower.includes('obat')) return 'medical_help';
  if (lower.includes('air') || lower.includes('minum')) return 'need_water';
  if (lower.includes('makanan') || lower.includes('makan')) return 'need_food';
  if (lower.includes('evakuasi') || lower.includes('jemput')) return 'need_evacuation';
  if (lower.includes('terjebak') || lower.includes('terperangkap')) return 'trapped';

  return 'need_assistance';
}

/**
 * Generate unique report ID
 */
export function generateReportId(): string {
  return 'rpt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}
