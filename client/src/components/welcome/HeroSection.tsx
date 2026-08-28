import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

export const HeroSection = () => {
  return (
    <View style={styles.container}>
      {/* Flight Path with Paper Airplane */}
      <View style={styles.flightPathContainer}>
        <View style={styles.dashedCurve} />
        <View style={styles.airplaneWrapper}>
          <MaterialCommunityIcons
            name="airplane"
            size={24}
            color={Colors.navy.dark}
            style={styles.airplaneIcon}
          />
        </View>
      </View>

      {/* Top Left Polaroid: Camper Van */}
      <View style={[styles.polaroidWrapper, styles.polaroidLeft]}>
        <View style={styles.tape} />
        <View style={styles.polaroidCard}>
          <Image
            source={require('../../../assets/images/van_mountains.jpg')}
            style={styles.polaroidImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Top Right Polaroid: Beach Jeep */}
      <View style={[styles.polaroidWrapper, styles.polaroidTopRight]}>
        <View style={styles.tape} />
        <View style={styles.polaroidCard}>
          <Image
            source={require('../../../assets/images/beach_jeep.jpg')}
            style={styles.polaroidImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Middle Right Polaroid: Sunset Friends */}
      <View style={[styles.polaroidWrapper, styles.polaroidMidRight]}>
        <View style={styles.tape} />
        <View style={styles.polaroidCard}>
          <Image
            source={require('../../../assets/images/sunset_friends.jpg')}
            style={styles.polaroidImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Brand Logo & Header */}
      <View style={styles.brandHeader}>
        {/* Roamie Logo with Pin Dot */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>Roam</Text>
          <View style={styles.dotContainer}>
            <View style={styles.pinDot} />
            <Text style={styles.logoText}>ie</Text>
          </View>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Plan <Text style={styles.taglineHighlight}>together.</Text> Travel better.
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          The all-in-one space to plan trips, chat with your crew, manage plans, track expenses and save places.
        </Text>
      </View>

      {/* Hero Backpackers Photo */}
      <View style={styles.heroImageWrapper}>
        <Image
          source={require('../../../assets/images/hero_travelers.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  flightPathContainer: {
    position: 'absolute',
    top: 24,
    right: 85,
    zIndex: 2,
  },
  dashedCurve: {
    position: 'absolute',
    top: 15,
    right: 18,
    width: 140,
    height: 35,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Colors.navy.dark,
    borderStyle: 'dashed',
    borderRadius: 35,
    opacity: 0.5,
    transform: [{ rotate: '-15deg' }],
  },
  airplaneWrapper: {
    transform: [{ rotate: '-35deg' }],
  },
  airplaneIcon: {
    opacity: 0.85,
  },
  polaroidWrapper: {
    position: 'absolute',
    zIndex: 3,
  },
  polaroidLeft: {
    top: 60,
    left: -14,
    transform: [{ rotate: '-12deg' }],
  },
  polaroidTopRight: {
    top: 35,
    right: -18,
    transform: [{ rotate: '12deg' }],
  },
  polaroidMidRight: {
    top: 175,
    right: -20,
    transform: [{ rotate: '15deg' }],
  },
  tape: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 32,
    height: 14,
    backgroundColor: '#EAD7B8',
    opacity: 0.8,
    zIndex: 10,
    transform: [{ rotate: '3deg' }],
    borderRadius: 2,
  },
  polaroidCard: {
    backgroundColor: '#FFF',
    padding: 5,
    paddingBottom: 14,
    borderRadius: 4,
    ...Shadows.polaroid,
  },
  polaroidImage: {
    width: 82,
    height: 72,
    borderRadius: 2,
  },
  brandHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 16,
    zIndex: 5,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 54,
    fontFamily: Platform.select({ ios: 'Snell Roundhand', default: 'serif' }),
    fontWeight: '800',
    color: Colors.navy.dark,
    letterSpacing: -1,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    position: 'relative',
  },
  pinDot: {
    position: 'absolute',
    top: 8,
    left: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: Colors.orange.primary,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  tagline: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.navy.dark,
    marginTop: 6,
    textAlign: 'center',
  },
  taglineHighlight: {
    color: Colors.orange.primary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: width * 0.76,
  },
  heroImageWrapper: {
    width: width - 36,
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: -16,
    zIndex: 4,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Shadows.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
});
