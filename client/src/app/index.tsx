import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { HeroSection } from '../components/welcome/HeroSection';
import { WelcomeCard } from '../components/welcome/WelcomeCard';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';

export default function WelcomeScreen() {
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // If user is already authenticated, navigate directly to rooms
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/rooms');
    }
  }, [user, isLoading]);

  const handleOpenLogin = () => {
    setAuthMode('login');
    setAuthModalVisible(true);
  };

  const handleOpenRegister = () => {
    setAuthMode('register');
    setAuthModalVisible(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.orange.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.parchment.base} />
      <View style={styles.container}>
        {/* Top: Parchment Map Background + Logo + Tagline + Continuous Travelers Landscape with Emerged Action Card */}
        <HeroSection>
          <WelcomeCard
            onLoginPress={handleOpenLogin}
            onRegisterPress={handleOpenRegister}
          />
        </HeroSection>
      </View>

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        visible={authModalVisible}
        initialMode={authMode}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => {
          setAuthModalVisible(false);
          router.replace('/rooms');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.parchment.base,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.parchment.base,
  },
});

