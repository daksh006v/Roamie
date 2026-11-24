import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
      <View style={styles.artworkContainer}>
        <View style={styles.outerRing}>
          <View style={styles.iconCircle}>
            <Ionicons name="compass" size={42} color={Colors.rooms.forestGreen} />
          </View>
        </View>
        <View style={styles.sparkleBadge}>
          <Ionicons name="sparkles" size={14} color="#C96A25" />
        </View>
      </View>

      <Text style={styles.title}>Your Shared Travel Journal</Text>
      <Text style={styles.subtitle}>
        Every great trip starts with a loose plan. Schedule activities, sunset dinners, and pinned Google Maps spots so everyone stays in sync.
      </Text>

      {canAdd && (
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onAddPress}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Add Activity</Text>
          </TouchableOpacity>

          {onPinPlace && (
            <TouchableOpacity
              style={styles.pinPlaceBtn}
              onPress={onPinPlace}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="google-maps" size={18} color="#C96A25" />
              <Text style={styles.pinPlaceBtnText}>Pin Any Spot</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 3 Quick Ideas Banner */}
      <View style={styles.ideasCard}>
        <Text style={styles.ideasTitle}>Quick Inspiration:</Text>
        <View style={styles.ideaItem}>
          <Text style={styles.ideaEmoji}>🏖️</Text>
          <Text style={styles.ideaText}>Pin the group's accommodation or villa address</Text>
        </View>
        <View style={styles.ideaItem}>
          <Text style={styles.ideaEmoji}>🍽️</Text>
          <Text style={styles.ideaText}>Search and save your favorite dinner spots</Text>
        </View>
        <View style={styles.ideaItem}>
          <Text style={styles.ideaEmoji}>🎯</Text>
          <Text style={styles.ideaText}>Schedule activities with automatic push reminders</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  artworkContainer: {
    position: 'relative',
    marginBottom: 18,
  },
  outerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: '#DFD2C2',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAE1D3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  sparkleBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F8DFC9',
    shadowColor: '#C96A25',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: Colors.rooms.mutedText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: Colors.rooms.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pinPlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2D5C3',
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pinPlaceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C96A25',
  },
  ideasCard: {
    width: '100%',
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  ideasTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  ideaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ideaEmoji: {
    fontSize: 16,
  },
  ideaText: {
    fontSize: 12.5,
    color: '#524B43',
    flex: 1,
    lineHeight: 17,
  },
});
