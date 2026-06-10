# Development Guide

## Architecture

### Data Layer (IDataSource)
The entire application accesses data through the `IDataSource` interface.
This abstraction means the UI never depends on the data format directly.

```
Component → React Query Hook → Repository → IDataSource → ExcelDataSource
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
2. Add data methods to `IDataSource` and `ExcelDataSource`
3. Add repository methods in `src/repositories/`
4. Create React Query hooks in `src/hooks/`
5. Build UI components in `src/features/your-feature/`
6. Add route in `src/app/router.tsx`

## Excel Data Source

The `ExcelDataSource` class:
1. Reads the `.xlsx` file via SheetJS (xlsx library)
2. Normalises raw rows into typed `Vehicle` objects
3. Builds pricing index, hierarchy, and analytics in memory
4. Provides memoised lookups for dependent dropdowns

## Performance Optimizations

- `React.memo` on expensive chart components
- `useMemo`/`useCallback` for derived data and callbacks
- React Query's `staleTime` and `gcTime` for caching
- Memoised hierarchy/analytics in data source
- Code splitting via Vite's `manualChunks`

## Inquiry System

### Data Flow
```
Step3Result (valuation complete)
  → useSaveInquiry (mutation)
    → inquiryRepository.save()
      → ExcelDataSource.saveInquiry() (in-memory push)
```

### Status Values
`pending` | `reviewed` | `contacted` | `closed`

### Hooks
- `useInquiries()` — query with 30s auto-refetch
- `useSaveInquiry()` — mutation, invalidates query cache
- `useUpdateInquiryStatus()` — mutation, toast on success/error
- `useExportInquiries()` — callback, downloads all inquiries as `.xlsx`

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
