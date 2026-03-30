import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { COLORS, RADII, SPACING, FONT_SIZES, MIN_TAP_TARGET } from '../../theme';
import AnimatedPressable from '../../components/AnimatedPressable';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const login = useAuthStore((s) => s.login);
  const showToast = useToastStore((s) => s.showToast);

  const handleLogin = async () => {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Wait', 'Please enter your email and password.', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Welcome Back', 'Login successful.', 'success');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Login Failed', result.error, 'error');
    }
    
    setIsLoading(false);
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
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.branding}>
            <Image 
              source={require('../../../assets/LumenCare icon.png')} 
              style={styles.appLogo} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>
              <Text style={styles.titleBold}>Lumen</Text>
              <Text style={styles.titleRegular}>Care</Text>
            </Text>
            <Text style={styles.subtitle}>Clarity in Care</Text>
          </View>

          <View style={styles.cardContainer}>
            <BlurView intensity={80} tint="light" style={styles.card}>
              <Text style={styles.cardTitle}>Sign In</Text>

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

              {/* Forgot Password Link */}
              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={() => {}}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Vibrant Glow Button */}
              <View style={styles.buttonShadowWrapper}>
                <AnimatedPressable 
                  style={[styles.loginButtonWrapper, isLoading && styles.loginButtonDisabled]} 
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#06b6d4', '#3b82f6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </BlurView>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to LumenCare?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkButton}>
              <Text style={styles.linkText}>Create Account</Text>
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
    justifyContent: 'center',
    padding: SPACING.xl,
    alignItems: 'center',
  },
  branding: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  appLogo: {
    width: 80,
    height: 80,
    marginBottom: SPACING.md,
    borderRadius: 20, // optional soft rounding depending on icon shape
  },
  title: {
    flexDirection: 'row',
  },
  titleBold: {
    fontSize: FONT_SIZES.xxl + 4,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  titleRegular: {
    fontSize: FONT_SIZES.xxl + 4,
    fontWeight: '400',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 12,
    color: '#3b82f6', // blue-500
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 6,
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
  cardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: '#1e3a8a', // blue-900
    marginBottom: SPACING.xl,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.sm,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: '#06b6d4', // cyan-500
    fontWeight: '600',
  },
  buttonShadowWrapper: {
    marginTop: SPACING.md,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonWrapper: {
    borderRadius: 9999, // rounded-full
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: SPACING.xl,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxl,
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
