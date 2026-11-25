import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../constants/theme';
import { MediaItem, GalleryFilter, GalleryTabProps } from './galleryTypes';
import { GalleryHeader } from './GalleryHeader';
import { GalleryFilterBar } from './GalleryFilterBar';
import { GalleryGrid } from './GalleryGrid';
import { EmptyGalleryState } from './EmptyGalleryState';
import { MediaViewerModal } from './MediaViewerModal';
import { UploadMediaSheet } from './UploadMediaSheet';
import api from '../../../services/api';
import { connectSocket } from '../../../services/socket';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

const roomGalleryCache = new Map<string, MediaItem[]>();

export const GalleryTab: React.FC<GalleryTabProps> = ({ data, onRefresh }) => {
  const { room, membership, members, currentUserId } = data;
  const roomId = room._id;
  const cachedPhotos = roomGalleryCache.get(roomId);

  const [photos, setPhotos] = useState<MediaItem[]>(() => cachedPhotos || []);
  const [loading, setLoading] = useState(() => !cachedPhotos);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state ('all' | 'my' | memberId)
  const [currentFilter, setCurrentFilter] = useState<GalleryFilter>('all');

  // Modals state
  const [uploadSheetVisible, setUploadSheetVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const canUpload =
    isOwner ||
    isAdmin ||
    (room.permissions?.members?.canUploadMedia ?? true) ||
    (room.adminPermissions?.managePhotos ?? true);

  /** Fetch gallery photos from GET /api/rooms/:roomId/media */
  const fetchPhotos = useCallback(async () => {
    if (!roomId) return;
    try {
      setErrorMsg(null);
      const res = await api.get(`/rooms/${roomId}/media`);
      if (res.data?.success && res.data?.data) {
        const list: MediaItem[] = res.data.data.media || [];
        setPhotos(list);
        roomGalleryCache.set(roomId, list);

        // Prefetch first batch of thumbnails for instant grid rendering
        const prefetchUrls = list
          .slice(0, 12)
          .map((p) =>
            getOptimizedImageUrl(p.thumbnailUrl || p.storageUrl, {
              width: 350,
              height: 350,
              crop: 'fill',
            })
          )
          .filter(Boolean);
        if (prefetchUrls.length > 0) {
          ExpoImage.prefetch(prefetchUrls).catch(() => {});
        }
      } else {
        setErrorMsg(res.data?.message || 'Could not load photos.');
      }
    } catch (err: any) {
      console.error('Error fetching gallery:', err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'Failed to connect to server.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  useEffect(() => {
    if (roomId && photos.length > 0) {
      roomGalleryCache.set(roomId, photos);
    }
  }, [roomId, photos]);

  /** Real-time Socket.IO sync for new_media */
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        const socket = await connectSocket();
        if (!mounted || !socket) return;

        socket.emit('join_room', { roomId });

        socket.on('new_media', (payload: { media: MediaItem[] }) => {
          if (!mounted || !payload?.media) return;
          setPhotos((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const newOnes = payload.media.filter((p) => !existingIds.has(p._id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev];
          });
        });
      } catch (err) {
        console.warn('Gallery socket connection error:', err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
    };
  }, [roomId]);

  const onPullRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotos();
    onRefresh?.();
  }, [fetchPhotos, onRefresh]);

  const handlePhotoPress = (photo: MediaItem, index: number) => {
    try {
      Vibration.vibrate(10);
    } catch (e) {}
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handlePhotoDeleted = (mediaId: string) => {
    setPhotos((prev) => prev.filter((p) => p._id !== mediaId));
    onRefresh?.();
  };

  const handleUploadPress = () => {
    try {
      Vibration.vibrate(15);
    } catch (e) {}
    setUploadSheetVisible(true);
  };

  // Filtered photos based on selected chip
  const filteredPhotos = useMemo(() => {
    if (currentFilter === 'all') return photos;
    if (currentFilter === 'my') {
      return photos.filter((p) => p.uploadedBy?._id === currentUserId);
    }
    return photos.filter((p) => p.uploadedBy?._id === currentFilter);
  }, [photos, currentFilter, currentUserId]);

  const myPhotosCount = useMemo(() => {
    return photos.filter((p) => p.uploadedBy?._id === currentUserId).length;
  }, [photos, currentUserId]);

  const memberList = useMemo(() => {
    return members
      .map((m) => ({
        _id: m.userId?._id,
        name: m.userId?.name || 'Traveler',
        avatar: m.userId?.avatar,
      }))
      .filter((m) => Boolean(m._id));
  }, [members]);

  return (
    <View style={styles.container}>
      {/* 1. Top Header */}
      <GalleryHeader
        roomName={room.name}
        coverImage={room.coverImage}
        photoCount={photos.length}
        memberCount={members.length}
        onRefresh={onPullRefresh}
      />

      {/* 2. Filter Bar (when photos exist) */}
      {photos.length > 0 && (
        <GalleryFilterBar
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          members={memberList}
          totalPhotos={photos.length}
          myPhotosCount={myPhotosCount}
        />
      )}

      {/* 3. Main Scrollable Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.rooms.forestGreen} />
          <Text style={styles.loadingText}>Opening gallery...</Text>
        </View>
      ) : errorMsg && photos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-triangle" size={38} color={Colors.rooms.planningOrange} />
          <Text style={styles.errorTitle}>Could not load gallery</Text>
          <Text style={styles.errorSubtitle}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPhotos}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPhotos.length === 0 ? (
        <EmptyGalleryState
          canUpload={canUpload}
          onUploadPress={handleUploadPress}
        />
      ) : (
        <GalleryGrid
          photos={filteredPhotos}
          onPhotoPress={handlePhotoPress}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={Colors.rooms.forestGreen}
              colors={[Colors.rooms.forestGreen]}
            />
          }
          ListHeaderComponent={
            <LinearGradient
              colors={['#243C32', '#315244']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.memoriesHero}
            >
              <View style={styles.memoriesLeft}>
                <View style={styles.memoriesTitleRow}>
                  <Ionicons name="sparkles" size={15} color="#F3C178" />
                  <Text style={styles.memoriesTitle}>Trip Memories</Text>
                </View>
                <Text style={styles.memoriesSubtitle}>
                  {photos.length} {photos.length === 1 ? 'moment' : 'moments'} captured with {members.length} {members.length === 1 ? 'traveler' : 'travelers'}
                </Text>
              </View>
              {canUpload && (
                <TouchableOpacity
                  style={styles.memoriesAddBtn}
                  onPress={handleUploadPress}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={14} color="#FFFFFF" />
                  <Text style={styles.memoriesAddText}>Add</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          }
        />
      )}

      {/* 4. Floating Action Button (FAB) for Camera / Upload */}
      {canUpload && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleUploadPress}
          activeOpacity={0.88}
        >
          <Feather name="camera" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* 5. Fullscreen Photo Lightbox Modal */}
      <MediaViewerModal
        visible={viewerVisible}
        photos={filteredPhotos}
        initialIndex={viewerIndex}
        currentUserId={currentUserId}
        isOwnerOrAdmin={isOwnerOrAdmin}
        roomId={roomId}
        onClose={() => setViewerVisible(false)}
        onPhotoDeleted={handlePhotoDeleted}
      />

      {/* 6. Upload Action Sheet Modal */}
      <UploadMediaSheet
        visible={uploadSheetVisible}
        roomId={roomId}
        onClose={() => setUploadSheetVisible(false)}
        onUploadSuccess={() => {
          fetchPhotos();
          onRefresh?.();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  memoriesHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  memoriesLeft: {
    flex: 1,
    marginRight: 10,
  },
  memoriesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  memoriesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFDF9',
  },
  memoriesSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 253, 249, 0.78)',
    fontWeight: '500',
  },
  memoriesAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.rooms.burntOrange,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  memoriesAddText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginTop: 12,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 22,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.rooms.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.rooms.burntOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFDF9',
  },
});
