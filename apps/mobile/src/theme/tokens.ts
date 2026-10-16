/**
 * SafeSphere design tokens. Source of truth: /DESIGN.md and the approved
 * concept canvas (design/mockup). Light theme only.
 *
 * Color is semantic: red is reserved for SOS/danger, green for "safe" status,
 * amber for medium risk, blue for safe places and links. Everything else is neutral.
 */

export const colors = {
  ground: '#F4F5F7',
  card: '#FFFFFF',
  ink: '#0E1726',
  ink2: '#4B5563',
  ink3: '#626B79',
  iconMuted: '#8A93A0',
  hairline: '#E6E8EC',
  divider: '#EEF0F3',
  fill: '#F1F2F4',
  fillStrong: '#E6E8EC',
  toggleOff: '#E3E6EB',

  safe: '#12A26B',
  safeText: '#067A55',
  safeTint: '#E9F6F0',

  danger: '#D92D3A',
  dangerText: '#B42330',
  dangerTint: '#FDEEEF',

  warning: '#E08A00',
  warningText: '#92400E',
  warningTextAlt: '#B45309',
  warningTint: '#FFF4E5',

  info: '#2563EB',
  infoTint: '#EAF1FF',

  violet: '#6D28D9',
  violetTint: '#F2EEFF',

  white: '#FFFFFF',
  scrim: 'rgba(14,23,38,0.32)',
} as const;

export type ColorName = keyof typeof colors;

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

export const typography = {
  largeTitle: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  subhead: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  footnote: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 16, letterSpacing: 0.8 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  metric: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 30, letterSpacing: -0.5 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Horizontal screen gutter. */
  gutter: 20,
} as const;

export const radius = {
  sm: 9,
  md: 12,
  button: 16,
  card: 20,
  cardLarge: 22,
  sheet: 28,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#101828',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  floating: {
    shadowColor: '#101828',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sos: {
    shadowColor: '#D92D3A',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
} as const;

export const layout = {
  tabBarHeight: 84,
  sosTabSize: 62,
  buttonHeight: 52,
  buttonHeightLarge: 56,
  minTouch: 44,
} as const;

/** Motion: short, purposeful, always disabled when the OS asks for reduced motion. */
export const motion = {
  duration: {
    fast: 150,
    base: 250,
    enter: 600,
    sheet: 700,
    gauge: 1400,
  },
  /** cubic-bezier(.2,.8,.2,1) — the house "settle" curve used across the mockup. */
  easing: [0.2, 0.8, 0.2, 1] as const,
  pressScale: 0.97,
  stagger: 80,
} as const;
