// Color palette matching the web app
export const colors = {
  // Primary
  primary: '#4A90D9',
  primaryDark: '#357ABD',
  primaryLight: '#6BA3E0',

  // Status
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#00BCD4',

  // Background
  bg: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  bgTertiary: '#F1F5F9',

  // Text
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Calendar specific
  today: '#4A90D9',
  weekend: '#E74C3C',
  holiday: '#27AE60',
  workday: '#F39C12',
  festival: '#E67E22',
  solarTerm: '#8E44AD',
} as const;

export type ColorKey = keyof typeof colors;
