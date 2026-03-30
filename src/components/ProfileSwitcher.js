import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useProfileStore } from '../store/useProfileStore';
import { COLORS, SPACING, FONT_SIZES, RADII, MIN_TAP_TARGET } from '../theme';

export default function ProfileSwitcher() {
  const [visible, setVisible] = useState(false);
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getDisplayName = (p) => {
    if (!p) return 'Unknown';
    if (p.first_name) return `${p.first_name} ${p.last_name || ''}`.trim();
    return p.name || 'Unknown';
  };

  if (!activeProfile) {
    return (
      <View style={styles.trigger}>
        <View style={[styles.avatar, { backgroundColor: COLORS.slate100 }]}>
          <Feather name="plus" size={16} color={COLORS.primary500} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        accessibilityLabel={`Switch profile. Current: ${getDisplayName(activeProfile)}`}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(getDisplayName(activeProfile))}</Text>
        </View>
        <Feather name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <GlassCard style={styles.dropdown} intensity={70}>
            <Text style={styles.dropdownTitle}>Switch Profile</Text>
            <FlatList
              data={profiles}
              style={{ flexGrow: 0, maxHeight: 400 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.profileRow,
                    item.id === activeProfileId && styles.profileRowActive,
                  ]}
                  onPress={() => {
                    setActiveProfile(item.id);
                    setVisible(false);
                  }}
                  accessibilityLabel={`Select ${getDisplayName(item)}`}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.avatarSmall,
                      item.id === activeProfileId && styles.avatarSmallActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarTextSmall,
                        item.id === activeProfileId && { color: COLORS.white },
                      ]}
                    >
                      {getInitials(getDisplayName(item))}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.profileName,
                      item.id === activeProfileId && styles.profileNameActive,
                    ]}
                  >
                    {getDisplayName(item)}
                  </Text>
                  {item.id === activeProfileId && (
                    <Feather name="check" size={18} color={COLORS.primary500} />
                  )}
                </TouchableOpacity>
              )}
            />
          </GlassCard>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: MIN_TAP_TARGET,
    minHeight: MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary900,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: SPACING.lg,
  },
  dropdown: {
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    minWidth: 200,
  },
  dropdownTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.sm,
    gap: SPACING.md,
    minHeight: MIN_TAP_TARGET,
  },
  profileRowActive: {
    backgroundColor: COLORS.primary50,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallActive: {
    backgroundColor: COLORS.primary500,
  },
  avatarTextSmall: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary900,
  },
  profileName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  profileNameActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
});
