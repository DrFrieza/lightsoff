/**
 * Mobile App Design System — Design Tokens
 * Source: Design System1_Mobile Apps (Figma)
 *
 * Usage (JS/TS):
 *   import { tokens } from './tokens'
 *   tokens.color.primary[500]          // '#006FFD'
 *   tokens.typography.scale.h1.fontSize // 24
 *   tokens.spacing[6]                  // 24
 *
 * Usage (destructured):
 *   const { color, spacing, radius, shadow, typography, motion } = tokens
 */

// ─────────────────────────────────────────────────────────
// COLOR
// ─────────────────────────────────────────────────────────

export const color = {
  /** Primary blue — highlight / interactive */
  primary: {
    900: '#003D8F',
    700: '#004FC7',
    500: '#006FFD', // ← base / default
    400: '#2897FF',
    300: '#6FBAFF',
    200: '#B4DBFF',
    100: '#EAF2FF',
  },

  /** Dark-mode primary (brighter for WCAG on dark surfaces) */
  primaryDark: '#0A84FF',

  /** Neutral — light grey scale */
  neutralLight: {
    600: '#C8C9CF',
    500: '#D4D6DD', // border default
    400: '#E8E9F1', // divider, icon bg
    300: '#F5F5F5', // card bg
    200: '#F5F6FA', // shell / search bg
    100: '#F8F9FE', // input bg
    0:   '#FFFFFF',
  },

  /** Neutral — dark grey scale */
  neutralDark: {
    900: '#1F2024', // text primary (light mode)
    800: '#2F3036',
    700: '#494A50',
    600: '#71727A', // text secondary
    500: '#8F9098', // text muted / placeholder
  },

  /** Semantic support */
  success: {
    500: '#3AC0A0',
    100: '#E7F4E8',
  },
  warning: {
    500: '#FFB37C',
    100: '#FFF4E4',
  },
  error: {
    500: '#FF616D',
    400: '#FF453A', // dark-mode error
    100: '#FFE2E5',
  },

  /** Fixed / always-on */
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
} as const;

// ─────────────────────────────────────────────────────────
// SEMANTIC COLOR ALIASES
// (light mode — swap overrides for dark mode below)
// ─────────────────────────────────────────────────────────

export const semantic = {
  light: {
    bg:            color.neutralLight[0],
    bgShell:       color.neutralLight[200],
    bgCard:        color.neutralLight[300],
    bgInput:       color.neutralLight[100],
    bgNavBar:      color.neutralLight[0],
    bgTabBar:      color.neutralLight[0],
    bgBubbleRecv:  color.neutralLight[200],

    border:        color.neutralLight[500],
    borderFocus:   color.primary[500],
    divider:       color.neutralLight[400],
    iconBg:        color.neutralLight[400],

    textPrimary:   color.neutralDark[900],
    textSecondary: color.neutralDark[600],
    textMuted:     color.neutralDark[500],
    textLink:      color.primary[500],
    textOnPrimary: color.white,

    primary:       color.primary[500],
    primaryBg:     color.primary[100],

    searchBg:      color.neutralLight[200],
    segActiveBg:   color.neutralLight[0],
    segBg:         color.neutralLight[200],

    logoutBg:      color.error[100],
    logoutText:    color.error[500],
  },

  dark: {
    bg:            '#000000',
    bgShell:       '#1C1C1E',
    bgCard:        '#2C2C2E',
    bgInput:       '#2C2C2E',
    bgNavBar:      '#1C1C1E',
    bgTabBar:      '#1C1C1E',
    bgBubbleRecv:  '#2C2C2E',

    border:        '#3A3A3C',
    borderFocus:   color.primaryDark,
    divider:       '#38383A',
    iconBg:        '#2C2C2E',

    textPrimary:   '#FFFFFF',
    textSecondary: 'rgba(235,235,245,0.60)',
    textMuted:     'rgba(235,235,245,0.30)',
    textLink:      color.primaryDark,
    textOnPrimary: color.white,

    primary:       color.primaryDark,
    primaryBg:     'rgba(10,132,255,0.15)',

    searchBg:      '#1C1C1E',
    segActiveBg:   '#3A3A3C',
    segBg:         '#1C1C1E',

    logoutBg:      'rgba(255,97,109,0.15)',
    logoutText:    color.error[400],
  },
} as const;

// ─────────────────────────────────────────────────────────
// SPACING  (base-4 scale, values in px)
// ─────────────────────────────────────────────────────────

export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;

// ─────────────────────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────────────────────

export const radius = {
  none:   0,
  xs:     4,   // small badge / tag edge
  sm:     8,   // small card, inner elements
  md:     12,  // buttons, inputs
  lg:     16,  // cards, panels
  xl:     20,  // large icon containers
  '2xl':  24,
  full:   9999, // pill / circle
} as const;

// ─────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────

export const shadow = {
  none: 'none',
  sm:   '0 2px 8px rgba(0,0,0,0.05)',
  md:   '0 4px 12px rgba(0,0,0,0.12)',
  lg:   '0 8px 24px rgba(0,0,0,0.20)',
  xl:   '0 16px 48px rgba(0,0,0,0.30)',

  /** Dark-mode equivalents (stronger because surfaces are dark) */
  dark: {
    sm: '0 2px 8px rgba(0,0,0,0.30)',
    md: '0 4px 12px rgba(0,0,0,0.40)',
    lg: '0 8px 24px rgba(0,0,0,0.60)',
  },
} as const;

// ─────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────

export const fontFamily = {
  display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  text:    "'SF Pro Text',    -apple-system, BlinkMacSystemFont, sans-serif",
  rounded: "'SF Pro Rounded', -apple-system, BlinkMacSystemFont, sans-serif",
  mono:    "'SF Mono', 'Fira Code', monospace",
} as const;

export const fontWeight = {
  ultralight: 100,
  thin:       200,
  light:      300,
  regular:    400,
  medium:     500,
  semibold:   600,
  bold:       700,
  heavy:      800,  // = ExtraBold in Inter terms
  black:      900,
} as const;

export const fontSize = {
  '2xs': 8,
  xs:    10,
  sm:    12,
  base:  14,
  md:    16,
  lg:    17,
  xl:    18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 48,
  '7xl': 56,
  '8xl': 96,
} as const;

export const lineHeight = {
  tight:   1.0,
  snug:    1.2,
  normal:  1.4,
  relaxed: 1.5,
  loose:   1.6,
} as const;

export const letterSpacing = {
  tighter: '-0.02em',
  tight:   '-0.01em',
  normal:   '0em',
  wide:     '0.01em',
  wider:    '0.05em',
  widest:   '0.10em',
} as const;

/**
 * Named text styles — mirrors the Figma type scale exactly.
 * Use `fontFamily.display` for sizes ≥20px, `fontFamily.text` below.
 */
export const textStyle = {
  // ── Display (SF Pro Display) ──────────────
  largeTitle: {
    fontFamily:    fontFamily.display,
    fontWeight:    fontWeight.heavy,
    fontSize:      fontSize['4xl'],  // 28
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h1: {
    fontFamily:    fontFamily.display,
    fontWeight:    fontWeight.bold,
    fontSize:      fontSize['3xl'],  // 24
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily:    fontFamily.display,
    fontWeight:    fontWeight.semibold,
    fontSize:      fontSize['2xl'],  // 20
    lineHeight:    lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },

  // ── UI Text (SF Pro Text) ─────────────────
  headline: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.semibold,
    fontSize:      fontSize.lg,      // 17
    lineHeight:    lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  bodyL: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.regular,
    fontSize:      fontSize.md,      // 16
    lineHeight:    lineHeight.relaxed,
    letterSpacing: letterSpacing.wide,
  },
  bodyM: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.regular,
    fontSize:      fontSize.base,    // 14
    lineHeight:    lineHeight.relaxed,
    letterSpacing: letterSpacing.wide,
  },
  bodyS: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.regular,
    fontSize:      fontSize.sm,      // 12
    lineHeight:    lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  bodyXS: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.medium,
    fontSize:      fontSize.xs,      // 10
    lineHeight:    lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  actionM: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.semibold,
    fontSize:      fontSize.base,    // 14
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.wide,
  },
  actionS: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.semibold,
    fontSize:      fontSize.sm,      // 12
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.wide,
  },
  caption: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.semibold,
    fontSize:      fontSize.xs,      // 10
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontFamily:    fontFamily.text,
    fontWeight:    fontWeight.bold,
    fontSize:      fontSize['2xs'],  // 8
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },

  // ── Rounded (SF Pro Rounded) ──────────────
  badge: {
    fontFamily:    fontFamily.rounded,
    fontWeight:    fontWeight.semibold,
    fontSize:      fontSize.xs,      // 10
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.normal,
  },
  tag: {
    fontFamily:    fontFamily.rounded,
    fontWeight:    fontWeight.bold,
    fontSize:      fontSize.sm,      // 12
    lineHeight:    lineHeight.tight,
    letterSpacing: letterSpacing.normal,
  },
} as const;

// ─────────────────────────────────────────────────────────
// LAYOUT / SCREEN
// ─────────────────────────────────────────────────────────

export const screen = {
  designWidth:   375,  // iOS standard
  designHeight:  812,  // iPhone X+
  statusBarHeight:  44,
  navBarHeight:     56,
  tabBarHeight:     83,
  homeIndicator:    34,
  keyboardPortrait: 293,
  paddingH:         24, // horizontal screen padding
  contentMaxWidth:  327, // 375 - 2*24
} as const;

// ─────────────────────────────────────────────────────────
// COMPONENT TOKENS  (sizing, not color)
// ─────────────────────────────────────────────────────────

export const component = {
  button: {
    heightLg:     52,
    heightMd:     48,
    heightSm:     40,
    paddingH:     24,
    borderRadius: radius.md,       // 12
    fontStyle:    textStyle.actionM,
  },
  input: {
    height:       52,
    heightSm:     44,
    borderRadius: radius.md,       // 12
    borderWidth:  1.5,
    paddingH:     14,
    fontStyle:    textStyle.bodyM,
  },
  card: {
    borderRadius: radius.lg,       // 16
    padding:      spacing[4],      // 16
    gap:          spacing[4],      // 16
  },
  cardHorizontal: {
    borderRadius: radius.lg,       // 16
    imageWidth:   80,
    height:       72,
  },
  listItem: {
    height:       56,
    paddingH:     spacing[6],      // 24
    gap:          spacing[3],      // 12
    iconSize:     36,
    iconRadius:   radius.sm,       // 8 (becomes 10 in Figma — use radius.sm or 10)
  },
  avatar: {
    sm:   32,
    md:   40,
    lg:   56,
    xl:   80,
  },
  toggle: {
    width:        51,
    height:       31,
    knobSize:     27,
    borderRadius: radius.full,
  },
  badge: {
    paddingH:     8,
    paddingV:     3,
    borderRadius: radius.full,
    fontStyle:    textStyle.badge,
  },
  tag: {
    paddingH:     10,
    paddingV:     4,
    borderRadius: radius.full,
    fontStyle:    textStyle.tag,
  },
  progressBar: {
    height:       6,
    borderRadius: radius.xs,       // 4
  },
  searchBar: {
    height:       44,
    borderRadius: radius.md,       // 12
    paddingH:     14,
  },
  divider: {
    height: 1,
  },
  navBar: {
    height: screen.navBarHeight,   // 56
  },
  tabBar: {
    height:    screen.tabBarHeight, // 83
    iconSize:  24,
    labelSize: fontSize.xs,        // 10
  },
} as const;

// ─────────────────────────────────────────────────────────
// MOTION / ANIMATION
// ─────────────────────────────────────────────────────────

export const motion = {
  duration: {
    instant:  0,
    fast:     150,
    normal:   250,
    slow:     400,
    slower:   600,
  },
  easing: {
    linear:     'linear',
    easeIn:     'cubic-bezier(0.4, 0, 1, 1)',
    easeOut:    'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut:  'cubic-bezier(0.4, 0, 0.2, 1)',
    spring:     'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    ios:        'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // UIKit default
  },
  transition: {
    color:      'color 150ms cubic-bezier(0.4,0,0.2,1)',
    background: 'background 300ms cubic-bezier(0.4,0,0.2,1)',
    opacity:    'opacity 150ms cubic-bezier(0.4,0,0.2,1)',
    transform:  'transform 250ms cubic-bezier(0.4,0,0.2,1)',
    all:        'all 250ms cubic-bezier(0.4,0,0.2,1)',
  },
} as const;

// ─────────────────────────────────────────────────────────
// Z-INDEX STACK
// ─────────────────────────────────────────────────────────

export const zIndex = {
  base:     0,
  raised:   10,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
  tooltip:  600,
} as const;

// ─────────────────────────────────────────────────────────
// MASTER EXPORT
// ─────────────────────────────────────────────────────────

const tokens = {
  color,
  semantic,
  spacing,
  radius,
  shadow,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  textStyle,
  screen,
  component,
  motion,
  zIndex,
} as const;

export default tokens;

// ─────────────────────────────────────────────────────────
// TYPE HELPERS  (auto-generated from const object shapes)
// ─────────────────────────────────────────────────────────

export type Tokens        = typeof tokens;
export type ColorScale    = typeof color;
export type SemanticLight = typeof semantic.light;
export type SemanticDark  = typeof semantic.dark;
export type SpacingScale  = typeof spacing;
export type RadiusScale   = typeof radius;
export type TextStyle     = typeof textStyle;
export type MotionTokens  = typeof motion;
