import React, { useCallback, useState } from 'react';
import { Alert, Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import { COLORS } from './_layout';
import { disconnectNode } from '../src/ble/BleManager';
import { getBleClient } from '../src/ble/bleClientFactory';
import { DEFAULT_API_BASE_URL, getOrCreateMobileInstallationId } from '../src/config/appConfig';
import { useSelectedNode, setGlobalNode } from '../src/hooks/useSelectedNode';
import { clearAllLocalData, getBacklogCount } from '../src/storage/localStore';

export default function PengaturanScreen() {
  const [deviceId, setDeviceId] = useState('-');
  const [backlogCount, setBacklogCount] = useState(0);
  const [networkLabel, setNetworkLabel] = useState('unknown');
  const [locationLabel, setLocationLabel] = useState('unknown');
  const [appVersion] = useState('v0.5.0-mobile-enhancement');

  const { node: selectedNode } = useSelectedNode();
  const client = getBleClient();

  const loadData = useCallback(async () => {
    setDeviceId(await getOrCreateMobileInstallationId());
    setBacklogCount(await getBacklogCount());
    const network = await Network.getNetworkStateAsync();
    setNetworkLabel(network.isConnected && network.isInternetReachable ? 'online' : 'offline');
    const location = await Location.getForegroundPermissionsAsync();
    setLocationLabel(location.status);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCopyDeviceId = () => {
    Clipboard.setString(deviceId);
    Alert.alert('Disalin', 'Mobile installation ID telah disalin.');
  };

  const handleResetBle = () => {
    Alert.alert('Reset Koneksi BLE', 'Koneksi aktif akan diputus dan node harus divalidasi ulang.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await disconnectNode().catch(() => {});
          setGlobalNode(null, false);
          Alert.alert('Berhasil', 'Koneksi BLE telah direset.');
        }
      }
    ]);
  };

  const handleDeleteLogs = () => {
    Alert.alert('Hapus Data Lokal', 'Sent history dan backlog lokal akan dihapus permanen.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await clearAllLocalData();
          await loadData();
          Alert.alert('Berhasil', 'Data lokal telah dihapus.');
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.backLabel}>LOOM - PENGATURAN</Text>
        <Text style={styles.title}>Pengaturan</Text>
        <Text style={styles.subtitle}>
          Status perangkat dan data lokal. Mobile tetap bisa dipakai offline setelah node tervalidasi.
        </Text>

        {client.isMock && (
          <View style={styles.mockBanner}>
            <Text style={styles.mockBannerTitle}>Mode Simulasi Aktif</Text>
            <Text style={styles.mockBannerDesc}>
              BLE native tidak tersedia di environment ini. Flow memakai mock firmware contract.
            </Text>
          </View>
        )}

        {selectedNode && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NODE AKTIF</Text>
            <View style={styles.nodeInfoCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nodeInfoName}>{selectedNode.name}</Text>
                <Text style={styles.nodeInfoId}>Node ID {selectedNode.nodeId}</Text>
              </View>
              <View style={styles.connectedDot} />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STATUS</Text>
          <View style={styles.card}>
            <InfoRow label="Bluetooth" value={client.isMock ? 'mock' : 'native'} />
            <View style={styles.cardDivider} />
            <InfoRow label="Lokasi" value={locationLabel} />
            <View style={styles.cardDivider} />
            <InfoRow label="Internet" value={networkLabel} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PERANGKAT</Text>
          <View style={styles.card}>
            <InfoRow label="Mobile installation ID" value={deviceId} actionLabel="Salin" onAction={handleCopyDeviceId} />
            <View style={styles.cardDivider} />
            <InfoRow label="API Base" value={DEFAULT_API_BASE_URL} />
            <View style={styles.cardDivider} />
            <InfoRow label="Versi aplikasi" value={appVersion} />
            <View style={styles.cardDivider} />
            <InfoRow label="Backlog belum selesai" value={`${backlogCount} item`} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>KONEKSI & DATA LOKAL</Text>
          <View style={styles.card}>
            <ActionRow title="Reset Koneksi BLE" description="Memutus koneksi dan memerlukan validasi ulang." onPress={handleResetBle} />
          </View>
        </View>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteLogs}>
          <Text style={styles.dangerBtnText}>Hapus Data Lokal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({
  label,
  value,
  actionLabel,
  onAction
}: {
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={styles.settingRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.settingLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
    {actionLabel && onAction ? (
      <TouchableOpacity style={styles.copyBtn} onPress={onAction}>
        <Text style={styles.copyBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const ActionRow = ({
  title,
  description,
  onPress
}: {
  title: string;
  description: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc}>{description}</Text>
    </View>
    <Text style={styles.actionChevron}>{'>'}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20 },
  backLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 20 },
  mockBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD54F',
    marginBottom: 16
  },
  mockBannerTitle: { fontSize: 14, fontWeight: '700', color: '#5D4037', marginBottom: 3 },
  mockBannerDesc: { fontSize: 12, color: '#795548', lineHeight: 18 },
  nodeInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.green,
    padding: 14
  },
  nodeInfoName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  nodeInfoId: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 10 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  cardDivider: { height: 1, backgroundColor: COLORS.border },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12
  },
  settingLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 3 },
  settingValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' },
  copyBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary },
  actionChevron: { fontSize: 20, color: COLORS.textMuted },
  dangerBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingVertical: 14,
    alignItems: 'center'
  },
  dangerBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.red }
});
