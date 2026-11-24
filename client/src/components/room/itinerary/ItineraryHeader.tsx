import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../../constants/theme';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

interface ItineraryHeaderProps {
  roomName: string;
  destination?: string;
  coverImage?: string;
  totalActivities: number;
  totalDays: number;
  isLocked: boolean;
  placesCount: number;
  onOpenPlaces: () => void;
  onRefresh?: () => void;
}

export const ItineraryHeader: React.FC<ItineraryHeaderProps> = ({
  roomName,
  destination,
  coverImage,
  totalActivities,
  totalDays,
  isLocked,
  placesCount,
  onOpenPlaces,
  onRefresh,
}) => {
  const router = useRouter();

  return (
    <View style={styles.topHeader}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="chevron-left" size={26} color={Colors.rooms.darkText} />
      </TouchableOpacity>

      {/* Room Thumbnail */}
      {coverImage ? (
        <ExpoImage
          source={{ uri: getOptimizedImageUrl(coverImage, { width: 120, height: 120, crop: 'fill' }) }}
          style={styles.headerThumbnail}
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={[styles.headerThumbnail, styles.headerThumbnailFallback]}>
          <Text style={styles.headerThumbnailEmoji}>🗓️</Text>
        </View>
      )}

      {/* Room Title & Subtitle */}
      <View style={styles.headerTitleBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomName}
          </Text>
          {isLocked && (
            <View style={styles.lockBadge}>
              <Feather name="lock" size={10} color="#C96A25" />
              <Text style={styles.lockBadgeText}>Locked</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {destination ? (
            <View style={styles.destPill}>
              <Ionicons name="location" size={10} color={Colors.rooms.forestGreen} />
              <Text style={styles.destText} numberOfLines={1}>
                {destination}
              </Text>
            </View>
          ) : null}
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} · {totalDays} {totalDays === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      {/* Right Controls: Saved Places Shortcut & Refresh */}
      <View style={styles.rightControls}>
        <TouchableOpacity
          style={styles.placesBtn}
          onPress={onOpenPlaces}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="map-marker-multiple" size={16} color={Colors.rooms.forestGreen} />
          <Text style={styles.placesBtnText}>{placesCount}</Text>
        </TouchableOpacity>

        {onRefresh && (
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="rotate-cw" size={16} color={Colors.rooms.darkText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#EADBCB',
  },
  backButton: {
    marginRight: 8,
    padding: 2,
  },
  headerThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 10,
  },
  headerThumbnailFallback: {
    backgroundColor: '#EAE1D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerThumbnailEmoji: {
    fontSize: 18,
  },
  headerTitleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDEBDD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F5CCA0',
  },
  lockBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#C96A25',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  destPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EAE2D5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    maxWidth: 100,
  },
  destText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  placesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFE5D7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2D5C3',
  },
  placesBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE5D7',
    borderWidth: 1,
    borderColor: '#E2D5C3',
  },
});
