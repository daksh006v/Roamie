import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export type RoomNavTab = 'itinerary' | 'gallery' | 'chat' | 'expenses' | 'about';

interface RoomBottomNavProps {
  activeTab: RoomNavTab;
  onTabChange: (tab: RoomNavTab) => void;
}

export const RoomBottomNav: React.FC<RoomBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Itinerary Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'itinerary' && styles.activePill]}
        onPress={() => onTabChange('itinerary')}
        activeOpacity={0.75}
      >
        <Feather
          name="calendar"
          size={20}
          color={activeTab === 'itinerary' ? Colors.rooms.darkText : Colors.rooms.mutedText}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'itinerary' && styles.activeTabLabel,
          ]}
        >
          Itinerary
        </Text>
      </TouchableOpacity>

      {/* 2. Gallery Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'gallery' && styles.activePill]}
        onPress={() => onTabChange('gallery')}
        activeOpacity={0.75}
      >
        <Feather
          name="image"
          size={20}
          color={activeTab === 'gallery' ? Colors.rooms.darkText : Colors.rooms.mutedText}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'gallery' && styles.activeTabLabel,
          ]}
        >
          Gallery
        </Text>
      </TouchableOpacity>

      {/* 3. Center Elevated Chat Button */}
      <View style={styles.centerButtonWrapper}>
        <TouchableOpacity
          style={[
            styles.chatCenterButton,
            activeTab === 'chat' && styles.activeChatButton,
          ]}
          onPress={() => onTabChange('chat')}
          activeOpacity={0.88}
        >
          <Feather name="message-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text
          style={[
            styles.tabLabel,
            { marginTop: 4 },
            activeTab === 'chat' && styles.activeTabLabel,
          ]}
        >
          Chat
        </Text>
      </View>

      {/* 4. Expenses Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'expenses' && styles.activePill]}
        onPress={() => onTabChange('expenses')}
        activeOpacity={0.75}
      >
        <Feather
          name="credit-card"
          size={20}
          color={activeTab === 'expenses' ? Colors.rooms.darkText : Colors.rooms.mutedText}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'expenses' && styles.activeTabLabel,
          ]}
        >
          Expenses
        </Text>
      </TouchableOpacity>

      {/* 5. About Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'about' && styles.activePill]}
        onPress={() => onTabChange('about')}
        activeOpacity={0.75}
      >
        <Feather
          name="info"
          size={20}
          color={activeTab === 'about' ? Colors.rooms.darkText : Colors.rooms.mutedText}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'about' && styles.activeTabLabel,
          ]}
        >
          About
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.rooms.background,
    borderTopWidth: 1,
    borderTopColor: Colors.rooms.sandBorder,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 58,
  },
  activePill: {
    backgroundColor: Colors.rooms.greige,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    fontWeight: '500',
    marginTop: 3,
  },
  activeTabLabel: {
    color: Colors.rooms.darkText,
    fontWeight: '700',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  chatCenterButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.rooms.forestGreen,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: Colors.rooms.background,
  },
  activeChatButton: {
    backgroundColor: Colors.rooms.burntOrange,
  },
});
