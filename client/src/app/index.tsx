import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Colors } from '../constants/theme';
import { HeroSection } from '../components/welcome/HeroSection';
import { ActionButtons } from '../components/welcome/ActionButtons';
import { FeaturesSection } from '../components/welcome/FeaturesSection';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.parchment.base} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Parchment Map & Hero Section */}
        <HeroSection />

        {/* Action Buttons: Log In & Create Account */}
        <ActionButtons
          onLoginPress={handleOpenLogin}
          onRegisterPress={handleOpenRegister}
        />

        {/* Bottom Dark Navy Features & Campfire Section */}
        <FeaturesSection />
      </ScrollView>

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
  scrollContent: {
    paddingBottom: 0,
  },
});
