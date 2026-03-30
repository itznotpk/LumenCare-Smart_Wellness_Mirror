import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { COLORS, RADII, SPACING, FONT_SIZES, MIN_TAP_TARGET } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const showToast = useToastStore((s) => s.showToast);
  const registerAuth = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Missing Info', 'Please fill out all fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Wait', 'Passwords do not match.', 'error');
      return;
    }

    if (!isTermsAccepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Terms Required', 'Please accept the Terms of Service.', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    const result = await registerAuth(email, password, name);

    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Account Created', 'Please login with your new credentials.', 'success');
      navigation.goBack();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Registration Error', result.error || 'Server error occurred.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* Daylight Glowing Orbs */}
      <View style={[styles.orb, styles.orbBlueLight]} />
      <View style={[styles.orb, styles.orbEmerald]} />
      <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#06b6d4" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join <Text style={{ fontWeight: '800' }}>Lumen</Text>
              <Text style={{ fontWeight: '400' }}>Care</Text> Today
            </Text>
          </View>

          <View style={styles.cardContainer}>
            <BlurView intensity={80} tint="light" style={styles.card}>

              {/* Full Name Input */}
              <View style={[styles.inputContainer, isNameFocused && styles.inputContainerFocused]}>
                <Feather name="user" size={18} color={isNameFocused ? '#06b6d4' : '#64748b'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                  editable={!isLoading}
                />
              </View>

              {/* Email Input */}
              <View style={[styles.inputContainer, isEmailFocused && styles.inputContainerFocused]}>
                <Feather name="mail" size={18} color={isEmailFocused ? '#06b6d4' : '#64748b'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  editable={!isLoading}
                />
              </View>

              {/* Password Input */}
              <View style={[styles.inputContainer, isPasswordFocused && styles.inputContainerFocused]}>
                <Feather name="lock" size={18} color={isPasswordFocused ? '#06b6d4' : '#64748b'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  activeOpacity={0.7}
                >
                  <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, isConfirmPasswordFocused && styles.inputContainerFocused]}>
                <Feather name="lock" size={18} color={isConfirmPasswordFocused ? '#06b6d4' : '#64748b'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!isConfirmPasswordVisible}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  activeOpacity={0.7}
                >
                  <Feather name={isConfirmPasswordVisible ? 'eye' : 'eye-off'} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsTermsAccepted(!isTermsAccepted);
                }}
                activeOpacity={0.7}
              >
                <Feather
                  name={isTermsAccepted ? 'check-square' : 'square'}
                  size={20}
                  color={isTermsAccepted ? '#06b6d4' : '#64748b'}
                />
                <Text style={styles.checkboxText}>
                  I agree to the Terms of Service & Privacy Policy
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <View style={styles.buttonShadowWrapper}>
                <AnimatedPressable
                  style={[styles.registerButtonWrapper, isLoading && styles.registerButtonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#06b6d4', '#3b82f6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.registerGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.registerButtonText}>Register</Text>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </BlurView>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  orb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
  },
  orbBlueLight: {
    backgroundColor: 'rgba(147, 197, 253, 0.4)', // blue-300/40
    top: -50,
    left: -100,
  },
  orbEmerald: {
    backgroundColor: 'rgba(110, 231, 183, 0.3)', // emerald-300/30
    bottom: -50,
    right: -100,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingTop: SPACING.xxl * 2,
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#e2e8f0', // shadow-slate-200
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: '#1e3a8a', // blue-900
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: '#3b82f6', // blue-500
    marginTop: 4,
    fontWeight: '700',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#cbd5e1', // prominent diffused shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  card: {
    padding: SPACING.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.70)', // frosted white 70%
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.5)', // bg-slate-50/50
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: '#e2e8f0', // subtle light border
    paddingHorizontal: SPACING.md,
    minHeight: 56, // Increased tap target slightly
    marginBottom: SPACING.lg,
  },
  inputContainerFocused: {
    borderColor: '#06b6d4',
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING.md,
    height: '100%',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0f172a', // text-slate-900
    fontSize: FONT_SIZES.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingRight: SPACING.md,
  },
  checkboxText: {
    marginLeft: SPACING.sm,
    color: '#64748b', // slate-500
    fontSize: 13,
    fontWeight: '500',
  },
  buttonShadowWrapper: {
    marginTop: SPACING.md,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonWrapper: {
    borderRadius: 9999, // rounded-full
    overflow: 'hidden',
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: SPACING.xl,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: '#64748b', // slate-500
    fontSize: FONT_SIZES.sm,
  },
  linkButton: {
    marginLeft: 6,
    padding: 4,
  },
  linkText: {
    color: '#3b82f6', // blue-500
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },

});
