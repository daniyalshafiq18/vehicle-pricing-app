# Design Language — Vehicle Pricing Intelligence Platform

> **Last updated:** 2026-07-23
> **See also:** [`color-scheme.md`](color-scheme.md) for the full color palette

---

## Table of Contents

1. [Brand Personality](#1-brand-personality)
2. [Layout & Grid](#2-layout--grid)
3. [Typography](#3-typography)
4. [Color](#4-color)
5. [Spacing](#5-spacing)
6. [Border Radius](#6-border-radius)
7. [Shadows & Elevation](#7-shadows--elevation)
8. [Component Design](#8-component-design)
9. [Motion & Animation](#9-motion--animation)
10. [Iconography](#10-iconography)
11. [States & Feedback](#11-states--feedback)
12. [Empty, Loading & Error States](#12-empty-loading--error-states)
13. [Navigation](#13-navigation)
14. [Data Visualization](#14-data-visualization)
15. [Writing Style](#15-writing-style)
16. [Accessibility](#16-accessibility)

---

## 1. Brand Personality

| Axis | Position |
|---|---|
| **Tone** | Professional, data-driven, premium |
| **Vibe** | Modern automotive — precision meets luxury |
| **Voice** | Clear and confident. Short, declarative sentences. No jargon. |
| **Target feel** | A high-end dashboard in a luxury vehicle — dark, glowing, technical |

---

## 2. Layout & Grid

### Page widths

```
max-w-[1536px]          ← standard content width (1440px + padding)
min-[2560px]:max-w-[90%] ← ultra-wide screens
```

### Admin layout

```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │  Top bar (header)                     │
│  w-64    ├──────────────────────────────────────┤
│  (16rem) │  Content area (overflow-y-auto)       │
│          │  p-6 lg:p-8                           │
│          │                                       │
│ collapsible                                      │
│ to w-16                                           │
└──────────┴──────────────────────────────────────┘
```

- Admin sidebar collapses from `w-64` (256px) to `w-16` (64px) — hover to temporarily expand.
- Public layout: sticky header + centered content + footer.
- Dashboard charts use a responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Content never exceeds `max-w-[1536px]` on public pages.

### Z-index stack

| Layer | z-index |
|---|---|
| Base content | Auto |
| Sticky header | `z-40` |
| Sidebar toggle button | `z-50` |
| Dialogs / modals | `z-50` |
| Loading splash screen | `z-50` |
| Dropdowns (notification) | `z-50` |
| Toast notifications | — (react-hot-toast, rendered in portal) |

---

## 3. Typography

### Font stack

```css
font-sans: Inter, system-ui, sans-serif;
font-mono: JetBrains Mono, Fira Code, monospace;
```

### Type scale

| Usage | Class | Size | Weight |
|---|---|---|---|
| Hero heading | `text-4xl md:text-6xl lg:text-7xl font-extrabold` | 36/48/60 → 60/72/80px | 800 |
| Section heading | `text-3xl md:text-4xl font-bold` | 30 → 36px | 700 |
| Card title | `text-2xl font-semibold` | 24px | 600 |
| Subheading / modal title | `text-xl font-semibold` | 20px | 600 |
| Feature / stat value | `text-lg font-semibold` | 18px | 600 |
| Body | `text-sm` | 14px | 400 |
| Small / metadata | `text-xs` | 12px | 400 |
| Tiny (label, uppercase) | `text-[10px] font-medium uppercase tracking-wider` | 10px | 500 |
| Badge text | `text-xs font-semibold` | 12px | 600 |
| Chart value (tabular) | `text-sm font-medium tabular-nums` | 14px | 500 |

### Leading / tracking

- Headings: `leading-tight` (~1.1)
- Body: default (1.5)
- Numeric tabular data: `tabular-nums` for aligned digits
- Uppercase labels: `tracking-wider` (0.05em)

### Gradient text effects

```css
.gradient-text          /* primary indigo gradient */
.gradient-text-gold     /* accent amber gradient */
.shimmer-text           /* animated indigo ↔ amber sweep */
```

---

## 4. Color

> **Full reference:** [`docs/color-scheme.md`](color-scheme.md)

### The two-punch combo

- **Indigo (primary, `252°`)** — trust, technology, precision. Used for CTAs, active states, links, focus rings.
- **Amber (accent, `38°`)** — speed, luxury, gold warmth. Used for premium badges, highlights, shimmer partners.

### Surface philosophy

- **Light mode:** Clean white backgrounds (`0 0% 100%`), subtle gray borders (`240 6% 90%`).
- **Dark mode:** True near-black (`240 10% 2.5%`) — not dark gray. Creates a high-end dashboard feel.
- **Sidebar:** Permanently dark in both modes (deep indigo `252 65% 14%` in light, near-black `240 10% 1.5%` in dark) — acts as a persistent visual anchor.

### Semantic colors

| Color | Use |
|---|---|
| `green` (`142°`) | Success, completed, "Live Market Data" badges |
| `red` (`0°`) | Destructive actions, errors, ErrorBoundary |
| Amber (`38°`) | Warnings, "Vehicle Not Found" state, caution banners |
| `emerald` | Price Suggestions section accent (notification dropdown) |

---

## 5. Spacing

The app uses **Tailwind's default spacing scale** (`4` = 16px).

| Spacing | Value | Common uses |
|---|---|---|
| `p-1` / `gap-1` | 4px | Tight icon spacing |
| `p-3` | 12px | Sidebar nav items, tight cards |
| `p-4` | 16px | Standard card padding, section padding |
| `p-5` / `p-6` | 20–24px | Card content, dialog body |
| `p-8` | 32px | Landing section padding |
| `py-10` / `py-20` | 40–80px | Footer, section vertical spacing |
| `gap-3` | 12px | Form field stacks |
| `gap-6` | 24px | Grid gutters |
| `space-y-2` | 8px | Label-to-input spacing |
| `space-y-4` | 16px | Section-to-section |
| `space-y-8` | 32px | Large vertical rhythm (valuation result) |

### Content padding (responsive)

```
px-4              ← mobile
p-6 lg:p-8        ← admin content
px-4 py-20 md:py-32  ← hero section
```

---

## 6. Border Radius

| Token | Value | Class |
|---|---|---|
| `--radius` | 12px (`0.75rem`) | `rounded-lg` |
| `--radius - 2px` | 10px | `rounded-md` |
| `--radius - 4px` | 8px | `rounded-sm` |
| — | 16px | `rounded-2xl` (dialogs, card overrides) |
| — | Full | `rounded-full` (badges, avatars, stat circles) |
| — | 0 | `rounded-none` (separators) |

### Where each radius is used

| Radius | Components |
|---|---|
| `rounded-lg` (12px) | Buttons, inputs, cards, selects, tabs, skeleton, progress bar |
| `rounded-xl` (12px + border) | Cards, dialogs, notification dropdown, ChartCard |
| `rounded-2xl` (16px) | Dialog content container |
| `rounded-full` | Badges, notification dots, icon containers in stats |
| `rounded-md` (10px) | Small inset elements, tab triggers |
| `rounded-sm` (8px) | Small stat containers |

---

## 7. Shadows & Elevation

### Shadow levels

| Level | Class / Value | Used on |
|---|---|---|
| **Flat** | `shadow-none` | Cards in a flat list, inputs |
| **Raised** | `shadow-sm` | Default cards, buttons, selects, tabs |
| **Hovered** | `shadow-md` | Button hover, Card hover |
| **Elevated** | `shadow-lg` | Gradient buttons, interactive card hover |
| **Modal** | `shadow-2xl` | Dialog content |
| **Tooltip** | `shadow-xl` | Chart tooltips, notification dropdown |
| **Glow (indigo)** | `0 8px 30px hsl(var(--primary) / 0.15)` | Interactive card hover |
| **Primary glow** | `shadow-xl shadow-primary/20` | Primary CTA buttons |

### Key shadow implementations

```css
/* Default card */
shadow-sm

/* Interactive card hover */
box-shadow: 0 8px 30px hsl(var(--primary) / 0.15);
transform: translateY(-4px);

/* CTA button (gradient variant) */
shadow-lg hover:shadow-primary/30

/* Notification dropdown */
shadow-xl
```

---

## 8. Component Design

### Buttons (`button.tsx`)

| Variant | Style | Use case |
|---|---|---|
| `default` | `bg-primary text-primary-foreground shadow-sm` | Primary actions |
| `gradient` | Indigo gradient, animated sweep, scale on hover | Hero CTAs, primary calls-to-action |
| `gradient-accent` | Amber gradient, same animation | Premium / gold CTAs |
| `outline` | Border + transparent bg + accent hover glow | Secondary actions |
| `secondary` | `bg-secondary text-secondary-foreground` | Tertiary buttons |
| `ghost` | Transparent, accent hover | Icon buttons, toolbar |
| `link` | Underlined text | Inline navigation |
| `destructive` | Red bg | Delete, irreversible actions |

Sizes: `sm` (h-9), `default` (h-10), `lg` (h-12), `xl` (h-14), `icon` (h-10 w-10), `icon-sm` (h-8 w-8).

**Interaction quirks:**
- All buttons: `active:scale-[0.95]` — subtle press-down.
- Gradient buttons: `hover:scale-[1.02]` — slight lift.
- Icons in buttons: `hover:scale-110` on children.
- Loading state: spinning circle SVG replaces icon.

### Cards

- **Composition:** `Card` → `CardHeader` / `CardContent` / `CardFooter`.
- **Default card:** `rounded-xl border bg-card text-card-foreground shadow-sm`.
- **Interactive card (`.interactive-card`):** Hover lifts `-translate-y-1`, gains indigo-tinted shadow, border tints toward primary.
- **ChartCard:** Adds accent gradient bar (1px) at top, icon + subtitle header, built-in empty state.
- **Glass card (`.glass-card`):** Light: `bg-white/80 backdrop-blur-xl border-black/5`. Dark: `bg-black/20 backdrop-blur-xl border-white/10`.
- **Glow card (`.glow-card`):** Subtle gradient border that fades in on hover via `::before` pseudo-element.

### Badges (`badge.tsx`)

| Variant | Style | Use |
|---|---|---|
| `default` | Primary bg, white text | Status tags |
| `secondary` | Muted bg | Info tags |
| `destructive` | Red | Error/cancelled |
| `success` | Green bg/20 + green text | "Completed", "Sold" |
| `warning` | Amber bg/20 + amber text | "Pending" |
| `outline` | Border only | Subtle tags |

### Tabs (`tabs.tsx`)

- Contained in `rounded-lg bg-muted p-1`.
- Active tab: `motion.div` with `layoutId="tab-indicator"` — sliding indicator with Framer Motion.
- Content transition: `fade-in + slide-up` (opacity 0→1, y: 4→0).
- Focus ring on keyboard navigation.

### Dialogs (`dialog.tsx`)

- **Overlay:** `bg-black/50 backdrop-blur-sm` — click to close.
- **Content animates in:** `opacity: 0→1, scale: 0.95→1, y: 10→0` over 200ms ease-out.
- Sizes: `sm` (384px), `md` (512px), `lg` (672px), `xl` (896px), `full` (95vw/95vh).
- Closing on Escape is built-in.
- `hideCloseButton` prop available for custom-header modals.

### Inputs

- **Standard input:** `h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm`.
- **Focus:** `ring-2 ring-ring` (indigo).
- **Error state:** `border-destructive focus-visible:ring-destructive`.
- **Disabled:** `opacity-50 cursor-not-allowed`.
- **Price inputs:** "AED" prefix inside the field with `pl-14` padding, sanitized numeric input.
- **Search input:** Search icon `pointer-events-none` inside, with `pl-9` padding.

### Progress (`progress.tsx`)

- **Track:** `h-2 rounded-full bg-secondary`.
- **Indicator:** `rounded-full bg-primary transition-all duration-500 ease-out`.
- Uses CSS `transform: translateX(...)` for smooth animation.
- Optional label with percentage counter.

---

## 9. Motion & Animation

### Duration & easing

| Type | Duration | Easing | Used on |
|---|---|---|---|
| Micro-interactions | 150ms | `ease-out` | Button hover, icon hover |
| Standard transitions | 200ms | `ease-out` | Dialog enter/exit, tab indicator |
| Themed transitions | 300ms | `ease` | Theme color swap (bg, border, text) |
| Page fade-in | 300–500ms | `ease-out` | Route transitions |
| Progress animation | 500ms | `ease-out` | Progress bar fill |
| Hero entrance | 600ms | — | Landing page hero |

### Framer Motion patterns

```tsx
// Page entrance
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { duration: 0.3 }

// Dialog entrance
initial: { opacity: 0, scale: 0.95, y: 10 }
animate: { opacity: 1, scale: 1, y: 0 }
exit: { opacity: 0, scale: 0.95, y: 10 }

// Tab content
initial: { opacity: 0, y: 4 }
animate: { opacity: 1, y: 0 }

// Notification dropdown
initial: { opacity: 0, scale: 0.95, y: -4 }
animate: { opacity: 1, scale: 1, y: 0 }

// Mobile menu (AnimatePresence with height animation)
initial: { height: 0, opacity: 0 }
animate: { height: 'auto', opacity: 1 }
exit: { height: 0, opacity: 0 }

// Stagger children (landing page)
transition: { staggerChildren: 0.1 }

// Splash screen exit
exit: { opacity: 0, transition: { duration: 0.3 } }

// Shared layout animation (tab indicator)
layoutId="tab-indicator"
transition: { duration: 0.2, ease: 'easeOut' }
```

### CSS animations defined in globals.css

| Animation | Duration | Purpose |
|---|---|---|
| `shimmer-text` | 3s infinite | Animated gradient on hero text |
| `shimmer-border` | 2s linear infinite | Loading card borders |
| `float` | 3s ease-in-out infinite | Floating orbs on hero, loading screen |
| `glow-pulse` | 2s ease-in-out infinite | Glowing card effect |
| `bounce-gentle` | 1.5s ease-in-out infinite | Car icon on loading screen, hero badge |
| `gradient-shift` | 4s ease infinite | Gradient button backgrounds, CTA section bg |
| `pulse-soft` | 2s ease-in-out infinite | Skeleton loaders |
| `fade-in / fade-out` | 0.3s ease-out | Page transitions |
| `slide-in-from-*` | 0.3s ease-out | Directional entrance |
| `scale-in` | 0.2s ease-out | Content entrance |
| `spin` (inline) | 2–3s linear infinite | Loading screen scanning rings |
| `indeterminate-bar` | — | Future: infinite progress |

### Interactive animations

- **Button press:** `active:scale-[0.95]` — every button feels tactile.
- **Gradient button hover:** `hover:scale-[1.02]` — gentle breath.
- **Card hover:** `-translate-y-0.5` with `shadow-md` and `border-primary/20`.
- **Interactive card hover:** `-translate-y-1 shadow-lg` with indigo glow.
- **Link hover underline:** `after:w-4/5` via pseudo-element (`after:transition-all after:duration-300`).
- **Sidebar item:** `hover:scale-110` on icons.
- **Nav link bottom bar:** `300ms` width transition from 0 → 80%.
- **Theme transition:** `0.3s ease` on `background-color, border-color, color`.

---

## 10. Iconography

- **Library:** [Lucide React](https://lucide.dev/) — all icons throughout.
- **Size convention:**
  - `h-4 w-4` (16px) — Inline with buttons, form fields
  - `h-5 w-5` (20px) — Section headings, sidebar items
  - `h-6 w-6` (24px) — Feature icons, stat icons
  - `h-8 w-8` (32px) — Hero stats, empty state icons
  - `h-10 w-10` (40px) — Modal success circles
  - `h-16 w-16` (64px) — Loading screen car icon
- **Color:** Inherit from text color, or explicitly `text-primary` / `text-muted-foreground`.
- **Decoration:** Icons in feature cards sit inside a `rounded-lg bg-primary/10` container that shifts to `bg-accent/20` on hover.

### Icon-to-label mapping

| Lucide Icon | Used For |
|---|---|
| `Car` | Brand logo, vehicle specs, valuation |
| `BarChart3` | Analytics, dashboard, features |
| `TrendingUp` | Market insights, positive trends |
| `TrendingDown` | Negative trends |
| `Bell` | Notifications |
| `SearchX` | Missing / not found |
| `DollarSign` | Pricing, price suggestions |
| `ClipboardList` | Queries, inquiries |
| `Shield` | Trust, security, drive type |
| `Gauge` | Horsepower, speed |
| `Cpu` | Engine specs |
| `Cog` | Transmission |
| `Zap` | Powertrain, speed badge |
| `Star` | Premium features |
| `Tag` | Category, price tag |
| `CheckCircle` | Success, completed |
| `ArrowRight` | CTAs, navigation forward |
| `ArrowLeft` | Navigation back |
| `Search` | Search input |
| `Download` | PDF export |
| `Send` | Submit |
| `Globe` | Web / YallaMotor data |
| `Sparkles` | Results, premium |
| `Heart` | Thank you / favorite |
| `MessageSquare` | Request submitted |
| `Menu` / `X` | Mobile hamburger / close |
| `Sun` / `Moon` / `Monitor` | Theme switcher |
| `LayoutDashboard` | Admin dashboard link |
| `Settings` | Settings page |
| `LogOut` | Back to site |
| `ChevronLeft` / `ChevronRight` | Sidebar collapse |
| `Loader2` | Loading spinners |
| `Inbox` | Empty state fallback icon |

---

## 11. States & Feedback

### Focus ring (global)

Every interactive element uses a consistent focus ring:
```css
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

### Disabled state (global)

```css
disabled:cursor-not-allowed disabled:opacity-50
```

### Button press

```css
active:scale-[0.95] select-none
```

### Transitions (default)

```css
transition-all duration-200   /* buttons, sidebar items */
transition-colors duration-200 /* nav links, icon containers */
transition-opacity duration-200 /* collapsed sidebar text */
transition-transform duration-200  /* icons */
transition-shadow duration-300    /* cards */
```

### Notification badge (pulsing dot)

```css
/* Bell icon dot */
animate-ping rounded-full bg-red-400 opacity-75   /* outer ping */
rounded-full bg-red-500                           /* inner dot */
```

### Toast feedback

- React Hot Toast for all mutations.
- **Success toast:** Green (default).
- **Error toast:** Red (destructive).

---

## 12. Empty, Loading & Error States

Every page follows the same four-state pattern:

```
Loading → Skeleton
Error    → Retry / refresh
Empty    → EmptyState component
Data     → Render
```

### Loading (Skeleton)

- `Skeleton`: `animate-pulse-soft rounded-lg bg-muted` — pulses opacity 1→0.5.
- `SkeletonCard`: Mimics a card layout with bar placeholders.
- `SkeletonTable`: Row/column grid matching data table structure.
- **LazyChart:** `200px` skeleton placeholder while chart is out of viewport.

### Loading screen (splash)

- Full-screen overlay with `z-50`.
- Animated scanning rings (two spinning arcs — primary + accent).
- Car icon with `bounce-gentle` and `drop-shadow` glow.
- Gradient progress bar (`from-primary via-accent to-primary`).
- Technical grid background + ambient glow orbs.
- Exponential-decay smooth progress animation (RAF-driven).
- Brand title with "UAE Market Analysis" tagline.
- Fade-out exit via `AnimatePresence`.

### Empty state

```tsx
<EmptyState
  icon={...}       // custom or Inbox as fallback
  title={...}      // required
  description={...} // optional
  action={...}     // optional CTA button
/>
```

- **Layout:** `min-h-[300px]` centered, `border-dashed`, `bg-card/50`.
- **Icon container:** `rounded-full bg-muted p-3 text-muted-foreground`.

### Error states

- **ErrorBoundary (global):** Catches render errors. Shows warning icon + error message + "Try again" button.
- **Page-level error:** Centered layout, destructive icon, message, and "Go Back" / retry button.
- **Form field error:** Red border (`border-destructive`), red error text below input.
- **Scrape error:** `border-red-500/20 bg-red-500/5` container with "Try Again" button.

### Not found (vehicle)

- Amber icon (`SearchX` in `bg-amber-500/10`).
- Summary card with amber-tinted border.
- "Request This Vehicle" CTA.
- Multi-step dialog: Details → Scraping YallaMotor → Results.

---

## 13. Navigation

### Public (MainLayout)

- **Header:** Sticky, `bg-white/70 backdrop-blur-md`, gradient bottom border (indigo, visible on hover).
- **Nav links:** Bottom-underline hover effect (`after:w-4/5` at 300ms). Active link has persistent underline + primary color.
- **Mobile:** Hamburger menu with `AnimatePresence` height animation.
- **Footer:** 3-column grid (Brand, Quick Links, Legal). `bg-slate-50` / `dark:bg-slate-900/50`.

### Admin (AdminLayout)

- **Sidebar:** Collapsible (`w-64` ↔ `w-16`). React state driven (not CSS group-hover). Icons always visible.
- **Active item:** Primary-tinted background + left accent bar (`h-5 w-0.5 rounded-full bg-primary`).
- **Notification badges:** `bg-amber-500` consistent across all three sections.
- **Top bar:** Breadcrumb-style title + search input + NotificationDropdown + ThemeSwitcher.
- **Page title updates** `document.title` on route change.

---

## 14. Data Visualization

- **Library:** Recharts.
- **Wrapper:** `LazyChart` — defers rendering until near viewport (IntersectionObserver, 200px margin, 320px default height).
- **Container:** `ChartCard` — consistent wrapper with accent bar, title, subtitle, empty state.
- **Tooltip:** `ChartTooltip` — `rounded-lg border bg-background/95 backdrop-blur-sm shadow-xl text-xs`. Shared across all charts.

### Known dashboard charts

| Chart | Type | Data | Accent |
|---|---|---|---|
| TopMakesChart | Bar | Vehicle makes by count | Primary gradient |
| BodyTypeChart | Pie/Bar | Body type distribution | Accent gradient |
| PriceDistributionChart | Area/Bar | Price buckets | Primary |
| ValueTrendChart | Line | Price trends over time | Primary/accent |
| PowertrainChart | Bar/Donut | Powertrain types | Accent |
| BoxPlotChart | Box plot | Price quartiles | Primary gradient |
| ScatterChartView | Scatter | Price vs. attributes | Primary/accent |

### Number formatting

- Currency: `formatCurrency()` → AED, comma-separated, no decimals.
- Counts: `formatNumber()` → locale-formatted integers.
- Chart values: `tabular-nums` class for aligned digits.
- Chart axis values: `valueFormatter` prop on tooltips.

---

## 15. Writing Style

### Conventions observed throughout

| Context | Style | Example |
|---|---|---|
| Headings | Title Case | "Vehicle Specifications" |
| Buttons | Sentence case | "Start Valuation" |
| Labels (form) | Sentence case | "First name" |
| Labels (uppercase data) | `text-[10px] uppercase tracking-wider` | "ENGINE", "HORSEPOWER" |
| Placeholder | Sentence case, no period | "Search..." |
| Description text | Sentence case, period | "We couldn't find this vehicle..." |
| Error messages | Full sentence | "We couldn't generate a valuation..." |
| Empty states | Title + optional description | "No data available" |
| Status badges | Default case | "Pending", "Sold" |

### Microcopy patterns

- **Success:** "Request Submitted!" with a check icon.
- **Thank you:** "Thank You!" (when user skips suggestion after scraped data).
- **Not found:** "Vehicle Not Found" — direct, not apologetic.
- **Error boundary:** "Something went wrong" — not technical.
- **Scraping in progress:** "Searching YallaMotor" — active voice.
- **Live data badge:** "Live Market Data — YallaMotor" with green dot.

---

## 16. Accessibility

### What's in place

- **Focus ring:** All interactive elements have `focus-visible:ring-2 ring-ring`.
- **ARIA labels:** `aria-label` on icon buttons (theme switcher, notification bell, menu toggle).
- **ARIA expanded:** `aria-expanded` on dropdown triggers.
- **`role` attributes:** `alert` on error states.
- **Close on Escape:** All dialogs and dropdowns.
- **Close on click outside:** Dropdowns.
- **Dark mode:** Full dark mode with proper contrast ratios — dark text on light surfaces and vice versa.
- **Reduced motion:** Animations use `duration-200` to `600` — no epileptic-risk flashes. (Note: no explicit `prefers-reduced-motion` query found yet.)
- **Keyboard navigation:** All nav items, buttons, and tabs are fully keyboard-operable.

### Potential gaps

- `prefers-reduced-motion` media query — not yet implemented.
- Skip-to-content link — not present.
- Color contrast check against WCAG AA — not formally verified.
- Form field `id` ↔ `label` association — handled via `htmlFor` but relies on auto-generation.
- Notification dot (red `animate-ping`) — relies on color only; no text alternative for the pulsing state.

---

## Appendix: Design Tokens Cross-Reference

| Token | Value | Where Defined | Used In |
|---|---|---|---|
| `--radius` | `0.75rem` | `globals.css` | All corners |
| `--background` | HSL var | `globals.css` | `bg-background` |
| `--foreground` | HSL var | `globals.css` | `text-foreground` |
| `--primary` | HSL var | `globals.css` | `bg-primary`, `text-primary`, ring |
| `--ring` | HSL var | `globals.css` | Focus rings |
| Primary scale | 50–950 | `globals.css` + `tailwind.config.ts` | All `primary-*` classes |
| Accent scale | 50–900 | `globals.css` + `tailwind.config.ts` | All `accent-*` classes |
| Sidebar scale | 5 vars | `globals.css` + `tailwind.config.ts` | `sidebar-*` classes |
| Inter font | `Inter, system-ui, sans-serif` | `tailwind.config.ts` | Body + headings |
| JetBrains Mono | `JetBrains Mono, Fira Code, monospace` | `tailwind.config.ts` | Code |
| Shadow tokens | 6 levels | Inline Tailwind / `.interactive-card` | Cards, buttons, modals |
| Animation tokens | 18 keyframes | `globals.css` + `tailwind.config.ts` | Loading, hover, entrance |

---

## Appendix: File Map

| File | What It Defines |
|---|---|
| `src/styles/globals.css` | CSS variables, component classes (`.interactive-card`, `.glass-card`, `.glow-card`), animations, scrollbar, print styles |
| `tailwind.config.ts` | Theme extension — colors, fonts, border radii, keyframes, animations |
| `src/providers/ThemeProvider.tsx` | Dark mode application on `<html>` |
| `src/stores/themeStore.ts` | Theme state (light/dark/system) + localStorage persistence |
| `src/components/ui/button.tsx` | Button variants, sizes, loading state, press animation |
| `src/components/ui/card.tsx` | Card + sub-components with hover effect |
| `src/components/ui/badge.tsx` | Badge variants (status colors) |
| `src/components/ui/dialog.tsx` | Modal with Framer Motion enter/exit |
| `src/components/ui/tabs.tsx` | Tab strip with animated indicator |
| `src/components/ui/input.tsx` | Form input with label, error, helper text |
| `src/components/ui/select.tsx` | Form select with label, error |
| `src/components/ui/progress.tsx` | Progress bar with label |
| `src/components/ui/skeleton.tsx` | Skeleton loader + SkeletonCard + SkeletonTable |
| `src/components/ui/loading-screen.tsx` | Full-screen splash with animated spinner + progress |
| `src/components/ui/empty-state.tsx` | Reusable empty state layout |
| `src/components/ui/error-boundary.tsx` | Error boundary with retry |
| `src/components/ui/separator.tsx` | Horizontal rule |
| `src/components/ui/notification-dropdown.tsx` | Notification bell + dropdown with per-section colors |
| `src/components/ui/lazy-chart.tsx` | IntersectionObserver lazy loader for charts |
| `src/components/ui/theme-switcher.tsx` | Light / Dark / System toggle |
| `src/features/admin/dashboard/ChartCard.tsx` | Chart wrapper + shared tooltip component |
| `src/layouts/MainLayout.tsx` | Public layout: sticky header + footer |
| `src/layouts/AdminLayout.tsx` | Admin layout: collapsible sidebar + top bar |
