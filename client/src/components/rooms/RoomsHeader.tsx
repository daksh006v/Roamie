import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../constants/theme';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

const { width } = Dimensions.get('window');

export type RoomTab = 'myRooms' | 'invites' | 'archived';

interface RoomsHeaderProps {
  userName: string;
  userAvatar?: string;
  activeTab: RoomTab;
  onTabChange: (tab: RoomTab) => void;
  onOpenJoinModal?: () => void;
  onOpenProfile?: () => void;
}

/** Generates a deterministic color from a string */
const getInitialColor = (name: string): string => {
  const colors = ['#648A62', '#C96A25', '#5F745F', '#243C32', '#C97935', '#E18A3A'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const RoomsHeader: React.FC<RoomsHeaderProps> = ({
  userName,
  userAvatar,
  activeTab,
  onTabChange,
  onOpenJoinModal,
  onOpenProfile,
}) => {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tabs: { key: RoomTab; label: string }[] = [
    { key: 'myRooms', label: 'My Rooms' },
    { key: 'invites', label: 'Invites' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <View style={styles.container}>
      {/* Top bar: Brand Logo + Avatar & Join Button */}
      <View style={styles.topBar}>
        <Image
          source={require('../../../assets/images/roamie_brand_logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View style={styles.topRightActions}>
          {onOpenJoinModal && (
            <TouchableOpacity
              style={styles.joinPillBtn}
              onPress={onOpenJoinModal}
              activeOpacity={0.75}
            >
              <Text style={styles.joinPillIcon}>🔑</Text>
              <Text style={styles.joinPillText}>Join</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onOpenProfile}
            activeOpacity={0.75}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {userAvatar ? (
              <View pointerEvents="none">
                <ExpoImage
                  source={{ uri: getOptimizedImageUrl(userAvatar, { width: 120, height: 120, crop: 'fill' }) }}
                  style={styles.avatarImage}
                  cachePolicy="memory-disk"
                  transition={150}
                />
              </View>
            ) : (
              <View pointerEvents="none" style={[styles.avatar, { backgroundColor: getInitialColor(userName) }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Your Rooms</Text>
          <Text style={styles.subtitle}>
            Different trips. Same people. New stories.
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandLogo: {
    width: 130,
    height: 44,
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  avatarButton: {
    zIndex: 10,
  },
  joinPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2D5C3',
  },
  joinPillIcon: {
    fontSize: 13,
  },
  joinPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C96A25',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.rooms.sandBorder,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.rooms.sandBorder,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    marginTop: 4,
    fontWeight: '400',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
  },
  activeTab: {
    backgroundColor: Colors.rooms.forestGreen,
    borderColor: Colors.rooms.forestGreen,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rooms.mutedText,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});
