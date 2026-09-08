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

interface CreateRoomCardProps {
  onPress: () => void;
}

export const CreateRoomCard: React.FC<CreateRoomCardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.plusCircle}>
          <Feather name="plus" size={24} color={Colors.rooms.forestGreen} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Create a New Room</Text>
          <Text style={styles.subtitle}>Plan a trip. Bring your people.</Text>
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
    borderWidth: 1.5,
    borderColor: Colors.rooms.sandBorder,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.rooms.cardCream,
    marginBottom: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(36, 60, 50, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
