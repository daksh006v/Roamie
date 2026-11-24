import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { GalleryFilter } from './galleryTypes';

interface MemberFilterItem {
  _id: string;
  name: string;
  avatar?: string;
}

interface GalleryFilterBarProps {
  currentFilter: GalleryFilter;
  onFilterChange: (filter: GalleryFilter) => void;
  members: MemberFilterItem[];
  totalPhotos: number;
  myPhotosCount: number;
}

export const GalleryFilterBar: React.FC<GalleryFilterBarProps> = ({
  currentFilter,
  onFilterChange,
  members,
  totalPhotos,
  myPhotosCount,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Photos Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            currentFilter === 'all' && styles.activeChip,
          ]}
          onPress={() => onFilterChange('all')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.chipText,
              currentFilter === 'all' && styles.activeChipText,
            ]}
          >
            All ({totalPhotos})
          </Text>
        </TouchableOpacity>

        {/* My Photos Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            currentFilter === 'my' && styles.activeChip,
          ]}
          onPress={() => onFilterChange('my')}
          activeOpacity={0.75}
        >
          <Feather
            name="user"
            size={13}
            color={currentFilter === 'my' ? '#FFFFFF' : Colors.rooms.forestGreen}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.chipText,
              currentFilter === 'my' && styles.activeChipText,
            ]}
          >
            Mine ({myPhotosCount})
          </Text>
        </TouchableOpacity>

        {/* Member-specific Chips */}
        {members.map((member) => {
          const isSelected = currentFilter === member._id;
          const initials = (member.name || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <TouchableOpacity
              key={member._id}
              style={[
                styles.chip,
                isSelected && styles.activeChip,
              ]}
              onPress={() => onFilterChange(member._id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.initialsCircle,
                  isSelected && styles.activeInitialsCircle,
                ]}
              >
                <Text
                  style={[
                    styles.initialsText,
                    isSelected && styles.activeInitialsText,
                  ]}
                >
                  {initials}
                </Text>
              </View>
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.activeChipText,
                ]}
                numberOfLines={1}
              >
                {member.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#F8F1E5',
    borderWidth: 1,
    borderColor: '#E2D5C3',
  },
  activeChip: {
    backgroundColor: Colors.rooms.forestGreen,
    borderColor: Colors.rooms.forestGreen,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.rooms.darkText,
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  initialsCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5D8C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  activeInitialsCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  initialsText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.rooms.forestGreen,
  },
  activeInitialsText: {
    color: '#FFFFFF',
  },
});
