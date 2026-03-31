import React, { useEffect } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BottomTabs from './src/navigation/BottomTabs';
import AuthNavigator from './src/navigation/AuthNavigator';
import GlassToast from './src/components/GlassToast';
import { useAuthStore } from './src/store/useAuthStore';
import { useProfileStore } from './src/store/useProfileStore';
import { useAlertStore } from './src/store/useAlertStore';

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const fetchElderlies = useProfileStore((s) => s.fetchElderlies);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const subscribeToAlerts = useAlertStore((s) => s.subscribeToAlerts);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchElderlies();
      fetchAlerts();
      const unsubscribe = subscribeToAlerts();
      return () => unsubscribe?.();
    }
  }, [isAuthenticated, fetchElderlies, fetchAlerts, subscribeToAlerts]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LinearGradient
          colors={['#F1F5F9', '#E2E8F0', '#CBD5E1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <NavigationContainer>
            <StatusBar style="dark" />
            {isAuthenticated ? <BottomTabs /> : <AuthNavigator />}
          </NavigationContainer>
          {/* Global UI Overlays */}
          <GlassToast />
        </LinearGradient>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
