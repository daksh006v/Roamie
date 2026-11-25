import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Platform,
  RefreshControlProps,
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
  ListHeaderComponent?: React.ReactElement | null;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

type GridRow =
  | { type: 'header'; key: string; dateLabel: string; count: number }
  | { type: 'row'; key: string; items: { photo: MediaItem; globalIdx: number }[] };

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

const GalleryPhotoTile = React.memo<{
  photo: MediaItem;
  globalIdx: number;
  onPress: (photo: MediaItem, index: number) => void;
}>(({ photo, globalIdx, onPress }) => {
  const imgUrl = photo.thumbnailUrl || photo.storageUrl;
  const optimizedUrl = getOptimizedImageUrl(imgUrl, {
    width: 350,
    height: 350,
    crop: 'fill',
  });
  const uploaderAvatar = photo.uploadedBy?.avatar
    ? getOptimizedImageUrl(photo.uploadedBy.avatar, { width: 80, height: 80, crop: 'fill' })
    : '';

  return (
    <TouchableOpacity
      style={styles.photoTile}
      onPress={() => onPress(photo, globalIdx)}
      activeOpacity={0.85}
    >
      <ExpoImage
        source={{ uri: optimizedUrl }}
        recyclingKey={photo._id}
        style={styles.photoImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority={globalIdx < 9 ? 'high' : 'normal'}
        transition={80}
      />

      {uploaderAvatar ? (
        <ExpoImage
          source={{ uri: uploaderAvatar }}
          recyclingKey={`av_${photo._id}`}
          style={styles.uploaderAvatarBadge}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.uploaderBadge}>
          <Text style={styles.uploaderBadgeText}>
            {getInitials(photo.uploadedBy?.name)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  photos,
  onPhotoPress,
  ListHeaderComponent,
  refreshControl,
}) => {
  // Flatten grouped date sections + 3-column rows for virtualized FlatList rendering
  const gridRows: GridRow[] = useMemo(() => {
    const groups: Record<string, { label: string; items: { photo: MediaItem; globalIdx: number }[] }> = {};

    photos.forEach((photo, globalIdx) => {
      const dateKey = photo.createdAt ? photo.createdAt.split('T')[0] : 'Unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: formatDateLabel(photo.createdAt),
          items: [],
        };
      }
      groups[dateKey].items.push({ photo, globalIdx });
    });

    const rows: GridRow[] = [];
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      rows.push({
        type: 'header',
        key: `hdr_${key}`,
        dateLabel: group.label,
        count: group.items.length,
      });

      for (let i = 0; i < group.items.length; i += NUM_COLUMNS) {
        const chunk = group.items.slice(i, i + NUM_COLUMNS);
        rows.push({
          type: 'row',
          key: `row_${key}_${i}`,
          items: chunk,
        });
      }
    });

    return rows;
  }, [photos]);

  const renderRow = useCallback(
    ({ item }: { item: GridRow }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.dateHeaderRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateHeaderText}>{item.dateLabel}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.datePhotoCount}>
                {item.count} {item.count === 1 ? 'photo' : 'photos'}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.gridRow}>
          {item.items.map(({ photo, globalIdx }) => (
            <GalleryPhotoTile
              key={photo._id}
              photo={photo}
              globalIdx={globalIdx}
              onPress={onPhotoPress}
            />
          ))}
        </View>
      );
    },
    [onPhotoPress]
  );

  return (
    <FlatList
      data={gridRows}
      renderItem={renderRow}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={refreshControl}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 10,
    paddingBottom: 90,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  dateBadge: {
    backgroundColor: '#EFE7DC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E3D7C7',
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    letterSpacing: -0.1,
  },
  countBadge: {
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EDE5D8',
  },
  datePhotoCount: {
    fontSize: 11.5,
    color: Colors.rooms.mutedText,
    fontWeight: '600',
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },
  photoTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAE1D3',
    borderWidth: 1,
    borderColor: '#E5DACB',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  uploaderAvatarBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#FFFDF9',
  },
  uploaderBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(36, 60, 50, 0.88)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFDF9',
  },
  uploaderBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
