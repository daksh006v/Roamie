import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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

export const GalleryTab: React.FC<GalleryTabProps> = ({ data, onRefresh }) => {
  const { room, membership, members, currentUserId } = data;
  const roomId = room._id;

  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={Colors.rooms.forestGreen}
              colors={[Colors.rooms.forestGreen]}
            />
          }
        >
          {filteredPhotos.length === 0 ? (
            <EmptyGalleryState
              canUpload={canUpload}
              onUploadPress={handleUploadPress}
            />
          ) : (
            <GalleryGrid
              photos={filteredPhotos}
              onPhotoPress={handlePhotoPress}
            />
          )}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
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
