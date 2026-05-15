import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { COLORS } from './_layout';
import { getReports, LocalReport, ReportType, ReportStatus, updateReportStatus } from '../src/storage/localStore';
import { useSelectedNode } from '../src/hooks/useSelectedNode';
import { sendReportToNode } from '../src/ble/BleManager';
import { buildPayloadMessage } from '../src/utils/compression';

type FilterType = 'semua' | 'terkirim' | 'gagal';

export default function RiwayatScreen() {
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [filter, setFilter] = useState<FilterType>('semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const { node: selectedNode } = useSelectedNode();

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    const all = await getReports();
    setReports(all);
  };

  const filtered = reports.filter(r => {
    if (filter === 'semua') return true;
    if (filter === 'terkirim') return r.status === 'terkirim' || r.status === 'diterima_node';
    if (filter === 'gagal') return r.status === 'gagal';
    return true;
  });

  const counts = {
    semua: reports.length,
    terkirim: reports.filter(r => r.status === 'terkirim' || r.status === 'diterima_node').length,
    gagal: reports.filter(r => r.status === 'gagal').length,
  };

  const handleRetry = async (report: LocalReport) => {
    if (!selectedNode) {
      Alert.alert('Tidak Ada Node', 'Hubungkan ke Edge Node LOOM terlebih dahulu dari halaman Laporan.');
      return;
    }

    setRetrying(report.id);
    try {
      const payload = buildPayloadMessage(report.message, report.type);
      const success = await sendReportToNode(
        selectedNode.rawDevice || null,
        JSON.stringify({
          id: report.id,
          status: report.type,
          message: report.message,
          lat: report.location?.lat || 0,
          lon: report.location?.lon || 0,
          ts: Date.now(),
        })
      );

      await updateReportStatus(report.id, success ? 'diterima_node' : 'gagal');
      await loadReports();

      Alert.alert(
        success ? '✅ Berhasil' : '❌ Gagal',
        success ? 'Laporan berhasil dikirim ulang.' : 'Masih gagal. Coba lagi nanti.'
      );
    } finally {
      setRetrying(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.backLabel}>‹ LOOM · RIWAYAT</Text>
          <Text style={styles.title}>Riwayat Laporan</Text>
          <Text style={styles.subtitle}>
            Laporan yang tersimpan di perangkat ini. Laporan gagal dapat dikirim ulang saat koneksi BLE kembali tersedia.
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['semua', 'terkirim', 'gagal'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              <View style={[styles.filterBadge, filter === f && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === f && styles.filterBadgeTextActive]}>
                  {counts[f]}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Belum ada laporan</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isExpanded = expandedId === item.id;
              const statusColor = statusColorMap[item.status];
              const typeColor = typeColorMap[item.type];

              return (
                <TouchableOpacity
                  style={[styles.reportCard, isExpanded && styles.reportCardExpanded]}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportCardTop}>
                    <View style={styles.reportLeft}>
                      <View style={styles.reportTypeRow}>
                        <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
                        <Text style={[styles.reportType, { color: typeColor }]}>
                          {typeLabelMap[item.type]}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {statusLabelMap[item.status]}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reportDate}>{formatDate(item.timestamp)}</Text>
                      <Text style={styles.reportPreview} numberOfLines={isExpanded ? undefined : 1}>
                        "{item.message}"
                      </Text>
                    </View>
                    <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>

                  {isExpanded && (
                    <View style={styles.reportDetail}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>LOKASI</Text>
                        <Text style={styles.detailValue}>
                          {item.location
                            ? `${item.location.lat.toFixed(4)}°, ${item.location.lon.toFixed(4)}°`
                            : 'Lokasi belum tersedia'}
                        </Text>
                        <Text style={styles.detailLabel}>NODE</Text>
                        <Text style={styles.detailValue}>{item.nodeId || '—'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>ID LAPORAN</Text>
                        <Text style={styles.detailValue}>{item.id}</Text>
                        <Text style={styles.detailLabel}>DIKIRIM VIA</Text>
                        <Text style={styles.detailValue}>{item.sentVia || '—'}</Text>
                      </View>

                      {item.status === 'gagal' && (
                        <TouchableOpacity
                          style={styles.retryBtn}
                          onPress={() => handleRetry(item)}
                          disabled={retrying === item.id}
                        >
                          {retrying === item.id ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text style={styles.retryBtnText}>🔄 Kirim Ulang Laporan</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const statusColorMap: Record<ReportStatus, string> = {
  diterima_node: COLORS.green,
  terkirim: COLORS.green,
  gagal: COLORS.red,
};

const statusLabelMap: Record<ReportStatus, string> = {
  diterima_node: 'Diterima Node',
  terkirim: 'Terkirim',
  gagal: 'Gagal Terkirim',
};

const typeColorMap: Record<ReportType, string> = {
  aman: COLORS.green,
  butuh_bantuan: COLORS.orange,
  darurat_kritis: COLORS.red,
};

const typeLabelMap: Record<ReportType, string> = {
  aman: 'Aman',
  butuh_bantuan: 'Butuh Bantuan',
  darurat_kritis: 'Darurat Kritis',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 20 },

  header: { paddingTop: 8, marginBottom: 16 },
  backLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 8,
  },
  filterTabActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive: { color: 'white' },
  filterBadge: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  filterBadgeTextActive: { color: 'white' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },

  reportCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden',
  },
  reportCardExpanded: { borderColor: COLORS.textPrimary },
  reportCardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  reportLeft: { flex: 1 },
  reportTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  reportType: { fontSize: 14, fontWeight: '700' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  reportDate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  reportPreview: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },
  expandChevron: { fontSize: 12, color: COLORS.textMuted, paddingTop: 3 },

  reportDetail: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 14 },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  detailValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', marginBottom: 6 },

  retryBtn: {
    backgroundColor: COLORS.textPrimary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  retryBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
