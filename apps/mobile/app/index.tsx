import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal, FlatList, ActivityIndicator,
  Animated, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { COLORS } from './_layout';
import { useBleScanner, LoomNode } from '../src/ble/useBleScanner';
import { useSelectedNode, setGlobalNode } from '../src/hooks/useSelectedNode';
import { sendReportToNode } from '../src/ble/BleManager';
import { getLoomBleManager } from '../src/ble/BleManager';
import { buildPayloadMessage, generateReportId } from '../src/utils/compression';
import { getCurrentLocation, formatCoords } from '../src/utils/location';
import { saveReport, LocalReport, ReportType } from '../src/storage/localStore';

type StatusType = 'aman' | 'butuh_bantuan' | 'darurat_kritis' | null;

const MAX_MSG = 140;

const QUICK_TEMPLATES = [
  '4 orang selamat di titik kumpul',
  'Butuh air minum & obat',
  'Ada orang terjebak di bangunan',
  'Butuh evakuasi medis',
];

export default function LaporanScreen() {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const { node: selectedNode, isConnected } = useSelectedNode();
  const { nodes, isScanning, scanComplete, startScan, stopScan, rssiToMeters } = useBleScanner();
  const { isMockMode } = getLoomBleManager();

  // Refresh lokasi
  const refreshLocation = async () => {
    setLocationLoading(true);
    const loc = await getCurrentLocation();
    setLocation(loc ? { lat: loc.lat, lon: loc.lon } : null);
    setLocationLoading(false);
  };

  // Hapus pesan
  const clearMessage = () => setMessage('');

  // Pilih template
  const applyTemplate = (tpl: string) => {
    setMessage(prev => (prev ? prev + ' ' + tpl : tpl).slice(0, MAX_MSG));
  };

  // Pilih node dari modal
  const handleSelectNode = async (node: LoomNode) => {
    setGlobalNode(node, true);
    setShowNodeModal(false);
    // Ambil lokasi saat node dipilih
    const loc = await getCurrentLocation();
    setLocation(loc ? { lat: loc.lat, lon: loc.lon } : null);
  };

  // Kirim laporan
  const handleSend = async () => {
    if (!selectedStatus) {
      Alert.alert('Pilih Status', 'Silakan pilih status keselamatan Anda terlebih dahulu.');
      return;
    }
    if (!selectedNode) {
      Alert.alert('Pilih Node', 'Silakan hubungkan ke Edge Node LOOM terlebih dahulu.');
      return;
    }

    setIsSending(true);

    try {
      const payload = buildPayloadMessage(message, selectedStatus as any);
      const reportId = generateReportId();
      const now = Date.now();

      // Kirim ke node via BLE
      const bleSuccess = await sendReportToNode(
        selectedNode.rawDevice || null,
        JSON.stringify({
          id: reportId,
          status: selectedStatus,
          message: message || payload,
          lat: location?.lat || 0,
          lon: location?.lon || 0,
          ts: now,
        })
      );

      // Simpan ke riwayat lokal
      const report: LocalReport = {
        id: reportId,
        type: selectedStatus as ReportType,
        message: message || statusLabel(selectedStatus),
        timestamp: now,
        status: bleSuccess ? 'diterima_node' : 'gagal',
        nodeId: selectedNode.id,
        sentVia: selectedNode.name,
        location: location,
      };

      await saveReport(report);

      // Reset form
      setSelectedStatus(null);
      setMessage('');

      Alert.alert(
        bleSuccess ? '✅ Laporan Terkirim' : '⚠️ Gagal Terkirim',
        bleSuccess
          ? `Laporan Anda telah dikirim ke ${selectedNode.name} via ${isMockMode ? 'BLE (simulasi)' : 'Bluetooth'} dan akan disebarkan ke jaringan mesh.`
          : 'Gagal mengirim ke Node. Pastikan Bluetooth aktif dan Node masih dalam jangkauan.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('[Send] Error:', err);
      Alert.alert('Error', 'Terjadi kesalahan saat mengirim laporan.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ===== HEADER ===== */}
          <View style={styles.header}>
            <View>
              <View style={styles.headerTitleRow}>
                <Text style={styles.appName}>LOOM</Text>
                <View style={[styles.modeBadge, isConnected && styles.modeBadgeConnected]}>
                  <View style={[styles.modeDot, isConnected && styles.modeDotConnected]} />
                  <Text style={[styles.modeText, isConnected && styles.modeTextConnected]}>
                    {isConnected ? 'Terhubung' : 'Offline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.modeSubtitle}>MODE LURING · MESH AKTIF</Text>
            </View>
          </View>

          {/* ===== EDGE NODE CARD ===== */}
          <View style={styles.nodeCard}>
            <View style={styles.nodeCardLeft}>
              <Text style={styles.nodeLabelSmall}>EDGE NODE</Text>
              <Text style={styles.nodeName}>{selectedNode?.name || 'Belum Ada Node'}</Text>
              <View style={styles.nodeSignalRow}>
                {selectedNode ? (
                  <>
                    <Text style={styles.nodeSignalIcon}>📶</Text>
                    <Text style={styles.nodeSignalText}>
                      Sinyal {selectedNode.distance} · {rssiToMeters(selectedNode.rssi)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.nodeSignalText}>Belum terhubung ke node manapun</Text>
                )}
              </View>
            </View>
            <Text style={styles.nodeBtIcon}>📡</Text>
          </View>

          {/* ===== TOMBOL NODE ===== */}
          <View style={styles.nodeButtonRow}>
            <TouchableOpacity
              style={styles.nodeBtn}
              onPress={() => {
                setShowNodeModal(true);
                startScan();
              }}
            >
              <Text style={styles.nodeBtnText}>Pilih Node</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nodeBtn, styles.nodeBtnPrimary]}
              onPress={() => {
                setShowNodeModal(true);
                startScan();
              }}
            >
              <Text style={[styles.nodeBtnText, styles.nodeBtnPrimaryText]}>Cari Lagi</Text>
            </TouchableOpacity>
          </View>

          {/* ===== STATUS KESELAMATAN ===== */}
          <Text style={styles.sectionLabel}>STATUS KESELAMATAN</Text>

          <TouchableOpacity
            style={[styles.statusOption, selectedStatus === 'aman' && styles.statusOptionActive, { borderColor: COLORS.green }]}
            onPress={() => setSelectedStatus('aman')}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.green }]} />
              <View>
                <Text style={styles.statusTitle}>Aman</Text>
                <Text style={styles.statusDesc}>Saya selamat dan tidak memerlukan bantuan.</Text>
              </View>
            </View>
            <View style={[styles.statusRadio, selectedStatus === 'aman' && styles.statusRadioActive, { borderColor: COLORS.green }]}>
              {selectedStatus === 'aman' && <View style={[styles.statusRadioDot, { backgroundColor: COLORS.green }]} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusOption, selectedStatus === 'butuh_bantuan' && styles.statusOptionActive, selectedStatus === 'butuh_bantuan' && { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange }]}
            onPress={() => setSelectedStatus('butuh_bantuan')}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.orange }]} />
              <View>
                <Text style={styles.statusTitle}>Butuh Bantuan</Text>
                <Text style={styles.statusDesc}>Saya butuh bantuan namun tidak dalam bahaya kritis.</Text>
              </View>
            </View>
            <View style={[styles.statusRadio, selectedStatus === 'butuh_bantuan' && styles.statusRadioActive, selectedStatus === 'butuh_bantuan' && { borderColor: COLORS.orange }]}>
              {selectedStatus === 'butuh_bantuan' && <View style={[styles.statusRadioDot, { backgroundColor: COLORS.orange }]} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusOption, selectedStatus === 'darurat_kritis' && styles.statusOptionActive, selectedStatus === 'darurat_kritis' && { backgroundColor: COLORS.redLight, borderColor: COLORS.red }]}
            onPress={() => setSelectedStatus('darurat_kritis')}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.red }]} />
              <View>
                <Text style={styles.statusTitle}>Darurat Kritis</Text>
                <Text style={styles.statusDesc}>Situasi mengancam jiwa, butuh respons segera.</Text>
              </View>
            </View>
            <View style={[styles.statusRadio, selectedStatus === 'darurat_kritis' && styles.statusRadioActive, selectedStatus === 'darurat_kritis' && { borderColor: COLORS.red }]}>
              {selectedStatus === 'darurat_kritis' && <View style={[styles.statusRadioDot, { backgroundColor: COLORS.red }]} />}
            </View>
          </TouchableOpacity>

          {/* ===== PESAN SINGKAT ===== */}
          <View style={styles.messageHeader}>
            <Text style={styles.sectionLabel}>PESAN SINGKAT (opsional)</Text>
            {message.length > 0 && (
              <TouchableOpacity onPress={clearMessage}>
                <Text style={styles.hapusText}>Hapus {message.length}/{MAX_MSG}</Text>
              </TouchableOpacity>
            )}
            {message.length === 0 && (
              <Text style={styles.counterText}>0/{MAX_MSG}</Text>
            )}
          </View>

          <TextInput
            style={styles.messageInput}
            multiline
            placeholder={'Contoh: 4 orang di titik kumpul sekolah, butuh air minum.'}
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={t => setMessage(t.slice(0, MAX_MSG))}
            maxLength={MAX_MSG}
          />

          {/* ===== TEMPLATE CEPAT ===== */}
          <Text style={styles.templateLabel}>TEMPLATE CEPAT</Text>
          {QUICK_TEMPLATES.map(tpl => (
            <TouchableOpacity key={tpl} style={styles.templateBtn} onPress={() => applyTemplate(tpl)}>
              <Text style={styles.templateText}>{tpl}</Text>
            </TouchableOpacity>
          ))}

          {/* ===== LOKASI & WAKTU ===== */}
          <Text style={styles.sectionLabel}>LOKASI &amp; WAKTU</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>LOKASI TERSEDIA</Text>
                <Text style={styles.locationValue}>
                  {location ? formatCoords(location.lat, location.lon) : 'Belum diambil'}
                </Text>
              </View>
              <TouchableOpacity onPress={refreshLocation} disabled={locationLoading}>
                <Text style={styles.refreshBtn}>{locationLoading ? '...' : 'Perbarui'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.locationDivider} />
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>🕐</Text>
              <View>
                <Text style={styles.locationLabel}>WAKTU &amp; TANGGAL</Text>
                <Text style={styles.locationValue}>{formatNow()}</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.refreshBtn}>Kini</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ===== KIRIM BUTTON ===== */}
          <TouchableOpacity
            style={[styles.sendBtn, (!selectedStatus || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selectedStatus || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.sendIcon}>📤</Text>
                <Text style={styles.sendBtnText}>Kirim Laporan</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== MODAL PILIH NODE ===== */}
      <Modal visible={showNodeModal} animationType="slide" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setShowNodeModal(false); stopScan(); }}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cari Edge Node LOOM</Text>
              <TouchableOpacity onPress={() => { setShowNodeModal(false); stopScan(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {isMockMode && (
              <View style={styles.mockBanner}>
                <Text style={styles.mockBannerText}>🔧 Mode Simulasi — BLE tidak tersedia di perangkat ini</Text>
              </View>
            )}

            {isScanning && (
              <View style={styles.scanningRow}>
                <ActivityIndicator color={COLORS.accent} size="small" />
                <Text style={styles.scanningText}>Memindai perangkat di sekitar Anda...</Text>
              </View>
            )}

            {scanComplete && nodes.length === 0 && (
              <Text style={styles.noNodesText}>Tidak ada node ditemukan. Coba pindai ulang.</Text>
            )}

            <FlatList
              data={nodes}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedNode?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.nodeListItem, isSelected && styles.nodeListItemSelected]}
                    onPress={() => handleSelectNode(item)}
                  >
                    <Text style={styles.nodeListIcon}>📡</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nodeListName, isSelected && styles.nodeListNameSelected]}>{item.name}</Text>
                      <Text style={styles.nodeListDistance}>
                        {item.distance.charAt(0).toUpperCase() + item.distance.slice(1)} · {rssiToMeters(item.rssi)}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.nodeSelectedBadge}>
                        <Text style={styles.nodeSelectedBadgeText}>Terpilih</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.nodeConnectBtn} onPress={() => handleSelectNode(item)}>
                        <Text style={styles.nodeConnectBtnText}>Hubungkan</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => { startScan(); }}
              disabled={isScanning}
            >
              <Text style={styles.rescanBtnText}>{isScanning ? 'Memindai...' : 'Pindai Ulang'}</Text>
            </TouchableOpacity>

            <View style={styles.modalTip}>
              <Text style={styles.modalTipText}>
                💡 Tips: Mendekat ± 10 meter ke node. Matikan penghemat baterai agar BLE tidak terputus.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function statusLabel(s: StatusType): string {
  if (s === 'aman') return 'Saya aman';
  if (s === 'butuh_bantuan') return 'Butuh bantuan';
  if (s === 'darurat_kritis') return 'Darurat kritis';
  return '';
}

function formatNow(): string {
  const now = new Date();
  const day = now.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = months[now.getMonth()];
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${day} ${month} · ${h}:${m}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: { marginBottom: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1 },
  modeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surfaceAlt, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modeBadgeConnected: { backgroundColor: '#EBF3E8', borderColor: COLORS.green },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  modeDotConnected: { backgroundColor: COLORS.green },
  modeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  modeTextConnected: { color: COLORS.green },
  modeSubtitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  // Node card
  nodeCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  nodeCardLeft: { flex: 1 },
  nodeLabelSmall: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 2 },
  nodeName: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  nodeSignalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nodeSignalIcon: { fontSize: 13 },
  nodeSignalText: { fontSize: 12, color: COLORS.green, fontWeight: '500' },
  nodeBtIcon: { fontSize: 28 },

  // Node buttons
  nodeButtonRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  nodeBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  nodeBtnPrimary: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  nodeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  nodeBtnPrimaryText: { color: 'white' },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 10 },

  // Status options
  statusOption: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5,
    borderColor: COLORS.border, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  statusOptionActive: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  statusLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  statusDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, flex: 1 },
  statusRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  statusRadioActive: { borderColor: COLORS.orange },
  statusRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.orange },

  // Message
  messageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hapusText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  counterText: { fontSize: 12, color: COLORS.textMuted },
  messageInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, fontSize: 15, color: COLORS.textPrimary, minHeight: 90,
    textAlignVertical: 'top', marginBottom: 12,
  },

  // Templates
  templateLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 8 },
  templateBtn: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 7,
  },
  templateText: { fontSize: 13.5, color: COLORS.textPrimary },

  // Location
  locationCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 20, overflow: 'hidden',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  locationDivider: { height: 1, backgroundColor: COLORS.border },
  locationIcon: { fontSize: 18 },
  locationLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8 },
  locationValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', marginTop: 1 },
  refreshBtn: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },

  // Send button
  sendBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon: { fontSize: 18 },
  sendBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, maxHeight: '75%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { fontSize: 18, color: COLORS.textSecondary, padding: 4 },

  mockBanner: { backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, marginBottom: 10 },
  mockBannerText: { fontSize: 12, color: '#7A6000', fontWeight: '500' },

  scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  scanningText: { fontSize: 13, color: COLORS.textSecondary },
  noNodesText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 14, marginVertical: 20 },

  nodeListItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 14, marginBottom: 8,
  },
  nodeListItemSelected: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  nodeListIcon: { fontSize: 22 },
  nodeListName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  nodeListNameSelected: { color: COLORS.accent },
  nodeListDistance: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  nodeSelectedBadge: { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  nodeSelectedBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  nodeConnectBtn: { backgroundColor: COLORS.textPrimary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  nodeConnectBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },

  rescanBtn: {
    backgroundColor: COLORS.bg, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: 12, alignItems: 'center', marginVertical: 12,
  },
  rescanBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  modalTip: { backgroundColor: COLORS.accentLight, borderRadius: 10, padding: 12 },
  modalTipText: { fontSize: 12, color: '#7A5000', lineHeight: 18 },
});
