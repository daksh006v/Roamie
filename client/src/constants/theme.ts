export const Colors = {
  // Parchment / Map Canvas Colors
  parchment: {
    base: '#F5ECE1',
    light: '#FAF4EB',
    card: '#FFFDF9',
    contour: '#EADBCB',
    dottedLine: '#D2BBA0',
    border: '#E8D9C8',
  },
  
  // Brand Warm Orange
  orange: {
    primary: '#EA580C',
    dark: '#C2410C',
    light: '#F97316',
    gradientStart: '#F97316',
    gradientEnd: '#EA580C',
    subtle: '#FFF7ED',
    border: '#FED7AA',
    badge: '#FFEDD5',
  },

  // Dark Navy for Bottom Features Section
  navy: {
    darkest: '#081324',
    dark: '#0C1B33',
    card: '#13284B',
    light: '#1E3A6B',
    textMuted: '#94A3B8',
    textLight: '#E2E8F0',
  },

  // Feature Badges
  features: {
    chat: '#0D9488',
    photos: '#F59E0B',
    itinerary: '#8B5CF6',
    expenses: '#F43F5E',
    places: '#10B981',
  },

  // Neutral / Text
  text: {
    primary: '#1E293B',
    secondary: '#475569',
    muted: '#78716C',
    light: '#FFFFFF',
    placeholder: '#94A3B8',
  },

  // UI States
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // System light/dark compatibility
  light: {
    text: '#1E293B',
    textSecondary: '#64748B',
    background: '#F5ECE1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FED7AA',
    tint: '#EA580C',
    icon: '#475569',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#EA580C',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    background: '#081324',
    backgroundElement: '#13284B',
    backgroundSelected: '#1E3A6B',
    tint: '#F97316',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#F97316',
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const MaxContentWidth = 600;
export const BottomTabInset = 16;

export const Fonts = {
  mono: 'Courier',
};

export const Shadows = {
  polaroid: {
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    shadowColor: '#3F2C18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const Typography = {
  logoFont: 'serif',
  titleSize: 28,
  subtitleSize: 14,
};
