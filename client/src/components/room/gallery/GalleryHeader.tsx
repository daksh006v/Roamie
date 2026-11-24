import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../../constants/theme';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

interface GalleryHeaderProps {
  roomName: string;
  coverImage?: string;
  photoCount: number;
  memberCount: number;
  onRefresh?: () => void;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  roomName,
  coverImage,
  photoCount,
  memberCount,
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
          <Text style={styles.headerThumbnailEmoji}>📸</Text>
        </View>
      )}

      {/* Room Title & Subtitle */}
      <View style={styles.headerTitleBlock}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {roomName}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'} · {memberCount} {memberCount === 1 ? 'traveler' : 'travelers'}
        </Text>
      </View>

      {/* Right Refresh / Action button */}
      {onRefresh && (
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="rotate-cw" size={19} color={Colors.rooms.darkText} />
        </TouchableOpacity>
      )}
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
    marginRight: 10,
    padding: 2,
  },
  headerThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginTop: 1,
    fontWeight: '500',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0E6D8',
    marginLeft: 8,
  },
});
