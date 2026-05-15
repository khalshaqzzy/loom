import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Network from 'expo-network';

import { getOrCreateDeviceId } from '../src/storage/localStore';
import { syncPendingBacklog } from '../src/sync/syncBacklog';

export const COLORS = {
  bg: '#F5F0E8',          // warm cream background
  surface: '#FDFAF4',     // card surface
  surfaceAlt: '#EDE8DC',  // slightly darker surface
  border: '#DDD8CE',      // border
  textPrimary: '#2C2A26', // almost black
  textSecondary: '#8A8070',
  textMuted: '#B5AFA0',
  accent: '#C4863A',      // amber/orange accent (tombol utama)
  accentLight: '#F5E6D0', // light accent
  green: '#5C8A4A',       // safe/aman
  greenLight: '#EBF3E8',
  orange: '#C4863A',      // butuh bantuan
  orangeLight: '#FBF0E3',
  red: '#C0392B',         // darurat kritis
  redLight: '#FDECEA',
  tabActive: '#2C2A26',
  tabInactive: '#B5AFA0',
  shadow: 'rgba(44, 42, 38, 0.08)',
};

function TabIcon({ focused, color, label, icon }: { focused: boolean; color: string; label: string; icon: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    let deviceId: string;

    const init = async () => {
      deviceId = await getOrCreateDeviceId();
    };
    init();

    // Background burst: cek internet tiap 15 detik
    const interval = setInterval(async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (net.isInternetReachable) {
          const result = await syncPendingBacklog();
          if (result.attempted > 0) console.log('[Burst] Result', result);
        }
      } catch (err) {
        console.error('[Burst] Error:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={COLORS.bg} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 68,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 10,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: COLORS.tabActive,
          tabBarInactiveTintColor: COLORS.tabInactive,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Laporan',
            tabBarIcon: ({ focused, color }) => (
              <Image source={require('../assets/home.png')} 
              style={styles.baricon} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Riwayat',
            tabBarIcon: ({ focused }) => (
              <Image source={require('../assets/history.png')} 
              style={styles.baricon} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="help"
          options={{
            title: 'Bantuan',
            tabBarIcon: ({ focused }) => (
              <Image source={require('../assets/information.png')} 
              style={styles.baricon} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Pengaturan',
            tabBarIcon: ({ focused }) => (
             <Image source={require('../assets/setting.png')} 
              style={styles.baricon} 
              />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  baricon: {
    width: 24, 
    height: 24,
    resizeMode: 'contain', 
  },
});
