import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  return (
    <View style={styles.container}>
      {days.map((group, groupIndex) => {
        const completedCount = group.activities.filter((a) => a.isCompleted).length;
        const totalCount = group.activities.length;
        const isDayAllDone = totalCount > 0 && completedCount === totalCount;

        return (
          <View key={group.date || String(groupIndex)} style={styles.dayGroup}>
            {/* Day Header */}
            <View style={styles.dayHeaderRow}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>Day {groupIndex + 1}</Text>
              </View>

              <View style={styles.dayDateBlock}>
                <Text style={styles.dayDateText}>{group.formattedDate}</Text>
                <Text style={styles.dayCounterText}>
                  {completedCount}/{totalCount} completed
                </Text>
              </View>

              {canEdit && (
                <TouchableOpacity
                  style={styles.addDayBtn}
                  onPress={() => onAddActivityForDate(group.date)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="plus" size={14} color={Colors.rooms.forestGreen} />
                  <Text style={styles.addDayBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Timeline Activities */}
            <View style={styles.timelineWrapper}>
              {/* Vertical line running through the day */}
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
                    />

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
    paddingBottom: 100,
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayBadge: {
    backgroundColor: Colors.rooms.forestGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 10,
  },
  dayBadgeText: {
    color: '#FFFDF9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dayDateBlock: {
    flex: 1,
  },
  dayDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  dayCounterText: {
    fontSize: 12,
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
    fontWeight: '600',
    color: Colors.rooms.forestGreen,
  },
  timelineWrapper: {
    position: 'relative',
    paddingLeft: 16,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 21,
    top: 6,
    bottom: 20,
    width: 2,
    backgroundColor: '#E5D6C5',
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C96A25',
    borderWidth: 2,
    borderColor: '#F4EBDD',
    zIndex: 2,
  },
  timelineDotCompleted: {
    backgroundColor: Colors.rooms.forestGreen,
  },
  cardWrapper: {
    flex: 1,
  },
});
