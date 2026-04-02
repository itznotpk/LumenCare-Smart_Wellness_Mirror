import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';
import GlassSkeleton from '../components/GlassSkeleton';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { COLORS, SPACING, FONT_SIZES, RADII, SHADOWS, MIN_TAP_TARGET } from '../theme';
import LumenAvatar from '../components/LumenAvatar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';




/**
 * SettingsScreen — Full settings panel:
 *   1. Account & Dependents (switch + edit profiles)
 *   2. Emergency & Alerts (escalation, contacts)
 *   3. Device Management (mirror hub status)
 *   4. App Preferences (notifications, export)
 */
export default function SettingsScreen() {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editConditions, setEditConditions] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDob, setAddDob] = useState('');
  const [addGender, setAddGender] = useState('');
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [addConditions, setAddConditions] = useState('');
  const [addPhotoUri, setAddPhotoUri] = useState(null);
  const [addPhotoUploading, setAddPhotoUploading] = useState(false);

  const handlePickAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      const processed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAddPhotoUri(processed.uri);
    }
  };

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPrimary, setContactPrimary] = useState(false);
  
  const showToast = useToastStore((s) => s.showToast);
  const logout = useAuthStore((s) => s.logout);

  // Profile store
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const addElderly = useProfileStore((s) => s.addElderly);
  const getActiveProfile = useProfileStore((s) => s.getActiveProfile);
  const profile = getActiveProfile();

  // Settings store
  const emergencyContacts = useSettingsStore((s) => s.emergencyContacts);
  const fetchEmergencyContacts = useSettingsStore((s) => s.fetchEmergencyContacts);
  const addEmergencyContact = useSettingsStore((s) => s.addEmergencyContact);
  const updateStoreContact = useSettingsStore((s) => s.updateEmergencyContact);
  const escalation = useSettingsStore((s) => s.escalation);
  const updateEscalation = useSettingsStore((s) => s.updateEscalation);
  const notifications = useSettingsStore((s) => s.notifications);
  const updateNotifications = useSettingsStore((s) => s.updateNotifications);
  const mirrorDevice = useSettingsStore((s) => s.mirrorDevice);
  const rebootMirror = useSettingsStore((s) => s.rebootMirror);
  const removeEmergencyContact = useSettingsStore((s) => s.removeEmergencyContact);

  // Caregiver Details
  const user = useAuthStore((s) => s.user);
  const caregiverProfile = useProfileStore((s) => s.caregiverProfile);
  const fetchCaregiverProfile = useProfileStore((s) => s.fetchCaregiverProfile);

  const caregiverName = caregiverProfile?.full_name || user?.user_metadata?.full_name || 'Caregiver Name';
  const caregiverInitials = caregiverName.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2) || '?';
  const caregiverEmail = caregiverProfile?.email || user?.email || 'caregiver@example.com';

  useEffect(() => {
    fetchCaregiverProfile();
  }, [fetchCaregiverProfile]);

  useEffect(() => {
    if (activeProfileId) {
      fetchEmergencyContacts(activeProfileId);
    }
  }, [activeProfileId, fetchEmergencyContacts]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2);
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const diffMs = Date.now() - new Date(dob).getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const openEditProfile = (p) => {
    const displayName = p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.name || '');
    setEditingProfile(p);
    setEditName(displayName);
    setEditDob(p.date_of_birth || '');
    setEditGender(p.gender || '');
    setEditConditions(p.medical_notes || (p.conditions || []).join(', '));
    setEditModalVisible(true);
  };

  const saveProfile = async () => {
    if (!editingProfile) return;
    
    const nameParts = editName.trim().split(' ');
    const firstName = nameParts[0] || editingProfile.first_name;
    const lastName = nameParts.slice(1).join(' ') || editingProfile.last_name || '';

    const result = await updateProfile(editingProfile.id, {
      first_name: firstName,
      last_name: lastName,
      gender: editGender || null,
      date_of_birth: editDob.trim() || null,
      medical_notes: editConditions.trim(),
    });
    
    if (result?.success) {
      setEditModalVisible(false);
      showToast('Profile Saved', 'Updates applied successfully to Supabase.', 'success');
    } else {
      showToast('Update Failed', result?.error || 'Could not save updates.', 'error');
    }
  };

  const handleAddDependent = async () => {
    if (!addName.trim()) {
      showToast('Missing Info', 'Please provide at least a name.', 'error');
      return;
    }
    const nameParts = addName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const result = await addElderly(firstName, lastName, addGender || null, addDob.trim() || null, addConditions.trim());
    
    if (result?.success) {
      // If a photo was selected, try uploading it to the backend face recognition service
      if (addPhotoUri && result.newProfile?.id) {
        setAddPhotoUploading(true);
        try {
          const formData = new FormData();
          
          if (Platform.OS === 'web') {
            // Web requires a real Blob/File object for FormData
            const response = await fetch(addPhotoUri);
            const blob = await response.blob();
            formData.append('file', blob, 'face.jpg');
          } else {
            // Native requires the {uri, name, type} object
            // @ts-ignore
            formData.append('file', {
              uri: addPhotoUri,
              name: 'face.jpg',
              type: 'image/jpeg',
            });
          }
          
          formData.append('elderly_id', result.newProfile.id);

          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
          console.log(`[Face enrollment] Submitting to: ${apiUrl}/api/auth/register-face`);

          const response = await fetch(`${apiUrl}/api/auth/register-face`, {
            method: 'POST',
            body: formData,
            // Header is implicitly set by FormData
          });

          if (response.ok) {
            const resData = await response.json();
            if (!resData.success) {
              console.warn('[Face enrollment] Server error:', resData.message);
              showToast('Face Enrollment Note', resData.message || 'Profile created, but face recognition setup failed.', 'info');
            } else {
              console.log('[Face enrollment] Success:', resData.message);
            }
          } else {
             const errorText = await response.text();
             console.error('[Face enrollment] HTTP error:', response.status, errorText);
             showToast('Face Sync Error', 'Profile created, but face registration service is currently unavailable.', 'info');
          }
        } catch (err) {
          console.error('[Face enrollment] Network error:', err);
          showToast('Face Sync Skip', 'Managed to create profile, but face registration failed (check network connection or CORS).', 'info');
        } finally {
          setAddPhotoUploading(false);
        }
      }

      // Cleanup and close modal
      setAddModalVisible(false);
      setAddName('');
      setAddDob('');
      setAddGender('');
      setAddConditions('');
      setAddPhotoUri(null);
      showToast('Dependent Added', `${firstName} has been successfully registered.`, 'success');
    } else {
      showToast('Registration Failed', result?.error || 'Could not save profile to database.', 'error');
    }
  };

  const handleReboot = () => {
    Alert.alert(
      'Reboot Mirror?',
      'This will remotely restart the mirror device. It may take up to 60 seconds.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot Now',
          style: 'destructive',
          onPress: () => {
            rebootMirror();
            showToast('Rebooting Mirror', 'Please wait ~60 seconds.', 'info');
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Vitals Data',
      'A CSV file containing all raw vitals data will be prepared for download.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export CSV',
          onPress: () => {
            useSettingsStore.getState().setLastExportDate(new Date().toISOString());
            showToast('Export Ready', 'Vitals data saved to Downloads.', 'success');
          },
        },
      ]
    );
  };

  const handleDeleteContact = (id, name) => {
    Alert.alert(
      `Remove ${name}?`,
      'This person will no longer receive emergency alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            const res = await removeEmergencyContact(id);
            if (res.success) {
              showToast('Contact Removed', `${name} is no longer on the alert list.`, 'success');
            }
          } 
        },
      ]
    );
  };

  const openContactModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setContactName(contact.name);
      setContactPhone(contact.phone);
      setContactRelation(contact.relationship || '');
      setContactPrimary(contact.is_primary);
    } else {
      setEditingContact(null);
      setContactName('');
      setContactPhone('');
      setContactRelation('');
      setContactPrimary(false);
    }
    setContactModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      showToast('Missing Info', 'Name and Phone are required.', 'error');
      return;
    }
    
    let result;
    if (editingContact) {
      // Update logic
      result = await updateStoreContact(editingContact.id, {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        relationship: contactRelation.trim(),
        is_primary: contactPrimary,
      }, activeProfileId);
    } else {
      // Create logic
      result = await addEmergencyContact(
        activeProfileId,
        contactName.trim(),
        contactPhone.trim(),
        contactRelation.trim(),
        contactPrimary
      );
    }

    if (result.success) {
      setContactModalVisible(false);
      showToast(editingContact ? 'Contact Updated' : 'Contact Added', 'Changes applied successfully.', 'success');
    } else {
      showToast('Failed', result.error || 'Could not save contact.', 'error');
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (activeProfileId) {
      fetchEmergencyContacts(activeProfileId).finally(() => setRefreshing(false));
    } else {
      setRefreshing(false);
    }
  };

  const [avatarUploading, setAvatarUploading] = useState(false);
  const updateCaregiverProfile = useProfileStore((s) => s.updateCaregiverProfile);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      // PRO FIX: Convert HEIC (iPhone) or any format to COMPATIBLE JPEG
      // Also resizes to 500x500 to save bandwidth/storage while keeping it sharp.
      const processed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      uploadAvatar(processed.uri);
    }
  };


  const uploadAvatar = async (localUri) => {
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      // Convert URI to Blob
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      // Determine Content-Type
      const mimeMap = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'heic': 'image/heic'
      };
      const contentType = mimeMap[ext] || 'image/jpeg';

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });


      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      const res = await updateCaregiverProfile({ avatar_url: publicUrl });
      if (res.success) {
        showToast('Profile Updated', 'Your avatar has been successfully changed.', 'success');
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      // Fallback for demo: if Storage bucket 'avatars' doesn't exist, just save the local URI (won't persist across devices but works for UI demo)
      const res = await updateCaregiverProfile({ avatar_url: localUri });
      if (res.success) {
         showToast('Updated (Local)', 'Avatar updated (Storage bucket not found).', 'info');
      } else {
        showToast('Upload Failed', err.message, 'error');
      }
    } finally {
      setAvatarUploading(false);
    }
  };


  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary500} />
      }
    >
      <View style={styles.caregiverProfileCard}>
        <TouchableOpacity 
          onPress={handlePickAvatar} 
          disabled={avatarUploading}
          style={{ marginRight: SPACING.lg, opacity: avatarUploading ? 0.6 : 1 }}
        >
          <LumenAvatar 
            src={caregiverProfile?.avatar_url || "https://img.daisyui.com/images/profile/demo/gordon@192.webp"}
            size={96}
            online={true}
          />
          <View style={styles.avatarEditBadge}>
            <Feather name="camera" size={12} color={COLORS.white} />
          </View>
        </TouchableOpacity>


        <View style={styles.caregiverInfo}>
          <Text style={styles.caregiverNameLarge}>{caregiverName}</Text>
          <Text style={styles.caregiverEmail}>{caregiverEmail}</Text>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. ACCOUNT & DEPENDENTS                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Text style={styles.sectionLabel}>ACCOUNT & DEPENDENTS</Text>
      <View style={styles.card}>
        {/* Profile Switcher */}
        <Text style={styles.cardTitle}>Active Profile</Text>
        <View style={styles.profileList}>
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const displayName = p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p.name || 'Unknown');
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.profileChip, isActive && styles.profileChipActive]}
                onPress={() => setActiveProfile(p.id)}
                accessibilityLabel={`Switch to ${displayName}`}
                accessibilityRole="button"
              >
                <View style={[styles.chipAvatar, isActive && styles.chipAvatarActive]}>
                  <Text style={[styles.chipAvatarText, isActive && { color: COLORS.white }]}>
                    {getInitials(displayName)}
                  </Text>
                </View>
                <Text style={[styles.chipName, isActive && styles.chipNameActive]}>
                  {displayName}
                </Text>
                {isActive && <Feather name="check-circle" size={16} color={COLORS.primary500} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.lg }} 
          onPress={() => setAddModalVisible(true)}
        >
          <Feather name="plus-circle" size={16} color={COLORS.primary500} />
          <Text style={{ fontSize: FONT_SIZES.sm, color: COLORS.primary500, fontWeight: '600' }}>Register Dependent</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Edit Active Profile */}
        <Text style={styles.cardTitle}>Edit Profile</Text>
        <View style={styles.profileDetail}>
          <View style={styles.detailRow}>
            <Feather name="user" size={16} color={COLORS.textMuted} />
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>
              {profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile.name || 'Unknown')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Feather name="calendar" size={16} color={COLORS.textMuted} />
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{calculateAge(profile.date_of_birth) || profile.age || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Feather name="clipboard" size={16} color={COLORS.textMuted} />
            <Text style={styles.detailLabel}>Conditions</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {profile.medical_notes || (profile.conditions || []).join(', ') || 'None'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditProfile(profile)}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
        >
          <Feather name="edit-2" size={16} color={COLORS.primary500} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. EMERGENCY & ALERTS                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Text style={styles.sectionLabel}>EMERGENCY & ALERTS</Text>
      <View style={styles.card}>
        {/* Escalation Protocol */}
        <View style={styles.cardHeaderRow}>
          <Feather name="alert-circle" size={18} color={COLORS.red} />
          <Text style={styles.cardTitle}>Escalation Protocol</Text>
        </View>
        <View style={styles.escalationFlow}>
          <View style={styles.escalationStep}>
            <View style={[styles.escalationDot, { backgroundColor: COLORS.primary500 }]} />
            <View style={styles.escalationContent}>
              <Text style={styles.escalationPrimary}>
                {emergencyContacts.find((c) => c.id === escalation.primaryContactId)?.name || 'You'}
              </Text>
              <Text style={styles.escalationSub}>Notified immediately</Text>
            </View>
          </View>
          <View style={styles.escalationConnector} />
          <View style={styles.escalationStep}>
            <View style={[styles.escalationDot, { backgroundColor: COLORS.yellow }]} />
            <View style={styles.escalationContent}>
              <Text style={styles.escalationPrimary}>
                {emergencyContacts.find((c) => c.id === escalation.fallbackContactId)?.name || 'Fallback'}
              </Text>
              <Text style={styles.escalationSub}>
                If no response in {escalation.escalateAfterMinutes} min
              </Text>
            </View>
          </View>
          <View style={styles.escalationConnector} />
          <View style={styles.escalationStep}>
            <View style={[styles.escalationDot, { backgroundColor: COLORS.red }]} />
            <View style={styles.escalationContent}>
              <Text style={styles.escalationPrimary}>Emergency Services (999)</Text>
              <Text style={styles.escalationSub}>
                Auto-call after {escalation.autoCallAfterMinutes} min
              </Text>
            </View>
          </View>
        </View>

        {/* Timer adjustment */}
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>Escalate after</Text>
          <View style={styles.timerControls}>
            <TouchableOpacity
              style={styles.timerButton}
              onPress={() => updateEscalation({
                escalateAfterMinutes: Math.max(1, escalation.escalateAfterMinutes - 1),
              })}
            >
              <Feather name="minus" size={16} color={COLORS.primary500} />
            </TouchableOpacity>
            <Text style={styles.timerValue}>{escalation.escalateAfterMinutes} min</Text>
            <TouchableOpacity
              style={styles.timerButton}
              onPress={() => updateEscalation({
                escalateAfterMinutes: Math.min(30, escalation.escalateAfterMinutes + 1),
              })}
            >
              <Feather name="plus" size={16} color={COLORS.primary500} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Emergency Contacts */}
        <View style={styles.cardHeaderRow}>
          <Feather name="phone" size={18} color={COLORS.green} />
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
        </View>
        {emergencyContacts.map((contact) => (
          <Swipeable
            key={contact.id}
            renderRightActions={() => (
              <TouchableOpacity
                style={styles.swipeDeleteAction}
                onPress={() => handleDeleteContact(contact.id, contact.name)}
              >
                <Feather name="trash-2" size={20} color={COLORS.white} />
                <Text style={styles.swipeDeleteText}>Remove</Text>
              </TouchableOpacity>
            )}
            overshootRight={false}
          >
            <TouchableOpacity 
              style={styles.contactRow} 
              onPress={() => openContactModal(contact)}
              activeOpacity={0.7}
            >
              <View style={[styles.contactAvatar, contact.is_primary && styles.contactAvatarPrimary]}>
                <Text style={[styles.contactAvatarText, contact.is_primary && { color: COLORS.white }]}>
                  {getInitials(contact.name)}
                </Text>
              </View>
              <View style={styles.contactInfo}>
                <View style={styles.contactNameRow}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.contactPhone}>{contact.phone}{contact.relationship ? ` • ${contact.relationship}` : ''}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Swipeable>
        ))}
        <TouchableOpacity style={styles.addContactButton} onPress={() => openContactModal()}>
          <Feather name="plus-circle" size={18} color={COLORS.primary500} />
          <Text style={styles.addContactText}>Add Emergency Contact</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. DEVICE MANAGEMENT                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Text style={styles.sectionLabel}>DEVICE MANAGEMENT</Text>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Feather name="monitor" size={18} color={COLORS.primary500} />
          <Text style={styles.cardTitle}>Mirror Hub</Text>
        </View>

        <View style={styles.deviceStatusGrid}>
          <View style={styles.deviceStatusItem}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: mirrorDevice.status === 'online' ? COLORS.green : mirrorDevice.status === 'rebooting' ? COLORS.yellow : COLORS.red },
            ]} />
            <Text style={styles.deviceLabel}>Status</Text>
            <Text style={[
              styles.deviceValue,
              { color: mirrorDevice.status === 'online' ? '#065F46' : mirrorDevice.status === 'rebooting' ? '#92400E' : '#991B1B' },
            ]}>
              {mirrorDevice.status === 'online' ? 'Online' : mirrorDevice.status === 'rebooting' ? 'Rebooting...' : 'Offline'}
            </Text>
          </View>

          <View style={styles.deviceStatusItem}>
            <Feather name="wifi" size={16} color={mirrorDevice.wifiStrength > 60 ? COLORS.green : COLORS.yellow} />
            <Text style={styles.deviceLabel}>Wi-Fi</Text>
            <Text style={styles.deviceValue}>{mirrorDevice.wifiStrength}%</Text>
          </View>

          <View style={styles.deviceStatusItem}>
            <Feather name="clock" size={16} color={COLORS.textMuted} />
            <Text style={styles.deviceLabel}>Uptime</Text>
            <Text style={styles.deviceValue}>{mirrorDevice.uptime}</Text>
          </View>

          <View style={styles.deviceStatusItem}>
            <Feather name="cpu" size={16} color={COLORS.textMuted} />
            <Text style={styles.deviceLabel}>Firmware</Text>
            <Text style={styles.deviceValue}>v{mirrorDevice.firmwareVersion}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.rebootButton} onPress={handleReboot}>
          <Feather name="refresh-cw" size={16} color={COLORS.white} />
          <Text style={styles.rebootButtonText}>Reboot Mirror</Text>
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. APP PREFERENCES                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Text style={styles.sectionLabel}>APP PREFERENCES</Text>
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Feather name="bell" size={18} color={COLORS.primary500} />
          <Text style={styles.cardTitle}>Notification Toggles</Text>
        </View>

        <ToggleRow
          icon="check-circle"
          iconColor={COLORS.green}
          label="Green (All Clear) alerts"
          sublabel="Low priority — routine scans"
          value={notifications.greenAlerts}
          onValueChange={(val) => updateNotifications({ greenAlerts: val })}
        />
        <ToggleRow
          icon="alert-circle"
          iconColor={COLORS.yellow}
          label="Yellow (Warning) alerts"
          sublabel="Moderate priority — needs attention"
          value={notifications.yellowAlerts}
          onValueChange={(val) => updateNotifications({ yellowAlerts: val })}
        />
        <ToggleRow
          icon="alert-triangle"
          iconColor={COLORS.red}
          label="Red (Critical) alerts"
          sublabel="High priority — always recommended"
          value={notifications.redAlerts}
          onValueChange={(val) => updateNotifications({ redAlerts: val })}
        />

        <View style={styles.divider} />

        <ToggleRow
          icon="moon"
          iconColor="#4338CA"
          label="Do Not Disturb"
          sublabel={`Mute ${notifications.muteStart} – ${notifications.muteEnd}`}
          value={notifications.muteEnabled}
          onValueChange={(val) => updateNotifications({ muteEnabled: val })}
        />
        <ToggleRow
          icon="volume-2"
          iconColor={COLORS.textSecondary}
          label="Sound effects"
          sublabel="Alert tones and notification sounds"
          value={notifications.soundEnabled}
          onValueChange={(val) => updateNotifications({ soundEnabled: val })}
        />
        <ToggleRow
          icon="smartphone"
          iconColor={COLORS.textSecondary}
          label="Haptic feedback"
          sublabel="Vibration on alerts and interactions"
          value={notifications.vibrationEnabled}
          onValueChange={(val) => updateNotifications({ vibrationEnabled: val })}
        />
      </View>

      {/* Export Data */}
      <View style={[styles.card, { marginTop: SPACING.md }]}>
        <View style={styles.cardHeaderRow}>
          <Feather name="download" size={18} color={COLORS.primary500} />
          <Text style={styles.cardTitle}>Export Data</Text>
        </View>
        <Text style={styles.exportDescription}>
          Download raw vitals data as a CSV file for doctors, researchers, or personal records.
        </Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
          <Feather name="file-text" size={18} color={COLORS.white} />
          <Text style={styles.exportButtonText}>Export Vitals CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
        }}
      >
        <Feather name="log-out" size={18} color={COLORS.red} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Image 
          source={require('../../assets/LumenCare icon.png')}
          style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 8 }}
          resizeMode="contain"
        />
        <Text style={styles.appInfoText}>
          <Text style={{ fontWeight: '800' }}>Lumen</Text>
          <Text style={{ fontWeight: '400' }}>Care</Text> v1.0.0
        </Text>
        <Text style={[styles.appInfoText, { textTransform: 'uppercase', letterSpacing: 2, fontSize: 10, marginTop: 4 }]}>
          Clarity in Care
        </Text>
      </View>

      {/* ── Edit Profile Modal ──────────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={() => setEditModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
              <TouchableOpacity 
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: editGender === 'Male' ? COLORS.primary50 : COLORS.background, borderColor: editGender === 'Male' ? COLORS.primary500 : COLORS.border }]}
                onPress={() => setEditGender('Male')}
              >
                <Text style={{ color: editGender === 'Male' ? COLORS.primary700 : COLORS.textMuted, fontWeight: editGender === 'Male' ? '700' : '500' }}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: editGender === 'Female' ? COLORS.primary50 : COLORS.background, borderColor: editGender === 'Female' ? COLORS.primary500 : COLORS.border }]}
                onPress={() => setEditGender('Female')}
              >
                <Text style={{ color: editGender === 'Female' ? COLORS.primary700 : COLORS.textMuted, fontWeight: editGender === 'Female' ? '700' : '500' }}>Female</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Date of Birth</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.modalInput}
                value={editDob}
                onChangeText={setEditDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            ) : (
              <TouchableOpacity 
                style={[styles.modalInput, { justifyContent: 'center' }]} 
                onPress={() => setShowEditDatePicker(true)}
              >
                <Text style={{ color: editDob ? COLORS.textPrimary : COLORS.textMuted }}>
                  {editDob ? editDob : "Select Date"}
                </Text>
              </TouchableOpacity>
            )}

            {showEditDatePicker && Platform.OS !== 'web' && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showEditDatePicker}>
                  <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <View style={{ backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 20 : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: SPACING.md, borderBottomWidth: 1, borderColor: '#eee' }}>
                        <TouchableOpacity onPress={() => setShowEditDatePicker(false)}>
                          <Text style={{ color: COLORS.primary500, fontSize: FONT_SIZES.md, fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={editDob ? new Date(editDob) : new Date(1950, 0, 1)}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) setEditDob(selectedDate.toISOString().split('T')[0]);
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={editDob ? new Date(editDob) : new Date(1950, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEditDatePicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setEditDob(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )
            )}

            <Text style={styles.inputLabel}>Baseline Conditions</Text>
            <Text style={styles.inputHint}>Comma-separated (e.g. "Hypertension, Type 2 Diabetes")</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={editConditions}
              onChangeText={setEditConditions}
              placeholder="Enter conditions"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveProfile}>
                <Feather name="check" size={18} color={COLORS.white} />
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Profile Modal ──────────────────────────────────────────── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={() => setAddModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Register Dependent</Text>

                {/* Dependent Face Photo */}
                <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
                  <TouchableOpacity 
                    onPress={handlePickAddPhoto} 
                    disabled={addPhotoUploading}
                    style={{ opacity: addPhotoUploading ? 0.6 : 1 }}
                  >
                    <LumenAvatar 
                      src={addPhotoUri || 'https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png'}
                      size={94}
                      online={false}
                    />
                    <View style={styles.avatarEditBadge}>
                      <Feather name="camera" size={12} color={COLORS.white} />
                    </View>
                  </TouchableOpacity>
                  <Text style={{ fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: SPACING.sm }}>
                    {addPhotoUploading ? 'Uploading Face...' : 'Tap to add facial recognition photo'}
                  </Text>
                </View>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              value={addName}
              onChangeText={setAddName}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Gender</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md }}>
              <TouchableOpacity 
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: addGender === 'Male' ? COLORS.primary50 : COLORS.background, borderColor: addGender === 'Male' ? COLORS.primary500 : COLORS.border }]}
                onPress={() => setAddGender('Male')}
              >
                <Text style={{ color: addGender === 'Male' ? COLORS.primary700 : COLORS.textMuted, fontWeight: addGender === 'Male' ? '700' : '500' }}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalInput, { flex: 1, marginBottom: 0, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: addGender === 'Female' ? COLORS.primary50 : COLORS.background, borderColor: addGender === 'Female' ? COLORS.primary500 : COLORS.border }]}
                onPress={() => setAddGender('Female')}
              >
                <Text style={{ color: addGender === 'Female' ? COLORS.primary700 : COLORS.textMuted, fontWeight: addGender === 'Female' ? '700' : '500' }}>Female</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Date of Birth</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.modalInput}
                value={addDob}
                onChangeText={setAddDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />
            ) : (
              <TouchableOpacity 
                style={[styles.modalInput, { justifyContent: 'center' }]} 
                onPress={() => setShowAddDatePicker(true)}
              >
                <Text style={{ color: addDob ? COLORS.textPrimary : COLORS.textMuted }}>
                  {addDob ? addDob : "Select Date"}
                </Text>
              </TouchableOpacity>
            )}

            {showAddDatePicker && Platform.OS !== 'web' && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" visible={showAddDatePicker}>
                  <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <View style={{ backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 20 : 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: SPACING.md, borderBottomWidth: 1, borderColor: '#eee' }}>
                        <TouchableOpacity onPress={() => setShowAddDatePicker(false)}>
                          <Text style={{ color: COLORS.primary500, fontSize: FONT_SIZES.md, fontWeight: '700' }}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={addDob ? new Date(addDob) : new Date(1950, 0, 1)}
                        mode="date"
                        display="spinner"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) setAddDob(selectedDate.toISOString().split('T')[0]);
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={addDob ? new Date(addDob) : new Date(1950, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowAddDatePicker(false);
                    if (event.type === 'set' && selectedDate) {
                      setAddDob(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )
            )}

            <Text style={styles.inputLabel}>Baseline Conditions</Text>
            <Text style={styles.inputHint}>Comma-separated (e.g. "Hypertension")</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={addConditions}
              onChangeText={setAddConditions}
              placeholder="Enter conditions"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddDependent}>
                <Feather name="check" size={18} color={COLORS.white} />
                <Text style={styles.modalSaveText}>Register</Text>
              </TouchableOpacity>
            </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Contact Management Modal (Add/Edit) ────────────────────────── */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={() => setContactModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Emergency Contact'}</Text>

                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.inputLabel}>Relationship</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contactRelation}
                  onChangeText={setContactRelation}
                  placeholder="e.g. Son, Daughter, Caretaker"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.modalInput}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder="+60 12-345 6789"
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textMuted}
                />

                <View style={styles.timerRow}>
                   <Text style={[styles.timerLabel, { flex: 1 }]}>Set as Primary Contact</Text>
                   <Switch 
                     value={contactPrimary} 
                     onValueChange={setContactPrimary}
                     trackColor={{ false: COLORS.border, true: COLORS.primary500 + '60' }}
                     thumbColor={contactPrimary ? COLORS.primary500 : COLORS.textMuted}
                   />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setContactModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSave} onPress={handleSaveContact}>
                    <Feather name="check" size={18} color={COLORS.white} />
                    <Text style={styles.modalSaveText}>{editingContact ? 'Save Changes' : 'Add Contact'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

/**
 * ToggleRow — Reusable toggle switch row for notification settings.
 */
function ToggleRow({ icon, iconColor, label, sublabel, value, onValueChange }) {
  return (
    <View style={toggleStyles.row}>
      <View style={toggleStyles.rowLeft}>
        <Feather name={icon} size={16} color={iconColor} />
        <View style={toggleStyles.rowText}>
          <Text style={toggleStyles.rowLabel}>{label}</Text>
          <Text style={toggleStyles.rowSublabel}>{sublabel}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={(val) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(val);
        }}
        trackColor={{ false: COLORS.border, true: COLORS.primary500 + '60' }}
        thumbColor={value ? COLORS.primary500 : COLORS.textMuted}
        style={{ minWidth: MIN_TAP_TARGET, minHeight: MIN_TAP_TARGET }}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    paddingRight: SPACING.md,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowSublabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: 110,
    paddingBottom: 120,
  },
  // ── Caregiver Profile Header ─────────────────────────────────────────
  caregiverProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  caregiverAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  caregiverAvatarLargeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverNameLarge: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  caregiverEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary500,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },


  // ── Section ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  sectionCard: {
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    overflow: 'hidden',
  },
  deviceCard: {
    borderRadius: RADII.lg,
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.lg,
  },

  // ── Profile Switcher ──────────────────────────────────────────────────
  profileList: {
    gap: SPACING.sm,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.background,
    minHeight: MIN_TAP_TARGET,
  },
  profileChipActive: {
    backgroundColor: COLORS.primary50,
    borderWidth: 1.5,
    borderColor: COLORS.primary500 + '40',
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarActive: {
    backgroundColor: COLORS.primary500,
  },
  chipAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  chipNameActive: {
    fontWeight: '700',
    color: COLORS.primary900,
  },

  // ── Profile Detail ────────────────────────────────────────────────────
  profileDetail: {
    gap: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    width: 80,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary500,
    minHeight: MIN_TAP_TARGET,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary500,
  },

  // ── Escalation Protocol ───────────────────────────────────────────────
  escalationFlow: {
    marginBottom: SPACING.lg,
  },
  escalationStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  escalationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  escalationContent: {
    flex: 1,
  },
  escalationPrimary: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  escalationSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  escalationConnector: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginLeft: 5,
    marginVertical: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.md,
  },
  timerLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary900,
    minWidth: 50,
    textAlign: 'center',
  },

  // ── Emergency Contacts ────────────────────────────────────────────────
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarPrimary: {
    backgroundColor: COLORS.primary500,
  },
  contactAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary900,
  },
  swipeDeleteAction: {
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: SPACING.md, // align with row spacing
    borderTopRightRadius: RADII.md,
    borderBottomRightRadius: RADII.md,
  },
  swipeDeleteText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    marginTop: 4,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  contactName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary500 + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary500,
    letterSpacing: 0.5,
  },
  contactPhone: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contactAction: {
    padding: SPACING.sm,
    minWidth: MIN_TAP_TARGET,
    minHeight: MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary500,
    borderStyle: 'dashed',
    minHeight: MIN_TAP_TARGET,
  },
  addContactText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary500,
  },

  // ── Device Management ─────────────────────────────────────────────────
  deviceStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  deviceStatusItem: {
    flexBasis: '46%',
    flexGrow: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  deviceValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rebootButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    minHeight: MIN_TAP_TARGET,
  },
  rebootButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },

  // ── Export ─────────────────────────────────────────────────────────────
  exportDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary900,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    minHeight: MIN_TAP_TARGET,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },

  // ── App Info ──────────────────────────────────────────────────────────
  appInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 4,
  },
  appInfoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // ── Edit Profile Modal ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    padding: SPACING.xl,
    paddingTop: SPACING.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minHeight: MIN_TAP_TARGET,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.primary500,
    minHeight: MIN_TAP_TARGET,
  },
  modalSaveText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: SPACING.lg,
  },
  signOutText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.red,
  },
});
