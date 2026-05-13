import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ComposeScreen() {
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSend = (type: 'SAFE' | 'HELP') => {
    // Skenario 100% Offline via BLE
    Alert.alert(
      "Pesan Terkirim",
      "Pesan Anda telah dikirim ke Node ESP32 via Bluetooth dan sedang disebarkan ke jaringan Mesh.",
      [{ text: "OK", onPress: () => router.push('/history') }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Kirim Pesan</Text>
      </View>

      <Text style={styles.label}>Status Cepat</Text>
      <TouchableOpacity style={styles.safeBtn} onPress={() => handleSend('SAFE')}>
        <Ionicons name="checkmark-circle" size={32} color="white" />
        <View style={{marginLeft: 15}}>
          <Text style={styles.safeBtnTitle}>SAYA AMAN</Text>
          <Text style={styles.safeBtnSub}>Kirim status selamat ke tim penyelamat</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Pesan Kustom</Text>
      <TextInput 
        style={styles.textArea} 
        multiline 
        numberOfLines={4}
        placeholder="Tulis bantuan yang dibutuhkan (misal: Butuh air/medis)..."
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity 
        style={[styles.sendBtn, !message && {backgroundColor: '#CCC'}]} 
        onPress={() => handleSend('HELP')}
        disabled={!message}
      >
        <Text style={styles.sendBtnText}>Kirim Pesan Darurat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  header: { marginTop: 40, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', marginLeft: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10, marginTop: 20 },
  safeBtn: { backgroundColor: '#28A745', padding: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center' },
  safeBtnTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  safeBtnSub: { color: 'white', opacity: 0.8, fontSize: 12 },
  textArea: { backgroundColor: 'white', borderRadius: 15, padding: 20, fontSize: 18, textAlignVertical: 'top', height: 150, borderWidth: 1, borderColor: '#EEE' },
  sendBtn: { backgroundColor: '#DC3545', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  sendBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});