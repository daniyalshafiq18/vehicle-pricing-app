/**
 * Brand-anchored chart palette.
 *
 * Every color is drawn from the three-tone teal brand or one of its shades.
 *
 * Usage:
 *   import { CHART_COLORS, CHART_COLORS_HSL, getBarColor } from '@utils/colors';
 *
 * For single-series bars (Top Makes, Body Type):
 *   fill={CHART_COLORS_HSL.primary}
 *   + fillOpacity via getBarOpacity(index)
 *
 * For multi-series (donuts, grouped):
 *   fill={CHART_COLORS[index % CHART_COLORS.length]}
 */

// ─── CSS variable references (works with both light/dark) ───
export const CHART_COLORS_HSL = {
  primary: 'hsl(var(--primary))',
  primary300: 'hsl(var(--primary-300))',
  primary400: 'hsl(var(--primary-400))',
  primary600: 'hsl(var(--primary-600))',
  accent: 'hsl(var(--accent))',
  accent300: 'hsl(var(--accent-300))',
  accent400: 'hsl(var(--accent-400))',
  muted: 'hsl(var(--muted-foreground))',
} as const;

// ─── Fixed-hex companion palette (for tooltips, donut slices) ───
// Core palette first, then tonal steps for multi-series separation.
export const CHART_COLORS = [
  '#0B5351', // Deep teal — primary anchor
  '#00A9A5', // Electric teal — accent
  '#092327', // Midnight teal — depth
  '#16706D', // Mid teal
  '#28BDB8', // Bright teal
  '#56D3CE', // Light teal
  '#7BE2DE', // Mist teal
  '#B8F2EF', // Pale teal
] as const;

// ─── Brand-aligned powertrain colors ───
export const PT_COLORS: Record<string, string> = {
  'Petrol/Diesel': CHART_COLORS[0]!,
  'Hybrid': CHART_COLORS_HSL.primary300,
  'Electric': CHART_COLORS[1]!,
};

export const PT_FALLBACK_COLORS = ['#0B5351', '#16706D', '#00A9A5', '#56D3CE'];

// ─── Rank-based opacity for bar charts ───
// #1 bar gets full opacity, progressively lighter
export function getBarOpacity(index: number): number {
  if (index === 0) return 0.95;
  if (index <= 2) return 0.85;
  if (index <= 4) return 0.72;
  if (index <= 6) return 0.58;
  return 0.44;
}
