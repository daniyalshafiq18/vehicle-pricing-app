# Color Scheme — Vehicle Pricing Intelligence Platform

> **Last updated:** 2026-07-24
> **Source of truth:** `src/styles/globals.css`

## Brand palette

| Role | Hex | HSL | Purpose |
|---|---|---|---|
| Midnight teal | `#092327` | `188 63% 9%` | Dark-mode canvas, sidebar, deepest gradient stop, primary text |
| Deep teal | `#0B5351` | `178 77% 18%` | Light-mode primary actions, links, structure, PDF headers |
| Electric teal | `#00A9A5` | `179 100% 33%` | Highlights, focus, progress, active accents, chart emphasis |

The canonical brand spectrum moves from `#092327` through `#0B5351` to `#00A9A5`. Use the shared `brand-gradient` utility instead of recreating this gradient inside components.

## Semantic mapping

| Token | Light mode | Dark mode | Usage |
|---|---|---|---|
| `primary` | `#0B5351` | `#00A9A5` | Main actions, links, selected controls, chart series |
| `primary-foreground` | White | `#092327` | Text placed on `primary` |
| `accent` | `#00A9A5` | lighter electric teal | Highlights, progress, active decoration |
| `accent-foreground` | `#092327` | `#092327` | Text placed on bright accent surfaces |
| `background` | teal-tinted off-white | `#092327` | Application canvas |
| `foreground` | `#092327` | pale teal-white | Main text |
| `card` | white | elevated deep teal | Cards, dialogs and dropdowns |
| `secondary` | pale teal | dark teal surface | Secondary buttons and containers |
| `muted` | pale teal-gray | muted dark teal | Skeletons and quiet surfaces |
| `border` | desaturated pale teal | desaturated deep teal | Dividers, cards and tables |
| `ring` | `#00A9A5` | `#00A9A5` | Keyboard focus |
| `sidebar` | `#092327` | deeper shade of `#092327` | Persistent admin navigation |

Success and destructive colors remain green and red because they communicate state, not brand. Warning and information surfaces use the teal family.

## Tonal scales

`primary-50` through `primary-950` are shades derived from deep and midnight teal. `accent-50` through `accent-900` are shades derived from electric teal.

- `50–200`: tinted backgrounds and quiet chips
- `300–400`: borders, hover states and data visualization
- `500`: base token
- `600–700`: pressed states and high-contrast text on light surfaces
- `800–950`: deep structure and dark surfaces

Dark mode uses a contrast-adjusted scale: interactive teal becomes brighter while backgrounds remain in the midnight family.

## Shared brand utilities

| Utility | Use |
|---|---|
| `.brand-gradient` | Primary CTAs, active navigation and progress |
| `.brand-gradient-soft` | Large low-contrast tinted surfaces |
| `.brand-canvas` | App/page background with teal ambient glows |
| `.brand-icon` | Logo and feature icon tiles |
| `.brand-rule` | Dividers and compact accents |
| `.section-title` | Centered branded heading underline |
| `.gradient-text` | Static three-tone brand text |
| `.shimmer-text` | Animated three-tone brand text |

## Contrast rules

- White text belongs on midnight or deep teal.
- Text on electric teal must use `accent-foreground` (`#092327`), not white.
- In dark mode, `primary-foreground` automatically switches to midnight teal.
- Full-strength gradients are reserved for compact brand moments and controls, not large reading surfaces.
- Use token opacity (`bg-primary/10`, `border-accent/20`) for supporting surfaces.

## Data visualization

Charts use the three core colors plus derived teal shades:

```text
#0B5351  #00A9A5  #092327  #16706D
#28BDB8  #56D3CE  #7BE2DE  #B8F2EF
```

The palette is centralized in `src/utils/colors.ts`. Do not add unrelated chart colors directly inside chart components.

## Changing the scheme

1. Update light and dark CSS variables in `src/styles/globals.css`.
2. Keep `primary-foreground` and `accent-foreground` contrast-safe.
3. Update fixed chart/export colors in `src/utils/colors.ts` and `src/utils/pdfExport.ts`.
4. Search for hardcoded colors in `src/`.
5. Verify light mode, dark mode, focus states and loading states.
6. Update this document and `docs/CHANGELOG.md`.

`tailwind.config.ts` maps tokens to utilities but does not own their values. Components should use semantic classes such as `bg-primary`, `text-foreground` and `border-border`.
