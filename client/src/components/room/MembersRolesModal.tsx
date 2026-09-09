import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { RoomDetailsData } from '../../types/room';
import api from '../../services/api';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

interface MembersRolesModalProps {
  visible: boolean;
  onClose: () => void;
  data: RoomDetailsData;
  onRefresh: () => void;
}

const getMemberColor = (name: string): string => {
  const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name?: string): string => {
  if (!name) return 'U';
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
};

export const MembersRolesModal: React.FC<MembersRolesModalProps> = ({
  visible,
  onClose,
  data,
  onRefresh,
}) => {
  const { room, membership, members, currentUserId } = data;
  const isOwner = membership?.role === 'owner';
  const [changingMemberId, setChangingMemberId] = useState<string | null>(null);

  // Dynamic role badges based on room.roleColors
  const roleBadges = useMemo(() => {
    const ownerColor = room.roleColors?.owner || '#C96A25';
    const adminColor = room.roleColors?.admin || '#5F745F';
    const memberColor = room.roleColors?.member || '#59615A';

    return {
      owner: {
        label: 'Owner',
        emoji: '👑',
        bg: `${ownerColor}20`,
        text: ownerColor,
      },
      admin: {
        label: 'Admin',
        emoji: '🛡️',
        bg: `${adminColor}20`,
        text: adminColor,
      },
      member: {
        label: 'Member',
        emoji: '👤',
        bg: `${memberColor}1A`,
        text: memberColor,
      },
    };
  }, [room.roleColors]);

  // Sort: Owner first, then Admins, then Members
  const sortedMembers = useMemo(() => {
    const order: Record<string, number> = { owner: 0, admin: 1, member: 2 };
    return [...members].sort((a, b) => {
      return (order[a.role] ?? 2) - (order[b.role] ?? 2);
    });
  }, [members]);

  const handleToggleRole = useCallback(
    (memberId: string, memberName: string, currentRole: string) => {
      if (!isOwner) return;
      if (currentRole === 'owner') {
        Alert.alert('Owner Protected', 'The Room Owner role cannot be changed.');
        return;
      }

      const targetRole = currentRole === 'admin' ? 'member' : 'admin';
      const title = targetRole === 'admin' ? 'Promote to Admin' : 'Demote to Member';
      const message =
        targetRole === 'admin'
          ? `Are you sure you want to promote ${memberName} to Admin? They will receive elevated trip management permissions.`
          : `Are you sure you want to change ${memberName}'s role back to standard Member?`;

      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: targetRole === 'admin' ? 'Promote' : 'Demote',
          style: targetRole === 'admin' ? 'default' : 'destructive',
          onPress: async () => {
            setChangingMemberId(memberId);
            try {
              await api.put(`/rooms/${room._id}/members/${memberId}/role`, {
                role: targetRole,
              });
              onRefresh();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.response?.data?.message || 'Could not update member role.'
              );
            } finally {
              setChangingMemberId(null);
            }
          },
        },
      ]);
    },
    [isOwner, room._id, onRefresh]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={s.overlayBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>Members & Roles</Text>
              <Text style={s.subtitle}>
                {isOwner
                  ? 'Tap a member to promote or demote'
                  : `${members.length} travelers in ${room.name}`}
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={Colors.rooms.darkText} />
            </TouchableOpacity>
          </View>

          {/* Member List */}
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {sortedMembers.map((m) => {
              const isCurrentUser = m.userId?._id === currentUserId;
              const displayName = isCurrentUser
                ? `${m.userId?.name || 'Traveler'} (You)`
                : m.userId?.name || 'Traveler';
              const badge = roleBadges[m.role] || roleBadges.member;
              const isTargetOwner = m.role === 'owner';
              const isUpdating = changingMemberId === m._id;

              return (
                <TouchableOpacity
                  key={m._id}
                  style={s.memberCard}
                  disabled={!isOwner || isTargetOwner || isUpdating}
                  onPress={() =>
                    handleToggleRole(m._id, m.userId?.name || 'Traveler', m.role)
                  }
                  activeOpacity={0.7}
                >
                  {m.userId?.avatar ? (
                    <ExpoImage
                      source={{
                        uri: getOptimizedImageUrl(m.userId.avatar, {
                          width: 120,
                          height: 120,
                          crop: 'fill',
                        }),
                      }}
                      style={s.avatar}
                      cachePolicy="memory-disk"
                      transition={150}
                    />
                  ) : (
                    <View
                      style={[
                        s.avatar,
                        { backgroundColor: getMemberColor(m.userId?.name || '') },
                      ]}
                    >
                      <Text style={s.avatarText}>{getInitials(m.userId?.name)}</Text>
                    </View>
                  )}

                  <View style={s.memberInfo}>
                    <Text style={s.memberName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={s.memberEmail} numberOfLines={1}>
                      {m.userId?.email || 'No email provided'}
                    </Text>
                  </View>

                  {isUpdating ? (
                    <ActivityIndicator size="small" color={Colors.rooms.forestGreen} />
                  ) : (
                    <View style={[s.roleBadge, { backgroundColor: badge.bg }]}>
                      <Text style={s.roleEmoji}>{badge.emoji}</Text>
                      <Text style={[s.roleText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                      {isOwner && !isTargetOwner && (
                        <Feather
                          name="chevron-right"
                          size={14}
                          color={badge.text}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isOwner && (
            <View style={s.footerTip}>
              <Feather name="info" size={14} color={Colors.rooms.mutedText} />
              <Text style={s.footerTipText}>
                Admins receive elevated management powers configured in Role Permissions.
              </Text>
            </View>
          )}
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
  overlayBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: Colors.rooms.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.rooms.sandBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: Colors.rooms.cardCream,
  },
  scrollView: {
    maxHeight: 420,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#E5D8C7',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    marginRight: 10,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  roleText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  footerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.rooms.cardCream,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  footerTipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.rooms.mutedText,
    lineHeight: 16,
  },
});
