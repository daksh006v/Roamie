import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChatMessage } from './types';
import { formatTime, getInitials, getAvatarColor } from './helpers';
import { Image as ExpoImage } from 'expo-image';
import { getOptimizedImageUrl } from '../../../utils/imageOptimizer';

interface ChatSearchModalProps {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSelectMessage: (messageId: string) => void;
  getRoleColor: (userId: string, defaultColor?: string) => string;
}

export const ChatSearchModal: React.FC<ChatSearchModalProps> = ({
  visible,
  onClose,
  messages,
  onSelectMessage,
  getRoleColor,
}) => {
  const [query, setQuery] = useState('');

  const filteredMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return messages.filter((m) => {
      if (m.type === 'system') return false;
      const content = (m.content || m.text || '').toLowerCase();
      const sender = (m.senderId?.name || '').toLowerCase();
      return content.includes(q) || sender.includes(q);
    });
  }, [messages, query]);

  const handleSelect = (messageId: string) => {
    onClose();
    setTimeout(() => {
      onSelectMessage(messageId);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          {/* Top Bar with Search Input */}
          <View style={s.searchBarHeader}>
            <View style={s.inputCapsule}>
              <Feather name="search" size={18} color="#8C867A" style={{ marginRight: 8 }} />
              <TextInput
                style={s.textInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search messages in this trip..."
                placeholderTextColor="#A8A29E"
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x-circle" size={16} color="#8C867A" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Results Summary Bar */}
          {query.trim().length > 0 && (
            <View style={s.resultsBar}>
              <Text style={s.resultsCountText}>
                {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'} found
              </Text>
            </View>
          )}

          {/* Results List */}
          <FlatList
            data={filteredMessages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const sender = item.senderId;
              const senderName = sender?.name || 'Traveler';
              const roleColor = sender?._id
                ? getRoleColor(sender._id, getAvatarColor(senderName))
                : '#243C32';

              return (
                <TouchableOpacity
                  style={s.resultCard}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item._id)}
                >
                  {/* Sender Avatar */}
                  {sender?.avatar ? (
                    <ExpoImage
                      source={{
                        uri: getOptimizedImageUrl(sender.avatar, { width: 80, height: 80, crop: 'fill' }),
                      }}
                      style={s.avatar}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={[s.avatarFallback, { backgroundColor: roleColor }]}>
                      <Text style={s.avatarInitials}>{getInitials(senderName)}</Text>
                    </View>
                  )}

                  {/* Message Info */}
                  <View style={s.resultBody}>
                    <View style={s.resultMetaRow}>
                      <Text style={[s.senderName, { color: roleColor }]} numberOfLines={1}>
                        {senderName}
                      </Text>
                      <Text style={s.timestamp}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <Text style={s.messageContent} numberOfLines={2}>
                      {item.content || item.text || (item.media?.url ? '📸 Photo' : '')}
                    </Text>
                  </View>

                  <Feather name="corner-down-right" size={15} color="#A8A29E" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              query.trim().length > 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>🔍</Text>
                  <Text style={s.emptyTitle}>No messages found</Text>
                  <Text style={s.emptySubtitle}>
                    We couldn't find any message matching "{query}"
                  </Text>
                </View>
              ) : (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>💬</Text>
                  <Text style={s.emptyTitle}>Search conversation</Text>
                  <Text style={s.emptySubtitle}>
                    Type a keyword, spot name, or traveler name to jump directly to it
                  </Text>
                </View>
              )
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
    justifyContent: 'flex-start',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    marginTop: Platform.OS === 'ios' ? 44 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  searchBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE0D2',
    backgroundColor: '#FAF7F2',
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2D7C8',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 5,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#17251F',
    padding: 0,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  cancelText: {
    fontSize: 15,
    color: '#C96A25',
    fontWeight: '700',
  },
  resultsBar: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#F3EDE3',
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  listContent: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE0D2',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E5D8C7',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resultBody: {
    flex: 1,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#8C867A',
  },
  messageContent: {
    fontSize: 13.5,
    color: '#243C32',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
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
