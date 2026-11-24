import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
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

interface CategoryStyle {
  iconName: string;
  color: string;
  bg: string;
  label: string;
}

const getCategoryStyle = (category?: string): CategoryStyle => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'restaurant':
      return { iconName: 'food-fork-drink', color: '#C96A25', bg: '#FDF3E7', label: 'Dining' };
    case 'beach':
      return { iconName: 'beach', color: '#0284C7', bg: '#E0F2FE', label: 'Beach' };
    case 'stay':
    case 'hotel':
      return { iconName: 'bed-king', color: '#243C32', bg: '#EDF5EF', label: 'Stay' };
    case 'nightlife':
    case 'drinks':
      return { iconName: 'glass-cocktail', color: '#9333EA', bg: '#F3E8FF', label: 'Nightlife' };
    case 'activity':
    case 'activities':
      return { iconName: 'hiking', color: '#059669', bg: '#D1FAE5', label: 'Adventure' };
    case 'sights':
    case 'sightseeing':
      return { iconName: 'camera-iris', color: '#B45309', bg: '#FEF3C7', label: 'Sights' };
    default:
      return { iconName: 'map-marker-radius', color: '#64748B', bg: '#F1F5F9', label: 'Spot' };
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
  const catStyle = getCategoryStyle(linkedPlace?.category);

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

  const handleOpenMaps = (place: SavedPlace) => {
    const lat = place.latitude;
    const lng = place.longitude;
    const label = encodeURIComponent(place.name);

    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;

    const webFallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webFallbackUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webFallbackUrl);
      });
  };

  return (
    <View style={[styles.card, isCompleted && styles.completedCard]}>
      {/* Category color accent bar on left */}
      <View
        style={[
          styles.categoryStripe,
          { backgroundColor: isCompleted ? '#C5D6C5' : catStyle.color },
        ]}
      />

      {/* Checkbox column */}
      <View style={styles.leftColumn}>
        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkedCheckbox]}
          onPress={handleToggle}
          activeOpacity={0.75}
        >
          {isCompleted ? (
            <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
          ) : (
            <View style={styles.uncheckedInner} />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content Column */}
      <View style={styles.contentColumn}>
        {/* Top Meta Row: Time, Category Badge, Reminder, Actions */}
        <View style={styles.topMetaRow}>
          <View style={[styles.timePill, isCompleted && styles.completedTimePill]}>
            <MaterialCommunityIcons
              name="clock-time-four-outline"
              size={12}
              color={isCompleted ? Colors.rooms.mutedText : Colors.rooms.forestGreen}
            />
            <Text style={[styles.timeText, isCompleted && styles.completedTimeText]}>
              {formatTimeRange(item.startTime, item.endTime)}
            </Text>
          </View>

          {linkedPlace && (
            <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
              <MaterialCommunityIcons
                name={catStyle.iconName as any}
                size={11}
                color={catStyle.color}
              />
              <Text style={[styles.categoryBadgeText, { color: catStyle.color }]}>
                {catStyle.label}
              </Text>
            </View>
          )}

          {item.reminderMinutesBefore ? (
            <View style={styles.reminderPill}>
              <Feather name="bell" size={10} color="#C96A25" />
              <Text style={styles.reminderText}>{item.reminderMinutesBefore}m</Text>
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
                <Feather name="edit-2" size={13} color={Colors.rooms.mutedText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={13} color="#EF4444" />
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

        {/* Linked Place Badge with Direct Map Navigation */}
        {linkedPlace && linkedPlace.name ? (
          <View style={styles.placePillContainer}>
            <TouchableOpacity
              style={styles.placePill}
              onPress={() => onPlacePress?.(linkedPlace)}
              activeOpacity={0.75}
            >
              <Ionicons name="location" size={13} color={catStyle.color} />
              <Text style={styles.placeName} numberOfLines={1}>
                {linkedPlace.name}
              </Text>
              {linkedPlace.address ? (
                <Text style={styles.placeAddress} numberOfLines={1}>
                  · {linkedPlace.address}
                </Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapsShortcutBtn}
              onPress={() => handleOpenMaps(linkedPlace)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="navigate-outline" size={13} color={Colors.rooms.forestGreen} />
              <Text style={styles.mapsShortcutText}>Map</Text>
            </TouchableOpacity>
          </View>
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
    shadowRadius: 5,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  completedCard: {
    backgroundColor: '#F5EFE6',
    borderColor: '#DFD2C2',
    opacity: 0.82,
  },
  categoryStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
  },
  leftColumn: {
    alignItems: 'center',
    paddingTop: 2,
    paddingLeft: 4,
    marginRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#C4D6C4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedCheckbox: {
    backgroundColor: Colors.rooms.forestGreen,
    borderColor: Colors.rooms.forestGreen,
  },
  uncheckedInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  contentColumn: {
    flex: 1,
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAE1D3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  completedTimePill: {
    backgroundColor: '#E2D6C5',
  },
  timeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  completedTimeText: {
    color: Colors.rooms.mutedText,
    fontWeight: '500',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDF0E5',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F8DFC9',
  },
  reminderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C96A25',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  actionBtn: {
    padding: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    lineHeight: 20,
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.rooms.mutedText,
  },
  description: {
    fontSize: 12.5,
    color: '#60584F',
    lineHeight: 17,
    marginBottom: 8,
  },
  completedDescription: {
    color: '#8A8277',
  },
  placePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4ECE0',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E8DCCF',
    marginTop: 2,
    gap: 6,
  },
  placePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  placeName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.darkText,
    maxWidth: 140,
  },
  placeAddress: {
    fontSize: 11,
    color: Colors.rooms.mutedText,
    flex: 1,
  },
  mapsShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E6D9C8',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mapsShortcutText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
});
