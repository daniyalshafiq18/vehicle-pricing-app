# Color Scheme — Vehicle Pricing Intelligence Platform

> **Last updated:** 2026-07-23
> **Source of truth:** `src/styles/globals.css` (CSS custom properties) + `tailwind.config.ts` (Tailwind mapping)

---

## Table of Contents

1. [Quick Reference — Tailwind Classes](#1-quick-reference--tailwind-classes)
2. [Semantic Roles](#2-semantic-roles)
3. [Color Scales in Full](#3-color-scales-in-full)
4. [Surfaces &amp; Structural Tokens](#4-surfaces--structural-tokens)
5. [Sidebar Palette](#5-sidebar-palette)
6. [Dark Mode Differences](#6-dark-mode-differences)
7. [Where to Change Colors](#7-where-to-change-colors)
8. [Modifying the Scheme — Step by Step](#8-modifying-the-scheme--step-by-step)
9. [Design Tokens](#9-design-tokens)

---

## 1. Quick Reference — Tailwind Classes

These are the 37 color classes you use in JSX. Every one maps to a CSS variable in `globals.css`.

### Primary (Indigo)
| Class | Light HSL | Dark HSL |
|---|---|---|
| `bg-primary` / `text-primary` | `252 87% 60%` | `252 87% 65%` |
| `text-primary-foreground` | `0 0% 100%` | `0 0% 100%` |
| `bg-primary-50` | `250 100% 97%` | `252 65% 22%` |
| `bg-primary-100` | `251 95% 95%` | `252 70% 28%` |
| `bg-primary-200` | `252 96% 89%` | `252 75% 35%` |
| `bg-primary-300` | `252 95% 82%` | `252 80% 45%` |
| `bg-primary-400` | `252 91% 70%` | `252 85% 55%` |
| `bg-primary-500` | `252 87% 60%` | `252 87% 65%` |
| `bg-primary-600` | `252 80% 50%` | `252 91% 72%` |
| `bg-primary-700` | `252 75% 42%` | `252 95% 82%` |
| `bg-primary-800` | `252 70% 34%` | `251 95% 90%` |
| `bg-primary-900` | `252 65% 26%` | `250 100% 95%` |
| `bg-primary-950` | `252 60% 18%` | `250 100% 97%` |

### Accent (Amber / Gold)
| Class | Light HSL | Dark HSL |
|---|---|---|
| `bg-accent` / `text-accent` | `38 92% 50%` | `38 92% 54%` |
| `text-accent-foreground` | `0 0% 98%` | `0 0% 98%` |
| `bg-accent-50` | `40 100% 95%` | `38 70% 18%` |
| `bg-accent-100` | `38 100% 88%` | `38 75% 22%` |
| `bg-accent-200` | `38 96% 78%` | `38 80% 28%` |
| `bg-accent-300` | `38 95% 68%` | `38 85% 36%` |
| `bg-accent-400` | `38 94% 58%` | `38 90% 45%` |
| `bg-accent-500` | `38 92% 50%` | `38 92% 54%` |
| `bg-accent-600` | `38 85% 42%` | `38 94% 62%` |
| `bg-accent-700` | `38 80% 35%` | `38 96% 72%` |
| `bg-accent-800` | `38 75% 28%` | `38 100% 82%` |
| `bg-accent-900` | `38 70% 22%` | `40 100% 90%` |

### Surfaces
| Class | Light HSL | Dark HSL |
|---|---|---|
| `bg-background` | `0 0% 100%` | `240 10% 2.5%` |
| `text-foreground` | `240 10% 3.9%` | `0 0% 95%` |
| `bg-card` | `0 0% 100%` | `240 10% 4.5%` |
| `text-card-foreground` | `240 10% 3.9%` | `0 0% 95%` |
| `bg-popover` | `0 0% 100%` | `240 10% 4.5%` |
| `text-popover-foreground` | `240 10% 3.9%` | `0 0% 95%` |
| `bg-secondary` | `240 5% 96%` | `240 4% 12%` |
| `text-secondary-foreground` | `240 10% 10%` | `0 0% 95%` |
| `bg-muted` | `240 5% 96%` | `240 4% 12%` |
| `text-muted-foreground` | `240 4% 50%` | `240 5% 60%` |

### Semantic / Status
| Class | Light HSL | Dark HSL | Intention |
|---|---|---|---|
| `bg-destructive` / `text-destructive` | `0 84% 60%` | `0 62% 35%` | Errors, delete actions |
| `text-destructive-foreground` | `0 0% 98%` | `0 0% 98%` | — |
| `bg-success` / `text-success` | `142 71% 45%` | `142 71% 50%` | Completed states |
| `text-success-foreground` | `0 0% 98%` | `0 0% 98%` | — |
| `bg-warning` / `text-warning` | `38 92% 50%` (same as accent) | `38 92% 54%` | Warnings |
| `text-warning-foreground` | `0 0% 98%` | `0 0% 98%` | — |
| `bg-info` / `text-info` | `252 87% 60%` (same as primary) | `252 87% 65%` | Informational |
| `text-info-foreground` | `0 0% 98%` | `0 0% 98%` | — |

### Structural
| Class | Light HSL | Dark HSL |
|---|---|---|
| `border-border` | `240 6% 90%` | `240 4% 16%` |
| `border-input` | `240 6% 90%` | `240 4% 16%` |
| `ring-ring` | `252 87% 60%` | `252 87% 65%` |

### Sidebar
| Class | Light HSL | Dark HSL |
|---|---|---|
| `bg-sidebar` | `252 65% 14%` | `240 10% 1.5%` |
| `text-sidebar-foreground` | `0 0% 95%` | `0 0% 95%` |
| `text-sidebar-muted` | `252 30% 65%` | `252 30% 55%` |
| `bg-sidebar-accent` | `252 40% 25%` | `252 40% 12%` |
| `border-sidebar-border` | `252 40% 20%` | `240 4% 12%` |
| `ring-sidebar-ring` | `252 87% 60%` | `252 87% 65%` |

---

## 2. Semantic Roles

What each token *means*, not just what it looks like:

| Token | Where It's Used |
|---|---|
| `primary` | Buttons (filled), links, active tab, focus ring, progress bars, chart series #1, skeleton hue |
| `primary-50`–`100` | Alert backgrounds, table row hover (light), tag/chip backgrounds |
| `primary-400`–`600` | Hover states, gradient mid-points, icon fills |
| `primary-700`–`950` | Text on light backgrounds, pressed states |
| `accent` | Gold highlights, premium badges, chart series #2, shimmer gradient partner |
| `accent-50`–`200` | Badge/chip backgrounds, subtle highlights |
| `accent-600`–`900` | Hovered accent text, decorative borders |
| `background` | Page body, modal backdrop area |
| `foreground` | Body text, headings, icons |
| `card` | Card, dialog, dropdown backgrounds |
| `secondary` | Secondary button, non-interactive container bg |
| `muted` | Disabled background, skeleton loader |
| `muted-foreground` | Subtle text (metadata, timestamps, placeholders) |
| `border` | Card borders, dividers, table borders |
| `input` | Form input borders |
| `ring` | Focus ring (outline) on all interactive elements |
| `success` | "Sold" badge, completed step indicator, success toast |
| `destructive` | Delete button, error toast, error text |
| `warning` | Warning badge, caution banner |
| `info` | Information banner, help text icon |
| `sidebar` | Left nav background |
| `sidebar-foreground` | Sidebar nav text |
| `sidebar-muted` | Sidebar secondary text, collapsed icon |
| `sidebar-accent` | Sidebar active/hover item background |
| `sidebar-border` | Sidebar dividers |

---

## 3. Color Scales in Full

Only `primary` and `accent` have 10-step scales (50 → 950/900). All other tokens are single-point values.

### Primary — Indigo hue (`252`–`251`)

```
50    250 100% 97%   ─ very pale, for alert/section backgrounds
100   251 95% 95%
200   252 96% 89%
300   252 95% 82%    ─ light, for hover borders
400   252 91% 70%    ─ medium-light, hover state on dark surfaces
--- DEFAULT / 500 ---
500   252 87% 60%    ─ the brand color
600   252 80% 50%    ─ button hover, active
700   252 75% 42%
800   252 70% 34%
900   252 65% 26%
950   252 60% 18%    ─ deepest, for text on light backgrounds
```

In dark mode the scale is **inverted**: what was light becomes dark and vice versa, keeping the same hue but flipping lightness so it reads correctly on a dark background.

### Accent — Amber hue (`38`–`40`)

```
50    40 100% 95%    ─ very pale gold
100   38 100% 88%
200   38 96% 78%
300   38 95% 68%
400   38 94% 58%
--- DEFAULT / 500 ---
500   38 92% 50%     ─ the accent brand color
600   38 85% 42%
700   38 80% 35%
800   38 75% 28%
900   38 70% 22%
```

---

## 4. Surfaces & Structural Tokens

| Token | Light Mode |
|---|---|
| `--background` | `0 0% 100%` — pure white |
| `--foreground` | `240 10% 3.9%` — almost-black text |
| `--card` | `0 0% 100%` — white card |
| `--card-foreground` | `240 10% 3.9%` — same as foreground |
| `--popover` | `0 0% 100%` — white dropdown/dialog |
| `--popover-foreground` | `240 10% 3.9%` |
| `--secondary` | `240 5% 96%` — light gray surface |
| `--secondary-foreground` | `240 10% 10%` |
| `--muted` | `240 5% 96%` — same as secondary |
| `--muted-foreground` | `240 4% 50%` — medium gray text |
| `--border` | `240 6% 90%` — subtle gray border |
| `--input` | `240 6% 90%` — same as border |
| `--ring` | `252 87% 60%` — matches primary |
| `--destructive` | `0 84% 60%` — red |
| `--success` | `142 71% 45%` — green |
| `--warning` | `38 92% 50%` — matches accent |
| `--info` | `252 87% 60%` — matches primary |

Note: `--card` / `--popover` = `--background` and `--secondary` / `--muted` are identical in light mode, so some same-HSL aliases exist for semantic clarity.

---

## 5. Sidebar Palette

| Token | Light | Dark |
|---|---|---|
| `--sidebar-background` | `252 65% 14%` — deep indigo nav | `240 10% 1.5%` — near-black |
| `--sidebar-foreground` | `0 0% 95%` — off-white text | same |
| `--sidebar-muted` | `252 30% 65%` — desaturated indigo | `252 30% 55%` |
| `--sidebar-accent` | `252 40% 25%` — highlight bg | `252 40% 12%` |
| `--sidebar-border` | `252 40% 20%` | `240 4% 12%` |
| `--sidebar-ring` | `252 87% 60%` — matches primary | same |

Sidebar is designed to stay dark in both modes, creating a persistent navigation anchor.

---

## 6. Dark Mode Differences

Dark mode does more than invert. Notes on key shifts:

| Token | Light → Dark | Why |
|---|---|---|
| `--primary` | `60%` → `65%` | +5% lightness so indigo glows against near-black bg |
| `--accent` | `50%` → `54%` | +4% for the same reason |
| `--destructive` | `60%` → `35%` | Drastically reduced — full-bright red is painful on dark |
| `--success` | `45%` → `50%` | Slightly brighter green to stay legible |
| Primary scale | light values are **inverted** | `primary-50` goes from `97% lightness` → `22%` (was lightest, now darkest) |
| `--border` | `90%` → `16%` | Subtle border in dark, not high-contrast |
| `--muted-foreground` | `50%` → `60%` | Raised so secondary text stays readable |

---

## 7. Where to Change Colors

If you want to modify the scheme, you need to touch **two files** — and you **must** keep them in sync:

### `src/styles/globals.css` — THE SOURCE OF TRUTH

All HSL values live here as CSS custom properties. Two blocks:

```css
:root {
  --primary: 252 87% 60%;
  /* ... all light-mode values */
}

.dark {
  --primary: 252 87% 65%;
  /* ... all dark-mode values */
}
```

> Change a value **here** and it updates everywhere automatically.

### `tailwind.config.ts` — THE SURFACE MAP

This file does *not* set color values — it maps CSS variables to Tailwind utility classes. Only edit it if you are **adding** or **removing** a color token (e.g., adding a new `tertiary` color).

```ts
colors: {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
    50: 'hsl(var(--primary-50))',
    // ...
  },
}
```

### What you should NOT do

- ❌ Do not hardcode hex or HSL in components — always use Tailwind classes like `bg-primary` or `text-muted-foreground`.
- ❌ Do not add new CSS variables without also adding the Tailwind mapping.
- ❌ Do not edit one theme without the other — light and dark must be updated together.

---

## 8. Modifying the Scheme — Step by Step

### A. Changing an existing color (example: make primary more purple)

1. Edit `--primary` (and the full scale) in `:root` and `.dark` in `globals.css`.
2. Verify contrast ratios with the foreground colors.
3. Search for any hardcoded colors in components: `rg src/ --include '*.tsx' --include '*.ts' -o '#[0-9a-fA-F]{6}'`
4. Test both light and dark mode.

### B. Adding a new semantic color (example: `tertiary`)

1. Add CSS variables in `globals.css`:
   ```css
   :root {
     --tertiary: 180 80% 40%;
     --tertiary-foreground: 0 0% 98%;
   }
   .dark {
     --tertiary: 180 80% 50%;
     --tertiary-foreground: 0 0% 98%;
   }
   ```
2. Add Tailwind mapping in `tailwind.config.ts`:
   ```ts
   tertiary: {
     DEFAULT: 'hsl(var(--tertiary))',
     foreground: 'hsl(var(--tertiary-foreground))',
   },
   ```
3. Use in components: `bg-tertiary text-tertiary-foreground`.
4. Update this document.

### C. Changing accent to a completely different color

1. The `accent` scale is 10 stops (50–900). Choose your hue and build the scale.
2. `--warning` is aliased to accent — decide if it should split off as its own color.
3. Update `--warning` separately if needed.

---

## 9. Design Tokens

| Token | Value | Notes |
|---|---|---|
| `--radius` | `0.75rem` (12px) | Border radius — applied via `rounded-lg` |
| Border radius (sm) | `calc(0.75rem - 4px)` = 8px | `rounded-sm` |
| Border radius (md) | `calc(0.75rem - 2px)` = 10px | `rounded-md` |
| Font (sans) | `Inter`, `system-ui`, `sans-serif` | |
| Font (mono) | `JetBrains Mono`, `Fira Code`, `monospace` | |
| Shadow (interactive card hover) | `0 8px 30px hsl(var(--primary) / 0.15)` | |
| Glass card (light) | `bg-white/80 backdrop-blur-xl border-black/5` | |
| Glass card (dark) | `bg-black/20 backdrop-blur-xl border-white/10` | |

---

## Appendix: Full Variable List

All 52 CSS custom properties in `:root`, for reference:

```
--background       --foreground
--card             --card-foreground
--popover          --popover-foreground
--primary          --primary-foreground
--primary-50       --primary-100    --primary-200    --primary-300
--primary-400      --primary-500    --primary-600    --primary-700
--primary-800      --primary-900    --primary-950
--accent           --accent-foreground
--accent-50        --accent-100     --accent-200     --accent-300
--accent-400       --accent-500     --accent-600     --accent-700
--accent-800       --accent-900
--secondary        --secondary-foreground
--muted            --muted-foreground
--destructive      --destructive-foreground
--success          --success-foreground
--warning          --warning-foreground
--info             --info-foreground
--border           --input           --ring
--sidebar-background    --sidebar-foreground
--sidebar-muted         --sidebar-accent
--sidebar-border        --sidebar-ring
```

---

## Appendix: Color Count Summary

| | Count |
|---|---|
| CSS variables defined in `:root` | 52 |
| Unique HSL values (light) | 35 |
| Unique HSL values (dark) | 34 |
| Tailwind utility classes | 37 |
| Distinct hues used | 5 (indigo/252, amber/38, gray/240, red/0, green/142) |
