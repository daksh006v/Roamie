import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { ChatMessage } from './types';
import { formatTime, formatDateSeparator } from './helpers';
import { Colors } from '../../../constants/theme';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SPACING = 4;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_SPACING * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

interface SharedMediaItem {
  messageId: string;
  url: string;
  senderName: string;
  createdAt: string;
}

interface SharedMediaModalProps {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSelectMessage: (messageId: string) => void;
}

export const SharedMediaModal: React.FC<SharedMediaModalProps> = ({
  visible,
  onClose,
  messages,
  onSelectMessage,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<SharedMediaItem | null>(null);

  // Extract all media items from messages
  const mediaItems = useMemo(() => {
    const items: SharedMediaItem[] = [];
    messages.forEach((m) => {
      const url = m.media?.url || (m.type === 'image' && m.content ? m.content : null);
      if (url) {
        items.push({
          messageId: m._id,
          url,
          senderName: m.senderId?.name || 'Traveler',
          createdAt: m.createdAt,
        });
      }
    });
    // Most recent media first
    return items.reverse();
  }, [messages]);

  const handleJumpToMessage = (messageId: string) => {
    setSelectedPhoto(null);
    onClose();
    setTimeout(() => {
      onSelectMessage(messageId);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.titleBlock}>
              <View style={s.titleBadgeRow}>
                <Text style={s.title}>Shared Media</Text>
                <View style={s.countBadge}>
                  <Text style={s.countText}>{mediaItems.length}</Text>
                </View>
              </View>
              <Text style={s.subtitle}>
                Photos & attachments shared in chat
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Media Grid */}
          <FlatList
            data={mediaItems}
            keyExtractor={(item) => `${item.messageId}_${item.url}`}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={s.columnWrapper}
            contentContainerStyle={s.gridContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.gridItem}
                activeOpacity={0.8}
                onPress={() => setSelectedPhoto(item)}
              >
                <ExpoImage
                  source={{
                    uri: getOptimizedImageUrl(item.url, {
                      width: 240,
                      height: 240,
                      crop: 'fill',
                    }),
                  }}
                  style={s.thumbImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>📁</Text>
                <Text style={s.emptyTitle}>No shared media</Text>
                <Text style={s.emptySubtitle}>
                  Photos and images shared by your group in this trip will be collected here for easy viewing.
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Fullscreen Photo Viewer */}
      {selectedPhoto && (
        <Modal
          visible={Boolean(selectedPhoto)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={s.fullscreenOverlay}>
            <View style={s.fullscreenHeader}>
              <View>
                <Text style={s.viewerSender}>{selectedPhoto.senderName}</Text>
                <Text style={s.viewerTime}>
                  {formatDateSeparator(selectedPhoto.createdAt)} · {formatTime(selectedPhoto.createdAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={s.viewerCloseBtn}
                onPress={() => setSelectedPhoto(null)}
              >
                <Feather name="x" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={s.fullscreenImageContainer}>
              <ExpoImage
                source={{ uri: selectedPhoto.url }}
                style={s.fullscreenImage}
                contentFit="contain"
              />
            </View>

            <View style={s.fullscreenFooter}>
              <TouchableOpacity
                style={s.jumpInChatBtn}
                activeOpacity={0.8}
                onPress={() => handleJumpToMessage(selectedPhoto.messageId)}
              >
                <Feather name="message-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={s.jumpInChatText}>Jump to Message in Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 37, 31, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6CBBC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  titleBlock: {
    flex: 1,
    marginRight: 10,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#17251F',
  },
  countBadge: {
    backgroundColor: '#EDE5D8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78716C',
  },
  subtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 2,
  },
  closeBtn: {
    padding: 7,
    borderRadius: 12,
    backgroundColor: '#EFE7DC',
  },
  gridContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  columnWrapper: {
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EDE5D8',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17251F',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Fullscreen viewer */
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  viewerSender: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewerTime: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 2,
  },
  viewerCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  fullscreenFooter: {
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingTop: 12,
  },
  jumpInChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C96A25',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  jumpInChatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
