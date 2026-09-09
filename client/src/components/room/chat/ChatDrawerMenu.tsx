import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';

interface ChatDrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  roomName: string;
  pinnedCount: number;
  mediaCount: number;
  isNotificationsMuted: boolean;
  onOpenSearch: () => void;
  onOpenPinned: () => void;
  onOpenNotifications: () => void;
  onClearChat: () => void;
  onOpenMedia: () => void;
}

export const ChatDrawerMenu: React.FC<ChatDrawerMenuProps> = ({
  visible,
  onClose,
  roomName,
  pinnedCount,
  mediaCount,
  isNotificationsMuted,
  onOpenSearch,
  onOpenPinned,
  onOpenNotifications,
  onClearChat,
  onOpenMedia,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.headerTitleCol}>
              <Text style={s.title}>Chat Options</Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {roomName}
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <View style={s.optionsList}>
            {/* 1. Search Messages */}
            <TouchableOpacity
              style={s.optionCard}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onOpenSearch();
              }}
            >
              <View style={[s.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Feather name="search" size={20} color="#1976D2" />
              </View>
              <View style={s.optionTextCol}>
                <Text style={s.optionTitle}>Search Messages</Text>
                <Text style={s.optionDesc}>
                  Search text across this Room's chat history
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#A8A29E" />
            </TouchableOpacity>

            {/* 2. Pinned Messages */}
            <TouchableOpacity
              style={s.optionCard}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onOpenPinned();
              }}
            >
              <View style={[s.iconBox, { backgroundColor: '#FFF3E0' }]}>
                <Feather name="bookmark" size={20} color="#E65100" />
              </View>
              <View style={s.optionTextCol}>
                <View style={s.titleRow}>
                  <Text style={s.optionTitle}>Pinned Messages</Text>
                  {pinnedCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{pinnedCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.optionDesc}>
                  Open all messages that members have pinned
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#A8A29E" />
            </TouchableOpacity>

            {/* 3. Chat Notifications */}
            <TouchableOpacity
              style={s.optionCard}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onOpenNotifications();
              }}
            >
              <View
                style={[
                  s.iconBox,
                  { backgroundColor: isNotificationsMuted ? '#FEE2E2' : '#E8F5E9' },
                ]}
              >
                <Feather
                  name={isNotificationsMuted ? 'bell-off' : 'bell'}
                  size={20}
                  color={isNotificationsMuted ? '#DC2626' : '#2E7D32'}
                />
              </View>
              <View style={s.optionTextCol}>
                <View style={s.titleRow}>
                  <Text style={s.optionTitle}>Chat Notifications</Text>
                  <View
                    style={[
                      s.statusBadge,
                      {
                        backgroundColor: isNotificationsMuted
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(34, 197, 94, 0.12)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.statusBadgeText,
                        { color: isNotificationsMuted ? '#DC2626' : '#16A34A' },
                      ]}
                    >
                      {isNotificationsMuted ? 'Muted' : 'Active'}
                    </Text>
                  </View>
                </View>
                <Text style={s.optionDesc}>
                  Toggle notifications for this particular Room
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#A8A29E" />
            </TouchableOpacity>

            {/* 4. Shared Media */}
            <TouchableOpacity
              style={s.optionCard}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onOpenMedia();
              }}
            >
              <View style={[s.iconBox, { backgroundColor: '#EDE7F6' }]}>
                <Feather name="folder" size={20} color="#673AB7" />
              </View>
              <View style={s.optionTextCol}>
                <View style={s.titleRow}>
                  <Text style={s.optionTitle}>Shared Media</Text>
                  {mediaCount > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{mediaCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.optionDesc}>
                  Quick view of photos and files shared in the chat
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#A8A29E" />
            </TouchableOpacity>

            {/* 5. Clear Chat (Local View Only) */}
            <TouchableOpacity
              style={[s.optionCard, s.optionCardDanger]}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onClearChat();
              }}
            >
              <View style={[s.iconBox, { backgroundColor: '#FEE2E2' }]}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </View>
              <View style={s.optionTextCol}>
                <Text style={[s.optionTitle, { color: '#DC2626' }]}>
                  Clear Chat
                </Text>
                <Text style={s.optionDesc}>
                  Clear chat from your local view on this device only
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 26,
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
    marginBottom: 18,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#17251F',
    letterSpacing: 0.1,
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
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE0D2',
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  optionCardDanger: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  optionTextCol: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17251F',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#78716C',
    lineHeight: 16,
  },
  badge: {
    backgroundColor: '#EDE5D8',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78716C',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
