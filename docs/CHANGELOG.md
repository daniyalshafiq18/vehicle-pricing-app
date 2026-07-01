# Changelog

## 2026-06-30

### Changed — Missing Vehicle Request API (Simplified Schema)
- **`src/types/missingVehicleRequest.ts`** — Simplified type: removed `MissingVehicleRequestStatus` type, `status`, `requestedCount`, `firstRequestedOn`, `lastRequestedOn`, and `comment` fields. Table uses its own dedicated body type optionset.
- **`src/types/datasource.ts`** — Removed `updateMissingVehicleRequestStatus` from `IDataSource`. Removed `comment` from upsert payload.
- **`src/data/dataverseConfig.ts`** — Updated entity set to `vpi_missingvehiclerequestses`. Removed tracking field mappings (`vpi_requestedcount`, `vpi_firstrequestedon`, `vpi_lastrequestedon`, `vpi_status`, `vpi_comment`). Fixed mileage field spelling (`vpi_minmilage`/`vpi_maxmilage`).
- **`src/data/dataverseOptionSets.ts`** — Added `MISSING_VEHICLE_BODY_TYPE` with the table's dedicated 62-value body type mapping (separate from master BODY_TYPE). Removed `MISSING_VEHICLE_REQUEST_STATUS` and helpers since the table has no status field.
- **`src/lib/missingVehicleApi.ts`** — Rewrote: simple POST create (no upsert/lookup/increment logic). Uses the dedicated body type mapping. Field names and entity URL match the exact Dataverse schema.
- **`src/data/dataverseDataSource.ts`** — Removed `updateMissingVehicleRequestStatus` method and import. Simplified upsert signature.
- **`src/repositories/missingVehicleRepository.ts`** — Removed `updateStatus` method.
- **`src/hooks/useMissingVehicleRequests.ts`** — Removed `useUpdateMissingVehicleRequestStatus` hook. Simplified `useUpsertMissingVehicleRequest` payload.
- **`src/features/valuation/Step3Result.tsx`** — Removed comment textarea from request dialog. API no longer accepts comments.
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Simplified table: removed status filter tabs, status badges, count column, and status change dropdown. Table now shows Make/Model/Year/Spec/Body Type/Requested Date with detail modal.

### Fix — Portal SPA-Shell Asset References
- **`vehicle-pricing-intelligence-platform/.powerpages-site/web-templates/spa-shell/SPA-Shell.webtemplate.source.html`** — Fixed hardcoded hashed filenames that went stale after `upload-code-site --compiledPath` replaced portal web files. Changed `/assets/index-CN2ljK-N.css` → `/assets/style.css` and `/assets/index-X2k2XeaT.js` → `/assets/index.js` to match the unhashed file naming in `vite.config.ts`.

### Build — Hashed Asset Filenames + Auto-Template Sync
- **`vite.config.ts`** — Switched to hashed filenames (`[name]-[hash]`) for production builds, preventing asset conflicts on portal uploads
- **`scripts/update-portal-template.mjs`** (new) — Post-build script that automatically reads the hashed output filenames from `dist/assets/` and updates the SPA-Shell web template with the correct references
- **`package.json`** — Build command now chains `tsc -b && vite build && node scripts/update-portal-template.mjs`

### Feature — Missing Vehicle Request (Phase 3 Backend)
- **`src/types/missingVehicleRequest.ts`** (new) — Added `MissingVehicleRequest`, `MissingVehicleRequestStatus`, and `MissingVehicleRequestUpsertPayload` types
- **`src/types/datasource.ts`** — Added `upsertMissingVehicleRequest`, `getMissingVehicleRequests`, `updateMissingVehicleRequestStatus` to `IDataSource` interface
- **`src/data/dataverseConfig.ts`** — Added entity name, field maps, and select fields for `vpi_missingvehiclerequests`
- **`src/data/dataverseOptionSets.ts`** — Added `MISSING_VEHICLE_REQUEST_STATUS` optionset with label/value helpers (pending=1, approved=2, rejected=3, in-progress=4, imported=5)
- **`src/lib/missingVehicleApi.ts`** (new) — Implemented upsert/fetch/update-status API functions using Dataverse Web API
- **`src/data/dataverseDataSource.ts`** — Wired API functions into `DataverseDataSource` methods
- **`src/repositories/missingVehicleRepository.ts`** (new) — Thin repository layer
- **`src/hooks/useMissingVehicleRequests.ts`** (new) — React Query hooks (`useMissingVehicleRequests`, `useUpsertMissingVehicleRequest`, `useUpdateMissingVehicleRequestStatus`)

### Feature — Vehicle Not Found Flow (Valuation Step 3)
- **`src/features/valuation/Step3Result.tsx`** — Added Vehicle Not Found state with amber icon, explanatory text, and vehicle summary card. Users can click "Request This Vehicle" → prefilled dialog (Make, Model, Year, Spec, Body Type) with optional comment field. On submit, triggers upsert mutation to Dataverse. Success state confirms the vehicle is in the review queue.

### Feature — Admin Missing Vehicle Requests Page
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** (new) — Full admin management page with table (Make, Model, Year, Spec, Body, Status, Count, Last Requested), status filter tabs (All/Pending/Approved/Rejected/In Progress/Imported), search by make/model/year, pagination, and per-row status dropdown. Includes detail modal with vehicle info, request stats, and user comment.
- **`src/features/admin/index.ts`** — Added `AdminMissingVehiclesPage` export
- **`src/app/router.tsx`** — Added `/admin/missing-vehicles` route
- **`src/layouts/AdminLayout.tsx`** — Added "Missing Vehicles" sidebar nav item with `SearchX` icon

### Documentation — Phase 3 Dataverse Tables
- **`docs/dataverse-schema.md`** — Added documentation for two new Dataverse tables:
  - **Missing Vehicle Request** (`vpi_missingvehiclerequests`) — Records vehicles users searched for that don't exist in master data (Make, Model, Body Type, Trim, Model Year, Min/Max Price, Min/Max Mileage)
  - **Price Suggestion** (`vpi_pricesuggestions`) — Accumulates user-submitted pricing suggestions linked to existing vehicles (Comment, Min/Max Price, Source URL, Submitted By, Vehicle Lookup)
  - Updated ER diagram, overview table, business flow (vehicle-exists decision branch), and design principles section

## 2026-06-29

### Documentation — Stale Memory Files Fixed
- **`README.md`** — Removed stale env vars (`VITE_API_BASE_URL`, `VITE_DATA_SOURCE`, `VITE_ENABLE_MOCK_DATA`) from table that no longer exist in `.env.example`
- **`docs/SETUP.md`** — Synced env var snippet to match actual `.env.example` (removed same 3 vars)
- **Claude system memory** (`C:\Users\PC\.claude\projects\C--vehicle-pricing-app\memory\`) — Fixed all 4 memory files:
  - `project-identity.md` — replaced ExcelDataSource/DatasheetJS references with Dataverse
  - `learned-conventions.md` — updated "Excel is current" → "Dataverse is current"
  - `cleanup-history.md` — added note that Phase-2 superseded the intermediate revert
  - `dataverse-phase2-infrastructure.md` — Rewritten to describe final architecture (not the discarded `src/data/dataverse/` approach)
  - Created `MEMORY.md` index for the system memory directory
- `memory/project-identity.md` and `memory/learned-conventions.md` (repo) were already up to date

## 2026-06-24

### Valuation Pricing — Accurate Per-Vehicle Min/Max
- **Root cause:** `buildPricingIndex()` computed `minimumPrice` and `maximumPrice` from the **entire make segment** (all vehicles of the same make), not the specific vehicle variant's own values. A Toyota Camry LE would show min/max spanning the cheapest Corolla to the priciest Land Cruiser.
- **Fix:** Added `rawMinPrices` and `rawMaxPrices` maps populated from `vpi_minprice`/`vpi_maxprice` during `initialize()`
- **Fix:** `getValuation()` now overrides `minimumPrice`/`maximumPrice` with the per-vehicle raw values from Dataverse (cloned to avoid mutating the shared cache)

### Admin Inquiry Modal — Pricing Data Now Visible
- **Root cause:** `parseInquiry()` never constructed `valuationResult` — the modal always showed "No valuation data available"
- **Fix:** Added `vpi_vehicledataid` to the `$expand` vehicle `$select` in `getInquiries()` and `getInquiryById()` so the vehicle GUID is available for cache lookup
- **Fix:** `parseInquiry()` now looks up the cached `Vehicle` + `VehiclePricing` by the expanded vehicle GUID and constructs a full `ValuationResult` (with confidence indicator)
- **Fix:** When cache lookup misses, falls back to a minimal `ValuationResult` from the raw pricing fields in the expanded vehicle data

### Documentation — Inquiry System Data Flow
- **`docs/context.md`** — Updated Lifecycle section with `$expand` detail explaining that customer/vehicle data is fetched through Dataverse lookups at query time (not snapshot fields); added note about future data source compatibility
- **`docs/DEVELOPMENT.md`** — Split Inquiry Data Flow into write path and read path; added `$expand=vpi_Contact(...),vpi_Vehicle(...)` to the read diagram; added note explaining the lookup-based reading pattern and option-set helper usage
- **`docs/PHASE-2-PERFORMANCE-OPTIMIZATION.md`** — Created comprehensive performance optimization roadmap with 8 prioritized items, effort estimates, and verification checklist

## 2026-06-23

### Bug Fix — Admin Queries Page Shows Blank Rows (Inquiry Snapshot Data)
- **Root cause:** The `vpi_vehicleinquiry` entity has no snapshot fields (`vpi_firstname`, `vpi_email`, etc.) — the original `parseInquiry()` read them via `(record as any)` which always returned empty strings
- **Fix:** Removed the non-existent snapshot fields — the POST payload now only sends the 4 valid fields (`vpi_name`, `vpi_Contact@odata.bind`, `vpi_Vehicle@odata.bind`, `vpi_status`)
- **Fix:** `getInquiries()` now uses **`$expand=vpi_Contact(...),vpi_Vehicle(...)`** to fetch customer and vehicle data through the Dataverse lookups — returns real names, emails, vehicle details
- **Fix:** `getInquiryById()` also uses `$expand` for consistency
- **Fix:** `parseInquiry()` reads contact fields from the expanded `vpi_Contact` object and vehicle fields from `vpi_Vehicle` — uses `bodyTypeLabel()`/`cityLabel()` option-set helpers
- **Chore:** Removed `RawInquiryRecord` interface (no longer needed) — only `RawContactRecord` remains
- **Chore:** Removed 11 debug `console.log` calls from `dataverseDataSource.ts` and 6 from `Step3Result.tsx`

### Documentation Sweep — Full Audit
- **All docs updated** to reflect Phase 2 completion
- **All docs updated** to reflect Phase 2 completion — see individual files for details
- Fixed stale Excel references across `README.md`, `memory/project-identity.md`, `memory/learned-conventions.md`
- Fixed pagination description (`@odata.nextLink` → keyset pagination) in `DEVELOPMENT.md` and `MIGRATION.md`
- Added missing API module docs (`contactApi.ts`, `inquiryApi.ts`) to `context.md`, `DEVELOPMENT.md`, `MIGRATION.md`
- Updated `CLAUDE.md` lib description from `webapi.ts` to `safeAjax.ts`

## 2026-06-22

### Phase-2 — API Layer Refactored
- **Created `src/lib/contactApi.ts`** — dedicated contact creation module with dual-path strategy:
  - Primary: `webapi.safeAjax` (reads `entityid` response header)
  - Fallback: `safeFetchWithMeta` native `fetch()` (supports `entityid` and `OData-EntityId` headers)
- **Created `src/lib/inquiryApi.ts`** — dedicated inquiry creation module with same dual-path strategy
  - Enhanced error reporting includes full XHR response body for debugging failures
- **Refactored `dataverseDataSource.ts`** — `saveInquiry()` and `upsertContact()` now delegate to the dedicated API modules instead of inline calls
- **Added debug logging** (`[saveInquiry]`, `[upsertContact #N]`) for troubleshooting the inquiry save pipeline (temporary — to be cleaned up)
- **Cleaned up stale Power Pages build artifacts** — removed 16 old `.js.map` and `.webfile.yml` entries from the `.powerpages-site/` export directory
- **`vite.config.ts`** — re-enabled `manualChunks: undefined` for simpler build output

## 2026-06-19

### Simplified — Removed Proxy Complexity
- **Actual vehicle count is 14,631** (not 33K+ from old Excel data). The year-by-year portal API approach already fetches all records correctly.
- **Removed `Ajax/Vehicles-Proxy` web template** — server-side fetchxml endpoint no longer needed
- **Removed `fetchAllVehiclesFromProxy()`** — proxy endpoint fetch with safeFetch and raw-fetch fallback
- **Removed `fetchAllVehiclesDirect()` and `callDataverseWithToken()`** — OAuth token approach no longer needed
- **Removed `DATAVERSE_ORG` / `DATAVERSE_API` constants** and `scripts/update-vehicles-proxy-template.ps1`
- **Simplified `fetchAllVehicles()`** — single year-by-year strategy, clean and straightforward
- **Reverted `shell.getTokenDeferred` type** in `webapi.ts` — resource parameter no longer needed

## 2026-06-17

### Phase-2 Complete — Pure Dataverse
- **Removed `ExcelDataSource`** — deleted `src/data/excelDataSource.ts` and `UAE_Vehicle_Data.xlsx`
- **Removed `xlsx` (SheetJS) dependency** — eliminated ~500 KB from bundle, replaced with native CSV/TSV exports
- **Made Dataverse the hard-coded default** — `DataSourceContext.tsx` initializes `DataverseDataSource` directly (no type switching, no env var)
- Updated `AdminSettingsPage.tsx` — shows "Dataverse (Power Pages Web API)" as the active source
- Updated all exports (PremiumLeaderboard TSV, AdminQueriesPage CSV, inquiries CSV) — no remaining xlsx references
- Cleaned up stale Excel comments in `dataverseDataSource.ts` and `datasource.ts`

### Documentation Sweep
- `CLAUDE.md` — updated tech stack, architecture diagram, project structure, env vars section
- `docs/context.md` — removed all Excel references, updated data flow, tech stack, architecture, inquiry lifecycle
- `docs/MIGRATION.md` — rewritten as Dataverse Architecture Guide (no more migration options)
- `docs/DEVELOPMENT.md` — updated data layer diagram, added DataverseDataSource section, removed ExcelDataSource section
- `docs/SETUP.md` — replaced Excel setup instructions with Dataverse context
- `memory/` — updated project-identity.md and cleanup-history.md

### Phase-2 — Dataverse Integration
- Created `src/data/dataverseConfig.ts` — API base URL, entity logical names, field constants, `$select` strings
- Created `src/data/dataverseOptionSets.ts` — bidirectional option-set mappings for all 9 choice fields (body type, category, transmission, doors, seats, drive type, powertrain, vehicle type, inquiry status, city) with typed helper functions
- Created `src/data/dataverseDataSource.ts` — full `IDataSource` implementation backed by the Power Pages Web API
  - Paginated vehicle fetch on init (follows `@odata.nextLink`)
  - Option-set conversion (int → label) during parsing
  - In-memory cache for analytics/hierarchy (same pattern as ExcelDataSource)
  - Inquiry CRUD via Web API (contact upsert → inquiry create, status PATCH)
  - Uses `safeFetch` from `@lib/webapi` for CSRF-authenticated requests
- Updated `src/data/DataSourceContext.tsx` — supports runtime switching via `type` prop or `VITE_DATA_SOURCE=dataverse` env var
- Extended `src/lib/webapi.ts` — added `body` to `SafeFetchOptions` for POST/PATCH support

### Lib & Path Aliases
- Simplified `src/lib/webapi.ts` — removed jQuery dependency, replaced `$.Deferred()` / `$.ajax()` with native `fetch()` + `Promise`, modernised IIFE global pattern to ES module export
- Added `@lib` path alias to `tsconfig.json` and `vite.config.ts` pointing to `src/lib/`

### Project Cleanup
- Removed all API-related work (`src/webapi/`, `src/data/dataverseDataSource.ts`, `src/data/vehicleComputations.ts`)
- Consolidated documentation: moved `Documentation/` → `docs/` (all 5 files), added `dataverse-schema.md`
- Cleaned up project root: removed stale `vehicle-pricing-intelligence-platform/` (73 MB duplicate Power Pages export), screenshots, test artifacts, and empty directories (`public/`, `src/services/`)
- Removed unused `@types/jquery` dependency
- Updated `.gitignore` — added `.vite/`
- Reverted env files and `tsconfig.json` — removed dataverse-specific entries, restored `VITE_DATA_SOURCE`
- Updated `README.md` — documentation section now points to `docs/` paths
- Removed `.env` and `.env.production` — unused (env vars are not consumed by the app); kept `.env.example` as documentation only
- Created `CLAUDE.md`, `MEMORY.md`, and `memory/` files for project rules and persistent memory

### UI Changes
- Updated admin sidebar title to **"Admin Center"** and subtitle to **"Vehicle Intelligence Platform"**

## 2026-06-10

### Documentation
- Updated `context.md` — fixed Step3Result description, removed stale "Analytics" from removed routes, documented `/result` and `/admin/dashboard` routes, updated env var section to clarify they're reserved for future use
- Updated `SETUP.md` — synced `.env` example variables with actual `.env.example`, removed mock data reference (feature not implemented)
- Updated `README.md` — corrected tech stack table (added TanStack React Query), synced env vars table with actual `.env.example`, noted env vars are not consumed yet
- Updated `CHANGELOG.md` — added today's entry

### Landing Page
- Removed stale "Confidence Scores" and "Comparable Search" feature cards — replaced with "Price Range" and "Detailed Specs" matching current valuation output
- Fixed import to include `Tag` and `Gauge` icons
- Updated "Price Predictions" description to "Market Valuations" with accurate wording
- Downgraded "Market Insights" description from "actionable insights" to "contextual observations"
- Corrected "Export Ready" description to reflect actual capabilities (PDF + XLSX)

### Admin Dashboard
- Fixed sidebar hover restoration — switched from CSS-only back to React state-based (`hovered` state with `onMouseEnter`/`onMouseLeave`)
- Fixed KPI card grid from `xl:grid-cols-7` to `xl:grid-cols-6` — eliminated empty column with 6 cards
- Enhanced KPI cards with color-coded gradient accents, themed icon backgrounds, decorative elements, and subtitles
- Fixed vehicle count discrepancy (32,790 → 33,370) — changed `totalVehicles` from `prices.length` (priced vehicles only) to `vehicles.length`
- Removed "Pricing" and "Reports" sidebar items

### Admin Queries Page (new)
- Created `src/features/admin/AdminQueriesPage.tsx` with full inquiry management table
- Filter tabs (All, Pending, Reviewed, Contacted, Closed) with count badges
- Search by name, email, phone, or vehicle
- Pagination with page controls
- StatusSelect dropdown for inline status changes with optimistic UI
- InquiryDetailModal with user info, contact details, vehicle specs, and valuation pricing
- Modal layout iterated: fixed sizing issues, two-column layout, compact spacing, submission date in header, removed price range and market trend sections

### Dialog Component
- Added `hideCloseButton` prop to `Dialog` component for custom header layouts

### Inquiry System
- Updated `InquiryStatus` type: `'pending' | 'reviewed' | 'contacted' | 'closed'`
- Wired up inquiry saving in `Step3Result.tsx` — auto-saves inquiry when valuation loads (guarded by `useRef` to prevent duplicates)
- Added `useSaveInquiry` and `useUpdateInquiryStatus` mutation hooks with toast notifications
- Added auto-refetch interval (30s) on `useInquiries` for real-time updates

### Admin Layout
- Added Queries sidebar item with pending-count badge
- Added `/admin/queries` route to router
- Added `'/admin/queries': 'Queries'` to page titles

### Export
- Added `useExportInquiries` hook — exports all inquiries as XLSX via the `xlsx` library
- Export button in Queries page header (next to search bar)

### Router
- Route: `<Route path="queries" element={<AdminQueriesPage />} />` under admin layout

### Data Source
- `IDataSource` interface unchanged (inquiry methods already defined)
- `ExcelDataSource` — inquiry methods use in-memory array
