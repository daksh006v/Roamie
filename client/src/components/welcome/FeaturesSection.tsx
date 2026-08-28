import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

const FEATURE_ITEMS = [
  {
    id: 'chat',
    iconType: 'Ionicons',
    iconName: 'chatbubbles',
    iconColor: '#FFF',
    bgColor: Colors.features.chat,
    title: 'Chat',
    subtitle: 'Stay in sync\nwith your crew',
  },
  {
    id: 'photos',
    iconType: 'Ionicons',
    iconName: 'images',
    iconColor: '#FFF',
    bgColor: Colors.features.photos,
    title: 'Photos',
    subtitle: 'Share memories\nin real time',
  },
  {
    id: 'itinerary',
    iconType: 'Ionicons',
    iconName: 'calendar',
    iconColor: '#FFF',
    bgColor: Colors.features.itinerary,
    title: 'Itinerary',
    subtitle: 'Organize plans\nand activities',
  },
  {
    id: 'expenses',
    iconType: 'Ionicons',
    iconName: 'wallet',
    iconColor: '#FFF',
    bgColor: Colors.features.expenses,
    title: 'Expenses',
    subtitle: 'Split costs\nand track easily',
  },
  {
    id: 'places',
    iconType: 'Ionicons',
    iconName: 'location',
    iconColor: '#FFF',
    bgColor: Colors.features.places,
    title: 'Saved Places',
    subtitle: 'Keep your favorite\nspots handy',
  },
];

export const FeaturesSection = () => {
  return (
    <View style={styles.container}>
      {/* Curved wave transition */}
      <View style={styles.waveHeader}>
        <Text style={styles.heading}>
          Everything you need,{' '}
          <Text style={styles.headingHighlight}>in one place</Text>
        </Text>
        <View style={styles.handDrawnUnderline} />
      </View>

      {/* Feature Icons Row */}
      <View style={styles.featuresRow}>
        {FEATURE_ITEMS.map((item) => (
          <View key={item.id} style={styles.featureColumn}>
            <View style={[styles.iconPill, { backgroundColor: item.bgColor }]}>
              <Ionicons
                name={item.iconName as any}
                size={20}
                color={item.iconColor}
              />
            </View>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
          </View>
        ))}
      </View>

      {/* Bottom Campfire Scenery Art */}
      <View style={styles.campfireWrapper}>
        <Image
          source={require('../../../assets/images/campfire_scenery.jpg')}
          style={styles.campfireImage}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy.darkest,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 24,
    marginTop: -20,
    zIndex: 1,
    overflow: 'hidden',
  },
  waveHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headingHighlight: {
    color: Colors.orange.light,
  },
  handDrawnUnderline: {
    width: 95,
    height: 3,
    backgroundColor: Colors.orange.light,
    borderRadius: 2,
    marginTop: 4,
    alignSelf: 'flex-end',
    marginRight: 24,
    opacity: 0.85,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  featureColumn: {
    alignItems: 'center',
    width: (width - 24) / 5,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
    textAlign: 'center',
  },
  featureSubtitle: {
    fontSize: 9.5,
    lineHeight: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  campfireWrapper: {
    width: '100%',
    height: 140,
    marginTop: 8,
  },
  campfireImage: {
    width: '100%',
    height: '100%',
  },
});
