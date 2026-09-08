import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export interface RoomMember {
  _id: string;
  name: string;
  avatar?: string;
}

export interface RoomData {
  _id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  status: 'planning' | 'active' | 'completed';
  coverImage?: string;
  members?: RoomMember[];
}

interface RoomCardProps {
  room: RoomData;
  onPress: (room: RoomData) => void;
}

/** Formats a date to "14 Jan 2026" */
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/** Generates a deterministic color from a string for member initials */
const getMemberColor = (name: string): string => {
  const palette = ['#648A62', '#C96A25', '#5F745F', '#E18A3A', '#C97935', '#243C32'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

/** Maps destination names to locally bundled fallback cover images */
const getCoverFallback = (destination: string): ImageSourcePropType => {
  const lower = destination.toLowerCase();
  if (lower.includes('goa')) {
    return require('../../../assets/images/goa_room_cover.jpg');
  }
  if (lower.includes('manali') || lower.includes('mountain') || lower.includes('himalaya')) {
    return require('../../../assets/images/manali_room_cover.jpg');
  }
  // Default fallback
  return require('../../../assets/images/goa_room_cover.jpg');
};

export const RoomCard: React.FC<RoomCardProps> = ({ room, onPress }) => {
  const members = room.members || [];
  const visibleMembers = members.slice(0, 4);
  const overflowCount = Math.max(0, members.length - 4);

  const isActive = room.status === 'active';
  const statusLabel = isActive ? 'Active' : 'Planning';
  const statusColor = isActive ? Colors.rooms.activeGreen : Colors.rooms.planningOrange;

  // Determine cover image source
  const coverSource = room.coverImage
    ? { uri: room.coverImage }
    : getCoverFallback(room.destination);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={() => onPress(room)}
    >
      <View style={styles.cardInner}>
        {/* Full-bleed cover image across the whole card */}
        <Image
          source={coverSource}
          style={styles.fullCoverImage}
          resizeMode="cover"
        />

        {/* Directional gradient: opaque on the left for text readability, clear on the right so photo is bright and colorful */}
        <LinearGradient
          colors={[
            'rgba(18, 28, 22, 0.9)',
            'rgba(23, 37, 31, 0.72)',
            'rgba(23, 37, 31, 0.25)',
            'rgba(0, 0, 0, 0.04)',
          ]}
          locations={[0, 0.38, 0.68, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.coverGradientOverlay}
        />

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        {/* Content overlay */}
        <View style={styles.content}>
          {/* Room name */}
          <Text style={styles.roomName} numberOfLines={1}>
            {room.name}
          </Text>

          {/* Description */}
          <Text style={styles.description} numberOfLines={1}>
            {room.description || `Trip to ${room.destination}`}
          </Text>

          {/* Member avatars */}
          {members.length > 0 && (
            <View style={styles.membersRow}>
              {visibleMembers.map((member, index) => {
                const initials = member.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <View
                    key={member._id}
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: getMemberColor(member.name), marginLeft: index > 0 ? -8 : 0, zIndex: 10 - index },
                    ]}
                  >
                    <Text style={styles.memberInitial}>{initials}</Text>
                  </View>
                );
              })}
              {overflowCount > 0 && (
                <View style={[styles.memberAvatar, styles.overflowBadge]}>
                  <Text style={styles.overflowText}>+{overflowCount}</Text>
                </View>
              )}
            </View>
          )}

          {/* Date range */}
          <View style={styles.infoRow}>
            <Feather name="calendar" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.infoText}>
              {formatDate(room.startDate)} — {formatDate(room.endDate)}
            </Text>
          </View>

          {/* Destination */}
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.infoText}>{room.destination}</Text>
          </View>
        </View>

        {/* Chevron arrow */}
        <View style={styles.chevron}>
          <View style={styles.chevronCircle}>
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0D1B14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    alignSelf: 'center',
    backgroundColor: '#1E302A',
  },
  cardInner: {
    minHeight: 175,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  fullCoverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 5,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: 18,
    paddingRight: CARD_WIDTH * 0.4,
    zIndex: 3,
  },
  roomName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  description: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 12,
    fontWeight: '400',
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#243C32',
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  overflowBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: -8,
  },
  overflowText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  chevron: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    zIndex: 5,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
