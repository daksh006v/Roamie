import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { HeroSection } from '../components/welcome/HeroSection';
import { WelcomeCard } from '../components/welcome/WelcomeCard';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';

export default function WelcomeScreen() {
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user } = useAuth();

  const handleOpenLogin = () => {
    setAuthMode('login');
    setAuthModalVisible(true);
  };

  const handleOpenRegister = () => {
    setAuthMode('register');
    setAuthModalVisible(true);
  };

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
          console.log('Authenticated successfully!');
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

