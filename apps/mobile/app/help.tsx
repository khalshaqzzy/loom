import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "./_layout";

type AccordionItem = {
  key: string;
  title: string;
  content: string;
};

const FAQS: AccordionItem[] = [
  {
    key: "status",
    title: "TENTANG STATUS",
    content:
      "🟢 Aman — Anda selamat dan tidak memerlukan bantuan segera.\n\n🟠 Butuh Bantuan — Perlu bantuan namun bukan situasi mengancam nyawa.\n\n🔴 Darurat Kritis — Situasi mengancam nyawa, butuh respons segera."
  },
  {
    key: "gagal",
    title: "JIKA LAPORAN GAGAL TERKIRIM",
    content:
      '1. Pastikan Bluetooth aktif di pengaturan HP Anda.\n\n2. Dekatkan HP ke Edge Node (± 10 meter).\n\n3. Matikan mode hemat baterai agar BLE tidak terputus.\n\n4. Buka halaman Riwayat dan tekan "Kirim Ulang" pada laporan yang gagal.\n\n5. Jika masih gagal, cari node lain dengan tombol "Cari Lagi".'
  },
  {
    key: "nonode",
    title: "TIDAK MENEMUKAN EDGE NODE?",
    content:
      '• Pastikan ada Edge Node LOOM yang aktif di sekitar Anda.\n\n• Coba pindahkan posisi Anda ke area lebih terbuka.\n\n• Tekan "Pindai Ulang" di modal pemilihan node.\n\n• Node LOOM biasanya dipasang di titik kumpul, balai desa, atau kantor pemerintah terdekat.'
  },
  {
    key: "privasi",
    title: "CATATAN PRIVASI",
    content:
      "• Lokasi GPS hanya dikirim bersama laporan darurat, tidak dilacak terus-menerus.\n\n• Data disimpan lokal di perangkat Anda dan di node LOOM.\n\n• Saat ada koneksi internet, data diteruskan ke server pusat untuk koordinasi bantuan.\n\n• Tidak ada data pribadi yang dijual ke pihak ketiga."
  }
];

const STEPS = [
  {
    num: "1",
    title: "Pilih Status Keselamatan",
    desc: "Tekan salah satu tombol: Aman, Butuh Bantuan, atau Darurat Kritis sesuai kondisi Anda."
  },
  {
    num: "2",
    title: "Tulis Pesan Singkat (opsional)",
    desc: "Maksimal 140 karakter. Jelaskan kondisi atau kebutuhan Anda seringkas mungkin."
  },
  {
    num: "3",
    title: "Tekan Kirim Laporan",
    desc: "Pastikan Bluetooth aktif. Laporan akan dikirim ke edge node LOOM terdekat, lalu diteruskan melalui jaringan mesh."
  }
];

export default function BantuanScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.backLabel}>‹ LOOM · BANTUAN</Text>
        <Text style={styles.title}>Panduan Darurat</Text>
        <Text style={styles.subtitle}>
          Instruksi singkat untuk menggunakan LOOM pada kondisi darurat tanpa sinyal seluler.
        </Text>

        {/* Steps */}
        {STEPS.map((step) => (
          <View key={step.num} style={styles.stepCard}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{step.num}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        {/* FAQ Accordion */}
        {FAQS.map((faq) => {
          const isOpen = expanded === faq.key;
          return (
            <View key={faq.key} style={styles.accordionItem}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggle(faq.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.accordionTitle}>{faq.title}</Text>
                <Text style={styles.accordionChevron}>{isOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.accordionContent}>
                  <Text style={styles.accordionText}>{faq.content}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.divider} />

        {/* CTA */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaTitle}>Butuh bantuan sekarang?</Text>
          <Text style={styles.ctaDesc}>
            Buat laporan darurat secara langsung. Anda tetap bisa mengisinya meski belum terhubung
            ke node.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push("/")}>
            <Text style={styles.ctaBtnText}>Buka Halaman Laporan</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20 },

  backLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 20 },

  // Steps
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 10
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.textPrimary,
    alignItems: "center",
    justifyContent: "center"
  },
  stepNumText: { color: "white", fontSize: 16, fontWeight: "800" },
  stepTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },

  // Accordion
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16
  },
  accordionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, flex: 1 },
  accordionChevron: { fontSize: 12, color: COLORS.textMuted },
  accordionContent: { paddingBottom: 16 },
  accordionText: { fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 22 },

  // CTA
  ctaBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20
  },
  ctaTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 6 },
  ctaDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 14 },
  ctaBtn: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  ctaBtnText: { color: "white", fontSize: 15, fontWeight: "700" }
});
