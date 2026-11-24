import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { DayScheduleGroup, ItineraryItem, SavedPlace } from './itineraryTypes';
import { ActivityCard } from './ActivityCard';

interface DayScheduleListProps {
  days: DayScheduleGroup[];
  canEdit: boolean;
  onToggleComplete: (item: ItineraryItem) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (item: ItineraryItem) => void;
  onPlacePress?: (place: SavedPlace) => void;
  onAddActivityForDate: (dateString: string) => void;
}

export const DayScheduleList: React.FC<DayScheduleListProps> = ({
  days,
  canEdit,
  onToggleComplete,
  onEditItem,
  onDeleteItem,
  onPlacePress,
  onAddActivityForDate,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | 'all'>('all');

  const displayedDays =
    selectedDayIndex === 'all'
      ? days
      : [days[selectedDayIndex]].filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Horizontal Day Switcher Carousel */}
      {days.length > 1 && (
        <View style={styles.dayFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.dayFilterChip,
                selectedDayIndex === 'all' && styles.dayFilterChipActive,
              ]}
              onPress={() => setSelectedDayIndex('all')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.dayFilterChipText,
                  selectedDayIndex === 'all' && styles.dayFilterChipTextActive,
                ]}
              >
                All Days ({days.length})
              </Text>
            </TouchableOpacity>

            {days.map((group, idx) => {
              const isActive = selectedDayIndex === idx;
              const completedCount = group.activities.filter((a) => a.isCompleted).length;
              const totalCount = group.activities.length;
              const isAllDone = totalCount > 0 && completedCount === totalCount;

              return (
                <TouchableOpacity
                  key={group.date || String(idx)}
                  style={[
                    styles.dayFilterChip,
                    isActive && styles.dayFilterChipActive,
                  ]}
                  onPress={() => setSelectedDayIndex(idx)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.dayFilterChipText,
                      isActive && styles.dayFilterChipTextActive,
                    ]}
                  >
                    Day {idx + 1}
                  </Text>
                  <View
                    style={[
                      styles.dayChipBadge,
                      isActive && styles.dayChipBadgeActive,
                      isAllDone && styles.dayChipBadgeDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayChipBadgeText,
                        isActive && styles.dayChipBadgeTextActive,
                      ]}
                    >
                      {completedCount}/{totalCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Render Days */}
      {displayedDays.map((group) => {
        // Find actual index in parent days list for proper "Day X" label
        const actualIndex = days.findIndex((d) => d.date === group.date);
        const dayNumber = actualIndex !== -1 ? actualIndex + 1 : 1;
        const completedCount = group.activities.filter((a) => a.isCompleted).length;
        const totalCount = group.activities.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const isDayAllDone = totalCount > 0 && completedCount === totalCount;

        return (
          <View key={group.date || String(dayNumber)} style={styles.dayGroup}>
            {/* Day Header Row */}
            <View style={styles.dayHeaderRow}>
              <View style={[styles.dayBadge, isDayAllDone && styles.dayBadgeDone]}>
                <Ionicons
                  name={isDayAllDone ? 'checkmark-circle' : 'calendar'}
                  size={12}
                  color="#FFFDF9"
                />
                <Text style={styles.dayBadgeText}>Day {dayNumber}</Text>
              </View>

              <View style={styles.dayDateBlock}>
                <Text style={styles.dayDateText}>{group.formattedDate}</Text>
                <Text style={styles.dayCounterText}>
                  {completedCount}/{totalCount} completed · {percentage}%
                </Text>
              </View>

              {canEdit && (
                <TouchableOpacity
                  style={styles.addDayBtn}
                  onPress={() => onAddActivityForDate(group.date)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="add-circle" size={15} color={Colors.rooms.forestGreen} />
                  <Text style={styles.addDayBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Timeline Activities with Connecting Track */}
            <View style={styles.timelineWrapper}>
              <View style={styles.verticalTimelineLine} />

              <View style={styles.activitiesContainer}>
                {group.activities.map((activity) => (
                  <View key={activity._id} style={styles.timelineItemWrapper}>
                    {/* Small timeline node dot */}
                    <View
                      style={[
                        styles.timelineDot,
                        activity.isCompleted && styles.timelineDotCompleted,
                      ]}
                    >
                      {activity.isCompleted ? (
                        <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                      ) : null}
                    </View>

                    {/* Activity Card */}
                    <View style={styles.cardWrapper}>
                      <ActivityCard
                        item={activity}
                        canEdit={canEdit}
                        onToggleComplete={onToggleComplete}
                        onEdit={onEditItem}
                        onDelete={onDeleteItem}
                        onPlacePress={onPlacePress}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 110,
  },
  dayFilterContainer: {
    marginBottom: 16,
  },
  dayFilterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  dayFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFD2C2',
  },
  dayFilterChipActive: {
    backgroundColor: Colors.rooms.forestGreen,
    borderColor: Colors.rooms.forestGreen,
  },
  dayFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
  },
  dayFilterChipTextActive: {
    color: '#FFFDF9',
  },
  dayChipBadge: {
    backgroundColor: '#EBE2D5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dayChipBadgeActive: {
    backgroundColor: 'rgba(255, 253, 249, 0.25)',
  },
  dayChipBadgeDone: {
    backgroundColor: '#D1E7D5',
  },
  dayChipBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  dayChipBadgeTextActive: {
    color: '#FFFDF9',
  },
  dayGroup: {
    marginBottom: 26,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C96A25',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 10,
  },
  dayBadgeDone: {
    backgroundColor: Colors.rooms.forestGreen,
  },
  dayBadgeText: {
    color: '#FFFDF9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dayDateBlock: {
    flex: 1,
  },
  dayDateText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.rooms.darkText,
    letterSpacing: -0.2,
  },
  dayCounterText: {
    fontSize: 11.5,
    color: Colors.rooms.mutedText,
    marginTop: 1,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBE2D5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFD2C2',
  },
  addDayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rooms.forestGreen,
  },
  timelineWrapper: {
    position: 'relative',
    paddingLeft: 16,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 21,
    top: 10,
    bottom: 24,
    width: 2,
    backgroundColor: '#E4D5C3',
    borderRadius: 1,
  },
  activitiesContainer: {
    paddingLeft: 16,
  },
  timelineItemWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  timelineDot: {
    position: 'absolute',
    left: -21,
    top: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C96A25',
    borderWidth: 2,
    borderColor: '#FAF7F2',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: Colors.rooms.forestGreen,
  },
  cardWrapper: {
    flex: 1,
  },
});
