import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../../constants/theme';
import { MediaItem, GalleryDateGroup } from './galleryTypes';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 12;
const GAP = 4;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface GalleryGridProps {
  photos: MediaItem[];
  onPhotoPress: (photo: MediaItem, index: number) => void;
}

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getInitials = (name?: string): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  photos,
  onPhotoPress,
}) => {
  // Group photos by day (YYYY-MM-DD)
  const groupedSections: GalleryDateGroup[] = useMemo(() => {
    const groups: Record<string, { label: string; items: MediaItem[] }> = {};

    photos.forEach((photo) => {
      const dateKey = photo.createdAt ? photo.createdAt.split('T')[0] : 'Unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: formatDateLabel(photo.createdAt),
          items: [],
        };
      }
      groups[dateKey].items.push(photo);
    });

    return Object.keys(groups).map((key) => ({
      dateKey: key,
      dateLabel: groups[key].label,
      items: groups[key].items,
    }));
  }, [photos]);

  // Map to get global index for lightbox paging
  const photoIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((p, idx) => map.set(p._id, idx));
    return map;
  }, [photos]);

  return (
    <View style={styles.container}>
      {groupedSections.map((group) => (
        <View key={group.dateKey} style={styles.sectionContainer}>
          {/* Date Header */}
          <View style={styles.dateHeaderRow}>
            <Text style={styles.dateHeaderText}>{group.dateLabel}</Text>
            <Text style={styles.datePhotoCount}>
              {group.items.length} {group.items.length === 1 ? 'photo' : 'photos'}
            </Text>
          </View>

          {/* Photo Tiles Grid */}
          <View style={styles.gridRow}>
            {group.items.map((photo) => {
              const globalIdx = photoIndexMap.get(photo._id) ?? 0;
              const imgUrl = photo.thumbnailUrl || photo.storageUrl;
              const optimizedUrl = getOptimizedImageUrl(imgUrl, {
                width: 300,
                height: 300,
                crop: 'fill',
              });

              return (
                <TouchableOpacity
                  key={photo._id}
                  style={styles.photoTile}
                  onPress={() => onPhotoPress(photo, globalIdx)}
                  activeOpacity={0.85}
                >
                  <ExpoImage
                    source={{ uri: optimizedUrl }}
                    style={styles.photoImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />

                  {/* Uploader Initials Avatar Badge */}
                  <View style={styles.uploaderBadge}>
                    <Text style={styles.uploaderBadgeText}>
                      {getInitials(photo.uploadedBy?.name)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 90,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    letterSpacing: -0.1,
  },
  datePhotoCount: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EAE1D3',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  uploaderBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(36, 60, 50, 0.82)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  uploaderBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
