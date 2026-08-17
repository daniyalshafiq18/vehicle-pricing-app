# Project Context

## Overview

Vehicle Pricing Intelligence Platform — a React/TypeScript app for automotive valuation and analytics. Users complete a 3-step wizard (personal info → vehicle selection → valuation result). Administrators manage inquiries and view analytics in a dedicated admin panel.

Data is loaded from Microsoft Dataverse via the Power Pages Web API (`/_api/`). The architecture uses an `IDataSource` abstraction, enabling future backend swaps without UI changes.

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
| Web API | Power Pages (`/_api/`) | Dataverse entity CRUD via safeFetch · CSRF-authenticated |
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
│  DataverseDataSource  (src/data/dataverseDataSource.ts)   │
│  Power Pages Web API — reads via `/_api/` OData queries  │
└──────────────────────────────────────────────────────────┘
```

Data flows **downward** only. Components import hooks, hooks import repositories, repositories call `getDataSource()`. No component ever imports `DataverseDataSource` directly.

### App Bootstrap

- `SplashGate` keeps routes unmounted while `DataverseDataSource` paginates through ~30K–34K vehicle records via `/_api/vpi_vehicledatas`.
- Progress is reported page-by-page: each of the ~7 pages contributes equally (~14%) across 0–98%. After all pages are fetched, progress is set to 98%, then post-processing completes to 100%. A `useRef`-based rAF animation loop inside `LoadingScreen` smoothly crawls toward each target via exponential decay (10% of remaining gap per frame at 60fps), making the bar and percentage text count up continuously instead of jumping.
- When data is ready, the app renders behind the splash in a `hidden` div so React Query hooks start fetching immediately. After 900ms (enough for the rAF to reach exactly 100%), the splash is removed from the DOM instantly — no fade, no opacity transition, no intermediate render state that could cause a "0% flash".
- After the splash disappears, each page handles its own data loading independently (admin pages show their own loading spinners for inquiries, MVRs, price suggestions).

```
index.html → main.tsx
    ↓
AppProviders
    ├── ThemeProvider          (reads themeStore, sets dark/light class on <html>)
    ├── DataSourceProvider     (initializes DataverseDataSource)
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

All repositories call `getDataSource()`. To swap implementations (e.g. to a REST backend), change the initialization in `DataSourceProvider` — no UI changes needed.

### Error Handling Pattern

Every page follows the same pattern:

```
Loading → show skeleton / pulse placeholders
Error   → show error message with retry/refresh action
Empty   → show friendly empty-state illustration
Data    → render the actual content
```

Mutations use `react-hot-toast` for success/error feedback (configured globally in `AppProviders`).

### PAD Inbox Processing

DriveArabia capture data follows a separate browser-assisted transport path:

```
PAD residential Chrome → Azure ingest_html → Blob/Table inbox
    → Admin “Process PAD Inbox” → multiSourceScraper.ts
    → DriveArabia parser → exact make/model/year/trim MVR match
    → missingVehicleRepository → Dataverse → Complete/Error acknowledgement
```

`src/lib/multiSourceScraper.ts` drains at most 25 items per action. It derives make/model from the DriveArabia URL and year/trim/prices from fixture-tested parser output; it never guesses a target record. Exact matches are written with `transport:'pad'`. DriveArabia's per-year JSON-LD describes one selected/default `vehicleConfiguration`, even though its price table lists several trims, so body/fuel/transmission/drive/cylinders/engine/doors/horsepower are persisted only for an exact configuration/year match. Horsepower also flows into Vehicle Data on approval; torque and origin remain in scrape provenance because MVR has no dedicated columns for them. A valid capture with no exact MVR stays `Pending` and stops the drain so it can be retried after the request exists. Invalid, unsupported, or write-failed items are marked `Error` so their raw Blob remains available, while successful items are marked `Complete` and purged. `useProcessScrapeInbox` owns mutation feedback and React Query invalidation.

### Theming

- Tailwind CSS `class` strategy — dark mode toggled by adding `dark` class to `<html>`
- State persisted to `localStorage` via `useThemeStore`
- Colour variables in `src/styles/globals.css` — no hardcoded colours in components
- `ThemeSwitcher` component in admin top bar
- Typography uses Inter as the single UI font via `tailwind.config.ts` and `globals.css`; dense numeric UI uses `tabular-nums` instead of monospace font overrides

### Performance

| Strategy | Where |
|---|---|
| React Query staleTime (5 min) | Vehicle data — avoids refetching on every mount |
| React Query refetchInterval (30 s) | Inquiries — polls for new submissions from valuation flow |
| Memoisation | `DataverseDataSource` memoizes hierarchy and analytics |
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
│   └── ui/                 # Reusable primitives — Button, Dialog, Card, LazyChart, SkeletonTable, ThemeSwitcher, NotificationDropdown, CustomSelect
├── features/
│   ├── landing/            # Landing page — hero, stats, CTA
│   ├── valuation/          # 3-step wizard — Step1PersonalInfo, Step2VehicleSelection, Step3Result + components
│   └── admin/              # Admin pages — Dashboard, Vehicles, Queries, MissingVehicles, PriceSuggestions, Settings + chart components
├── layouts/                # MainLayout (public), AdminLayout (sidebar + top bar)
├── hooks/                  # React Query hooks — server queries/mutations, startup orchestration, PAD inbox processing
├── repositories/           # Data access wrappers — vehicleRepository, inquiryRepository, missingVehicleRepository, priceSuggestionRepository
├── providers/              # AppProviders, DataSourceContext, ThemeProvider
├── stores/                 # Zustand stores — adminStore, inquiryStore, vehicleStore, themeStore, dashboardStore
├── types/                  # All TS interfaces — datasource.ts, vehicle.ts, inquiry.ts, analytics.ts, priceSuggestion.ts, missingVehicleRequest.ts
├── utils/                  # Helpers — formatCurrency, formatNumber, cn, memoize, debounce, validators, pdfExport
├── lib/                    # API/scraper modules — Dataverse APIs, YallaMotor transports, multiSourceScraper PAD processor
├── parsers/                # Fixture-tested YallaMotor/DriveArabia extraction + Dataverse normalization
├── data/                   # Data source context + DataverseDataSource + config + option sets
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
| `/admin` | AdminLayout | AdminDashboardPage | KPI cards, 5 charts, premium leaderboard |
| `/admin/dashboard` | AdminLayout | AdminDashboardPage | Same as `/admin` |
| `/admin/vehicles` | AdminLayout | AdminVehiclesPage | Paginated vehicle table with pricing lookup |
| `/admin/queries` | AdminLayout | AdminQueriesPage | Inquiry table, filter tabs, detail modal, export |
| `/admin/missing-vehicles` | AdminLayout | AdminMissingVehiclesPage | Missing vehicle requests with scrape results + status management |
| `/admin/price-suggestions` | AdminLayout | AdminPriceSuggestionsPage | User-submitted pricing suggestions with review workflow |
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
| 3 — Result | `Step3Result.tsx` | Displays price range, vehicle specs, market insights, and PDF export/restart actions. Auto-saves inquiry to data source on first load (guarded by `useRef(false)`). If vehicle not found, shows "Missing Vehicle" request dialog (specs + mileage) → triggers Flow 3 real-time YallaMotor scraping via `yallaMotorHttpScraper.ts` → displays live prices or "Unavailable" fallback with manual price inputs |

### Admin Dashboard (`/admin`)

- **6 KPI cards**: Total Vehicles, Total Makes, Total Models, Highest Value, Avg Market Price, Lowest Value — each with colour-coded gradient accent and heading colour
  - Queries and Missing Vehicles KPI cards are clickable — open inline status distribution breakdown (Pending/Reviewed/Contacted/Closed for Queries, Pending/Approved/In Progress/Reject for Missing Vehicles)
- **5 charts**: Top Makes (horizontal bar, top 10), Top Models (horizontal bar, top 10), Body Type (horizontal bar), Powertrain Donut, Value Trend (area chart)
- **Premium Vehicle Leaderboard**: Top 100 vehicles by market value
- **Price by Model Year chart**: Searchable Make and dependent Model dropdowns run a dedicated cached analytics query for the selected vehicle group
- All charts use a unified brand-coordinated palette (indigo/teal/amber/violet/cyan/orange) via shared colour rotation
- All data from `useDashboardAnalytics` hook with `DashboardFilters`

### Admin Queries (`/admin/queries`)

- **Table**: #, Customer (avatar + name), Contact (email + phone), Vehicle, Body Type, Status (colour badge), Date, View action
- **Filter tabs**: All · Pending · Reviewed · Contacted · Closed — each with count badge
- **Search**: Filters by name, email, phone, and vehicle (year + make + model + spec)
- **Pagination**: 15 per page with first/prev/next/last controls + ellipsis
- **Status management**: Inline `StatusSelect` dropdown in both table and detail modal — optimistic React Query mutation with toast feedback
- **Detail modal**: Clean layout — header (name, date, status dropdown, close) → contact info → location → vehicle grid → valuation pricing (Min / Median / Max)
- **Export**: Button downloads all inquiries as `.csv` with full columns — generated client-side

### Admin Missing Vehicles (`/admin/missing-vehicles`)

- **Table**: #, Make, Model, Year, Trim, Status, Scraped, Requester, Date, View action
- **Card/Grid view**: Toggle with `LayoutList`/`LayoutGrid` icons — responsive grid (`sm:grid-cols-2 lg:grid-cols-3`)
- **Status filter tabs**: All · Pending · Approved · In Progress · Reject — each with count badge
- **Detail modal**: Vehicle info, Contact details, Scrape Results section (parsed JSON listing data, clickable source URL), Status dropdown
- **Scrape status**: Displays badge with listing count in table; scraped min/max prices shown in card mode and detail modal
- Statuses: Pending · Testing · In Progress · Scraped · Failed · Unreachable

### Admin Price Suggestions (`/admin/price-suggestions`)

- **Table**: Submitted By, Min Price, Max Price, Source URL, Status (colour badge), Submitted date, Comment, View action
- **Card/Grid view**: Toggle between table and responsive card grid
- **Status filter tabs**: All · Pending · Edit & Approve · Rejected — built dynamically from Dataverse optionset
- **Search**: Filters by submitter name, vehicle name, and URL
- **Detail modal**: Editable min/max price inputs pre-filled from current values with "Save Changes" button; saving auto-sets status to "Edit & Approve"
- Statuses: Pending=4 · Approve=1 · Reject=2 · Edit & Approve=3

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
DataverseDataSource saves to Dataverse (upserts contact + creates vpi_vehicleinquiry record)
    ↓
Admin sidebar polls useInquiries every 30s via `/_api/vpi_vehicleinquiries`
    └── Uses `$expand=vpi_Contact(...),vpi_Vehicle(...)` to fetch customer & vehicle data through Dataverse lookups
    ↓
Admin views/manages on /admin/queries → status changes via PATCH to `vpi_vehicleinquiries`
```

**Note:** The `vpi_vehicleinquiry` entity does not store snapshot copies of customer or vehicle fields. The admin queries page reads them through Dataverse lookup expansion (`$expand`). Any future data source implementation must handle this the same way.

### Files

| File | Role |
|---|---|
| `src/types/inquiry.ts` | Types |
| `src/types/datasource.ts` | Interface contract: `saveInquiry`, `getInquiries`, `getInquiryById`, `updateInquiryStatus` |
| `src/data/dataverseDataSource.ts` | Dataverse Web API implementation |
| `src/data/dataverseConfig.ts` | Entity/field name constants, API base path |
| `src/data/dataverseOptionSets.ts` | Bidirectional choice-field maps (69 body types, etc.) |
| `src/lib/contactApi.ts` | Contact CRUD — creates contacts via `/_api/contacts` (dual-path: `webapi.safeAjax` / native `fetch`) |
| `src/lib/inquiryApi.ts` | Inquiry CRUD — creates inquiries via `/_api/vpi_vehicleinquiries` (dual-path: `webapi.safeAjax` / native `fetch`) |
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

> **Note:** All env vars in `.env.example` are reserved for future use. The app hard-codes Dataverse as its data source — no runtime configuration needed.

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
