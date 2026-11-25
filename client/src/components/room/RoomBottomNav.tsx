import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

export type RoomNavTab = 'itinerary' | 'gallery' | 'chat' | 'expenses' | 'about';

interface RoomBottomNavProps {
  activeTab: RoomNavTab;
  onTabChange: (tab: RoomNavTab) => void;
}

const SIDE_TABS_LEFT: { key: RoomNavTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'itinerary', label: 'Itinerary', icon: 'calendar' },
  { key: 'gallery', label: 'Gallery', icon: 'image' },
];

const SIDE_TABS_RIGHT: { key: RoomNavTab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'expenses', label: 'Expenses', icon: 'credit-card' },
  { key: 'about', label: 'About', icon: 'info' },
];

export const RoomBottomNav: React.FC<RoomBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);

  const renderSideTab = (tab: { key: RoomNavTab; label: string; icon: keyof typeof Feather.glyphMap }) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tabItem}
        onPress={() => onTabChange(tab.key)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconPill, isActive && styles.activeIconPill]}>
          <Feather
            name={tab.icon}
            size={19}
            color={isActive ? Colors.rooms.burntOrange : Colors.rooms.mutedText}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            isActive && styles.activeTabLabel,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const isChatActive = activeTab === 'chat';

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {SIDE_TABS_LEFT.map(renderSideTab)}

      {/* Center Elevated Chat Button */}
      <View style={styles.centerButtonWrapper}>
        <TouchableOpacity
          style={[
            styles.chatCenterButton,
            isChatActive && styles.activeChatButton,
          ]}
          onPress={() => onTabChange('chat')}
          activeOpacity={0.88}
        >
          <Feather name="message-circle" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text
          style={[
            styles.tabLabel,
            { marginTop: 3 },
            isChatActive && styles.activeTabLabel,
          ]}
        >
          Chat
        </Text>
      </View>

      {SIDE_TABS_RIGHT.map(renderSideTab)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#FFFDF9',
    borderTopWidth: 1,
    borderTopColor: '#EADBCB',
    paddingTop: 8,
    paddingHorizontal: 6,
    shadowColor: '#243C32',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconPill: {
    backgroundColor: '#FDF1E6',
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    fontWeight: '600',
    marginTop: 2,
  },
  activeTabLabel: {
    color: Colors.rooms.burntOrange,
    fontWeight: '800',
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  chatCenterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.rooms.forestGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFDF9',
  },
  activeChatButton: {
    backgroundColor: Colors.rooms.burntOrange,
    shadowColor: Colors.rooms.burntOrange,
  },
});
