# Changelog

## 2026-07-20

### Flow 3 — Count Fix: Double `replace()` + `@{...}` Template Syntax
- **User fixed `Extract Listing Count` expression** — added second `replace()` to strip double quotes: `replace(replace(..., '>', ''), '"', '')`. Both `>` prefix (`>294` → `294`) and `"` wrapping (`"\"7"` → `7`) are now stripped.
- **User fixed Response body syntax** — changed from bare `outputs('Extract_Min_Price')` to `@{outputs('Extract_Min_Price')}` template interpolation syntax. Without `@{...}`, values were not interpolated correctly into the JSON response.
- **Test 3 confirmed ✅** — 2024 Mercedes-Benz C-Class C 200 returns: `Count: 6`, `Min Price: 127000`, `Max Price: 275000`
- Frontend display now shows correctly: *"6 listings · AED 127,000 – 275,000 · 2024–2024"*
- Updated `docs/power-automate-cloud-only-design.md` — Extract Listing Count step, Response body section, and Test Results section all updated with working expressions
- Updated `memory/learned-conventions.md` — added `@{...}` template syntax and double `replace()` patterns

## 2026-07-17

### Flow 3 — Final Architecture: SAS Token Auth + Try/Catch Scope + Direct Flow URL
- **Authentication resolved**: Changed Flow 3 trigger to "When an HTTP request is received" with **"Anyone can trigger"** setting — generates a SAS token (`sig=...`) embedded in the URL, eliminating the 401 OAuth error
- **Direct browser-to-flow approach adopted**: Frontend calls the flow HTTP POST URL directly via `fetch()` — no Power Pages proxy, no server logic middleware
- **Try/Catch Scope pattern added**: All scraping actions (Build Search URL → HTTP GET → Extract Heading → Extract Prices) placed inside a **Try Scope**. A **Catch Scope** (configured to run on failure/skip/timeout) contains only the **Response (PREMIUM)** action — returns Count: -1 to signal YallaMotor was unreachable
- **Response (PREMIUM) returns only 3 values**: `Min Price`, `Max Price`, `Count` — heading and source URL are constructed client-side to keep the response lightweight
- **`_unavailable` graceful error UI**: When Count = -1 (Catch scope fired), the frontend shows an amber "Live Data Unavailable" banner with manual price inputs and "Submit Request" button instead of a red error box — users can still submit their request without scraped data
- **Count parsing fix (scope-wrapping quotes)**: Power Automate `outputs('ActionName')` inside a Scope wraps values in extra quotes (`"\"7"` instead of `7`). Frontend applies `String(result['Count']).replace(/[^0-9-]/g, '')` to strip non-numeric characters. Flow's `int()` wrapper was inconsistent — frontend handles it robustly
- **Current issue**: After user added `int()` to Extract Listing Count expression, it returns 0 instead of the actual count (e.g., 6 for 2024 Mercedes-Benz C-Class). The frontend fix already handles the raw expression output — user needs to **revert the flow's Extract_Listing_Count expression back to the original** (remove `int()` wrapper)

### `yallaMotorHttpScraper.ts` — Final Implementation
- Created `src/lib/yallaMotorHttpScraper.ts` with `scrapeViaFlow3()` function calling the Power Automate HTTP trigger URL directly
- `Flow3ScrapeResult` interface with `success`, `make`, `model`, `trim`, `year`, `count`, `minPrice`, `maxPrice`, `heading`, `sourceUrl`, and optional `_unavailable` flag
- Constructs YallaMotor URL client-side using the hyphenated slug pattern (`replace(/\s+/g, '-')` for multi-word makes/models/trims)
- Builds `heading` string locally: `"6 listings · AED 127,000 – 275,000 · 2024–2024"`
- Uses `satisfies Flow3ScrapeResult` type assertion for type safety

### Step3Result.tsx — Scraped Data Display
- Three-state UI for scrape results:
  - `flow3Result._unavailable === true` → amber "Live Data Unavailable" banner + manual price inputs
  - `scrapeError && !flow3Result` → red error box with "Try Again" button (network errors)
  - `flow3Result` → live price display from YallaMotor + price suggestion fields + "Confirm & Submit"
- Created MVR now includes all scraped fields: `scrapedMinPrice`, `scrapedMaxPrice`, `scrapedListings` (JSON with count/min/max/url/heading), `scrapedSources`, `scrapeStatusValue: 4` (Scraped)

### Documentation Updated
- `docs/power-automate-cloud-only-design.md` — Flow 3 section rewritten to reflect actual Try/Catch scope architecture, SAS token auth, and 3-output Response
- `CLAUDE.md` — Added `yallaMotorHttpScraper.ts` to project structure lib/ section
- `memory/learned-conventions.md` — Added SAS token pattern, scope-wrapping quotes issue, `_unavailable` UI pattern
- `memory/power-automate-flow-design.md` — Updated Flow 3 status to reflect final architecture

## 2026-07-16

### Flow 3 — New HTTP-Triggered Flow Design for Real-Time Scraping
- **New approach**: Instead of Dataverse-triggered scraping (slow, user never sees results), created **FLOW 3** with "When an HTTP request is received" trigger
- Frontend calls Flow 3 → scrapes YallaMotor → returns JSON immediately → user sees results → suggests price (optional) → MVR created with both scraped + suggested prices
- `vpi_scraped_minprice/maxprice` = scraped from YallaMotor, `vpi_minprice/maxprice` = user-suggested (both preserved)
- Full design documented in `docs/power-automate-cloud-only-design.md` (FLOW 3 section)

### Flow 2 — Full Test Results with Mercedes-Benz C-Class C 200
- **First test** — used old URL builder (no hyphen fix, no version/trim segment):
  - Results: `>294` listings, AED 5,000–385,000, years 2000–2027
  - Scraped Sources link returned 404 (space in URL: `mercedes benz`)
- **🔑 Key discovery** — YallaMotor's URL needs the **version/trim segment** (`vr_c-200`) for year-specific results. Without it, the heading shows the entire model range across all years
- **Manual test with correct URL** (`/mercedes-benz/c-class/vr_c-200/yr_2021_2021`):
  - ✅ **7 listings · AED 95,000 – 145,000 · 2021–2021** — accurate, year-specific data!
- Updated URL builder: added `replace(' ', '-')` for multi-word makes/models and `/vr_{trim-slug}` segment
- Documented hyphen rule: database stores "Mercedes Benz" (space), YallaMotor URL needs "mercedes-benz" (hyphen)
- Updated `docs/power-automate-cloud-only-design.md` with corrected test results and URL pattern

## 2026-07-15

### Flow 2 — Field Name Fix & Debug Step
- Fixed all `Update a row` Row ID expressions in Flow 2 design doc: `vpi_missingvehiclerequestid` → `vpi_missingvehiclerequestsid` (Dataverse uses lowercase `sid` suffix, not uppercase `ID`)
- Added debug Compose step (Step 2) after trigger to inspect exact trigger output field names before building expressions
- Documented step numbering shift caused by debug step insertion

### Fixed — YallaMotor Backend Outage Diagnosed
- Discovered YallaMotor was returning `backend_error` (`backend=nextjs`, `Backend fetch failed`) — their Next.js servers were down, NOT Cloudflare blocking the HTTP connector
- Both Flow 1 (Toyota Camry) and Flow 2 (Mercedes-Benz) failed for the same reason: YallaMotor server outage
- The Power Automate Cloud-only approach remains viable. Cloudflare was not the cause of recent failures
- Updated `docs/power-automate-cloud-only-design.md` status header to reflect accurate diagnosis
- Updated `docs/PHASE-3-REVISED-PLAN.md` status with YallaMotor backend outage finding

### Fixed — URL Format for Multi-Word Makes/Models
- Identified that multi-word makes ("Mercedes Benz") and models ("C-Class") need hyphenated URL slugs (`mercedes-benz`) not space-encoded (`mercedes%20benz`) for YallaMotor URLs
- Documented in design doc URL builder expression

### Added — Scrape Result Fields Wired into UI
- Added `scrapeStatus`, `scrapeStatusValue`, `scrapedListings`, `scrapedMinPrice`, `scrapedMaxPrice`, `scrapedSources` to `MissingVehicleRequest` type
- Added scrape field names to `MISSING_VEHICLE_REQUEST_FIELDS` in `dataverseConfig.ts`
- Added `MISSING_VEHICLE_SCRAPE_STATUS` optionset mapping (Pending=1, Testing=2, In Progress=3, Scraped=4, Failed=5, Unreachable=6) in `dataverseOptionSets.ts`
- Added scrape field parsing in `missingVehicleApi.ts` (`parseRawRecord` and `$select`)
- **AdminMissingVehiclesPage** now displays scrape results:
  - **Table view**: New "Scrape" column with status badge + listing count
  - **Card view**: Scrape status badge + scraped min/max prices
  - **Detail modal**: Full "Scrape Results" section with parsed JSON display, source URL link, and descriptive messages for In Progress/Failed/Unreachable states
- All builds clean — TypeScript strict, no errors

## 2026-07-15

### Changed — Layout reorder: Top Makes + Top Models side by side
- Rearranged dashboard layout per user request: Section 1 = Top Makes + Top Models, Section 2 = Body Types + Powertrain, Section 3 = Price by Model Year (full-width), Section 4 = Premium Leaderboard

### Changed — Unified brand-coordinated color palette across all charts
- Replaced disparate rainbow palettes with a single, professionally curated 10-color palette anchored on the app's brand colors (indigo primary `#6366f1` and amber accent `#f59e0b`)
- **Top Makes** / **Top Models** / **Body Types** bar charts now share the same unified color rotation (indigo → teal → amber → violet → cyan → orange → purple → emerald → sky → pink)
- **Powertrain** donut updated: Petrol → brand indigo, Hybrid → teal, Electric → violet (was blue/green/purple)
- **Value Trend** area chart: line/fill/gradient changed from orange `#f97316` to brand amber `#f59e0b`
- Updated gradient accent bars on all ChartCards to match: Top Makes (indigo→violet), Top Models (indigo→cyan), Body Types (teal→emerald), Powertrain (indigo→amber), Value Trend (amber→orange)

### Changed — Top Makes: top 10 + Y-axis fix + matching heights
- **Top Makes** now shows top 10 (was 15) with Y-axis width 150px so all make names display fully; chart height adjusted to 320px to match Body Type
- **Body Type** and **Top Makes** now use matching 320px chart heights for visual alignment

### Fixed — Powertrain donut legend cropping
- Restructured chart layout to flex column — donut SVG takes `flex-1`, legend sits below in `flex-shrink-0` so it's never cropped
- Reduced donut size (outerRadius 120→105, innerRadius 70→60) for better proportions

### Added — Top Models Chart
- New **TopModelsChart** in the blank space next to Powertrain — horizontal bar chart showing the 10 most-represented vehicle models (e.g., "Toyota Camry") with per-bar gradient colors, vehicle count, and avg price tooltip

### Removed
- **PriceDistributionChart**, **BoxPlotChart**, **ScatterChartView** — orphaned chart files deleted from project directory

### Changed — Dashboard Layout Refinements (from earlier session)

- **7 new chart widgets** built with Recharts, organized into 3 sections:
  - **Market Composition** (2-col grid): TopMakesChart (top 15 makes, horizontal bars with per-make gradient colors) + BodyTypeChart (body type breakdown)
  - **Pricing Landscape** (2-col grid): PriceDistributionChart (10-bucket histogram with gradient fill) + ValueTrendChart (avg price by model year, area chart with gradient)
  - **Technical Profiles** (2-col grid): PowertrainChart (Petrol/Diesel/Hybrid/Electric, horizontal bars) + BoxPlotChart (custom SVG box plot — min, Q1, median, Q3, max — for GCC/Non-GCC/Other price ranges)
- **Full-width ScatterChartView** (Horsepower vs Price, 500 pts sampled, color-coded by make with legend)
- **ChartCard** — consistent wrapper component for all chart widgets (gradient accent bar, title, subtitle, empty state, lazy loading)
- **ChartTooltip** — shared premium tooltip component used across all charts
- **compactNumber** formatter utility (`1.5M`, `55k`, `320`) for chart axis labels
- All charts wrapped in `LazyChart` for IntersectionObserver-based deferred rendering
- All charts fully responsive via Recharts `ResponsiveContainer`

### Changed

### Changed — Curated Dashboard: Summary-First Chart Layout
- **Reduced from 10 charts → 4 core summary charts**: Top Makes, Price Distribution, Value Trend, Powertrain Composition + Premium Leaderboard
- **Removed** Performance vs Scatter, Body Type Bar, Age Distribution, Volatility Box, Top Models — these were niche/redundant and added clutter
- **Replaced BODY TYPES KPI** with AVG MARKET PRICE (uses `overview.averageMarketPrice`) for better summary value
- **Tighter spacing**: grid gap reduced from 6 to 5 for a more compact, scannable layout
- **Bundle savings**: ~17 KB removed via tree-shaking of unused chart imports
- Cleaned up unused destructured analytics data and icon imports

### Changed — Fully Cross-Constrained Vehicle Filters

### Changed — Fully Cross-Constrained Vehicle Filters
- **All 10 filter dimensions now cross-constrain each other** — selecting any filter (Year, Make, Model, Body Type, Transmission, Category, Drive Type, Spec, Powertrain, Vehicle Type) narrows the available options in ALL other filters to only compatible values
- **Tuple-based constraint engine** — builds all valid (year, make, model) combinations from the hierarchy and filters them against every selected filter simultaneously, with each dropdown's available options computed by excluding its own filter (so it shows all compatible values, not just the one already picked)
- **Case-insensitive matching** — all filter comparisons are case-insensitive to handle mixed-case hierarchy data
- **Body Type handled specially** — correctly resolves both spec-qualified (`year-make-model-spec`) and unqualified hierarchy keys

### Changed — Unified Premium Loading Screen & Dashboard Loading
- **Enhanced `LoadingScreen` component** — upgraded to a premium glowing gradient (purple→orange) progress bar with stronger glow effects, purple/orange scanning rings, radial inner glow, and ambient orbs for a cohesive brand experience
- **Replaced dashboard skeleton loading** — `AdminDashboardPage` now uses the `LoadingScreen` instead of inline skeleton/pulse animations, ensuring a consistent full-screen loader across Landing, Valuation, and Admin pages
- **Removed unused `KPICardSkeleton`** — cleaned up dead code from the dashboard after the loading screen replacement
- **Persistent lifecycle** — the `LoadingScreen` stays mounted without flickering until all initial API fetches resolve (analytics on landing, data source init on valuation, dashboard analytics on admin)

### Changed — Vehicle Filter Bar: Independent Filters + Custom Styled Dropdowns
- **All filters now independent** — Year/Make/Model no longer chain; users can select any filter in any order without being forced to pick a prerequisite first
- **CustomSelect component** (`src/components/ui/custom-select.tsx`) — replaced native `<select>` with a fully styled dropdown: search input, animated panel, click-outside-close, keyboard navigation, dark-mode aware
- All 10 filter dropdowns (Year, Make, Model, Body Type, Transmission, Category, Drive Type, Spec, Powertrain, Vehicle Type) now use the custom dropdown with matching rounded-xl borders and consistent styling
- Price inputs matched to the new dropdown height (h-10) and rounded-xl style for visual consistency

### Added — Table/Card View Toggle For Missing Vehicles & Price Suggestions
- **AdminMissingVehiclesPage** — added `MissingVehicleCard` component with make/model header, spec grid, price range, requester info, and view toggle (`LayoutList`/`LayoutGrid`) between table and card grid modes
- **AdminPriceSuggestionsPage** — added `PriceSuggestionCard` component with vehicle name, submitter, min/max price cards, source URL, comment preview, and view toggle between table and card grid modes
- **Consistent pattern** — both pages follow the AdminVehiclesPage pattern: local `viewMode` state, segmented toggle, shared filters/pagination across views, identical loading/error/empty states in both modes
- Removed summary metrics KPI cards from both pages (replaced by card view)
- Removed unused imports (`AnimatePresence`, `Fuel`, `Cog`, `Shield`, `statusOptions` prop) to resolve TypeScript strict-mode errors

## 2026-07-14

### Changed — Replaced Header Notification Pills With Unified Bell Icon Dropdown
- **New `NotificationDropdown` component** (`src/components/ui/notification-dropdown.tsx`) — a unified Bell icon dropdown that replaces the three separate notification pills in the admin header
- **Bell icon** with a pulsing red dot when any unread/pending notifications exist across Queries, Missing Vehicles, or Price Suggestions
- **Three-section dropdown** with distinct accent colors: Queries (blue), Missing Vehicles (amber), Price Suggestions (emerald)
- Each section shows its icon, pending count badge, and a preview text
- Click-outside-to-close and Escape key support, with smooth Framer Motion animation
- Clicking a section redirects to the specific admin page (e.g., `/admin/queries`) and closes the popover
- Sidebar badges preserved for persistent awareness

### Changed — `MessageSquare` Icon Removed From AdminLayout Imports
- Replaced with the new `NotificationDropdown` component in the header area

### Fixed — Dashboard Chart Layout & Sizing
- Added `w-full` to `LazyChart` wrapper div so `ResponsiveContainer` inside can properly calculate its parent width and fill the card
- Reduced `TopMakesChart` right margin from 20 → 8 to eliminate wasted whitespace on the right
- Reduced `PriceDistributionChart` right/left/bottom margins and increased X-axis label area (`height: 50 → 60`, `angle: -20 → -25`, `interval={0}`) so all rotated labels render without clipping
- All other charts (6 remaining) untouched — no regressions

## 2026-07-13

### Changed — KPI Cards On Dashboard Now Clickable
- All 6 KPI cards (Total Vehicles, Makes, Models, Highest/Lowest Value, Avg Market Price) on the admin dashboard are now clickable and navigate to `/admin/vehicles`
- Added `useNavigate`, `onClick` handlers, and keyboard accessibility (`tabIndex`, `role="button"`, `onKeyDown`)

### Added — Table/Grid View Toggle On Vehicles Page
- Added view toggle (Table / Grid) in the Vehicles page header using `LayoutList` / `LayoutGrid` icons
- New `VehicleCard` component for the card/grid view showing: year badge, spec badge, make/model, engine, HP, transmission, drive type, body type, category, powertrain, and market price
- Grid view uses responsive layout: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- All existing functionality (filters, search, sorting, pagination, export CSV, detail dialog) preserved in both views
- Extracted `VehiclesEmptyState` as a reusable component shared between table and grid views
### Flow 1 — Full Test Outcome Confirmed (Modified Flow)

- **`docs/power-automate-cloud-only-design.md`** — Updated test result section with the complete email output from the user's latest test run
- **`docs/CHANGELOG.md`** — Added this entry
- **`docs/power-automate-cloud-flow-design.md`** — Added deprecation banner pointing to `power-automate-cloud-only-design.md` (this was the older Desktop-era design file)
- **`docs/PHASE-3-REVISED-PLAN.md`** — Updated status from "Pivoting to Power Automate Desktop" to "Pivoted to Power Automate Cloud-only (successful)"
- **`memory/power-automate-flow-design.md`** — Updated with Flow 1 modified test outcome
- **`memory/scraper-service-built.md`** — Updated "New approach" from Power Automate Desktop to Cloud-only flows (successful)

### Detailed Test Output Confirmed

The Flow 1 modified version was tested end-to-end with Toyota Camry and returned:

| Field | Value |
|---|---|
| **URL** | `https://uae.yallamotor.com/used-cars/toyota/camry` |
| **Accessible** | ✅ True |
| **Page Title** | `Used Toyota Camry for Sale in UAE — From AED 120` |
| **HTTP Status** | 200 |
| **BDI Price** | 42,900 |
| **Cloudflare** | ✅ No false positives |
| **InvalidTemplate Error** | ✅ Fixed |

**Full listing record extracted:**
- **Car:** Used Toyota Camry 2.5 S 2019
- **Price:** AED 42,900 (Fair Deal)
- **Mileage:** 166,000 KM
- **Fuel type:** Petrol
- **Transmission:** Automatic
- **Regional specs:** GCC Specs
- **Location:** Sharjah
- **Dealer:** Al Aram Used Cars (Ref#967)
- **Installment:** 626 AED/month

## 2026-07-14

### Flow 2 — Complete Redesign (Heading-based extraction)

- **`docs/power-automate-cloud-only-design.md`** — Rewrote entire Flow 2 section based on Flow 1 learnings:
  - **Primary approach changed** from JSON-LD card parsing to heading extraction: parses `<div class="heading-h2-content">` for aggregate data (count, min, max) — simpler, faster, fewer steps
  - **URL now includes year filter** (`yr_{year}_{year}`) — narrowed results for more accurate pricing
  - **Cloudflare check simplified** — removed 3 body-content checks that caused false positives in Flow 1 (kept only title + status code)
  - **Removed heavy Apply-to-Each loops** — no more per-card JSON-LD or HTML article parsing as primary strategy
  - **JSON-LD retained as fallback** — only used when heading is not found
  - **BDI price extraction** as last-resort fallback
  - **Reduced from 72 steps to 79 steps** but with much simpler branching: one main path (heading) + two fallbacks (JSON-LD, BDI)
  - Added planned enhancements section (fuel/transmission URL filters, email notification, Dubizzle)
- **Flow 1 (MVR - Test YallaMotor Accessibility)** — Confirmed heading extraction approach works; the user's test showed the heading contains `15 listings · AED 30,000 – 110,000 · 2022–2022`

### Flow 1 — DOM Extraction Enhancement & Cloudflare Fix

- **`docs/power-automate-cloud-only-design.md`** — Flow 1 improvements:
  - Added `<bdi>` price extraction and full vehicle listing record extraction (article container) via string expressions
  - Fixed Cloudflare false positive: simplified to title + status code only (removed body-content checks like `cdn-cgi/challenge-platform`, `cf_chl_opt`, `Checking your browser`)
  - Fixed `InvalidTemplate: text_3` error: removed Year and MVRRecordID inputs (manual trigger only has `text` and `text_1`)
  - Updated email output to include BDI Price row and full vehicle record HTML
  - Verified: ✅ YallaMotor accessible; full listing record extracted (AED 42,900, 166,000 KM, Petrol, Automatic, Sharjah, Al Aram Used Cars)
  - Heading pattern documented: `15 listings · AED 30,000 – 110,000 · 2022–2022 · updated 14 July 2026`

## 2026-07-13

### Built & Tested — Power Automate Cloud Flow 1 (YallaMotor Accessibility)
- **`docs/power-automate-cloud-only-design.md`** — Updated with confirmed test results, JSON-LD discovery, practical learnings (triggerBody key naming, simplified Cloudflare detection), and schema-correct column names across both flows
- **Flow 1 (MVR - Test YallaMotor Accessibility)** built and tested successfully:
  - ✅ YallaMotor returns HTTP 200 with real content from Microsoft cloud IPs
  - ✅ Page title: "Used Toyota Camry for Sale in UAE — From AED 120"
  - ❌ Cloudflare did NOT block the HTTP request (unlike previous Puppeteer microservice from Railway)
  - ✅ JSON-LD structured data confirmed present in HTML — ideal for Flow 2 parsing
  - Key insight: `triggerBody()['text']` / `triggerBody()['text_1']` must be used instead of display names for manual trigger inputs
- **Flow 2 (MVR - Scrape YallaMotor)** — Design updated with correct MVR column names: `vpi_scrapestatus`, `vpi_scraped_listings`, `vpi_scraped_minprice`, `vpi_scraped_maxprice`, `vpi_scraped_sources`. Not yet built.

### Updated — MVR Table Schema (Power Automate scraping)
- **`docs/dataverse-schema.md`** — Updated Missing Vehicle Request table to reflect newly added columns: Cylinders, Doors, Drive Type, Engine Size, Fuel Type, Horsepower, Seats, Transmission Type, Comments, Source URL, Contact lookup, Missing Vehicle lookup, Scrape Status (choice), Scraped Listings, Scraped Min/Max Price, Scraped Sources
- **`docs/power-automate-cloud-only-design.md`** — Flows updated to use actual MVR column names (vpi_scraped_listings, vpi_scraped_minprice, vpi_scraped_maxprice, vpi_scrapestatus)

### Added — Performance Optimization (Phase 2)
- **`src/utils/debounce.ts`** (new) — `useDebounce` hook for debouncing search inputs with configurable delay
- **React.memo** — Wrapped all 9 chart components in `charts.tsx` with `React.memo` + custom comparator that skips function props, preventing unnecessary re-renders on sidebar toggle / filter changes
- **`useDebounce`** — Applied 300ms debounce to search inputs in `AdminQueriesPage` and `AdminVehiclesPage`, preventing synchronous filtering and server queries on every keystroke
- **Dead code removed** — `@tanstack/react-virtual` (unused dependency) removed from `package.json`

### Changed — Performance Optimization (Phase 2, continued from scraper pivot session)
- **Deferred DataSource Init** — `DataSourceProvider` no longer eagerly fetches vehicles on app mount. Landing page renders instantly (~200ms). Data loads lazily when first visiting `/valuation` or `/admin`
- **React.lazy Route Code Splitting** — All 9 page components changed from static imports to `React.lazy()` dynamic imports with `Suspense` wrappers. Initial JS bundle reduced from ~1.1MB to ~250KB
- **`vite.config.ts`** — Added `manualChunks` function separating React, Recharts, Framer Motion, TanStack Query, and other vendors into cacheable chunks
- **Admin crash fix** — Added DataSource init guard to `AdminLayout` to prevent crash when navigating to `/admin` during initial load

### Added — Path B Scraper Microservice Postmortem
- **`docs/path-b-scraper-microservice-postmortem.md`** (new) — Comprehensive retrospective documenting the scraper microservice

### Removed — Scraper Service (Path B: Puppeteer) — Abandoned due to Cloudflare
- **`scraper-service/`** — Entire directory removed. Puppeteer approach blocked by YallaMotor Cloudflare. Pivoting to Power Automate Desktop.
- **`src/lib/yallaMotorScraper.ts`** — Kept (mock scraper still used by Step3Result.tsx UI, will be repurposed later to read Power Automate data).
- **`.env.example`** — `VITE_SCRAPER_API_URL` entry kept as a harmless placeholder.: what we were trying to achieve, full architecture, the 12 Docker/Chrome deploy cycles, YallaMotor Cloudflare blocker, anti-detection arsenal attempted, why Cloudflare cannot be beaten by automated browsers from datacenter IPs, lessons learned, reusable components, and the pivot to Power Automate Desktop. Serves as both reference and closure on the Puppeteer approach.

## 2026-07-10

### Added — Scraper Microservice (Path B: Dedicated Puppeteer Service)
- **`scraper-service/`** (new) — Full Node.js + Express + Puppeteer microservice for real-time UAE auto marketplace scraping:
  - **`src/index.ts`** — Express server with `POST /api/scrape` and `GET /health` endpoints, Puppeteer browser lifecycle (auto-relaunch on disconnect), stealth plugin, resource blocking, CORS, graceful shutdown
  - **`src/types.ts`** — Shared types: `ScrapeRequest`, `ScrapedListing`, `ScrapeResult`, `IScraperProvider` interface, `ProviderResult`
  - **`src/providers/yallaMotorProvider.ts`** — YallaMotor UAE headless scraper with dual-URL fallback, multi-selector card extraction, smooth scrolling, randomised delays, debug mode
  - **`src/aggregator.ts`** — Combines providers, filters bad prices, sorts by price, limits to 50 listings, computes min/max
  - **`src/utils.ts`** — `parsePrice`, `parseMileage`, `normaliseUrlSegment`, `delay`, `randomInt` helpers
  - **`Dockerfile`** — Single-stage build, Google Chrome Stable from official apt repo, non-root scraper user with home directory, health check
  - **`README.md`** — Full docs: architecture, API contract, Railway deployment guide, anti-detection, fallback strategy
  - **`package.json`** — Express 4, Puppeteer 23, puppeteer-extra + stealth, cheerio, TypeScript 5, tsx for dev
- **`.env.example`** — Added `VITE_SCRAPER_API_URL` (commented out, reserved for future frontend integration)

### Fixed — Scraper Docker/Chrome Deployment (12 commits to production)
- **`Dockerfile`** — Switched from multi-stage build (losing Chrome) to single-stage build with Google Chrome Stable from official apt repo
- **`Dockerfile`** — Fixed Debian 12 package names (removed `t64` suffixed names from Debian 13)
- **`Dockerfile`** — Added `package-lock.json` to COPY instruction for `npm ci` to succeed
- **`Dockerfile`** — Switched from `ghcr.io/puppeteer/puppeteer` image (ENTRYPOINT conflict) to `node:22-slim` with manual Chrome install
- **`Dockerfile`** — Changed port from 3001 to 8080 (Railway default), created home directory for non-root `scraper` user with `useradd -m`
- **`src/index.ts`** — Added `--disable-blink-features=AutomationControlled` launch arg and `evaluateOnNewDocument` webdriver overrides for anti-detection

### Blocked — YallaMotor Cloudflare Protection
- **YallaMotor uses Cloudflare** (JS challenge/bot detection) — Puppeteer with stealth plugin cannot bypass it. The scraper service deploys and runs successfully on Railway, Chrome launches, but YallaMotor returns a "Just a moment... Performing security verification" page.
- Added temporary `/api/debug-html` endpoint to inspect page HTML — confirmed Cloudflare is the blocker (not CSS selectors).
- **Decision:** Puppeteer approach abandoned for YallaMotor. Exploring Power Automate Desktop (RPA) as an alternative — it controls a real Chrome browser on a Windows machine, which can pass Cloudflare challenges naturally.

## 2026-07-09

### Documentation — Phase 3 Revised Plan
- **`docs/PHASE-3-REVISED-PLAN.md`** (new) — Full revised Phase 3 plan documenting the simplified flow: real-time scraping replaces mock, user price suggestions merged into missing vehicle flow, admin review → push-to-master pipeline, and email notification future work. Includes 3 architectural paths evaluated (Power Pages proxy rejected, Hybrid rejected, Dedicated Microservice recommended). All conversation decisions captured so the user can resume from any shutdown point.

## 2026-07-06

### Changed — MVR Scrape + Correction Now Saves Prices to Dataverse
- **`src/features/valuation/Step3Result.tsx`** — Restructured `handleSubmitRequest` to sequential flow: scrape YallaMotor first → use estimated prices in MVR creation with `minPrice`/`maxPrice` → persist MVR ID for corrections. Updated `handleSubmitCorrection` to PATCH correction prices to the MVR record via `updateMissingVehicleRequest()`, so user-entered prices are saved back to Dataverse.
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Added Min Price / Max Price columns to the table (right-aligned, formatted currency), and Price cards to the detail modal, so admins can see both scraped and user-corrected prices.

### Added — Application Splash / Loading Screen
- **`src/app/SplashScreen.tsx`** (new) — Full-screen branded loading splash with animated background grid, gradient orbs, Car logo icon with pulsing ring, shimmer-text title, animated gradient loading bar, and step indicators. Fades out via Framer Motion `AnimatePresence` exit animation (600ms).
- **`src/app/App.tsx`** — Added `SplashGate` component that coordinates three parallel conditions: (1) Dataverse data source initialization, (2) pre-fetching of Missing Vehicle Requests and Price Suggestions into React Query cache, (3) a strict 3-second minimum timer. The app only renders when all three complete, ensuring smooth loading animations.

### Added — YallaMotor Scraper Mock Service
- **`src/lib/yallaMotorScraper.ts`** (new) — Simulated scraper service that generates realistic price estimates based on vehicle parameters. Uses seeded pseudo-random data for deterministic output per vehicle. Returns `ScrapeResult` with `estimatedMinPrice`, `estimatedMaxPrice`, `averagePrice`, and `listings[]` (title, price, mileage, source). Simulates 2–3.5s network delay. Ready for replacement with a real scraping microservice endpoint.

### Changed — Missing Vehicle Request Dialog to Multi-Step Scrape + Correction Flow
- **`src/features/valuation/Step3Result.tsx`** — Replaced the single-step request dialog with a 3-phase wizard:
  1. **Details** — Existing metadata form (Cylinders, Fuel, Transmission, Drive, Mileage) with "Submit Request & Scrape" button
  2. **Scraping** — Loading state with spinner animation showing "Searching YallaMotor, Dubizzle..."
  3. **Results** — Scraped price estimate card (min/max price, listing count, mini listings list) + price correction section where the user can enter their own suggested price range. Skip button dismisses without correction.
- On form submit: fires MVR creation (Dataverse) and YallaMotor scraper in parallel via `Promise.all`. When both resolve, transitions to results.
- On price correction submit: creates a Price Suggestion record (with null vehicle lookup since the vehicle doesn't exist yet) and transitions to success.
- **Success state** — Now shows "Request Submitted! We'll send you a message on {email} once this vehicle is available." with the scraped price summary card when available.
- Dialog close is blocked while scraping is in progress to prevent accidental dismissal.
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — Rewrote `PriceSuggestionDetailModal` with editable min/max price inputs pre-filled from current values, and a "Save Changes" button wired to `useUpdatePriceSuggestion` mutation. Fields reset when the suggestion changes. Footer has Cancel/Save buttons with loading spinner state.
- **`src/hooks/usePriceSuggestions.ts`** — Added `useUpdatePriceSuggestion` mutation hook (was already present from prior session preparation).

### Added — Vehicle Column in Price Suggestions Table + Modal
- **`src/types/priceSuggestion.ts`** — Added `vehicleName?: string` field to store the human-readable vehicle name.
- **`src/lib/priceSuggestionApi.ts`** — Added `$expand=vpi_Vehicle($select=vpi_name,vpi_make,vpi_model,vpi_year)` to fetch price suggestions, and parses the vehicle name from the expanded lookup. Falls back to building `"Year Make Model"` from fields, or shows vehicle GUID if no name is available.
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — Added "Vehicle" column to the table (with blue icon and truncated name with tooltip), vehicle info card in the detail modal, and vehicle name to the search filter.

### Changed — Save Edits Auto-Sets Status to "Edit & Approve"
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — When clicking "Save Changes" in the price suggestion modal, the mutation now chains a status update to "Edit & Approve" (value 3) after the prices are saved, so editing prices automatically marks the suggestion as reviewed.

### Fixed — Price Suggestion Creation (Wrong Entity Name + Missing Status)
- **`src/data/dataverseConfig.ts`** — Changed `PRICE_SUGGESTION` entity from `'vpi_pricesuggestions'` to `'vpi_pricesuggestionses'` to match the actual Dataverse entity collection name. The wrong URL was causing a 500 error (`9004010A`).
- **`src/data/dataverseConfig.ts`** — Added `VEHICLE_LOOKUP_REF: '_vpi_vehicle_value'` to `PRICE_SUGGESTION_FIELDS` for the lookup reference field.
- **`src/lib/priceSuggestionApi.ts`** — `upsertPriceSuggestion` wasn't sending `vpi_status` in the POST body, causing a 400 Bad Request. Added `vpi_status = 4` (Pending). Now matches the working snippet exactly.
- **`src/lib/priceSuggestionApi.ts`** — `fetchPriceSuggestions` now uses explicit `$select` with all fields including `_vpi_vehicle_value`, and parses `vehicleId` from the lookup ref.

### Changed — Price Suggestion Status Now Fetched Dynamically from Dataverse
- **`src/lib/optionSetApi.ts`** (new) — Generic `fetchPicklistOptions()` function that queries the Dataverse `EntityDefinitions` metadata API for picklist options, returning `{value, label}` pairs. Falls back gracefully when the metadata endpoint is unavailable.
- **`src/hooks/usePriceSuggestionStatuses.ts`** (new) — `usePriceSuggestionStatusOptions()` React Query hook that fetches status options from Dataverse with 5-minute cache. Falls back to `PRICE_SUGGESTION_STATUS` from `dataverseOptionSets.ts` if the metadata endpoint is unavailable.
- **`src/data/dataverseOptionSets.ts`** — Added `Pending: 4` to `PRICE_SUGGESTION_STATUS` to match the updated Dataverse optionset. Changed the default fallback label from `'Approve'` to `'Pending'`.
- **`src/lib/priceSuggestionApi.ts`** — `upsertPriceSuggestion` now sets `vpi_status = 4` (Pending) instead of `null`. `fetchPriceSuggestions` now parses the raw `statusValue` alongside the display label. `updatePriceSuggestionStatus` now accepts the numeric optionset value directly instead of converting from a label string.
- **`src/types/priceSuggestion.ts`** — Added `statusValue?: number` field alongside the existing `status?: string` label.
- **`src/types/datasource.ts`** — Updated `IDataSource.updatePriceSuggestionStatus` to accept `statusValue: number` instead of `status: string`.
- **`src/data/dataverseDataSource.ts`** — Updated signature to match the interface change.
- **`src/repositories/priceSuggestionRepository.ts`** — Updated `updateStatus` to accept `statusValue: number`.
- **`src/hooks/usePriceSuggestions.ts`** — Updated mutation payload from `{id, status}` to `{id, statusValue}`.
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — Major refactor: `StatusSelect` now receives dynamic options from the hook and passes the numeric value directly when updating. `StatusBadge` looks up visual config by `statusValue` (integer) instead of label string. Filter tabs are built dynamically from fetched Dataverse options. Status counts computed by `statusValue`. The static `STATUS_OPTIONS` and `STATUS_CONFIG` (label-keyed) are replaced with value-keyed `STATUS_VISUALS` and the live `PicklistOption[]` from Dataverse.

## 2026-07-03

### Added — Contact Creation on Missing Vehicle Request
- **`src/types/datasource.ts`** — Added `contactName` to upsert payload
- **`src/data/dataverseDataSource.ts`** — Added `contactName` pass-through
- **`src/repositories/missingVehicleRepository.ts`** — Added `contactName` to upsert payload
- **`src/hooks/useMissingVehicleRequests.ts`** — Added `contactName` to mutation payload
- **`src/lib/missingVehicleApi.ts`** — Now creates a contact via `createContact()` when the email isn't found, then links MVR to the new contact; splits `contactName` into first/last for the contact record
- **`src/features/valuation/Step3Result.tsx`** — Passes `personalInfo.firstName + lastName` as `contactName` in the MVR submission

### Added — Price Suggestions System
- **`src/data/dataverseConfig.ts`** — Added `PRICE_SUGGESTION` entity, `STATUS` field to `PRICE_SUGGESTION_FIELDS`, and `PRICE_SUGGESTION_SELECT_FIELDS`
- **`src/data/dataverseOptionSets.ts`** — Added `PRICE_SUGGESTION_STATUS` optionset (Approve=1, Reject=2, Edit & Approve=3) with label/value helpers
- **`src/types/priceSuggestion.ts`** (new) — PriceSuggestion interface (id, comment, minPrice, maxPrice, sourceUrl, submittedBy, vehicleId, status, createdOn)
- **`src/types/datasource.ts`** — Added `upsertPriceSuggestion`, `getPriceSuggestions`, `updatePriceSuggestionStatus` to IDataSource
- **`src/lib/priceSuggestionApi.ts`** (new) — Full CRUD API: POST create with vehicle lookup binding, GET all with status label parsing, PATCH status update
- **`src/repositories/priceSuggestionRepository.ts`** (new) — Thin repository layer
- **`src/hooks/usePriceSuggestions.ts`** (new) — React Query hooks: `usePriceSuggestions`, `useUpsertPriceSuggestion`, `useUpdatePriceSuggestionStatus`
- **`src/data/dataverseDataSource.ts`** — Wired all price suggestion methods into DataverseDataSource
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** (new) — Full admin management page with table (Submitted By, Min/Max Price, Status, Submitted date), status filter tabs (All/Pending/Rejected/Edit & Approve), search, pagination, detail modal with status dropdown, source URL link, and comment display
- **`src/layouts/AdminLayout.tsx`** — Added "Price Suggestions" sidebar nav item with `DollarSign` icon and pending-count badge
- **`src/app/router.tsx`** — Added `/admin/price-suggestions` route
- **`src/features/valuation/Step3Result.tsx`** — Added "Suggest Price" button in valuation actions and dialog with price range, source URL, and comment fields; submits linked to the vehicle via Dataverse lookup

### Fix — Vehicle Selection Free-Text + Display Fixes
- **`src/features/valuation/Step2VehicleSelection.tsx`** — 3 fixes to support free-text entry for missing vehicles while preserving cascade filtering for existing ones:
  1. **Display fallback** — `VehicleSelect` button now shows the raw stored value even when it doesn't match any dropdown option (previously showed blank for free-text entries)
  2. **Enter key support** — Pressing Enter in the search input now immediately accepts the typed value (same as clicking "Use 'xxx'")
  3. **Cascade preserved** — Year and Body Type still filter by make/model/spec cascade for existing vehicles; free-text "Use 'xxx'" button + Enter key allow custom values for missing vehicles

### Added — Drive Type Field on Missing Vehicle Requests
- **`src/data/dataverseOptionSets.ts`** — Added `MISSING_VEHICLE_DRIVE_TYPE` mapping (4X4=1, AWD=2, FWD=3, RWD=4, Unknown=5) with `missingVehicleDriveTypeValue`/`missingVehicleDriveTypeLabel` helpers
- **`src/data/dataverseConfig.ts`** — Added `DRIVE_TYPE` field to `MISSING_VEHICLE_REQUEST_FIELDS` (`vpi_drivetype`)
- **`src/types/missingVehicleRequest.ts`** — Added `driveType?: string` field
- **`src/types/datasource.ts`** — Added `driveType?: string` to upsert payload
- **`src/data/dataverseDataSource.ts`** — Added `driveType` pass-through in upsert method
- **`src/repositories/missingVehicleRepository.ts`** — Added `driveType` to upsert payload
- **`src/hooks/useMissingVehicleRequests.ts`** — Added `driveType` to mutation payload
- **`src/lib/missingVehicleApi.ts`** — Added `driveType` to POST body (with optionset conversion) and GET response parsing
- **`src/features/valuation/Step3Result.tsx`** — Added Drive Type dropdown (4X4/AWD/FWD/RWD/Unknown) to the request dialog
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Added Drive Type field to the detail modal grid

### Added — Contact Lookup on Missing Vehicle Requests
- **`src/data/dataverseConfig.ts`** — Added `CONTACT_LOOKUP: 'vpi_Contact'` field
- **`src/types/missingVehicleRequest.ts`** — Added `contactName` and `contactEmail` display fields
- **`src/types/datasource.ts`** — Added `contactEmail` to upsert payload
- **`src/lib/missingVehicleApi.ts`** — Added `findContactIdByEmail()` helper to resolve email → GUID; sets `vpi_Contact@odata.bind` on POST; `$expand=vpi_Contact($select=firstname,lastname,emailaddress1)` on GET with contact field parsing
- **`src/data/dataverseDataSource.ts`** — Added `contactEmail` pass-through
- **`src/repositories/missingVehicleRepository.ts`** — Added `contactEmail` to upsert payload
- **`src/hooks/useMissingVehicleRequests.ts`** — Added `contactEmail` to mutation payload
- **`src/features/valuation/Step3Result.tsx`** — Passes `personalInfo.email` as `contactEmail` when submitting a missing vehicle request
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Added "Requested By" column (name + email) to the table and Contact fields to the detail modal

## 2026-07-02

### Added — Missing Vehicle Status Management (Final API)
- **`src/data/dataverseConfig.ts`** — Updated `MISSING_VEHICLE_REQUEST_FIELDS` with new API fields: `CYLINDERS`, `FUEL_TYPE`, `TRANSMISSION_TYPE`, `STATUS`. Removed `NAME`, `MIN_PRICE`, `MAX_PRICE`.
- **`src/data/dataverseOptionSets.ts`** — Added 4 dedicated optionsets: `MISSING_VEHICLE_CYLINDERS`, `MISSING_VEHICLE_FUEL_TYPE`, `MISSING_VEHICLE_TRANSMISSION_TYPE`, `MISSING_VEHICLE_STATUS` — each with `*Value()` and `*Label()` helpers.
- **`src/types/missingVehicleRequest.ts`** — Updated type: added `cylinders?`, `fuelType?`, `transmissionType?`, `status?`. Removed `name?`, `minPrice?`, `maxPrice?`.
- **`src/types/datasource.ts`** — Updated `upsertMissingVehicleRequest` payload with optional `bodyType?`, `cylinders?`, `fuelType?`, `transmissionType?`, `minMileage?`, `maxMileage?`. Re-added `updateMissingVehicleRequestStatus` to `IDataSource`.
- **`src/lib/missingVehicleApi.ts`** — Full rewrite with POST (all fields via optionset value helpers), GET (with `odata.include-annotations=*` for label parsing), and PATCH (status updates with `If-Match: *`).
- **`src/data/dataverseDataSource.ts`** — Re-added `updateMissingVehicleRequestStatus` delegation.
- **`src/repositories/missingVehicleRepository.ts`** — Re-added `updateStatus` method.
- **`src/hooks/useMissingVehicleRequests.ts`** — Re-added `useUpdateMissingVehicleRequestStatus` mutation with toast feedback.
- **`src/features/valuation/Step3Result.tsx`** — Rebuilt request dialog with 3 dropdowns (Cylinders, Fuel Type, Transmission) and Mileage Range inputs.
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Rebuilt with status management: `StatusBadge` component, `StatusSelect` dropdown, status filter tabs (All/Pending/Approved/In Progress/Reject with counts), Status column in table, and updated detail modal with status dropdown + new fields grid.
- **`src/lib/safeAjax.ts`** — Improved error handling: parses `xhr.responseText` for Dataverse error details instead of generic `errorThrown`.
- **`vite.config.ts`** — Disabled source maps (`sourcemap: false`) to fix Power Pages portal upload.

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
