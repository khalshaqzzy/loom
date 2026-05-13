import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const messages = [
    { id: '1', msg: 'Saya Aman', time: '12:00', status: 'CLOUD' },
    { id: '2', msg: 'Butuh air bersih di koordinat ini', time: '11:45', status: 'NODE' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Riwayat Pesan</Text>
      
      <FlatList 
        data={messages}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardMsg}>{item.msg}</Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            <View style={styles.statusRow}>
              <Ionicons 
                name={item.status === 'CLOUD' ? "cloud-done" : "radio-outline"} 
                size={16} 
                color={item.status === 'CLOUD' ? "#28A745" : "#F39C12"} 
              />
              <Text style={[styles.statusText, {color: item.status === 'CLOUD' ? "#28A745" : "#F39C12"}]}>
                {item.status === 'CLOUD' ? "Tersinkron ke Pusat" : "Tersimpan di Node ESP32"}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardMsg: { fontSize: 16, fontWeight: '600', flex: 1 },
  cardTime: { fontSize: 12, color: '#999' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 5 }
});