import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '../../constants/theme';
import { TripSettingsModal } from './TripSettingsModal';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Date not set';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getMemberColor = (name: string): string => {
  const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

export interface RoomPermissions {
  members: {
    canAddItinerary: boolean;
    canAddExpenses: boolean;
    canUploadMedia: boolean;
    canAddPlaces: boolean;
    canInvite: boolean;
  };
  admins: {
    canEditTripInfo: boolean;
    canManageRoles: boolean;
    canEndTrip: boolean;
    canDeleteRoom: boolean;
  };
}

export interface RoomDetailsData {
  room: {
    _id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
    coverImage?: string;
    status: 'planning' | 'active' | 'completed';
    inviteCode: string;
    createdBy?: any;
    permissions?: RoomPermissions;
  };
  membership: {
    role: 'owner' | 'admin' | 'member';
  };
  members: Array<{
    _id: string;
    role: 'owner' | 'admin' | 'member';
    userId: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
      phone?: string;
    };
  }>;
  stats: {
    totalDays: number;
    currentDay: number;
    progressPercentage: number;
    isUnderway: boolean;
    isCompleted: boolean;
    totalSpent: number;
    messageCount: number;
    photoCount: number;
    placeCount: number;
    itineraryCount: number;
    memberCount: number;
  };
  currentUserId?: string;
}

interface AboutTabProps {
  data: RoomDetailsData;
  onRefresh: () => void;
}

export const AboutTab: React.FC<AboutTabProps> = ({ data, onRefresh }) => {
  const router = useRouter();
  const { room, membership, members, stats, currentUserId } = data;
  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin';
  const isAdminOrOwner = isOwner || isAdmin;

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Cover image source
  const coverSource =
    room.coverImage && (room.coverImage.startsWith('http') || room.coverImage.startsWith('file://'))
      ? { uri: room.coverImage }
      : require('../../../assets/images/default_create_cover.jpg');

  const visibleMembers = members.slice(0, 4);
  const overflowCount = Math.max(0, members.length - 4);

  const handleCopyInviteCode = async () => {
    try {
      await Share.share({
        message: `Join our trip "${room.name}" on Roamie! Use invite code: ${room.inviteCode}`,
      });
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(true);
    }
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join our trip "${room.name}" on Roamie! Use invite code: ${room.inviteCode}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleLeaveRoom = () => {
    Alert.alert(
      'Leave Room',
      `Are you sure you want to leave "${room.name}"? You will lose access until re-invited.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Room',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/rooms/${room._id}/leave`);
              router.replace('/rooms');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not leave room.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete Room',
      `This will permanently delete "${room.name}" and all its data. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Room',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/rooms/${room._id}`);
              router.replace('/rooms');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not delete room.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Hero Cover Photo Header */}
      <View style={styles.heroContainer}>
        <Image source={coverSource} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.45)', 'transparent', 'rgba(18, 30, 24, 0.9)']}
          locations={[0, 0.35, 1]}
          style={styles.heroOverlay}
        />

        {/* Top Floating Controls: Back button & Menu */}
        <View style={styles.heroTopBar}>
          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="more-horizontal" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Hero Room Info */}
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {room.name}
          </Text>

          {/* Destination */}
          <View style={styles.heroMetaRow}>
            <Feather name="map-pin" size={14} color="rgba(255, 255, 255, 0.85)" />
            <Text style={styles.heroMetaText}>{room.destination}</Text>
          </View>

          {/* Dates */}
          <View style={styles.heroMetaRow}>
            <Feather name="calendar" size={14} color="rgba(255, 255, 255, 0.85)" />
            <Text style={styles.heroMetaText}>
              {formatDate(room.startDate)} – {formatDate(room.endDate)}
            </Text>
          </View>

          {/* Overlapping Member Avatars */}
          <View style={styles.heroAvatarsRow}>
            {visibleMembers.map((m, idx) => {
              const initials = (m.userId?.name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              return (
                <View
                  key={m._id}
                  style={[
                    styles.heroAvatarCircle,
                    {
                      backgroundColor: getMemberColor(m.userId?.name || ''),
                      marginLeft: idx > 0 ? -10 : 0,
                      zIndex: 10 - idx,
                    },
                  ]}
                >
                  <Text style={styles.heroAvatarInitial}>{initials}</Text>
                </View>
              );
            })}
            {overflowCount > 0 && (
              <View style={[styles.heroAvatarCircle, styles.heroOverflowCircle]}>
                <Text style={styles.heroOverflowText}>+{overflowCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.bodyContent}>
        {/* 2. Day Progress Card */}
        <View style={styles.card}>
          <Text style={styles.progressTitle}>
            {stats.isCompleted
              ? `Completed (${stats.totalDays} Days)`
              : stats.isUnderway
              ? `Day ${stats.currentDay || 1} of ${stats.totalDays}`
              : `Upcoming Trip (${stats.totalDays} Days)`}
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, stats.progressPercentage))}%` },
              ]}
            />
          </View>
          <Text style={styles.progressSubtitle}>
            {stats.isCompleted
              ? 'Trip completed'
              : stats.isUnderway
              ? `${stats.progressPercentage}% of the trip completed`
              : `Starts on ${formatDate(room.startDate)}`}
          </Text>
        </View>

        {/* 3. 4-Column Stats Grid Card */}
        <View style={[styles.card, styles.statsGridCard]}>
          {/* Places Saved */}
          <View style={styles.statColumn}>
            <Feather name="map-pin" size={18} color="#648A62" />
            <Text style={styles.statValue}>{stats.placeCount || 0}</Text>
            <Text style={styles.statLabel}>Places Saved</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Activities */}
          <View style={styles.statColumn}>
            <Feather name="calendar" size={18} color="#C97935" />
            <Text style={styles.statValue}>{stats.itineraryCount || 0}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Photos */}
          <View style={styles.statColumn}>
            <Feather name="image" size={18} color="#0D9488" />
            <Text style={styles.statValue}>{stats.photoCount || 0}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>

          <View style={styles.statDivider} />

          {/* Total Spent */}
          <View style={styles.statColumn}>
            <Feather name="credit-card" size={18} color="#C96A25" />
            <Text style={styles.statValue}>
              ₹{(stats.totalSpent || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {/* 4. Trip Details Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            {isOwner && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => Alert.alert('Edit Trip', 'Edit trip modal coming in next phase.')}
              >
                <Feather name="edit-2" size={14} color={Colors.rooms.forestGreen} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Destination */}
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={17} color={Colors.rooms.darkText} style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{room.destination}</Text>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.detailRow}>
            <Feather name="calendar" size={17} color={Colors.rooms.darkText} style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Dates</Text>
              <Text style={styles.detailValue}>
                {formatDate(room.startDate)} – {formatDate(room.endDate)} ({stats.totalDays} days)
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.detailRow}>
            <Feather name="file-text" size={17} color={Colors.rooms.darkText} style={styles.detailIcon} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>
                {room.description || 'Sun, beaches and our kind of chaos.'}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
          </View>
        </View>

        {/* 5. Members Section */}
        <View style={styles.membersSectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
            <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
              <Text style={styles.manageBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersScrollList}
          >
            {members.map((m) => {
              const isUser = m.userId?._id === currentUserId;
              const displayName = isUser ? 'You' : m.userId?.name || 'Member';
              const isMemberOwner = m.role === 'owner';
              const isMemberAdmin = m.role === 'admin';
              const initials = (m.userId?.name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <View key={m._id} style={styles.memberChip}>
                  <View style={styles.memberAvatarContainer}>
                    <View
                      style={[
                        styles.memberChipAvatar,
                        { backgroundColor: getMemberColor(m.userId?.name || '') },
                      ]}
                    >
                      <Text style={styles.memberChipInitial}>{initials}</Text>
                    </View>
                    {isMemberOwner && (
                      <View style={styles.crownBadge}>
                        <Text style={styles.crownEmoji}>👑</Text>
                      </View>
                    )}
                    {isMemberAdmin && (
                      <View style={styles.crownBadge}>
                        <Text style={styles.crownEmoji}>🛡️</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.memberName} numberOfLines={1}>
                    {displayName}
                  </Text>

                  {isMemberOwner && (
                    <View style={styles.ownerPill}>
                      <Text style={styles.ownerPillText}>Owner</Text>
                    </View>
                  )}
                  {isMemberAdmin && (
                    <View style={[styles.ownerPill, { backgroundColor: '#E8DCC8' }]}>
                      <Text style={[styles.ownerPillText, { color: '#7A5C2E' }]}>Admin</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* 6. Action List Card */}
        <View style={[styles.card, styles.actionCard]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setInviteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="users" size={18} color={Colors.rooms.darkText} style={styles.actionIcon} />
            <Text style={styles.actionText}>Invite Friends</Text>
            <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={18} color={Colors.rooms.darkText} style={styles.actionIcon} />
            <Text style={styles.actionText}>Trip Settings</Text>
            <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {isOwner ? (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDeleteRoom}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={18} color="#DC2626" style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete Room</Text>
              <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLeaveRoom}
              activeOpacity={0.7}
            >
              <Feather name="log-out" size={18} color="#DC2626" style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: '#DC2626' }]}>Leave Room</Text>
              <Feather name="chevron-right" size={18} color={Colors.rooms.mutedText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Invite Friends Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Invite Friends</Text>
            <Text style={styles.modalSubtitle}>
              Share this invite code with your friends to join {room.name}
            </Text>

            {/* Invite Code Box */}
            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCodeText}>{room.inviteCode}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleCopyInviteCode}
                activeOpacity={0.8}
              >
                <Feather
                  name={copiedCode ? 'check' : 'copy'}
                  size={16}
                  color={copiedCode ? '#10B981' : Colors.rooms.forestGreen}
                />
                <Text style={[styles.copyBtnText, copiedCode && { color: '#10B981' }]}>
                  {copiedCode ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Share Link CTA */}
            <TouchableOpacity
              style={styles.shareLinkBtn}
              onPress={handleShareInvite}
              activeOpacity={0.85}
            >
              <Feather name="share-2" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.shareLinkText}>Share Invite Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Trip Settings Modal */}
      <TripSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        data={data}
        onRefresh={onRefresh}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.rooms.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Hero Section */
  heroContainer: {
    width: '100%',
    height: 290,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  heroIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroMetaText: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  heroAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroOverflowCircle: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    marginLeft: -10,
  },
  heroOverflowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Body Content */
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Common Card */
  card: {
    backgroundColor: Colors.rooms.cardCream,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    marginBottom: 14,
  },

  /* Progress Card */
  progressTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 10,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.rooms.greige,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.rooms.forestGreen,
    borderRadius: 4,
  },
  progressSubtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },

  /* 4-Column Stats Grid */
  statsGridCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.rooms.sandBorder,
  },

  /* Trip Details Card */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.rooms.darkText,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailIcon: {
    width: 28,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.rooms.mutedText,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },

  /* Members Section */
  membersSectionContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  membersScrollList: {
    paddingVertical: 6,
    gap: 16,
  },
  memberChip: {
    alignItems: 'center',
    width: 64,
  },
  memberAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  memberChipAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.rooms.sandBorder,
  },
  memberChipInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  crownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  crownEmoji: {
    fontSize: 11,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.rooms.darkText,
    textAlign: 'center',
  },
  ownerPill: {
    marginTop: 4,
    backgroundColor: Colors.rooms.planningOrange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ownerPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Action Card */
  actionCard: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionIcon: {
    marginRight: 14,
  },
  actionText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  actionDivider: {
    height: 1,
    backgroundColor: Colors.rooms.sandBorder,
  },

  /* Invite Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 37, 31, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.rooms.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.rooms.sandBorder,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13.5,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.rooms.cardCream,
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
    marginBottom: 16,
  },
  inviteCodeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.rooms.greige,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.rooms.forestGreen,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  shareLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCloseBtn: {
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    fontWeight: '600',
  },
});
