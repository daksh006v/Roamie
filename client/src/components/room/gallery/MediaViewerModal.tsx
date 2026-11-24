import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { MediaItem } from './galleryTypes';
import api from '../../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MediaViewerModalProps {
  visible: boolean;
  photos: MediaItem[];
  initialIndex: number;
  currentUserId?: string;
  isOwnerOrAdmin?: boolean;
  roomId: string;
  onClose: () => void;
  onPhotoDeleted?: (mediaId: string) => void;
}

const formatFullDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dateFormatted = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateFormatted} at ${timeFormatted}`;
};

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  visible,
  photos,
  initialIndex,
  currentUserId,
  isOwnerOrAdmin,
  roomId,
  onClose,
  onPhotoDeleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!photos.length || currentIndex < 0 || currentIndex >= photos.length) {
    return null;
  }

  const currentPhoto = photos[currentIndex];
  const isUploader = currentPhoto.uploadedBy?._id === currentUserId;
  const canDelete = isUploader || isOwnerOrAdmin;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: currentPhoto.originalFilename || 'Trip Photo',
        url: currentPhoto.storageUrl,
        message: `Trip photo from Roamie: ${currentPhoto.storageUrl}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo from the trip gallery? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const res = await api.delete(`/rooms/${roomId}/media/${currentPhoto._id}`);
              if (res.data?.success) {
                onPhotoDeleted?.(currentPhoto._id);
                if (photos.length <= 1) {
                  onClose();
                } else if (currentIndex >= photos.length - 1) {
                  setCurrentIndex(photos.length - 2);
                }
              } else {
                Alert.alert('Error', res.data?.message || 'Failed to delete photo.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete photo.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Top Floating Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.controlIconBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.counterText}>
            {currentIndex + 1} of {photos.length}
          </Text>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={handleShare}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="share-2" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                style={[styles.controlIconBtn, styles.deleteBtn]}
                onPress={handleDelete}
                disabled={deleting}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="trash-2" size={20} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Center Image with Nav Chevrons */}
        <View style={styles.imageViewerContainer}>
          <ExpoImage
            source={{ uri: currentPhoto.storageUrl }}
            style={styles.mainImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />

          {/* Left / Right Nav Arrows */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.arrowButton, styles.leftArrow]}
              onPress={handlePrev}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {currentIndex < photos.length - 1 && (
            <TouchableOpacity
              style={[styles.arrowButton, styles.rightArrow]}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Feather name="chevron-right" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Uploader Info Card */}
        <View style={styles.bottomCard}>
          <View style={styles.uploaderRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(currentPhoto.uploadedBy?.name || 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>

            <View style={styles.uploaderTextColumn}>
              <Text style={styles.uploaderName} numberOfLines={1}>
                {currentPhoto.uploadedBy?.name || 'Traveler'}
                {isUploader ? ' (You)' : ''}
              </Text>
              <Text style={styles.timestampText}>
                {formatFullDateTime(currentPhoto.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(12, 22, 18, 0.96)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 16,
    zIndex: 10,
  },
  controlIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  arrowButton: {
    position: 'absolute',
    top: '45%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftArrow: {
    left: 12,
  },
  rightArrow: {
    right: 12,
  },
  bottomCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    backgroundColor: 'rgba(20, 34, 28, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.rooms.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  uploaderTextColumn: {
    flex: 1,
  },
  uploaderName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timestampText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
});
