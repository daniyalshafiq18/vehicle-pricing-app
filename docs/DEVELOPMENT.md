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

## Performance Optimizations

- `React.memo` on expensive chart components
- `useMemo`/`useCallback` for derived data and callbacks
- React Query's `staleTime` and `gcTime` for caching
- Memoised hierarchy/analytics in data source
- Code splitting via Vite's `manualChunks`

## API Modules (`src/lib/`)

The Web API layer is split into four dedicated modules, each with a dual-path strategy:

| Module | Purpose | Primary Path | Fallback Path |
|---|---|---|---|
| `safeAjax.ts` | CSRF-authenticated fetch wrapper | `webapi.safeAjax` | native `fetch` + `shell.getTokenDeferred()` |
| `vehicleApi.ts` | Fetch all vehicles with keyset pagination | `safeFetch` | — |
| `contactApi.ts` | Create/upsert contact records | `webapi.safeAjax` (reads `entityid` header) | `safeFetchWithMeta` |
| `inquiryApi.ts` | Create vehicle inquiry records | `webapi.safeAjax` (reads `entityid` header) | `safeFetchWithMeta` |

All API modules read the created record's GUID from the `entityid` response header (Power Pages standard), with a fallback to `OData-EntityId` header parsing.

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
