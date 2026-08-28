import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface ActionButtonsProps {
  onLoginPress: () => void;
  onRegisterPress: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onLoginPress,
  onRegisterPress,
}) => {
  return (
    <View style={styles.cardContainer}>
      {/* 1. Log In Button (Orange Gradient) */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onLoginPress}
        style={styles.buttonWrapper}
      >
        <LinearGradient
          colors={[Colors.orange.gradientStart, Colors.orange.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginGradient}
        >
          <View style={styles.iconContainerWhite}>
            <Feather name="mail" size={24} color="#FFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.loginTitle}>Log in</Text>
            <Text style={styles.loginSubtitle}>
              Welcome back! Let's continue your journey.
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* 2. Create an account Button (Outlined Card) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRegisterPress}
        style={styles.registerButton}
      >
        <View style={styles.iconContainerOrange}>
          <Feather name="user" size={24} color={Colors.orange.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.registerTitle}>Create an account</Text>
          <Text style={styles.registerSubtitle}>
            Start planning amazing trips with your crew.
          </Text>
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FAF7F2',
    marginHorizontal: 16,
    borderRadius: 28,
    padding: 16,
    paddingBottom: 8,
    marginTop: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#EFE6D8',
    ...Shadows.card,
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
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.orange.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  iconContainerWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconContainerOrange: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  loginTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  loginSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  registerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.navy.dark,
    letterSpacing: -0.2,
  },
  registerSubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2D5C3',
    width: 80,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: Colors.text.muted,
    fontWeight: '500',
  },
});
