import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  visible: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register } = useAuth();

  // Reset mode when opened
  React.useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
  }, [initialMode, visible]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email.trim(), password);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.message || 'Login failed');
        }
      } else {
        const res = await register(name.trim(), email.trim(), password, phone.trim());
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.message || 'Registration failed');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.modalContent}>
              {/* Header Bar */}
              <View style={styles.dragHandle} />
              
              <View style={styles.headerRow}>
                <Text style={styles.modalTitle}>
                  {mode === 'login' ? 'Welcome Back 👋' : 'Join Roamie 🗺️'}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Mode Switch Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'login' && styles.activeTab]}
                  onPress={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === 'login' && styles.activeTabText,
                    ]}
                  >
                    Log in
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tab, mode === 'register' && styles.activeTab]}
                  onPress={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mode === 'register' && styles.activeTabText,
                    ]}
                  >
                    Create account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error Message Banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Full Name Input (Register mode) */}
                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                      <Feather
                        name="user"
                        size={20}
                        color={Colors.text.muted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Daksh Sharma"
                        placeholderTextColor={Colors.text.placeholder}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="mail"
                      size={20}
                      color={Colors.text.muted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="traveler@example.com"
                      placeholderTextColor={Colors.text.placeholder}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Phone Input (Register mode) */}
                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone (for SMS trip invites)</Text>
                    <View style={styles.inputWrapper}>
                      <Feather
                        name="phone"
                        size={20}
                        color={Colors.text.muted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="+91 9876543210"
                        placeholderTextColor={Colors.text.placeholder}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                )}

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="lock"
                      size={20}
                      color={Colors.text.muted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="At least 6 characters"
                      placeholderTextColor={Colors.text.placeholder}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color={Colors.text.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Action Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={handleSubmit}
                  disabled={loading}
                  style={styles.submitWrapper}
                >
                  <LinearGradient
                    colors={[Colors.orange.gradientStart, Colors.orange.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.submitText}>
                        {mode === 'login' ? 'Log in' : 'Create Account'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Bottom Switch Note */}
                <View style={styles.switchRow}>
                  <Text style={styles.switchPrompt}>
                    {mode === 'login'
                      ? "Don't have an account? "
                      : 'Already have an account? '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setErrorMessage(null);
                    }}
                  >
                    <Text style={styles.switchAction}>
                      {mode === 'login' ? 'Sign up' : 'Log in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 27, 51, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
    ...Shadows.card,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2D5C3',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy.dark,
    letterSpacing: -0.4,
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5ECE1',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  activeTab: {
    backgroundColor: '#FFF',
    ...Shadows.card,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  activeTabText: {
    color: Colors.navy.dark,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy.dark,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E8D9C8',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  submitWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 16,
    ...Shadows.button,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  switchPrompt: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  switchAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.orange.primary,
  },
});
