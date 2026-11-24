import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { ItineraryItem, SavedPlace } from './itineraryTypes';

interface ActivityCardProps {
  item: ItineraryItem;
  canEdit: boolean;
  onToggleComplete: (item: ItineraryItem) => void;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (item: ItineraryItem) => void;
  onPlacePress?: (place: SavedPlace) => void;
}

const getCategoryIcon = (category?: string): string => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'restaurant':
      return '🍽️';
    case 'beach':
      return '🏖️';
    case 'stay':
    case 'hotel':
      return '🏨';
    case 'nightlife':
    case 'drinks':
      return '🍸';
    case 'activity':
    case 'activities':
      return '🎯';
    case 'sights':
    case 'sightseeing':
      return '🏛️';
    default:
      return '📍';
  }
};

const formatTimeRange = (startTime?: string, endTime?: string): string => {
  if (!startTime && !endTime) return 'Flexible time';
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  return startTime || endTime || '';
};

export const ActivityCard: React.FC<ActivityCardProps> = ({
  item,
  canEdit,
  onToggleComplete,
  onEdit,
  onDelete,
  onPlacePress,
}) => {
  const isCompleted = item.isCompleted;
  const linkedPlace = item.placeId as SavedPlace | undefined;

  const handleToggle = () => {
    try {
      Vibration.vibrate(15);
    } catch (e) {}
    onToggleComplete(item);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Activity',
      `Remove "${item.title}" from the itinerary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item),
        },
      ]
    );
  };

  return (
    <View style={[styles.card, isCompleted && styles.completedCard]}>
      {/* Left Column: Completion Checkbox & Time indicator */}
      <View style={styles.leftColumn}>
        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkedCheckbox]}
          onPress={handleToggle}
          activeOpacity={0.75}
        >
          {isCompleted && <Feather name="check" size={14} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      {/* Main Content Column */}
      <View style={styles.contentColumn}>
        {/* Top Meta Row: Time & Reminder */}
        <View style={styles.topMetaRow}>
          <View style={styles.timePill}>
            <Feather name="clock" size={12} color={isCompleted ? Colors.rooms.mutedText : Colors.rooms.forestGreen} />
            <Text style={[styles.timeText, isCompleted && styles.completedTimeText]}>
              {formatTimeRange(item.startTime, item.endTime)}
            </Text>
          </View>

          {item.reminderMinutesBefore ? (
            <View style={styles.reminderPill}>
              <Feather name="bell" size={11} color="#C96A25" />
              <Text style={styles.reminderText}>{item.reminderMinutesBefore}m before</Text>
            </View>
          ) : null}

          {/* Action Menu (Edit / Delete) */}
          {canEdit && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onEdit(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="edit-2" size={14} color={Colors.rooms.mutedText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.title, isCompleted && styles.completedTitle]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Description (if provided) */}
        {item.description ? (
          <Text
            style={[styles.description, isCompleted && styles.completedDescription]}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Linked Place Badge */}
        {linkedPlace && linkedPlace.name ? (
          <TouchableOpacity
            style={styles.placePill}
            onPress={() => onPlacePress?.(linkedPlace)}
            activeOpacity={0.75}
          >
            <Text style={styles.placeEmoji}>{getCategoryIcon(linkedPlace.category)}</Text>
            <Text style={styles.placeName} numberOfLines={1}>
              {linkedPlace.name}
            </Text>
            {linkedPlace.address ? (
              <Text style={styles.placeAddress} numberOfLines={1}>
                · {linkedPlace.address}
              </Text>
            ) : null}
            <Feather name="chevron-right" size={12} color={Colors.rooms.mutedText} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  completedCard: {
    backgroundColor: '#F7F2EB',
    borderColor: '#E2D5C3',
    opacity: 0.85,
  },
  leftColumn: {
    alignItems: 'center',
    paddingTop: 3,
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C8DEC8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: Colors.rooms.activeGreen,
    borderColor: Colors.rooms.activeGreen,
  },
  contentColumn: {
    flex: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAE1D3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  completedTimeText: {
    color: Colors.rooms.mutedText,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDEBDD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  reminderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C96A25',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  actionBtn: {
    padding: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    marginBottom: 4,
    lineHeight: 21,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.rooms.mutedText,
  },
  description: {
    fontSize: 13,
    color: Colors.rooms.mutedText,
    lineHeight: 18,
    marginBottom: 8,
  },
  completedDescription: {
    color: '#A89E91',
  },
  placePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0EDE5',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  placeEmoji: {
    fontSize: 13,
  },
  placeName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  placeAddress: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    maxWidth: 140,
  },
});
