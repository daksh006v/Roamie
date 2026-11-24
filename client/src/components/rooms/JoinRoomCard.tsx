import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface JoinRoomCardProps {
  onPress: () => void;
}

export const JoinRoomCard: React.FC<JoinRoomCardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.keyCircle}>
          <Feather name="key" size={20} color="#C96A25" />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Join with Invite Code</Text>
          <Text style={styles.subtitle}>Enter an 8-character code from a friend</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.rooms.mutedText} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8D9C8',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFDF9',
    marginBottom: 20,
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  keyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF0E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#F8DFC9',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    color: Colors.rooms.mutedText,
    marginTop: 2,
    fontWeight: '400',
  },
});
