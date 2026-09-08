import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Shadows } from '../../constants/theme';

interface WelcomeCardProps {
  onLoginPress: () => void;
  onRegisterPress: () => void;
}

export const WelcomeCard: React.FC<WelcomeCardProps> = ({
  onLoginPress,
  onRegisterPress,
}) => {
  return (
    <View style={styles.cardContainer}>
      {/* Log In Button */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onLoginPress}
        style={styles.buttonWrapper}
      >
        <LinearGradient
          colors={['#EA580C', '#D9480F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginGradient}
        >
          <View style={styles.iconContainerWhite}>
            <Feather name="mail" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.loginTitle}>Log in</Text>
            <Text style={styles.loginSubtitle}>
              Welcome back! Let's continue your journey.
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Account Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRegisterPress}
        style={styles.registerButton}
      >
        <View style={styles.iconContainerOrange}>
          <Feather name="user" size={24} color="#EA580C" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.registerTitle}>Create an account</Text>
          <Text style={styles.registerSubtitle}>
            Start planning amazing trips with your crew.
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 28,
    backgroundColor: 'rgba(250, 245, 237, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(235, 222, 206, 0.95)',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#1E140A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  buttonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadows.button,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    paddingVertical: 15,
    paddingHorizontal: 18,
    shadowColor: '#1E140A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainerWhite: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconContainerOrange: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  loginTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  loginSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
    fontWeight: '400',
  },
  registerTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#0C1B33',
    letterSpacing: -0.2,
  },
  registerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '400',
  },
});
