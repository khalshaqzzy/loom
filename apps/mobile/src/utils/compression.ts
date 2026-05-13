/**
 * Mengubah pesan darurat menjadi canonical value sesuai decision tree.
 * Sesuai PRD, status aman langsung menggunakan value 'fine'.
 */
export function buildPayloadMessage(text: string, isSafeStatus: boolean): string {
  if (isSafeStatus) {
    return 'fine';
  }
  
  // TODO: Implementasi decision tree penuh (contoh sederhana)
  const lowerText = text.toLowerCase();
  if (lowerText.includes('luka') || lowerText.includes('medis')) {
    return 'medical_help';
  }
  if (lowerText.includes('banjir') || lowerText.includes('air')) {
    return 'flood_warning';
  }
  
  return 'general_emergency';
}