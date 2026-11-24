import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';

interface EmptyItineraryStateProps {
  canAdd: boolean;
  onAddPress: () => void;
  onPinPlace?: () => void;
}

export const EmptyItineraryState: React.FC<EmptyItineraryStateProps> = ({
  canAdd,
  onAddPress,
  onPinPlace,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="calendar" size={38} color={Colors.rooms.forestGreen} />
      </View>
      <Text style={styles.title}>No schedule planned yet</Text>
      <Text style={styles.subtitle}>
        Map out daily adventures, dinners, and meetups. Set reminders so your group stays in sync without asking "what are we doing next?".
      </Text>

      {canAdd && (
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onAddPress}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={17} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Add Activity</Text>
          </TouchableOpacity>

          {onPinPlace && (
            <TouchableOpacity
              style={styles.pinPlaceBtn}
              onPress={onPinPlace}
              activeOpacity={0.8}
            >
              <Feather name="map-pin" size={16} color={Colors.rooms.forestGreen} />
              <Text style={styles.pinPlaceBtnText}>Pin Place</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 70,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F0E8',
    borderWidth: 2,
    borderColor: '#C8DEC8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.rooms.burntOrange,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: Colors.rooms.burntOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pinPlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBE2D5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DFD2C2',
  },
  pinPlaceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
});
