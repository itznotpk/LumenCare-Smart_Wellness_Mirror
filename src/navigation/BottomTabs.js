import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import DashboardScreen from '../screens/DashboardScreen';
import TrendsScreen from '../screens/TrendsScreen';
import SafetyScreen from '../screens/SafetyScreen';
import FamilyScreen from '../screens/FamilyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileSwitcher from '../components/ProfileSwitcher';
import { useProfileStore } from '../store/useProfileStore';
import { useToastStore } from '../store/useToastStore';
import { COLORS, FONT_SIZES, MIN_TAP_TARGET } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: 'home',
  Trends: 'trending-up',
  Safety: 'shield',
  Family: 'heart',
  Settings: 'settings',
};

export default function BottomTabs() {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const showToast = useToastStore((s) => s.showToast);

  return (
    <Tab.Navigator
      screenListeners={({ route }) => ({
        tabPress: (e) => {
          if (!activeProfileId && route.name !== 'Dashboard') {
            e.preventDefault();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast('Setup Required', 'Please register your first loved one before accessing this tab.', 'warning');
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      })}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <View style={styles.tabIconContainer}>
            <Feather name={TAB_ICONS[route.name]} size={22} color={color} />
          </View>
        ),
        tabBarActiveTintColor: COLORS.primary500,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          display: activeProfileId ? 'flex' : 'none', // Hidden when no profile exists
          position: 'absolute', // Required to let BlurView work underneath
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(255,255,255,0.4)',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
        ),
        tabBarItemStyle: {
          minHeight: MIN_TAP_TARGET,
        },
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.4)',
        },
        headerTransparent: true, // Let content scroll under the header
        headerBackground: () => (
          <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
        ),
        headerTitleStyle: {
          fontSize: FONT_SIZES.lg,
          fontWeight: '700',
          color: COLORS.textPrimary,
        },
        headerRight: () => activeProfileId ? (
          <View style={{ marginRight: 16 }}>
            <ProfileSwitcher />
          </View>
        ) : null,
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../assets/LumenCare icon.png')}
              style={{ width: 28, height: 28, borderRadius: 6, marginRight: 8 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: FONT_SIZES.lg, color: COLORS.textPrimary }}>
              <Text style={{ fontWeight: '800' }}>Lumen</Text>
              <Text style={{ fontWeight: '400' }}>Care</Text>
            </Text>
          </View>
        ),
        headerTitleAlign: 'left',
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Trends"
        component={TrendsScreen}
        options={{ tabBarLabel: 'Trends' }}
      />
      <Tab.Screen
        name="Safety"
        component={SafetyScreen}
        options={{ tabBarLabel: 'Safety' }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyScreen}
        options={{ tabBarLabel: 'Family' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
  },
});
