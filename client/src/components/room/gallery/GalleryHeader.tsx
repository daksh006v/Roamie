import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 48 : 36);

  return (
    <View style={[styles.topHeader, { paddingTop: topInset }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="chevron-left" size={24} color={Colors.rooms.darkText} />
      </TouchableOpacity>

      {/* Room Thumbnail */}
      {coverImage ? (
        <ExpoImage
          source={{ uri: getOptimizedImageUrl(coverImage, { width: 100, height: 100, crop: 'fill' }) }}
          style={styles.headerThumbnail}
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={[styles.headerThumbnail, styles.headerThumbnailFallback]}>
          <Feather name="camera" size={18} color="#243C32" />
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

      {/* Right Refresh button */}
      {onRefresh && (
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <Feather name="rotate-cw" size={16} color={Colors.rooms.darkText} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE5D8',
    zIndex: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerThumbnail: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
  },
  headerThumbnailFallback: {
    backgroundColor: '#EAE1D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerThumbnailEmoji: {
    fontSize: 16,
  },
  headerTitleBlock: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: Colors.rooms.mutedText,
    marginTop: 1,
    fontWeight: '500',
  },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE5D7',
    borderWidth: 1,
    borderColor: '#DFD2C2',
    flexShrink: 0,
  },
});
