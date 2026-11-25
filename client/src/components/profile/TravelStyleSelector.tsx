import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

const TRAVEL_STYLES: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { label: 'Explorer', icon: 'compass-outline' },
  { label: 'Foodie', icon: 'silverware-fork-knife' },
  { label: 'Backpacker', icon: 'bag-personal-outline' },
  { label: 'Roadtripper', icon: 'car-outline' },
  { label: 'Photographer', icon: 'camera-outline' },
  { label: 'Luxury', icon: 'diamond-stone' },
  { label: 'Chill', icon: 'palm-tree' },
];

interface TravelStyleSelectorProps {
  selectedStyle: string;
  onSelect: (style: string) => void;
}

export const TravelStyleSelector: React.FC<TravelStyleSelectorProps> = ({
  selectedStyle,
  onSelect,
}) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Travel Vibe</Text>
      <View style={styles.chipGrid}>
        {TRAVEL_STYLES.map((item) => {
          const isSelected = selectedStyle === item.label;
          return (
            <TouchableOpacity
              key={item.label}
              style={[styles.chip, isSelected && styles.activeChip]}
              onPress={() => onSelect(isSelected ? '' : item.label)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={15}
                color={isSelected ? '#FFFFFF' : Colors.rooms.forestGreen}
              />
              <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.rooms.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5EFE5',
    borderWidth: 1,
    borderColor: '#E3D7C7',
  },
  activeChip: {
    backgroundColor: Colors.rooms.forestGreen,
    borderColor: Colors.rooms.forestGreen,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.rooms.darkText,
  },
  activeChipText: {
    color: '#FFFFFF',
  },
});
