# Project Context

## Overview

Vehicle Pricing Intelligence Platform — a React/TypeScript app for automotive valuation and analytics. Users complete a 3-step wizard (personal info → vehicle selection → valuation result). Administrators manage inquiries and view analytics in a dedicated admin panel.

Data is loaded from an Excel file into memory via the `xlsx` library. The architecture is designed for seamless migration to Microsoft Dataverse (or any backend) by swapping the `IDataSource` implementation.

---

## Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| Framework | React 18, TypeScript 5 | UI + type safety |
| Build | Vite 5 | Dev server + bundling |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| Server state | TanStack React Query 5 | Caching, refetching, mutations |
| Client state | Zustand 5 | Theme, sidebar, wizard form, modals |
| Charts | Recharts | All dashboard charts |
| Animation | Framer Motion | Page transitions, modal entrances |
| Excel parsing | SheetJS (xlsx) | Read `.xlsx` into typed objects |
| Icons | Lucide React | All icons |
| Routing | React Router v6 | Nested layouts, public/admin routes |
| Notifications | react-hot-toast | Success/error toasts |
| Table sorting | TanStack Table | Vehicle data grid |

---

## Architecture

### Layer Diagram

```
┌──────────────────────────────────────────────────────────┐
│  Pages / Features  (src/features/)                       │
│  Composse hooks + UI components into page-level views    │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Hooks  (src/hooks/)                                     │
│  React Query useQuery / useMutation — loading/error/data │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  Repositories  (src/repositories/)                       │
│  Thin wrappers delegating to getDataSource() singleton   │
└────────────────────────┬─────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│  IDataSource  (src/types/datasource.ts)                  │
│  Interface contract — UI never imports the implementation │
├──────────────────────────────────────────────────────────┤
│  ExcelDataSource  (src/data/excelDataSource.ts)          │
│  Current implementation — reads .xlsx into memory        │
│  Future: DataverseDataSource implements same interface   │
└──────────────────────────────────────────────────────────┘
```

Data flows **downward** only. Components import hooks, hooks import repositories, repositories call `getDataSource()`. No component ever imports `ExcelDataSource` directly.

### App Bootstrap

```
index.html → main.tsx
    ↓
AppProviders
    ├── ThemeProvider          (reads themeStore, sets dark/light class on <html>)
    ├── DataSourceProvider     (initializes ExcelDataSource from .xlsx file)
    └── QueryClientProvider    (React Query with staleTime/gcTime)
    ↓
RouterProvider (React Router v6)
    ├── MainLayout  →  LandingPage, ValuationPage
    └── AdminLayout  →  Dashboard, Vehicles, Queries, Settings
```

### State Management

| Concern | Technology | Details |
|---|---|---|
| Server data | React Query | Vehicles, pricing, analytics, inquiries — single source of truth |
| UI state | Zustand | Theme, sidebar collapse, wizard form fields, modal toggles |
| Convenience mirrors | Zustand | `inquiryStore.inquiries`, `vehicleStore.selectedVehicle` — updated via `useEffect` in hooks, exist to avoid prop-drilling |

- Zustand stores never fetch data themselves — React Query owns all server state
- Stores that mirror server data are updated passively via `useEffect` in the hook
- See `src/stores/` for all Zustand stores, `src/hooks/` for all React Query hooks

### Data Source DI

`getDataSource()` in `src/data/DataSourceContext.tsx` is a singleton service locator:

```typescript
let dataSource: IDataSource | null = null;
export function getDataSource(): IDataSource { ... }
```

All repositories call `getDataSource()`. To swap from Excel to Dataverse, change the initialization in `DataSourceProvider` — no UI changes needed. See [`MIGRATION.md`](./MIGRATION.md).

### Error Handling Pattern

Every page follows the same pattern:

```
Loading → show skeleton / pulse placeholders
Error   → show error message with retry/refresh action
Empty   → show friendly empty-state illustration
Data    → render the actual content
```

Mutations use `react-hot-toast` for success/error feedback (configured globally in `AppProviders`).

### Theming

- Tailwind CSS `class` strategy — dark mode toggled by adding `dark` class to `<html>`
- State persisted to `localStorage` via `useThemeStore`
- Colour variables in `src/styles/globals.css` — no hardcoded colours in components
- `ThemeSwitcher` component in admin top bar

### Performance

| Strategy | Where |
|---|---|
| React Query staleTime (5 min) | Vehicle data — avoids refetching on every mount |
| React Query refetchInterval (30 s) | Inquiries — polls for new submissions from valuation flow |
| Memoisation | `ExcelDataSource` memoizes hierarchy and analytics |
| LazyChart (IntersectionObserver) | Dashboard charts load only when scrolled into view |
| Vite manualChunks | Separates vendor, charts, and app code |
| React.memo | Expensive chart components |
| useMemo/useCallback | Derived data and handlers in data-heavy pages |

---

## Project Structure

```
src/
├── app/                    # App entry + router config
├── components/
│   └── ui/                 # Reusable primitives — Button, Dialog, Card, LazyChart, SkeletonTable, ThemeSwitcher
├── features/
│   ├── landing/            # Landing page — hero, stats, CTA
│   ├── valuation/          # 3-step wizard — Step1PersonalInfo, Step2VehicleSelection, Step3Result
│   └── admin/              # Admin pages — Dashboard, Vehicles, Queries, Settings + chart components
├── layouts/                # MainLayout (public), AdminLayout (sidebar + top bar)
├── hooks/                  # React Query hooks — useVehicles, useInquiries, useDashboardAnalytics, etc.
├── repositories/           # Data access wrappers — vehicleRepository, inquiryRepository
├── providers/              # AppProviders, DataSourceContext, ThemeProvider
├── stores/                 # Zustand stores — adminStore, inquiryStore, vehicleStore, themeStore, dashboardStore
├── types/                  # All TS interfaces — datasource.ts, vehicle.ts, inquiry.ts, analytics.ts
├── utils/                  # Helpers — formatCurrency, formatNumber, cn, memoize, validators
├── data/                   # IDataSource interface + ExcelDataSource implementation
├── styles/                 # globals.css (CSS variables, Tailwind layers)
└── testing/                # Test setup (Vitest)
```

---

## Routes

| Path | Layout | Page | Description |
|---|---|---|---|
| `/` | MainLayout | LandingPage | Hero section, stats, call to action |
| `/valuation` | MainLayout | ValuationPage | 3-step wizard: personal info → vehicle → result |
| `/result` | MainLayout | ValuationResultPage | Standalone valuation result (accessed from wizard or direct link) |
| `/admin` | AdminLayout | AdminDashboardPage | KPI cards, 10 charts, premium leaderboard |
| `/admin/dashboard` | AdminLayout | AdminDashboardPage | Same as `/admin` |
| `/admin/vehicles` | AdminLayout | AdminVehiclesPage | Paginated vehicle table with pricing lookup |
| `/admin/queries` | AdminLayout | AdminQueriesPage | Inquiry table, filter tabs, detail modal, export |
| `/admin/settings` | AdminLayout | AdminSettingsPage | Data source config, theme toggle, reset |

### Removed Routes
`/admin/pricing` → merged into vehicles · `/admin/reports` → removed

---

## Key Features

### Valuation Wizard (`/valuation`)

| Step | File | What It Does |
|---|---|---|
| 1 — Personal Info | `Step1PersonalInfo.tsx` | Collects name, email, phone, city, country, consent → stored in `inquiryStore.personalInfo` |
| 2 — Vehicle Selection | `Step2VehicleSelection.tsx` | Cascading selects (Make → Model → Spec → Year → Body Type) via `useVehicleHierarchy` → stored in `inquiryStore.vehicleSelection` |
| 3 — Result | `Step3Result.tsx` | Displays price range, vehicle specs, market insights, and export/restart actions. Auto-saves inquiry to data source on first load (guarded by `useRef(false)` to prevent duplicates) |

### Admin Dashboard (`/admin`)

- **6 KPI cards**: Total Vehicles, Total Makes, Total Models, Highest Value, Avg Market Price, Lowest Value — each with colour-coded gradient accent
- **10 charts**: Top Makes, Price Distribution, Value Trend, Powertrain Donut, Performance vs Value Scatter, Body Type Bar, Age Distribution, Price Volatility Box, Top Models
- **Premium Vehicle Leaderboard**: Top 100 vehicles by market value
- **Vehicle Intelligence Modal**: Opens from scatter plot dot click — full vehicle + pricing details
- All data from `useDashboardAnalytics` hook with `DashboardFilters`

### Admin Queries (`/admin/queries`)

- **Table**: #, Customer (avatar + name), Contact (email + phone), Vehicle, Body Type, Status (colour badge), Date, View action
- **Filter tabs**: All · Pending · Reviewed · Contacted · Closed — each with count badge
- **Search**: Filters by name, email, phone, and vehicle (year + make + model + spec)
- **Pagination**: 15 per page with first/prev/next/last controls + ellipsis
- **Status management**: Inline `StatusSelect` dropdown in both table and detail modal — optimistic React Query mutation with toast feedback
- **Detail modal**: Clean layout — header (name, date, status dropdown, close) → contact info → location → vehicle grid → valuation pricing (Min / Median / Max)
- **Export**: Button downloads all inquiries as `.xlsx` with full columns — uses the `xlsx` library

---

## Inquiry System

### Data Model

```typescript
type InquiryStatus = 'pending' | 'reviewed' | 'contacted' | 'closed';

interface Inquiry {
  id: string;
  firstName: string;  lastName: string;
  email: string;      phone: string;
  city: string;       country: string;
  consent: boolean;
  selectedVehicle: {
    year: number;  make: string;  model: string;
    spec: string;  bodyType: string;
  };
  valuationResult?: ValuationResult;
  createdAt: Date;
  status: InquiryStatus;
}
```

### Lifecycle

```
User completes valuation
    ↓
Step3Result auto-saves via useSaveInquiry mutation (useRef guard prevents duplicates)
    ↓
ExcelDataSource.inquiries[] (in-memory — no persistence)
    ↓
Admin sidebar polls useInquiries every 30s → badge count updates
    ↓
Admin views/manages on /admin/queries → status changes via useUpdateInquiryStatus
```

### Files

| File | Role |
|---|---|
| `src/types/inquiry.ts` | Types |
| `src/types/datasource.ts` | Interface contract: `saveInquiry`, `getInquiries`, `getInquiryById`, `updateInquiryStatus` |
| `src/data/excelDataSource.ts` | In-memory array implementation |
| `src/repositories/inquiryRepository.ts` | Repository delegating to `getDataSource()` |
| `src/hooks/useInquiries.ts` | `useInquiries` (query + 30s poll), `useSaveInquiry`, `useUpdateInquiryStatus`, `useExportInquiries` |
| `src/features/admin/AdminQueriesPage.tsx` | Table + filter tabs + search + pagination + modal + export |
| `src/stores/inquiryStore.ts` | Zustand mirror for cross-component access |

---

## Key Patterns

### Admin Modal (Custom Header)

```tsx
<Dialog isOpen={...} onClose={...} title="" description="" size="xl" hideCloseButton>
  <div className="flex max-h-[75vh] flex-col">
    {/* Custom gradient header with name, date, status dropdown, close button */}
    <div className="shrink-0 -mx-6 -mt-6 rounded-t-2xl bg-gradient-to-br ...">
      ...
    </div>
    {/* Scrollable body */}
    <div className="flex-1 overflow-y-auto px-6 py-4">
      ...
    </div>
  </div>
</Dialog>
```

### Sidebar Hover (React State, Not CSS)

```tsx
const [hovered, setHovered] = useState(false);
const collapsed = isSidebarCollapsed && !hovered;
// onMouseEnter → setHovered(true), onMouseLeave → setHovered(false)
```

### Status Change with Optimistic UI

```tsx
const mutation = useUpdateInquiryStatus();
mutation.mutate({ id: inquiry.id, status: newStatus });
// React Query invalidates the inquiries cache → table re-renders
// Toast shows on success or error
```

### Lazy Chart

```tsx
<LazyChart immediate height={280}>   {/* immediate = not lazy (above fold) */}
  <TopMakesChart data={...} />
</LazyChart>

<LazyChart height={280}>             {/* lazy — loads when scrolled into view */}
  <PerformanceScatterChart data={...} />
</LazyChart>
```

---

## Configuration

> **Note:** The `.env` file contains several variables (`VITE_APP_TITLE`, `VITE_DATA_SOURCE`, `VITE_ENABLE_MOCK_DATA`, `VITE_CACHE_TTL`, etc.) scoped for future use/configuration. Currently the application reads the Excel file directly and none of these env vars are consumed in `src/`. They are reserved for when a backend Dataverse adapter is added.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (watch mode) |
