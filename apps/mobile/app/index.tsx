import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messageValueMetadata } from "@loom/decision-tree";
import { COLORS } from "./_layout";
import {
  connectAndValidateNode,
  notifyNodeInternetStatus,
  sendMobileMessageToNode
} from "../src/ble/BleManager";
import type { LoomNode } from "../src/ble/useBleScanner";
import { useBleScanner } from "../src/ble/useBleScanner";
import { getBleClient } from "../src/ble/bleClientFactory";
import { useSelectedNode, setGlobalNode } from "../src/hooks/useSelectedNode";
import {
  buildEmergencyMobileMessage,
  buildSafeMobileMessage
} from "../src/messages/buildMobileMessage";
import { upsertBacklogItem } from "../src/storage/backlogItems";
import { applyMessageAck, markSentMessageFailed, saveSentDraft } from "../src/storage/sentMessages";
import { formatCoords, getCurrentLocation } from "../src/utils/location";

type StatusType = "aman" | "butuh_bantuan" | "darurat_kritis" | null;

const MAX_MSG = 140;
const QUICK_TEMPLATES = [
  "Butuh air minum dan makanan",
  "Butuh bantuan medis",
  "Ada orang terjebak",
  "Bahaya banjir di sekitar"
];

const confirmSend = (message: string): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert("Konfirmasi Kategori", message, [
      { text: "Batal", style: "cancel", onPress: () => resolve(false) },
      { text: "Kirim", onPress: () => resolve(true) }
    ]);
  });

export default function LaporanScreen() {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const { node: selectedNode, isConnected } = useSelectedNode();
  const { nodes, isScanning, scanComplete, startScan, stopScan, rssiToMeters } = useBleScanner();
  const client = getBleClient();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeBacklog = client.subscribeBacklog(async (item) => {
      try {
        const stored = await upsertBacklogItem(item);
        await client.ackBacklog([stored.backlogId]);
      } catch (error) {
        console.warn("[Backlog] Failed to store backlog item", error);
      }
    });

    const unsubscribeStatus = client.subscribeNodeStatus(() => {});
    return () => {
      unsubscribeBacklog();
      unsubscribeStatus();
    };
  }, [client, isConnected]);

  const refreshLocation = async () => {
    setLocationLoading(true);
    const loc = await getCurrentLocation();
    setLocation(loc ? { lat: loc.lat, lon: loc.lon } : null);
    setLocationLoading(false);
  };

  const handleSelectNode = async (node: LoomNode) => {
    try {
      stopScan();
      const validatedNode = await connectAndValidateNode(node);
      setGlobalNode(validatedNode, true);
      setShowNodeModal(false);
      await refreshLocation();
      await notifyNodeInternetStatus().catch(() => {});
    } catch (error) {
      console.error("[BLE Validation] Failed to validate node", error);
      Alert.alert(
        "Validasi Node Gagal",
        error instanceof Error ? error.message : "Node tidak dapat divalidasi."
      );
    }
  };

  const handleSend = async () => {
    if (!selectedStatus) {
      Alert.alert("Pilih Status", "Pilih status keselamatan terlebih dahulu.");
      return;
    }

    if (!selectedNode?.validated) {
      Alert.alert(
        "Node Belum Tervalidasi",
        "Hubungkan dan validasi Edge Node LOOM terlebih dahulu."
      );
      return;
    }

    setIsSending(true);
    try {
      const currentLocation = await getCurrentLocation();
      const payloadResult =
        selectedStatus === "aman"
          ? {
              ok: true as const,
              payload: buildSafeMobileMessage(currentLocation),
              rawText: null,
              confidence: "high" as const
            }
          : buildEmergencyMobileMessage(message, currentLocation);

      if (!payloadResult.ok) {
        Alert.alert(
          "Kategori Belum Jelas",
          `Tulis pesan lebih spesifik atau gunakan template. Saran: ${payloadResult.suggestions
            .map((value) => messageValueMetadata[value].label)
            .join(", ")}.`
        );
        return;
      }

      if (payloadResult.confidence === "medium") {
        const confirmed = await confirmSend(
          `Kategori terdeteksi: ${messageValueMetadata[payloadResult.payload.message].label}. Kirim kategori ini?`
        );
        if (!confirmed) return;
      }

      await saveSentDraft(payloadResult.payload, selectedNode.nodeId, payloadResult.rawText);
      const ack = await sendMobileMessageToNode(payloadResult.payload);
      await applyMessageAck(ack);

      if (!ack.accepted) {
        await markSentMessageFailed(
          payloadResult.payload.clientMessageId,
          ack.error || "node_rejected"
        );
      }

      setSelectedStatus(null);
      setMessage("");

      Alert.alert(
        ack.accepted ? "Laporan Diterima Node" : "Laporan Ditolak Node",
        ack.accepted
          ? `Node menerima pesan ${payloadResult.payload.message}. Status: ${ack.queued ? "queued" : "sent_to_node"}.`
          : "Node menolak pesan. Pastikan node tervalidasi dan coba lagi."
      );
    } catch (error) {
      console.error("[Send] Error:", error);
      Alert.alert(
        "Gagal Mengirim",
        error instanceof Error ? error.message : "Terjadi kesalahan saat mengirim laporan."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.appName}>LOOM</Text>
              <View style={[styles.modeBadge, isConnected && styles.modeBadgeConnected]}>
                <View style={[styles.modeDot, isConnected && styles.modeDotConnected]} />
                <Text style={[styles.modeText, isConnected && styles.modeTextConnected]}>
                  {isConnected ? "Tervalidasi" : "Offline"}
                </Text>
              </View>
            </View>
            <Text style={styles.modeSubtitle}>Mode luring, LoRa best-effort</Text>
          </View>

          <View style={styles.nodeCard}>
            <View style={styles.nodeCardLeft}>
              <Text style={styles.nodeLabelSmall}>EDGE NODE</Text>
              <Text style={styles.nodeName}>{selectedNode?.name || "Belum ada node"}</Text>
              <Text style={styles.nodeSignalText}>
                {selectedNode
                  ? `Node ID ${selectedNode.nodeId} - ${rssiToMeters(selectedNode.rssi)}`
                  : "Pilih dan validasi node sebelum mengirim laporan"}
              </Text>
            </View>
          </View>

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

          <Text style={styles.sectionLabel}>STATUS KESELAMATAN</Text>
          {[
            ["aman", "Aman", "Saya selamat dan tidak memerlukan bantuan.", COLORS.green],
            [
              "butuh_bantuan",
              "Butuh Bantuan",
              "Butuh bantuan, tetapi bukan bahaya langsung.",
              COLORS.orange
            ],
            [
              "darurat_kritis",
              "Darurat Kritis",
              "Situasi mengancam jiwa atau bahaya sekitar.",
              COLORS.red
            ]
          ].map(([key, title, desc, color]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.statusOption,
                selectedStatus === key && {
                  backgroundColor: COLORS.accentLight,
                  borderColor: color
                }
              ]}
              onPress={() => setSelectedStatus(key as StatusType)}
            >
              <View style={styles.statusLeft}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>{title}</Text>
                  <Text style={styles.statusDesc}>{desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.messageHeader}>
            <Text style={styles.sectionLabel}>PESAN DARURAT</Text>
            <Text style={styles.counterText}>
              {message.length}/{MAX_MSG}
            </Text>
          </View>
          <TextInput
            style={styles.messageInput}
            multiline
            placeholder="Contoh: Butuh air minum dan bantuan medis."
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={(text) => setMessage(text.slice(0, MAX_MSG))}
            maxLength={MAX_MSG}
          />

          <Text style={styles.templateLabel}>TEMPLATE CEPAT</Text>
          {QUICK_TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template}
              style={styles.templateBtn}
              onPress={() =>
                setMessage((prev) => (prev ? `${prev} ${template}` : template).slice(0, MAX_MSG))
              }
            >
              <Text style={styles.templateText}>{template}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionLabel}>LOKASI & WAKTU</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>LOKASI</Text>
                <Text style={styles.locationValue}>
                  {location ? formatCoords(location.lat, location.lon) : "Belum diambil"}
                </Text>
              </View>
              <TouchableOpacity onPress={refreshLocation} disabled={locationLoading}>
                <Text style={styles.refreshBtn}>{locationLoading ? "..." : "Perbarui"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, (!selectedStatus || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!selectedStatus || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.sendBtnText}>Kirim Laporan</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showNodeModal} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowNodeModal(false);
            stopScan();
          }}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cari Edge Node LOOM</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNodeModal(false);
                  stopScan();
                }}
              >
                <Text style={styles.modalClose}>Tutup</Text>
              </TouchableOpacity>
            </View>
            {client.isMock && (
              <View style={styles.mockBanner}>
                <Text style={styles.mockBannerText}>
                  Mode simulasi aktif. BLE native tidak tersedia di environment ini.
                </Text>
              </View>
            )}
            {isScanning && (
              <View style={styles.scanningRow}>
                <ActivityIndicator color={COLORS.accent} size="small" />
                <Text style={styles.scanningText}>Memindai node di sekitar...</Text>
              </View>
            )}
            {scanComplete && nodes.length === 0 && (
              <Text style={styles.noNodesText}>Tidak ada node ditemukan. Coba pindai ulang.</Text>
            )}
            <FlatList
              data={nodes}
              keyExtractor={(item) => item.deviceId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.nodeListItem}
                  onPress={() => handleSelectNode(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nodeListName}>{item.name}</Text>
                    <Text style={styles.nodeListDistance}>
                      {item.nodeId ? `Node ID ${item.nodeId} - ` : ""}
                      {rssiToMeters(item.rssi)}
                    </Text>
                  </View>
                  <Text style={styles.nodeConnectBtnText}>Validasi</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.rescanBtn} onPress={startScan} disabled={isScanning}>
              <Text style={styles.rescanBtnText}>
                {isScanning ? "Memindai..." : "Pindai Ulang"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  appName: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: 1 },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modeBadgeConnected: { backgroundColor: COLORS.greenLight, borderColor: COLORS.green },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  modeDotConnected: { backgroundColor: COLORS.green },
  modeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },
  modeTextConnected: { color: COLORS.green },
  modeSubtitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginTop: 2 },
  nodeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10
  },
  nodeCardLeft: { flex: 1 },
  nodeLabelSmall: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 2
  },
  nodeName: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  nodeSignalText: { fontSize: 12, color: COLORS.green, fontWeight: "500" },
  nodeButtonRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  nodeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center"
  },
  nodeBtnPrimary: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  nodeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  nodeBtnPrimaryText: { color: "white" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 10
  },
  statusOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10
  },
  statusLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  statusTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 2 },
  statusDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  counterText: { fontSize: 12, color: COLORS.textMuted },
  messageInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 12
  },
  templateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 8
  },
  templateBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 7
  },
  templateText: { fontSize: 13.5, color: COLORS.textPrimary },
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    overflow: "hidden"
  },
  locationRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  locationLabel: { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.8 },
  locationValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: "500", marginTop: 1 },
  refreshBtn: { fontSize: 13, color: COLORS.accent, fontWeight: "600" },
  sendBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "75%"
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary },
  modalClose: { fontSize: 13, color: COLORS.accent, padding: 4, fontWeight: "700" },
  mockBanner: { backgroundColor: "#FFF8E1", borderRadius: 8, padding: 10, marginBottom: 10 },
  mockBannerText: { fontSize: 12, color: "#7A6000", fontWeight: "500" },
  scanningRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  scanningText: { fontSize: 13, color: COLORS.textSecondary },
  noNodesText: { textAlign: "center", color: COLORS.textMuted, fontSize: 14, marginVertical: 20 },
  nodeListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 8
  },
  nodeListName: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  nodeListDistance: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  nodeConnectBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: "700" },
  rescanBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: "center",
    marginVertical: 12
  },
  rescanBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary }
});
