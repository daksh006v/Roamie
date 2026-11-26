import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export type TagIconName = React.ComponentProps<typeof Ionicons>['name'];

export interface TagConfig {
  key: string;
  label: string;
  icon: TagIconName;
  category: string;
  bgColor: string;
  textColor: string;
  pillBg: string;
}

export const TAG_PRESETS: TagConfig[] = [
  {
    key: 'general',
    label: 'General',
    icon: 'receipt-outline',
    category: 'other',
    bgColor: '#EFF0EA',
    textColor: '#3D5A4A',
    pillBg: '#E3E4DB',
  },
  {
    key: 'food',
    label: 'Food',
    icon: 'restaurant-outline',
    category: 'food',
    bgColor: '#FAF1E5',
    textColor: '#B65919',
    pillBg: '#F5E2CB',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    icon: 'moon-outline',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    icon: 'sunny-outline',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'breakfast',
    label: 'Breakfast',
    icon: 'partly-sunny-outline',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'coffee',
    label: 'Coffee',
    icon: 'cafe-outline',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'drinks',
    label: 'Drinks',
    icon: 'wine-outline',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'snacks',
    label: 'Snacks',
    icon: 'fast-food-outline',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#B65919',
    pillBg: '#FDEBD0',
  },
  {
    key: 'stay',
    label: 'Stay',
    icon: 'home-outline',
    category: 'stay',
    bgColor: '#EAF1EA',
    textColor: '#4E7A52',
    pillBg: '#D4E6D6',
  },
  {
    key: 'hotel',
    label: 'Hotel',
    icon: 'bed-outline',
    category: 'stay',
    bgColor: '#EAF1EA',
    textColor: '#4E7A52',
    pillBg: '#D4E6D6',
  },
  {
    key: 'transport',
    label: 'Transport',
    icon: 'car-outline',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'cab',
    label: 'Cab',
    icon: 'car-sport-outline',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'fuel',
    label: 'Fuel',
    icon: 'flash-outline',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'train',
    label: 'Train',
    icon: 'train-outline',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'flight',
    label: 'Flight',
    icon: 'airplane-outline',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'tickets',
    label: 'Tickets',
    icon: 'ticket-outline',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'activity',
    label: 'Activity',
    icon: 'compass-outline',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'tour',
    label: 'Tour',
    icon: 'map-outline',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'shopping',
    label: 'Shopping',
    icon: 'bag-handle-outline',
    category: 'shopping',
    bgColor: '#F9E8EF',
    textColor: '#B6487B',
    pillBg: '#F2D1E0',
  },
  {
    key: 'souvenirs',
    label: 'Souvenirs',
    icon: 'gift-outline',
    category: 'shopping',
    bgColor: '#F9E8EF',
    textColor: '#B6487B',
    pillBg: '#F2D1E0',
  },
  {
    key: 'medical',
    label: 'Medical',
    icon: 'medkit-outline',
    category: 'other',
    bgColor: '#FCEAEA',
    textColor: '#B91C1C',
    pillBg: '#F9D2D2',
  },
  {
    key: 'group',
    label: 'Group',
    icon: 'people-outline',
    category: 'other',
    bgColor: '#EFF0EA',
    textColor: '#3D5A4A',
    pillBg: '#E3E4DB',
  },
];

export const GENERAL_TAG = TAG_PRESETS[0];

export const getTagConfig = (tagKey: string): TagConfig => {
  const lower = (tagKey || 'general').toLowerCase().replace(/^#/, '');
  return TAG_PRESETS.find((t) => t.key === lower) || GENERAL_TAG;
};

export const tagToCategory = (tags: string[]): string => {
  if (!tags || tags.length === 0) return 'other';
  const priority = ['stay', 'travel', 'shopping', 'activities', 'food', 'other'];
  let best = 5;
  let bestCat = 'other';
  for (const t of tags) {
    const cfg = getTagConfig(t);
    const idx = priority.indexOf(cfg.category);
    if (idx >= 0 && idx < best) {
      best = idx;
      bestCat = cfg.category;
    }
  }
  return bestCat;
};

export const getCategoryConfig = (
  category: string
): { icon: TagIconName; label: string; bgColor: string; textColor: string; pillBg: string } => {
  const keyMap: Record<string, string> = {
    food: 'food',
    stay: 'stay',
    travel: 'transport',
    activities: 'activity',
    shopping: 'shopping',
    other: 'general',
  };
  const cfg = getTagConfig(keyMap[category] || 'general');
  return {
    icon: cfg.icon,
    label: cfg.label,
    bgColor: cfg.bgColor,
    textColor: cfg.textColor,
    pillBg: cfg.pillBg,
  };
};

export const CATEGORY_OPTIONS: { key: string; label: string; icon: TagIconName }[] = [
  { key: 'food', label: 'Food', icon: 'restaurant-outline' },
  { key: 'stay', label: 'Stay', icon: 'home-outline' },
  { key: 'travel', label: 'Transport', icon: 'car-outline' },
  { key: 'activities', label: 'Activities', icon: 'compass-outline' },
  { key: 'shopping', label: 'Shopping', icon: 'bag-handle-outline' },
  { key: 'other', label: 'Other', icon: 'receipt-outline' },
];

export const getIconForTags = (
  tags: string[] | undefined,
  _paidBy?: any
): { icon: TagIconName; bgColor: string; textColor: string } => {
  if (tags && tags.length > 0) {
    const cfg = getTagConfig(tags[0]);
    return { icon: cfg.icon, bgColor: cfg.bgColor, textColor: cfg.textColor };
  }
  return { icon: 'receipt-outline', bgColor: '#EFF0EA', textColor: '#3D5A4A' };
};
