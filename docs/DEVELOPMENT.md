# Development Guide

## Architecture

### Data Layer (IDataSource)
The entire application accesses data through the `IDataSource` interface.
This abstraction means the UI never depends on the data format directly.

```
Component → React Query Hook → Repository → IDataSource → DataverseDataSource
```

### State Management
- **Zustand**: Client-only state (theme, modals, wizard form, UI state)
- **React Query**: Server/data state (vehicles, pricing, analytics)
- Zustand stores never cache API data — React Query handles that

### Component Patterns
- UI components in `src/components/ui/` are generic and reusable
- Feature components in `src/features/` implement specific business logic
- Pages compose features with layouts

### Startup Loading
- `DataverseDataSource.initialize()` loads paginated vehicle records from `/_api/vpi_vehicledatas` and builds in-memory pricing indexes
- The splash screen shows progress (0–100%) as each page of vehicles is fetched, with a brief hold at 100% before the app renders
- No admin data (inquiries, missing vehicles, price suggestions) is prefetched during splash — each page handles its own data loading

### Currency Formatting
- Use `formatCurrency()` from `@utils` for every displayed vehicle price so values consistently use the `AED` ISO currency code
- Price inputs and filter chips use `AED` as their visible prefix
- PDF currency output also uses `AED` in `src/utils/pdfExport.ts`

## Adding a Feature

1. Create types in `src/types/`
2. Add data methods to `IDataSource` and `DataverseDataSource`
3. Add repository methods in `src/repositories/`
4. Create React Query hooks in `src/hooks/`
5. Build UI components in `src/features/your-feature/`
6. Add route in `src/app/router.tsx`

## Dataverse Data Source

The `DataverseDataSource` class:
1. Calls `fetchAllVehicles()` from `src/lib/vehicleApi.ts` which queries `/_api/vpi_vehicledatas`
2. Uses **keyset pagination** (ordered by `vpi_vehicledataid asc`, filtered with `gt`) — the portal API does not support `@odata.nextLink` for large sets
3. Maps option-set integers to readable labels via `dataverseOptionSets.ts`
4. Builds pricing index, hierarchy, and analytics in memory (same pattern)
5. Applies central pricing algorithm to compute min/avg/max/median per make-segment

### Multi-source scrape data contract

`dataverseConfig.ts` defines the confirmed entity sets `vpi_vehiclescraperuns` and `vpi_vehiclescrapesourceresults`, their fields, and all case-sensitive lookup schema names. `dataverseOptionSets.ts` pins the exact Dataverse choice integers. `vehicleScrape.ts` contains the application-facing run and source-result types.

The relationship direction is always:

```text
Missing Vehicle Request → Vehicle Scrape Run → Vehicle Scrape Source Result
```

Do not put a direct MVR lookup on a source result or collapse source results into the legacy shared MVR scrape fields. Each source row must preserve its own price type and provenance. The MVR stores only the final admin decision and lookups to the reviewed run, primary price result, and selected specification result.

The new MVR decision fields intentionally remain outside `MISSING_VEHICLE_REQUEST_SELECT_FIELDS` until their read mapping is introduced. The existing MVR portal setting already uses `fields=*`. Both new tables are enabled with `fields=*`, and `vehicleScrapeApi.ts` provides create/read/update operations behind `VehicleScrapeRepository`.

YallaMotor now uses an additive dual-write migration. `useTriggerScrape` delegates to `yallaMotorDualWrite.ts`, which creates a Running single-request Run, executes the existing Azure-first/Power-Automate-fallback scrape, performs the proven legacy MVR write, creates one YallaMotor Source Result, and finalizes the Run. Source Result Category uses the same `mapCategory()` normalization as the MVR (`GCC`, `NON-GCC`, `OTHER/STANDARD`); the unmodified regional-spec wording remains in Raw Result JSON. Evidence-storage failures never undo a successful legacy MVR update; they produce an administrator warning and mark the Run failed where possible. Scrape failures and unavailable/blocked results retain the existing MVR status behavior and write failed/blocked evidence when a Run exists.

DriveArabia follows the same additive migration after a PAD inbox capture is parsed and matched to an exact Missing Vehicle Request. `driveArabiaDualWrite.ts` creates one Vehicle Scrape Run per matched request and one linked Vehicle Scrape Source Result containing the captured prices, supported specifications, source URL, inbox ID, and normalized diagnostic JSON. Multiple exact requests updated from one PAD capture are grouped by using the inbox ID as the Run batch-correlation key. The Source Result records DriveArabia, Power Automate Desktop, Succeeded, and Original Reference Price; captured HTML remains transient and is never copied into Dataverse. An evidence-storage failure is reported as an administrator warning without undoing the legacy MVR update or preventing successful PAD acknowledgement.

Run/source API rules:

- Validate every GUID before inserting it into an OData URL, filter, or lookup binding.
- Use case-sensitive schema/navigation names for writes (`vpi_MissingVehicleRequest@odata.bind`, `vpi_ScrapeRun@odata.bind`).
- Use lowercase lookup reference fields for reads (`_vpi_missingvehiclerequest_value`, `_vpi_scraperun_value`).
- Never include a lookup navigation property itself in `$select`; select its lookup reference instead.
- Explicitly write `vpi_attemptnumber=1` for a first source attempt.
- Do not place secrets in raw JSON, evidence references, source URLs, external job IDs, or error fields while broad portal roles remain assigned.

## Performance Optimizations

- `React.memo` on expensive chart components
- `useMemo`/`useCallback` for derived data and callbacks
- React Query's `staleTime` and `gcTime` for caching
- Memoised hierarchy/analytics in data source
- Code splitting via Vite's `manualChunks`

## API Modules (`src/lib/`)

The Web API and scraper layer is split into dedicated modules:

| Module | Purpose | Primary Path | Fallback Path |
|---|---|---|---|
| `safeAjax.ts` | CSRF-authenticated fetch wrapper | `webapi.safeAjax` | native `fetch` + `shell.getTokenDeferred()` |
| `vehicleApi.ts` | Fetch all vehicles with keyset pagination | `safeFetch` | — |
| `contactApi.ts` | Create/upsert contact records | `webapi.safeAjax` (reads `entityid` header) | `safeFetchWithMeta` |
| `inquiryApi.ts` | Create vehicle inquiry records | `webapi.safeAjax` (reads `entityid` header) | `safeFetchWithMeta` |
| `driveArabiaUrl.ts` | Build the short model-year route copied from an MVR into PAD's attended run input | DriveArabia redirect-compatible URL | — |
| `multiSourceScraper.ts` | Drain PAD HTML inbox, parse DriveArabia prices + selected-trim specs, match exact MVR records, persist `transport:'pad'` | Azure relay `next_pending` / `inbox_status` | — |
| `vehicleScrapeApi.ts` | Create/read/update normalized scrape runs and per-source results | Power Pages Web API | `safeFetch` / `safeFetchWithMeta` |
| `yallaMotorDualWrite.ts` | Orchestrate one YallaMotor scrape and persist both legacy MVR state and normalized Run/Source Result evidence | Azure-first YallaMotor scraper | Power Automate Cloud transport; legacy-only persistence with warning if evidence storage fails |
| `driveArabiaDualWrite.ts` | Persist one normalized Run/Source Result pair per exact MVR matched by a DriveArabia PAD capture | Parsed PAD inbox result | Legacy MVR update remains successful with an evidence-storage warning if dual-write persistence fails |

All API modules read the created record's GUID from the `entityid` response header (Power Pages standard), with a fallback to `OData-EntityId` header parsing.

For attended navigation, `buildDriveArabiaModelYearUrl()` creates a short route from the selected MVR. The request modal's **Copy PAD URL** action supplies it to PAD's required `DriveArabiaUrl` text input used by Launch Chrome. DriveArabia may redirect to a canonical make-prefixed route, and the capture records the final `window.location.href`.

The PAD processor is deliberately record-safe: it derives make/model from that final DriveArabia URL, takes year/trim from fixture-tested parser rows, and updates only exact matches among the MVR records already loaded by the admin page. DriveArabia unmounts closed Specs accordion bodies, so the PAD capture script serializes every rendered engine group into a `vpi-pad-spec-groups` JSON marker. Each commercial trim is matched to exactly one engine group by capacity + I/V cylinder layout + hybrid marker + drivetrain; zero or multiple matches remain price-only. Legacy captures without the marker still enrich only the exact JSON-LD-selected trim. Supported MVR writes include body/fuel/transmission/drive/cylinders/engine/doors/horsepower, and Horsepower is carried into Vehicle Data on approval. A valid unmatched capture stays `Pending` so an MVR can be created and processing retried. Unsupported, malformed, or write-failed captures are acknowledged as `Error` and retain their Blob HTML for diagnosis. Successful items are marked `Complete`, which purges the transient Blob.

Price-row extraction is bounded to the final visible **Original Trim Prices** or **Trim Prices** section rather than requiring a drivetrain suffix. DriveArabia currently uses both rendered headings across model-year pages. This supports older labels such as `2.4L sedan` and newer short labels such as `std`; the section ends before dealer/spec/similar-car content, preventing unrelated AED ranges from entering the result set.

Older exact commercial trims may also omit layout and drivetrain even though their Specs accordion includes them. When the JSON-LD-selected trim exactly matches the MVR, the parser may merge mechanical fields from one uniquely matching engine capacity (`2.4L sedan` → `2.4 I4 FWD`). Multiple groups at the same capacity remain ambiguous and are never guessed.

## Inquiry System

### Data Flow
```
Write path:
Step3Result (valuation complete)
  → useSaveInquiry (mutation)
    → inquiryRepository.save()
      → DataverseDataSource.saveInquiry() (upserts contact + creates vpi_vehicleinquiry via Web API POST)

Read path:
AdminQueriesPage / sidebar badge
  → useInquiries (30s auto-refetch)
    → inquiryRepository.getAll()
      → DataverseDataSource.getInquiries()
        → GET /_api/vpi_vehicleinquiries?$expand=vpi_Contact(...),vpi_Vehicle(...)
          (Customer and vehicle data fetched through lookup expansion)
```

**Note on entity design:** The `vpi_vehicleinquiry` entity stores only lookup references (`vpi_Contact`, `vpi_Vehicle`) — it has no snapshot fields for contact or vehicle data. All customer names, emails, and vehicle details are read via `$expand` at query time, using `bodyTypeLabel()` and `cityLabel()` option-set helpers for choice fields. Any alternate data source implementation must reproduce this lookup-based reading pattern.

### Status Values
`pending` | `reviewed` | `contacted` | `closed`

### Hooks
- `useInquiries()` — query with 30s auto-refetch
- `useSaveInquiry()` — mutation, invalidates query cache
- `useUpdateInquiryStatus()` — mutation, toast on success/error
- `useExportInquiries()` — callback, downloads all inquiries as `.csv`

### Key Components
- `AdminQueriesPage` — table + filter tabs + search + pagination
- `InquiryDetailModal` — full detail view with StatusSelect in header
- `StatusBadge` — color-coded status pill
- `StatusSelect` — inline dropdown for status changes

### Duplicate Guard
Step3Result uses `useRef(false)` to prevent re-saving on re-renders.

## Dialog Patterns

For modals with a fully custom header, pass `hideCloseButton` and `title=""`:

```tsx
<Dialog isOpen={...} onClose={...} title="" description="" size="xl" hideCloseButton>
  <div className="-mx-6 -mt-6 rounded-t-2xl ...">
    {/* custom header with own close button */}
  </div>
  <div className="overflow-y-auto px-6 py-4">
    {/* scrollable body */}
  </div>
</Dialog>
```

## Sidebar Hover

Use React state (not CSS `group-hover`) for collapse/expand:

```tsx
const [hovered, setHovered] = useState(false);
const collapsed = isSidebarCollapsed && !hovered;
```

## Dark Mode
Based on Tailwind's `class` strategy. Toggle via `useThemeStore`.
CSS variables in `globals.css` control all colours.
