import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path, Circle } from 'react-native-svg';
import { Shadows } from '../../constants/theme';
import { RoamieLogo } from './RoamieLogo';

const { width, height } = Dimensions.get('window');

interface HeroSectionProps {
  children?: React.ReactNode;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Topo Lines & Soft Pin Watermark in Background */}
      <View style={styles.topoOverlay} pointerEvents="none">
        <Svg width={width} height={260} viewBox={`0 0 ${width} 260`} fill="none">
          {/* Top-left subtle location pin watermark */}
          <Path
            d="M 28 42 C 22 42, 16 48, 16 55 C 16 65, 28 76, 28 76 C 28 76, 40 65, 40 55 C 40 48, 34 42, 28 42 Z"
            fill="#D97706"
            opacity={0.32}
          />
          <Circle cx="28" cy="55" r="4" fill="#F6EDE2" opacity={0.85} />

          {/* Faint contour waves */}
          <Path
            d={`M -30 70 Q ${width * 0.3} 35, ${width * 0.6} 80 T ${width + 30} 55`}
            stroke="#D2BBA0"
            strokeWidth="0.8"
            strokeDasharray="4,8"
            opacity={0.32}
          />
          <Path
            d={`M -20 125 Q ${width * 0.35} 85, ${width * 0.72} 135 T ${width + 40} 110`}
            stroke="#D2BBA0"
            strokeWidth="0.8"
            strokeDasharray="4,9"
            opacity={0.25}
          />
        </Svg>
      </View>

      {/* Side Polaroid Photos — positioned on outer edges so they never overlap text */}
      {/* 1. Left Polaroid: Van in Mountains */}
      <View style={[styles.polaroidWrapper, styles.polaroidTopLeft]}>
        <View style={styles.tape} />
        <View style={styles.polaroidCard}>
          <Image
            source={require('../../../assets/images/van_mountains.jpg')}
            style={styles.polaroidImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* 2. Top-Right Polaroid: Beach & Jeep */}
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

      {/* 3. Mid-Right Polaroid: Sunset Friends */}
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

      {/* Center Brand Header: Logo + Tagline + Subtitle */}
      <View style={styles.brandHeader}>
        {/* Roamie Logo (includes paper plane and orange pin on 'i') */}
        <RoamieLogo width={Math.min(width * 0.48, 195)} />

        {/* Tagline */}
        <Text style={styles.tagline}>
          Plan <Text style={styles.taglineHighlight}>together.</Text> Travel better.
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          The all-in-one space to plan trips,{'\n'}
          chat with your crew, manage plans,{'\n'}
          track expenses and save places.
        </Text>
      </View>

      {/* Continuous Hero Travelers & Canyon Cliff Landscape extending to bottom */}
      <View style={styles.landscapeWrapper}>
        <Image
          source={require('../../../assets/images/hero_travelers_tall.jpg')}
          style={styles.landscapeImage}
          resizeMode="cover"
        />
        {/* Soft top gradient to blend sky seamlessly into parchment */}
        <LinearGradient
          colors={['#F6EDE2', 'rgba(246, 237, 226, 0.75)', 'rgba(246, 237, 226, 0.25)', 'transparent']}
          locations={[0, 0.25, 0.6, 1.0]}
          style={styles.landscapeTopFade}
        />
        {/* Emerged Action Card placed directly over the lower cliff rocks */}
        {children && (
          <View style={styles.cardOverlay}>
            {children}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    backgroundColor: '#F6EDE2',
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
  },
  topoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    zIndex: 1,
  },
  polaroidWrapper: {
    position: 'absolute',
    zIndex: 10,
  },
  polaroidTopLeft: {
    top: 135,
    left: -24,
    transform: [{ rotate: '-11deg' }],
  },
  polaroidTopRight: {
    top: 75,
    right: -24,
    transform: [{ rotate: '10deg' }],
  },
  polaroidMidRight: {
    top: 228,
    right: -22,
    transform: [{ rotate: '13deg' }],
  },
  tape: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    width: 26,
    height: 12,
    backgroundColor: '#E6D2B5',
    opacity: 0.92,
    zIndex: 15,
    transform: [{ rotate: '2deg' }],
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  polaroidCard: {
    backgroundColor: '#FFFFFF',
    padding: 4,
    paddingBottom: 13,
    borderRadius: 4,
    ...Shadows.polaroid,
  },
  polaroidImage: {
    width: 66,
    height: 56,
    borderRadius: 2,
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 44 : (Platform.OS === 'ios' ? 32 : 28),
    paddingHorizontal: 48, // Generous padding so text never touches outer polaroids
    zIndex: 5,
  },
  tagline: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0C1B33',
    marginTop: 14,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  taglineHighlight: {
    color: '#EA580C',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19.5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: width * 0.70,
    fontWeight: '400',
  },
  landscapeWrapper: {
    width: width,
    flex: 1,
    marginTop: -16,
    position: 'relative',
    zIndex: 2,
  },
  landscapeImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    top: 285,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  landscapeTopFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 65,
    zIndex: 3,
  },
});


