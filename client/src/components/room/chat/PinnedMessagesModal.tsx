import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { ChatMessage } from './types';
import { formatTime, getInitials, getAvatarColor } from './helpers';
import { Colors } from '../../../constants/theme';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

interface PinnedMessagesModalProps {
  visible: boolean;
  onClose: () => void;
  pinnedMessages: ChatMessage[];
  onSelectMessage: (messageId: string) => void;
  onTogglePin: (messageId: string) => void;
  getRoleColor: (userId: string, defaultColor?: string) => string;
}

export const PinnedMessagesModal: React.FC<PinnedMessagesModalProps> = ({
  visible,
  onClose,
  pinnedMessages,
  onSelectMessage,
  onTogglePin,
  getRoleColor,
}) => {
  const handleSelect = (messageId: string) => {
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
                <Text style={s.title}>Pinned Messages</Text>
                <View style={s.countBadge}>
                  <Text style={s.countText}>{pinnedMessages.length}</Text>
                </View>
              </View>
              <Text style={s.subtitle}>
                Important messages pinned for this trip
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          <FlatList
            data={pinnedMessages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={s.listContent}
            renderItem={({ item }) => {
              const sender = item.senderId;
              const senderName = sender?.name || 'Traveler';
              const roleColor = sender?._id
                ? getRoleColor(sender._id, getAvatarColor(senderName))
                : '#243C32';

              return (
                <TouchableOpacity
                  style={s.card}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item._id)}
                >
                  <View style={s.cardHeader}>
                    {sender?.avatar ? (
                      <ExpoImage
                        source={{
                          uri: getOptimizedImageUrl(sender.avatar, {
                            width: 80,
                            height: 80,
                            crop: 'fill',
                          }),
                        }}
                        style={s.avatar}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[s.avatarFallback, { backgroundColor: roleColor }]}>
                        <Text style={s.avatarInitials}>{getInitials(senderName)}</Text>
                      </View>
                    )}

                    <View style={s.senderInfo}>
                      <Text style={[s.senderName, { color: roleColor }]} numberOfLines={1}>
                        {senderName}
                      </Text>
                      <Text style={s.timestamp}>{formatTime(item.createdAt)}</Text>
                    </View>

                    {/* Unpin Action */}
                    <TouchableOpacity
                      style={s.unpinBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        onTogglePin(item._id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="bookmark" size={16} color="#C96A25" />
                      <Text style={s.unpinText}>Unpin</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Body Text */}
                  {item.content || item.text ? (
                    <Text style={s.content} numberOfLines={3}>
                      {item.content || item.text}
                    </Text>
                  ) : null}

                  {/* Photo attachment preview if any */}
                  {item.media?.url ? (
                    <View style={s.photoPreview}>
                      <ExpoImage
                        source={{
                          uri: getOptimizedImageUrl(item.media.url, {
                            width: 250,
                            height: 140,
                            crop: 'fill',
                          }),
                        }}
                        style={s.photoImage}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}

                  {/* Tap prompt */}
                  <View style={s.cardFooter}>
                    <Text style={s.jumpPrompt}>Tap to jump to message</Text>
                    <Feather name="arrow-right" size={13} color="#C96A25" />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>📌</Text>
                <Text style={s.emptyTitle}>No pinned messages</Text>
                <Text style={s.emptySubtitle}>
                  Long-press any message in the chat and tap "Pin Message" to keep key info handy for everyone.
                </Text>
              </View>
            }
          />
        </View>
      </View>
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
    paddingHorizontal: 20,
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
  listContent: {
    gap: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE0D2',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    backgroundColor: '#E5D8C7',
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: '#8C867A',
  },
  unpinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  unpinText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C96A25',
  },
  content: {
    fontSize: 14,
    color: '#243C32',
    lineHeight: 20,
    marginBottom: 8,
  },
  photoPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  jumpPrompt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#C96A25',
  },
  emptyState: {
    paddingVertical: 40,
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
});
