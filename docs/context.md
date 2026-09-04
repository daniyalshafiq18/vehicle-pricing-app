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

The shared `Dialog` primitive renders overlays through a React portal attached to `document.body`. This keeps modal placement and typography independent of card animation transforms, overflow clipping and table formatting; nested dialogs preserve and restore the previous body scroll-lock state.

Correlated DriveArabia PAD processing resolves the prepared Run directly through the `vpi_correlationkey` carried by the URL fragment. The lookup uses a minimal Power Pages `$select`, then verifies the Run's Missing Vehicle Request ownership and active status before reading its Source Results. A correlated capture is acknowledged only after normalized evidence succeeds; resolver or persistence warnings leave it Pending so the same capture can be retried.

Phase 5 begins with a read-only review boundary in the MVR modal. `useVehicleScrapeEvidence()` loads the newest Run for the request through `VehicleScrapeRepository`, loads its Source Results, polls only while that Run is active, and presents each source's price type, provenance, prices and specifications independently. Legacy aggregate MVR scrape fields remain visible during migration but are not treated as the decision source.

The next Phase 5 slice persists the administrator-owned decision on the MVR. Only terminal Runs unlock the form; selected price/specification results must be Succeeded rows belonging to the displayed Run. The PATCH stores approved min/max, decision status/method, reviewed Run, primary price result, selected specification result, notes and the terminal decision timestamp. It does not yet promote or update Vehicle Data.

When a terminal Run first unlocks review, the form maps the system lifecycle values `Awaiting Scrapes`/`Scraping` to `Ready for Review`. This keeps the native select's visible default synchronized with the choice integer sent to Dataverse.

Phase 6 adds guarded Vehicle Data promotion as a separate administrator action. The app re-reads the saved decision and evidence, uses the MVR identity plus the selected specification result and approved price range, then creates or safely reuses one exact master record before linking it back to the MVR and setting ordinary MVR Status to Approved. Direct promotion through the generic status dropdown is disabled, and duplicate/retry checks run before the Vehicle Data POST.

Phase 6 is live-proven as of 2026-08-24. The administrator verified the promoted Vehicle Data record, approved range, selected specifications, evidence links, final MVR status and disabled retry state end to end.

Phase 7A adds a secured one-click DriveArabia transport adapter. After shared evidence preparation, the signed-in portal invokes a site-associated Power Pages cloud flow that is restricted by web role. This endpoint submits the serialized `eventData` form envelope through `shell.ajaxSafePost` when exposed by the template, or through an equivalent CSRF-token fallback based on `shell.getTokenDeferred()`; the Dataverse `webapi.safeAjax` JSON transport is not compatible with this dispatch boundary. The flow runs PAD with the correlated URL and returns the exact Azure Inbox ID; the browser processes only that capture through the existing parser and prepared Source Result. Attended URL copy and record-scoped processing remain the rollback path until background completion is implemented.

As of 2026-08-25, the PAD contract, registered machine connection and solution-aware Power Pages cloud flow are configured, and the generated registration GUID is present in local build configuration. Live acceptance remains pending. The flow is temporarily limited to Authenticated Users—not Anonymous Users—because duplicate Contacts and an empty External Identity table prevent reliable assignment of the dedicated administrator role. Administrator-only access remains a production gate.

As of 2026-08-28, the inherited cloud flow and its invalid connection references were superseded by the solution-native `MVR - DriveArabia - On Demand Scrape` flow, a newly authorized local-machine connection and a fresh site registration. The registration GUID is resolved at runtime from the `VPI/DriveArabiaCloudFlowId` Power Pages site setting, with the Vite variable retained only as a development fallback. Live deployment proves the site setting, authenticated Contact, CSRF token extraction, endpoint and form envelope are correct. The administrator Contact is now uniquely mapped and authenticated; the flow remains temporarily assigned to Authenticated Users because dedicated `VPI Administrators` enforcement was deliberately deferred. A response-only Power Pages smoke flow still returns HTTP 500 before creating a run, while manually running the production cloud flow successfully starts PAD and returns an accepted Azure Inbox ID. Exact recovery of Inbox `087ae330a1ef` then completed the intended MG 5 Run/Source Result in Dataverse without consuming an older capture. The remaining blocker is therefore Power Pages dispatch and should be escalated with its portal correlation; the scraper, PAD, cloud-to-machine connection and exact recovery path are proven.

As of 2026-08-31, a temporary HTTP-triggered copy independently proves the complete downstream chain. The application prepared MVR `94498b42-10a5-f111-aaac-70a8a5539ec6` and Run correlation `6ead7d6a-f91e-4f21-b542-bed6f0d05f49`; an asynchronous HTTP request launched attended PAD, Azure accepted Inbox `e9fa983b3483`, and record-scoped processing completed the exact prepared DriveArabia result. This isolates the remaining gap to secure application dispatch and automatic result handoff. The test flow's signed HTTP URL is a secret and its temporary **Anyone** access is not a production design; it must be disabled or protected after diagnostics and never embedded in frontend code.

As of 2026-09-01, secure application dispatch is live-proven through the Dataverse-triggered replacement. Multiple portal-prepared Source Results automatically launched PAD and persisted accepted Inbox receipts to their exact Dataverse rows. Client cache bypass, table change tracking, publishing and a Power Pages Preview cache reset did not make workflow-updated rows reliably visible before the browser deadline; a Volkswagen PASSAT CC run still served its original Queued snapshot for more than five minutes and required exact-Inbox recovery. Unified completion therefore no longer polls Power Pages for the receipt. The browser polls the existing Azure Inbox by the prepared Run correlation plus attempt number, validates the returned URL fragment, and processes only that exact Inbox ID. Dataverse receipt fields remain audit state, while Azure is the non-cached real-time handoff boundary.

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

The canonical historical and operational reference for this pipeline is `docs/DRIVEARABIA-SCRAPE-END-TO-END.md`. It records the failed Power Pages dispatch boundary, the Dataverse-triggered replacement, exact Azure Run/attempt receipt discovery, PAD JSON/version fixes, specification edge cases, deployment, recovery and troubleshooting.

DriveArabia capture data follows a separate browser-assisted transport path:

```
PAD residential Chrome → Azure ingest_html → Blob/Table inbox
    → Admin “Process PAD Inbox” → multiSourceScraper.ts
    → DriveArabia parser → exact make/model/year/trim MVR match
    → legacy MVR update + normalized Run/Source Result → Dataverse
    → Complete/Error acknowledgement
```

`buildDriveArabiaModelYearUrl()` builds a short DriveArabia route from an MVR's make/model/year. The request modal's **Copy PAD URL** action supplies it to PAD's required `DriveArabiaUrl` text input, removing the former fixed Camry navigation. DriveArabia redirects short routes to its current canonical route, and PAD records the final browser URL in the payload. `src/lib/multiSourceScraper.ts` then drains at most 25 items per action. It derives make/model from that final DriveArabia URL and year/trim/prices from fixture-tested parser output; it never guesses a target record. Exact matches are written with `transport:'pad'`. The parser prefers the `vpi-pad-spec-groups` marker used by the established rendered-DOM capture. For native PAD Web Page Source, which omits that injected marker, it can instead read fully populated accordion bodies serialized beneath `#specs`; this fallback is rejected unless every Specs control contains a detailed engine block. Identical mechanical groups repeated across grades are de-duplicated while retaining each complete grade-to-engine association, including labels split across nested nodes such as `LE` + `Titanium` + `+`. Both paths otherwise map a commercial trim only when capacity, I/V cylinder layout, hybrid marker, and drivetrain produce one unique match; unresolved or ambiguous trims remain price-only. Horsepower also flows into Vehicle Data on approval; torque and origin remain in scrape provenance because MVR has no dedicated columns for them. A valid capture with no exact MVR stays `Pending` and stops the drain so it can be retried after the request exists. Invalid, unsupported, or write-failed items are marked `Error` so their raw Blob remains available, while successful items are marked `Complete` and purged. `useProcessScrapeInbox` owns mutation feedback and React Query invalidation.

**Live status (2026-09-04):** the published automatic workflow succeeds end to end for the Nissan Patrol split-grade cases `SE Titanium` and `LE Titanium+`, including specifications. Exact plus-sign identity and complete nested-button label extraction are therefore live-accepted; conservative ambiguity rejection remains the rule for unknown trims.

DriveArabia price rows are scoped to the final **Original Trim Prices** or **Trim Prices** section. Trim labels do not need a drivetrain suffix because pages can use names such as `2.4L sedan` or `std`; the section boundary, row length/price validation, and exact MVR trim matching provide the safety constraints.

Where source naming differs, price matching remains conservative rather than fuzzy. Exact normalized text wins; otherwise one unique row must share engine capacity and distinctive grade after recognized parenthetical option-level wording is removed, with no conflict in any mechanics stated by both names. The live Dodge example maps YallaMotor `3.6L SXT (Mid Option)` to DriveArabia `3.6 V6 SXT`. Both requested and source trim labels are retained in evidence.

For an exact JSON-LD-selected older trim, a single Specs group with the same engine capacity may provide cylinders, drivetrain, transmission, fuel, horsepower, and torque. This covers `2.4L sedan` → `2.4 I4 FWD`; duplicate capacity matches remain unmerged.

**Live status (2026-08-18):** the dynamic attended workflow passed a non-Camry end-to-end test with Honda Accord `2.4 DX/LX` 2013. PAD navigation/capture, Azure ingestion, exact inbox matching, all required specification fields, prices, and Dataverse persistence succeeded. The attended transport is functionally proven; remaining work is orchestration automation rather than extraction correctness.

### Multi-source scrape persistence foundation (2026-08-19)

Dataverse now has a normalized evidence model: one Missing Vehicle Request has many `Vehicle Scrape Run` rows, and each run has many `Vehicle Scrape Source Result` rows. A source result owns its own prices, price type, specifications, transport, URL, evidence references, timing, and errors. This removes the legacy last-write-wins limitation of the shared MVR scrape fields and prevents unlike evidence—such as YallaMotor used asking prices and DriveArabia original reference prices—from being silently blended.

The MVR owns the admin decision: approved minimum/maximum prices, decision status/method/notes, reviewed run, independently selected price and specification results, decision contact, and timestamp. Both new tables are enabled through Power Pages with downloaded `enabled=true` and `fields=*` site settings. `vehicleScrapeApi.ts` and `VehicleScrapeRepository` provide typed create/read/update operations.

YallaMotor **Scrape Now** is the first migration consumer. `yallaMotorDualWrite.ts` performs one Azure-first/Power-Automate-fallback scrape, preserves the legacy MVR update, and additionally creates a linked single-request Run and YallaMotor Source Result. Successful evidence includes prices, listing count, normalized specifications, source URL, transport, attempt number, and a sanitized raw-result snapshot. Source Result Category reuses the MVR regional-spec mapper (`GCC`, `NON-GCC`, `OTHER/STANDARD`), while Raw Result JSON retains the source wording such as `american specs`. If normalized evidence persistence fails, the successful legacy MVR update remains visible and the admin receives a warning; failed or blocked scrape attempts record diagnostics whenever run creation succeeded.

DriveArabia is the second migration consumer. After each exact legacy PAD/MVR update, `driveArabiaDualWrite.ts` creates a one-source Run and Source Result using DriveArabia, Power Automate Desktop and Original Reference. Every exact request matched by one capture gets its own Run; the shared Inbox ID is stored as batch correlation. The Source Result stores min/max prices, supported exact-trim specifications, URL, Inbox ID, timing and sanitized JSON but never the captured HTML. Evidence persistence warnings are surfaced separately without undoing the legacy update or changing established inbox acknowledgement semantics.

Phase 4 now provides one per-request admin **Scrape** action with source selection. YallaMotor and DriveArabia are enabled by default; one shared Run and queued source results are prepared before YallaMotor executes immediately. The queued DriveArabia result carries its complete correlated PAD URL and serves as the secure dispatch job for a solution-aware automated Dataverse flow. That flow serializes attended PAD, records the returned Inbox ID/status on the same row, and the app polls and processes that exact receipt without calling a Power Pages or secret HTTP endpoint. A correlated PAD capture resolves only the exact active Run/MVR/attempt, updates its existing DriveArabia result, strips internal fragment keys from stored provenance, and re-aggregates the parent Run. Uncorrelated captures retain the live-proven standalone path; malformed or unresolved explicit correlation warns instead of creating a duplicate Run. The existing bulk action is explicitly YallaMotor-only, and the existing Dataverse schema remains sufficient.

In the unified path, MVR Scrape Status is a projection of the shared job rather than the first source to finish: Pending before preparation, In Progress while any selected source is active, Scraped when the terminal Run has at least one success, and Failed when every selected source terminates without success. The status-only PATCH is intentionally separate from legacy scrape-result writes.

Manual PAD recovery remains exposed as **Process PAD Capture** inside each MVR modal and receives only that record plus an explicitly entered 12-character Inbox ID. The page-wide action is removed. Normal one-click processing discovers the Inbox ID through Azure using the exact prepared Run correlation plus attempt; the Inbox ID/status written to the Source Result by the Dataverse-triggered flow remains durable audit evidence. Both paths bypass unrelated older Pending captures without skipping, consuming or attaching them by guesswork.

**Live status (2026-08-20):** YallaMotor and DriveArabia dual-write are proven end to end in the published portal. Both preserve the legacy MVR update and create linked Completed Runs plus Succeeded Source Results with source-specific prices, specifications and provenance. The DriveArabia gate passed with MG 5 2026 `STD`: Run counts `1/1/0`, DriveArabia/PAD/Original Reference evidence, AED 49,900–51,000 and the expected specifications all matched in Dataverse. Source Result Average Price and MVR Approved Average Price were removed because no true listing average is supplied. Power Pages detailed inner errors remain disabled after completing diagnosis.

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
