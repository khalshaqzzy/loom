import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBleScanner } from '../src/ble/useBleScanner'; // Import scanner kita

export default function DiscoveryScreen() {
  const router = useRouter();
  // Gunakan scanner asli, hapus useState dummy
  const { devices, isScanning, startScan } = useBleScanner(); 
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState('');
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LOOM Mobile</Text>
        <Text style={styles.headerSub}>Offline Mesh Network</Text>
      </View>

      <TouchableOpacity 
        style={styles.scanBtn} 
        onPress={startScan}
      >
        <Ionicons name={isScanning ? "stop-circle" : "search"} size={24} color="white" />
        <Text style={styles.scanBtnText}>{isScanning ? "Berhenti Mencari" : "Cari Node Terdekat"}</Text>
      </TouchableOpacity>

      <FlatList
        data={devices} // Gunakan data dari BLE
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.nodeCard, selectedNode === item.id && styles.nodeCardActive]}
            onPress={() => setSelectedNode(item.id)}
          >
            <Ionicons name="radio" size={30} color={selectedNode === item.id ? "#007AFF" : "#666"} />
            <View style={{marginLeft: 15}}>
              {/* Tampilkan nama asli device, jika null tampilkan "Unknown Device" */}
              <Text style={styles.nodeName}>{item.name || 'Unknown Device'}</Text>
              
              {/* Secara opsional, kita bisa membaca item.rssi untuk sinyal asli nanti */}
              <Text style={styles.nodeStatus}>Sinyal Terdeteksi ({item.id})</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {selectedNode && (
        <View style={styles.footer}>
          <TextInput 
            style={styles.input} 
            placeholder="Masukkan Node ID (Cek fisik alat)" 
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={nodeId}
            onChangeText={setNodeId}
          />
          <TouchableOpacity 
            style={styles.connectBtn}
            onPress={() => router.push('/compose')}
          >
            <Text style={styles.connectBtnText}>Hubungkan via Bluetooth</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  header: { marginTop: 40, marginBottom: 30 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A' },
  headerSub: { fontSize: 16, color: '#666' },
  scanBtn: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  scanBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10 },
  nodeCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  nodeCardActive: { borderColor: '#007AFF', borderWidth: 2, backgroundColor: '#F0F7FF' },
  nodeName: { fontSize: 18, fontWeight: 'bold' },
  nodeStatus: { fontSize: 13, color: '#28A745' },
  footer: { backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 10 },
  input: { backgroundColor: '#F1F3F5', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  connectBtn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center' },
  connectBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});