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

For the complete DriveArabia implementation history and current operating runbook, see `docs/DRIVEARABIA-SCRAPE-END-TO-END.md`. Use it before changing dispatch, PAD payload construction, Azure Inbox correlation, trim/specification matching, status ownership or recovery behavior.

`dataverseConfig.ts` defines the confirmed entity sets `vpi_vehiclescraperuns` and `vpi_vehiclescrapesourceresults`, their fields, and all case-sensitive lookup schema names. `dataverseOptionSets.ts` pins the exact Dataverse choice integers. `vehicleScrape.ts` contains the application-facing run and source-result types.

The relationship direction is always:

```text
Missing Vehicle Request → Vehicle Scrape Run → Vehicle Scrape Source Result
```

Do not put a direct MVR lookup on a source result or collapse source results into the legacy shared MVR scrape fields. Each source row must preserve its own price type and provenance. The MVR stores only the final admin decision and lookups to the reviewed run, primary price result, and selected specification result.

The new MVR decision fields intentionally remain outside `MISSING_VEHICLE_REQUEST_SELECT_FIELDS` until their read mapping is introduced. The existing MVR portal setting already uses `fields=*`. Both new tables are enabled with `fields=*`, and `vehicleScrapeApi.ts` provides create/read/update operations behind `VehicleScrapeRepository`.

YallaMotor now uses an additive dual-write migration. `useTriggerScrape` delegates to `yallaMotorDualWrite.ts`, which creates a Running single-request Run, executes the existing Azure-first/Power-Automate-fallback scrape, performs the proven legacy MVR write, creates one YallaMotor Source Result, and finalizes the Run. Source Result Category uses the same `mapCategory()` normalization as the MVR (`GCC`, `NON-GCC`, `OTHER/STANDARD`); the unmodified regional-spec wording remains in Raw Result JSON. Evidence-storage failures never undo a successful legacy MVR update; they produce an administrator warning and mark the Run failed where possible. Scrape failures and unavailable/blocked results retain the existing MVR status behavior and write failed/blocked evidence when a Run exists.

DriveArabia follows the same additive migration after a PAD inbox capture is parsed and matched to an exact Missing Vehicle Request. `driveArabiaDualWrite.ts` creates one Vehicle Scrape Run per matched request and one linked Vehicle Scrape Source Result containing the captured prices, supported specifications, source URL, inbox ID, and normalized diagnostic JSON. Multiple exact requests updated from one PAD capture are grouped by using the inbox ID as the Run batch-correlation key. The Source Result records DriveArabia, Power Automate Desktop, Succeeded, and Original Reference Price; captured HTML remains transient and is never copied into Dataverse. For an uncorrelated legacy capture, an evidence-storage warning does not undo the MVR write or prevent acknowledgement. A correlated Phase 4 capture is instead retained as Pending until its prepared evidence target resolves and persists successfully.

The approved Phase 4 migration introduces one shared Run per per-request admin scrape action. Selected sources receive queued Source Results before transport work starts; YallaMotor updates its target immediately, while DriveArabia resolves its target from a Run correlation carried through the attended PAD URL. A shared pure aggregator—not an individual source adapter—owns Run status, counts and completion. Source-specific standalone dual-write functions remain compatibility paths until the shared workflow passes live acceptance.

`vehicleScrapeRunState.ts` is the transport-independent state boundary. It selects the highest attempt per source, treats No Data/Blocked/Failed/Skipped as terminal non-success states, derives counts and the parent Run status, bounds error summaries to 2,000 characters, and builds stable `<run>:<source>:<attempt>` alternate-key values. Source adapters must not reproduce this logic.

`prepareMultiSourceScrape()` creates the shared Run and every queued per-source target before transport dispatch. Setup is deliberately all-or-terminal: if a later queued target cannot be created, earlier targets are marked Skipped and the Run becomes Failed, so the system never starts scraping with an incomplete evidence contract.

Queued DriveArabia targets include their complete correlated PAD URL in `vpi_sourceurl` at creation time. This makes the Source Result a self-contained Dataverse dispatch job for an automated **When a row is added** flow: the flow can filter Source `2` plus Processing Status `1` and pass Source URL directly to PAD. Successful evidence processing later overwrites the field with the cleaned final DriveArabia URL, so the correlation fragment remains transient orchestration data rather than permanent provenance. YallaMotor queued targets do not receive this URL.

`scrapeYallaMotorIntoPreparedTarget()` is the shared-orchestration adapter. It refuses to scrape unless its queued evidence row can first enter Running, preserves the existing legacy MVR success/failure writes, patches the same Source Result with the actual transport and evidence, then delegates parent counts/status to `refreshMultiSourceRun()`. The existing `scrapeYallaMotorWithDualWrite()` wrapper remains unchanged for rollback and the current bulk path.

DriveArabia PAD correlation uses a URL fragment rather than a query parameter or Dataverse schema field: `#vpiRun=<correlation>&vpiAttempt=<n>`. The vehicle pathname remains unchanged, the marker can survive canonical navigation without being sent to DriveArabia's server, and it is removed before Source URL evidence is saved. Missing/malformed markers never produce guessed Run attachment.

`resolvePreparedDriveArabiaTarget()` retrieves a minimal Run projection directly through the `vpi_correlationkey` carried by PAD, then accepts only an active Run belonging to the exact MVR and an exact queued/running DriveArabia attempt whose alternate correlation key matches `<run>:drivearabia:<attempt>`. It does not depend on the broader MVR lookup-filtered Run listing, which Power Pages rejected during live testing. `persistDriveArabiaEvidenceIntoPreparedTarget()` PATCHes that row rather than creating another Run/result, then calls the common aggregator. A capture with no orchestration marker still uses the proven standalone DriveArabia dual-write path; a present but malformed/unresolved marker surfaces an evidence warning and is never downgraded to standalone persistence. Resolver or persistence warnings leave a correlated inbox item Pending for retry rather than acknowledging and purging it.

Manual PAD recovery remains record-scoped in the MVR modal. **Process PAD Capture** requires the 12-character Inbox ID returned by PAD and invokes the existing inbox processor with that exact ID plus only the open request; the global page action remains hidden. This prevents an unrelated older Pending capture from blocking or being compared with the selected record.

The per-request admin **Scrape** action opens a source-selection dialog with YallaMotor and DriveArabia enabled by default. `executeMultiSourceScrape()` prepares the shared evidence contract first and dispatches YallaMotor into its prepared target. For DriveArabia, creation of the queued Source Result is the dispatch event: the automated Dataverse flow runs PAD and writes its Inbox ID/status back for audit. Automatic completion does not wait on that cached Power Pages read. It polls Azure `next_pending` with the prepared Run correlation and attempt, validates the returned PAD URL fragment, then processes only that exact Inbox ID. It does not invoke the Power Pages cloud-flow endpoint. The correlated URL remains visible only for diagnosis or controlled recovery. The existing bulk action remains the compatibility YallaMotor-only path and is labeled accordingly.

The MVR's legacy Scrape Status represents the whole selected-source operation in this path. After the shared Run and all targets are prepared it becomes In Progress. Because the prepared YallaMotor adapter retains standalone-compatible legacy writes, execution restores In Progress whenever DriveArabia is still outstanding. Final shared aggregation maps Completed or Partial Success with at least one successful source to Scraped, maps an all-source terminal failure to Failed, and retains In Progress while any latest source attempt is active. `updateMissingVehicleScrapeStatus()` PATCHes only `vpi_scrapestatus`, so lifecycle reconciliation cannot erase prices or legacy payloads.

Run/source API rules:

- Validate every GUID before inserting it into an OData URL, filter, or lookup binding.
- Resolve attended Run correlation through `vpi_correlationkey` with a minimal `$select`; verify the returned MVR lookup reference separately before reading Source Results.
- Use case-sensitive schema/navigation names for writes (`vpi_MissingVehicleRequest@odata.bind`, `vpi_ScrapeRun@odata.bind`).
- Use lowercase lookup reference fields for reads (`_vpi_missingvehiclerequest_value`, `_vpi_scraperun_value`).
- Never include a lookup navigation property itself in `$select`; select its lookup reference instead.
- Explicitly write `vpi_attemptnumber=1` for a first source attempt.
- Do not place secrets in raw JSON, evidence references, source URLs, external job IDs, or error fields while broad portal roles remain assigned.

Phase 5 evidence review is read-only in its first slice. `useVehicleScrapeEvidence()` reads the newest MVR Run and linked Source Results through the repository/data-source boundary, polls every 10 seconds only while the Run is Queued/Running, and renders independent source cards in the MVR modal. Decision lookups and approved prices are not written until the review form and validation contract are implemented.

The pricing-decision mutation uses `saveMissingVehiclePricingDecision()` through the normal hook/repository/`IDataSource` path. It binds `vpi_ReviewedScrapeRun`, `vpi_PrimaryPriceResult` and `vpi_SelectedSpecificationResult` with their exact navigation-property casing, while reads select their lowercase lookup-reference fields. The UI allows writes only against the displayed terminal Run and its Succeeded results; manual overrides, Needs Attention and Rejected decisions require notes. Promotion to Vehicle Data remains a later explicit action.

Before binding Decision Status, the review form converts the system-managed `Awaiting Scrapes` and `Scraping` states to the first valid administrator state, `Ready for Review`. A controlled native select must never receive a value absent from its options: browsers can visually show the first option while React retains and submits the unmatched value.

Dataverse optional evidence fields are normalized at the API mapping boundary: `null`, missing and empty-string values become `undefined` in the TypeScript model. UI consumers therefore render one consistent unavailable state and never interpret a null currency as zero. Schema.org drivetrain identifiers remain preserved in evidence but are shortened to standard drivetrain labels for review display.

Phase 6 promotion is an explicit action, separate from both pricing-decision approval and the ordinary MVR Status dropdown. `promoteApprovedMissingVehicle()` reloads the current MVR, Run and Source Results before writing; it never trusts a possibly stale modal object. It requires an Approved decision, valid approved min/max, a terminal reviewed Run owned by that MVR, and Succeeded selected evidence. Master identity uses requested make/model/year/trim so the original valuation request resolves; technical fields use Selected Specification Result values with an MVR fallback for evidence gaps. Prices use only the approved range.

Promotion is retry-safe at the application boundary. An existing MVR Vehicle Data lookup is a completed no-op; otherwise one exact make/model/year/spec Vehicle Data match is linked instead of recreated. Multiple exact matches stop for manual duplicate resolution. This natural-identity recovery prevents a retry from creating another master row if the initial Vehicle POST succeeded but the subsequent MVR PATCH failed.

The active Phase 7A dispatch boundary is now the queued DriveArabia Source Result, not a browser cloud-flow request. A solution-aware automated flow watches added rows with Source `2` and Processing Status `1`, runs with concurrency one, marks the row Running, invokes `PAD - DriveArabia` with `vpi_sourceurl`, and writes `InboxId`, `StatusCode`, and capture timing back to the same row. Its failure branch marks the row Failed with durable diagnostics. `executeMultiSourceScrape()` discovers the capture through Azure `next_pending` using the exact Run correlation plus attempt, verifies the returned URL identity, and then processes only that Inbox ID; the Dataverse receipt fields are durable audit data rather than the interactive completion signal. The prior Power Pages adapter and runtime flow GUID remain only as rollback/diagnostic artifacts and are not invoked by unified scraping. The signed direct-HTTP proof URL must never be shipped in client code.

The 2026-09-01 live runs prove that the Dataverse trigger and receipt writer work as designed but also prove that workflow-updated rows are not a reliable low-latency Power Pages signal. Client cache bypass, Dataverse change tracking and a server-cache reset still allowed a fresh workflow receipt to remain hidden behind the original Queued snapshot. `safeFetch()` retains cache bypass as polling hygiene, but unified DriveArabia now uses Azure correlation lookup for real-time receipt discovery. The exact Run UUID and positive attempt are required together; a mismatched returned URL is rejected before any HTML or evidence processing.

The 2026-08-31 direct HTTP diagnostic is not an alternate frontend transport. It proved that an application-prepared four-field payload can pass through an HTTP-triggered cloud-flow copy, attended PAD, Azure Inbox, exact correlation resolution and normalized Dataverse persistence. The flow used asynchronous response because attended PAD exceeded Postman's 30-second Cloud Agent wait; the flow run and exact Inbox ID are the durable completion boundary. A signed HTTP trigger URL authorizes its caller and must remain server-side. Never place it in `window.vpiRuntimeConfig`, a `VITE_*` variable, a web template, client JavaScript, or a committed portal server-logic export. The accepted Dataverse-triggered dispatch supersedes that diagnostic; keep the HTTP copy disabled/protected and retain manual exact-Inbox recovery only as rollback.

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
| `multiSourceScraper.ts` | Resolve exact PAD Inbox items by Run/attempt, parse DriveArabia prices + selected-trim specs, match exact MVR records, persist `transport:'pad'` | Azure relay `next_pending` / `inbox_status` | — |
| `vehicleScrapeApi.ts` | Create/read/update normalized scrape runs and per-source results | Power Pages Web API | `safeFetch` / `safeFetchWithMeta` |
| `yallaMotorDualWrite.ts` | Orchestrate one YallaMotor scrape and persist both legacy MVR state and normalized Run/Source Result evidence | Azure-first YallaMotor scraper | Power Automate Cloud transport; legacy-only persistence with warning if evidence storage fails |
| `driveArabiaDualWrite.ts` | Persist one normalized Run/Source Result pair per exact MVR matched by a DriveArabia PAD capture | Parsed PAD inbox result | Legacy MVR update remains successful with an evidence-storage warning if dual-write persistence fails |

All API modules read the created record's GUID from the `entityid` response header (Power Pages standard), with a fallback to `OData-EntityId` header parsing.

For attended navigation, `buildDriveArabiaModelYearUrl()` creates a short route from the selected MVR. The request modal's **Copy PAD URL** action supplies it to PAD's required `DriveArabiaUrl` text input used by Launch Chrome. DriveArabia may redirect to a canonical make-prefixed route, and the capture records the final `window.location.href`.

The PAD processor is deliberately record-safe: it derives make/model from that final DriveArabia URL, takes year/trim from fixture-tested parser rows, and updates only exact matches among the MVR records already loaded by the admin page. The parser first reads the established `vpi-pad-spec-groups` marker. Native PAD Web Page Source omits injected markers, so a fallback reads rendered accordion bodies beneath `#specs` only when every Specs control contains a detailed engine block. Repeated grades with identical mechanical data are de-duplicated without discarding their complete rendered button labels; nested text nodes and a standalone `+` are joined before normalization so exact grade-only trims retain their engine association. Other commercial trims are matched to exactly one engine group by capacity + I/V cylinder layout + hybrid marker + drivetrain; zero or multiple matches remain price-only, and explicit-marker duplicates remain ambiguous. Supported MVR writes include body/fuel/transmission/drive/cylinders/engine/doors/horsepower, and Horsepower is carried into Vehicle Data on approval. A valid unmatched capture stays `Pending` so an MVR can be created and processing retried. Unsupported, malformed, or write-failed captures are acknowledged as `Error` and retain their Blob HTML for diagnosis. Successful items are marked `Complete`, which purges the transient Blob.

Live acceptance on 2026-09-04 confirms the published marker-free path for both `SE Titanium` and `LE Titanium+`, including specifications. Preserve the exact `+` identity and complete rendered button text in any future parser refactor.

Cross-source commercial names are resolved exact-first. The only fallback removes recognized parenthetical option-level wording and normalizes litre/turbo notation, then requires the same capacity, identical non-mechanical grade tokens, compatible stated layout/drivetrain, equal hybrid/induction identity, and exactly one DriveArabia candidate. This permits `3.6L SXT (Mid Option)` → `3.6 V6 SXT` and `1.5T Premier` → `1.5TC I4 Premier`, while keeping turbo-diesel distinct and rejecting capacity-only, ambiguous, or mechanically conflicting matches. Evidence stores the DriveArabia row label as Source Result Trim and retains the different requested MVR trim in normalized/raw provenance.

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

All `Dialog` overlays render through a React portal attached to `document.body`. Keep this boundary intact: Framer Motion transforms, cards with overflow clipping, and table layout contexts otherwise turn a descendant `position: fixed` overlay into a locally positioned/clipped element. The portal also prevents trigger-container text alignment from leaking into dialog content.

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
