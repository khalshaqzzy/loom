import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { COLORS } from "./_layout";
import { getReports, type LocalReport, type ReportStatus } from "../src/storage/localStore";
import {
  listBacklogItems,
  type BacklogSyncStatus,
  type LocalBacklogItem
} from "../src/storage/backlogItems";
import { syncPendingBacklog } from "../src/sync/syncBacklog";

type FilterType = "sent" | "backlog";

export default function RiwayatScreen() {
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [backlog, setBacklog] = useState<LocalBacklogItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("sent");
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    setReports(await getReports());
    setBacklog(await listBacklogItems(["pending", "failed", "rejected", "synced"]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleManualSync = async () => {
    setSyncing(true);
    await syncPendingBacklog();
    await loadData();
    setSyncing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.backLabel}>LOOM - RIWAYAT</Text>
          <Text style={styles.title}>Riwayat & Sync</Text>
          <Text style={styles.subtitle}>
            BLE ack berarti node menerima atau mengantrekan pesan. Sync backend terjadi saat
            internet tersedia.
          </Text>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, filter === "sent" && styles.filterTabActive]}
            onPress={() => setFilter("sent")}
          >
            <Text style={[styles.filterTabText, filter === "sent" && styles.filterTabTextActive]}>
              Terkirim Node ({reports.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "backlog" && styles.filterTabActive]}
            onPress={() => setFilter("backlog")}
          >
            <Text
              style={[styles.filterTabText, filter === "backlog" && styles.filterTabTextActive]}
            >
              Backlog ({backlog.length})
            </Text>
          </TouchableOpacity>
        </View>

        {filter === "backlog" && (
          <TouchableOpacity style={styles.syncBtn} onPress={handleManualSync} disabled={syncing}>
            <Text style={styles.syncBtnText}>{syncing ? "Sync berjalan..." : "Sync Sekarang"}</Text>
          </TouchableOpacity>
        )}

        {filter === "sent" ? (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyState text="Belum ada laporan terkirim ke node." />}
            renderItem={({ item }) => <SentCard item={item} />}
          />
        ) : (
          <FlatList
            data={backlog}
            keyExtractor={(item) => item.backlogId}
            ListEmptyComponent={<EmptyState text="Belum ada backlog dari node." />}
            renderItem={({ item }) => <BacklogCard item={item} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const EmptyState = ({ text }: { text: string }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const SentCard = ({ item }: { item: LocalReport }) => (
  <View style={styles.reportCard}>
    <View style={styles.reportTypeRow}>
      <Text style={styles.reportType}>{item.type === "safe" ? "Aman" : "Darurat"}</Text>
      <StatusBadge status={item.status} />
    </View>
    <Text style={styles.reportDate}>{formatDate(item.timestamp)}</Text>
    <Text style={styles.reportPreview}>{item.rawText || item.message}</Text>
    <Text style={styles.detailValue}>Node {item.nodeId}</Text>
  </View>
);

const BacklogCard = ({ item }: { item: LocalBacklogItem }) => (
  <View style={styles.reportCard}>
    <View style={styles.reportTypeRow}>
      <Text style={styles.reportType}>{item.message}</Text>
      <BacklogBadge status={item.syncStatus} />
    </View>
    <Text style={styles.reportDate}>{item.timestamp}</Text>
    <Text style={styles.detailValue}>
      Dedup {item.senderNodeId}:{item.seqId}
    </Text>
    {item.lastSyncError ? <Text style={styles.errorText}>{item.lastSyncError}</Text> : null}
  </View>
);

const StatusBadge = ({ status }: { status: ReportStatus }) => (
  <View style={[styles.statusBadge, { backgroundColor: statusColor(status) + "22" }]}>
    <Text style={[styles.statusBadgeText, { color: statusColor(status) }]}>{status}</Text>
  </View>
);

const BacklogBadge = ({ status }: { status: BacklogSyncStatus }) => (
  <View style={[styles.statusBadge, { backgroundColor: backlogColor(status) + "22" }]}>
    <Text style={[styles.statusBadgeText, { color: backlogColor(status) }]}>{status}</Text>
  </View>
);

const statusColor = (status: ReportStatus): string => {
  if (status === "failed") return COLORS.red;
  if (status === "queued") return COLORS.orange;
  return COLORS.green;
};

const backlogColor = (status: BacklogSyncStatus): string => {
  if (status === "rejected" || status === "failed") return COLORS.red;
  if (status === "pending" || status === "syncing") return COLORS.orange;
  return COLORS.green;
};

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 8, marginBottom: 16 },
  backLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterTab: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  filterTabActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  filterTabText: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  filterTabTextActive: { color: "white" },
  syncBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12
  },
  syncBtnText: { color: "white", fontSize: 14, fontWeight: "700" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
  reportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    padding: 14
  },
  reportTypeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  reportType: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  reportDate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  reportPreview: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  detailValue: { fontSize: 12, color: COLORS.textPrimary, fontWeight: "500" },
  errorText: { fontSize: 12, color: COLORS.red, marginTop: 6 }
});
