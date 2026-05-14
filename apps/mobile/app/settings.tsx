import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { COLORS } from './_layout';
import { getOrCreateDeviceId, clearBacklog, getBacklog } from '../src/storage/localStore';
import { getLoomBleManager } from '../src/ble/BleManager';
import { useSelectedNode, setGlobalNode } from '../src/hooks/useSelectedNode';

export default function PengaturanScreen() {
  const [deviceId, setDeviceId] = useState('—');
  const [backlogCount, setBacklogCount] = useState(0);
  const [bleEnabled, setBleEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [appVersion] = useState('v0.4.2-mesh-ready');

  const { node: selectedNode } = useSelectedNode();
  const { isMockMode } = getLoomBleManager();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const id = await getOrCreateDeviceId();
    setDeviceId(id);
    const backlog = await getBacklog();
    setBacklogCount(backlog.length);
  };

  const handleCopyDeviceId = () => {
    Clipboard.setString(deviceId);
    Alert.alert('Disalin', 'Device ID telah disalin ke clipboard.');
  };

  const handleResetBle = () => {
    Alert.alert(
      'Reset Koneksi BLE',
      'Ini akan memutuskan koneksi dari node saat ini dan memulai pencarian dari awal.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setGlobalNode(null, false);
            Alert.alert('✅ Berhasil', 'Koneksi BLE telah direset.');
          },
        },
      ]
    );
  };

  const handleDeleteLogs = () => {
    Alert.alert(
      'Hapus Laporan Lokal',
      'Semua laporan yang tersimpan di perangkat ini akan dihapus permanen. Laporan yang sudah terkirim ke server tidak terpengaruh.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await clearBacklog();
            await loadData();
            Alert.alert('✅ Berhasil', 'Laporan lokal telah dihapus.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.backLabel}>‹ LOOM · PENGATURAN</Text>
        <Text style={styles.title}>Pengaturan</Text>
        <Text style={styles.subtitle}>
          Pengaturan dibuat minimal agar aplikasi tetap mudah digunakan saat panik.
        </Text>

        {/* Mock Mode Banner */}
        {isMockMode && (
          <View style={styles.mockBanner}>
            <Text style={styles.mockBannerIcon}>🔧</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.mockBannerTitle}>Mode Simulasi Aktif</Text>
              <Text style={styles.mockBannerDesc}>
                BLE tidak tersedia di perangkat/simulator ini. Build ke device fisik iOS/Android untuk BLE nyata.
              </Text>
            </View>
          </View>
        )}

        {/* Node Terhubung */}
        {selectedNode && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NODE AKTIF</Text>
            <View style={styles.nodeInfoCard}>
              <Text style={styles.nodeInfoIcon}>📡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.nodeInfoName}>{selectedNode.name}</Text>
                <Text style={styles.nodeInfoId}>{selectedNode.id}</Text>
              </View>
              <View style={styles.connectedDot} />
            </View>
          </View>
        )}

        {/* Izin */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>IZIN</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Bluetooth</Text>
                <Text style={styles.settingDesc}>Diperlukan untuk mengirim laporan ke edge node.</Text>
              </View>
              <Switch
                value={bleEnabled}
                onValueChange={setBleEnabled}
                trackColor={{ true: COLORS.textPrimary, false: COLORS.border }}
                thumbColor="white"
              />
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>Lokasi</Text>
                <Text style={styles.settingDesc}>Opsional. Membantu pemetaan korban di Digital Twin.</Text>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ true: COLORS.textPrimary, false: COLORS.border }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Perangkat */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PERANGKAT</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>DEVICE IDENTIFIER</Text>
                <Text style={styles.settingValue}>{deviceId}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyDeviceId}>
                <Text style={styles.copyBtnText}>Salin</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>VERSI APLIKASI</Text>
                <Text style={styles.settingValue}>{appVersion}</Text>
              </View>
            </View>
            {backlogCount > 0 && (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>BACKLOG PESAN</Text>
                    <Text style={styles.settingValue}>{backlogCount} pesan menunggu dikirim</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Koneksi & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>KONEKSI &amp; DATA LOKAL</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={handleResetBle}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Reset Koneksi BLE</Text>
                <Text style={styles.actionDesc}>Memutus koneksi dan memindai node dari awal.</Text>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hapus Laporan */}
        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteLogs}>
          <Text style={styles.dangerBtnText}>🗑 Hapus Laporan Lokal</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20 },

  backLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 20 },

  mockBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FFD54F', marginBottom: 16,
  },
  mockBannerIcon: { fontSize: 20 },
  mockBannerTitle: { fontSize: 14, fontWeight: '700', color: '#5D4037', marginBottom: 3 },
  mockBannerDesc: { fontSize: 12, color: '#795548', lineHeight: 18 },

  nodeInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.green, padding: 14,
  },
  nodeInfoIcon: { fontSize: 22 },
  nodeInfoName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  nodeInfoId: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 10 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, overflow: 'hidden',
  },
  cardDivider: { height: 1, backgroundColor: COLORS.border },

  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  settingTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  settingDesc: { fontSize: 12, color: COLORS.textSecondary },
  settingLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 3 },
  settingValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },

  copyBtn: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6,
  },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary },
  actionChevron: { fontSize: 20, color: COLORS.textMuted },

  dangerBtn: {
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.red,
    paddingVertical: 14, alignItems: 'center',
  },
  dangerBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.red },
});
