// TWEEBS Theme
// Pastel palette on a dark blue-grey base.
// Access as: theme.main, theme.blue, theme.textMuted, etc.
// CSS custom properties mirror these values in global.css.

export const theme = {
  // Core surface colors (dark blue-grey family based on main)
  main: '#282f37',
  bgDeep: '#1e252c',
  bg: '#282f37',
  bgCard: '#303840',
  bgHover: '#383f48',
  bgElevated: '#404850',

  // Text (greyscale)
  text: '#F7F7F7',
  textSecondary: '#BFBDBD',
  textMuted: '#808082',
  textFaint: '#4e5155',

  // Borders
  border: '#383f48',
  borderSubtle: '#303840',

  // Palette — pastel accent colors
  red: '#ee9e97',
  orange: '#edc292',
  yellow: '#f0d37c',
  green: '#d0d8a3',
  teal: '#a8d6d5',
  blue: '#a3cbe5',
  indigo: '#97a5d3',
  purple: '#a083b5',
  pink: '#e1819b',

  // Semantic
  accent: '#a3cbe5',
  accentHover: '#b7d7ed',
  success: '#d0d8a3',
  warning: '#edc292',
  error: '#e1819b',

  // Radius
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',
} as const

// Role → color mapping for avatars and card accents
export const roleColor: Record<string, string> = {
  pm: theme.blue,
  architect: theme.teal,
  'ux-designer': theme.purple,
  'frontend-engineer': theme.green,
  'backend-engineer': theme.yellow,
  'mobile-engineer': theme.red,
  'qa-engineer': theme.orange,
  sdet: theme.pink,
}

export type ThemeKey = keyof typeof theme
