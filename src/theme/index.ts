// src/theme/index.ts
import {Dimensions} from 'react-native';

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface ThemeColors {
  primary: ColorShades;
  gray: ColorShades;
  success: string;
  error: string;
  warning: string;
  info: string;
  white: string;
  black: string;
  transparent: string;
  background: {
    light: string;
    dark: string;
  };
  card: {
    light: string;
    dark: string;
  };
  text: {
    light: string;
    dark: string;
    dimLight: string;
    dimDark: string;
  };
  border: {
    light: string;
    dark: string;
  };
}

export interface Typography {
  fontFamily: {
    regular: string;
    medium: string;
    semiBold: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  lineHeight: {
    none: number;
    tight: number;
    normal: number;
    relaxed: number;
  };
}

export interface Shadow {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeType {
  colors: ThemeColors;
  typography: Typography;
  spacing: Record<string | number, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, Shadow>;
  screenSize: {
    width: number;
    height: number;
    isSmallDevice: boolean;
  };
  common: Record<string, any>;
}

const {width, height} = Dimensions.get('window');

// Color palette
const colors: ThemeColors = {
  // Primary colors (green from your config)
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#16a34a',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // UI states
  success: '#16A34A',
  error: '#DC2626',
  warning: '#FBBF24',
  info: '#3B82F6',

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // App specific - using your dark theme values
  background: {
    light: '#F9FAFB',
    dark: '#000000', // Pure black from your dark.bg
  },
  card: {
    light: '#FFFFFF',
    dark: '#111111', // From your dark.card
  },
  text: {
    light: '#111827',
    dark: '#ffffff', // From your dark.text
    dimLight: '#6B7280',
    dimDark: '#a0a0a0', // From your dark.text-dim
  },
  border: {
    light: '#E5E7EB',
    dark: '#2d2d2d', // From your dark.border
  },
};

// Typography
const typography: Typography = {
  fontFamily: {
    regular: 'System', // Replace with your custom fonts if needed
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
const spacing: Record<string | number, number> = {
  px: 1,
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  // Additional values omitted for brevity
  // Include remaining values from original spacing
};

// Border radius
const borderRadius: Record<string, number> = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

// Shadows
const shadows: Record<string, Shadow> = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Screen dimensions
const screenSize = {
  width,
  height,
  isSmallDevice: width < 375,
};

// Common styles
const common = {
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background.light,
    padding: spacing[4],
  },
  cardContainer: {
    backgroundColor: colors.card.light,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.md,
  },
};

const theme: ThemeType = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  screenSize,
  common,
};

export default theme;
