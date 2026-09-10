export interface TagConfig {
  key: string;
  label: string;
  emoji: string;
  category: string;
  bgColor: string;
  textColor: string;
  pillBg: string;
}

export const TAG_PRESETS: TagConfig[] = [
  {
    key: 'general',
    label: 'general',
    emoji: '🧾',
    category: 'other',
    bgColor: '#EFF0EA',
    textColor: '#3D5A4A',
    pillBg: '#E3E4DB',
  },
  {
    key: 'food',
    label: 'food',
    emoji: '🍽️',
    category: 'food',
    bgColor: '#FAF1E5',
    textColor: '#B65919',
    pillBg: '#F5E2CB',
  },
  {
    key: 'dinner',
    label: 'dinner',
    emoji: '🌮',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'lunch',
    label: 'lunch',
    emoji: '🥗',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'breakfast',
    label: 'breakfast',
    emoji: '🥐',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'restaurant',
    label: 'restaurant',
    emoji: '🍛',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#B65919',
    pillBg: '#FDEBD0',
  },
  {
    key: 'snacks',
    label: 'snacks',
    emoji: '🍿',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#B65919',
    pillBg: '#FDEBD0',
  },
  {
    key: 'stay',
    label: 'stay',
    emoji: '🏨',
    category: 'stay',
    bgColor: '#EAF1EA',
    textColor: '#4E7A52',
    pillBg: '#D4E6D6',
  },
  {
    key: 'hotel',
    label: 'hotel',
    emoji: '🛖',
    category: 'stay',
    bgColor: '#EAF1EA',
    textColor: '#4E7A52',
    pillBg: '#D4E6D6',
  },
  {
    key: 'booking',
    label: 'booking',
    emoji: '🛏️',
    category: 'stay',
    bgColor: '#EAF1EA',
    textColor: '#4E7A52',
    pillBg: '#D4E6D6',
  },
  {
    key: 'resort',
    label: 'resort',
    emoji: '🏝️',
    category: 'stay',
    bgColor: '#EAF1EA',
    textColor: '#4E7A52',
    pillBg: '#D4E6D6',
  },
  {
    key: 'transport',
    label: 'transport',
    emoji: '🚕',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'travel',
    label: 'travel',
    emoji: '🚗',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'cab',
    label: 'cab',
    emoji: '🚖',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'fuel',
    label: 'fuel',
    emoji: '⛽',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'train',
    label: 'train',
    emoji: '🚆',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'flight',
    label: 'flight',
    emoji: '✈️',
    category: 'travel',
    bgColor: '#FBE9E2',
    textColor: '#B7602C',
    pillBg: '#F7D4C4',
  },
  {
    key: 'tickets',
    label: 'tickets',
    emoji: '🎟️',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'activity',
    label: 'activity',
    emoji: '🎯',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'activities',
    label: 'activities',
    emoji: '🏄',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'waterpark',
    label: 'waterpark',
    emoji: '💦',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'tour',
    label: 'tour',
    emoji: '🧭',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'drinks',
    label: 'drinks',
    emoji: '🍻',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'coffee',
    label: 'coffee',
    emoji: '☕',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'dessert',
    label: 'dessert',
    emoji: '🍧',
    category: 'food',
    bgColor: '#FEF3E7',
    textColor: '#C96A25',
    pillBg: '#FDEBD0',
  },
  {
    key: 'shopping',
    label: 'shopping',
    emoji: '🛍️',
    category: 'shopping',
    bgColor: '#F9E8EF',
    textColor: '#B6487B',
    pillBg: '#F2D1E0',
  },
  {
    key: 'souvenirs',
    label: 'souvenirs',
    emoji: '🎁',
    category: 'shopping',
    bgColor: '#F9E8EF',
    textColor: '#B6487B',
    pillBg: '#F2D1E0',
  },
  {
    key: 'goa',
    label: 'goa',
    emoji: '🌊',
    category: 'activities',
    bgColor: '#E7EDF3',
    textColor: '#435E7A',
    pillBg: '#CFDCEA',
  },
  {
    key: 'group',
    label: 'group',
    emoji: '👥',
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

export const getCategoryConfig = (category: string): { emoji: string; label: string; bgColor: string; textColor: string; pillBg: string } => {
  const keyMap: Record<string, string> = {
    food: 'food',
    stay: 'stay',
    travel: 'transport',
    activities: 'activities',
    shopping: 'shopping',
    other: 'general',
  };
  const cfg = getTagConfig(keyMap[category] || 'general');
  return {
    emoji: cfg.emoji,
    label: cfg.key.charAt(0).toUpperCase() + cfg.key.slice(1),
    bgColor: cfg.bgColor,
    textColor: cfg.textColor,
    pillBg: cfg.pillBg,
  };
};

export const CATEGORY_OPTIONS: { key: string; label: string; emoji: string }[] = [
  { key: 'food', label: 'Food', emoji: '🍽️' },
  { key: 'stay', label: 'Stay', emoji: '🏨' },
  { key: 'travel', label: 'Transport', emoji: '🚗' },
  { key: 'activities', label: 'Activities', emoji: '🎯' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { key: 'other', label: 'Other', emoji: '🧾' },
];

export const getIconForTags = (tags: string[] | undefined, paidBy?: any): { emoji: string; bgColor: string; textColor: string } => {
  if (tags && tags.length > 0) {
    const cfg = getTagConfig(tags[0]);
    return { emoji: cfg.emoji, bgColor: cfg.bgColor, textColor: cfg.textColor };
  }
  return { emoji: '🧾', bgColor: '#EFF0EA', textColor: '#3D5A4A' };
};
