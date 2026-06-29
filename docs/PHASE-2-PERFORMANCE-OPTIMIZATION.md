# Phase 2 — Performance & UX Polish

> **Status:** Planned
> **Theme:** Faster loads, smoother interactions, better caching
> **Target:** Sub-2s initial interactive on landing page, instant page transitions, no chart jank

---

## Priority Order

### P0 — Critical (Must Fix)

#### 1. Fix Admin Pages Crash During DataSource Init (Bug)

**Problem:** `AdminLayout` calls `useInquiries()` → `getDataSource()` which throws if the 14K-vehicle init hasn't finished. Navigating to `/admin` during the initial 4-10s load crashes the page.

**Files:**
- `src/layouts/AdminLayout.tsx` — no `useDataSource()` guard
- All admin pages (Dashboard, Vehicles, Queries, Settings) — no loading state

**Fix:** Add a check in the admin layout that renders a `LoadingScreen` until `isInitialized` is true.

**Effort:** Small (~15 min)

---

### P1 — High Impact (Load Time & Re-renders)

#### 2. Deferred DataSource Init (Lazy Loading)

**Problem:** `DataSourceProvider` eagerly fetches all 14,631 vehicles from Dataverse on app mount. The landing page doesn't need any data but still blocks until init completes (4-10s).

**Approach:** Move init from eager (app mount) to lazy (first data-consuming page):

```
Current: App mount → fetch all 14K vehicles → render any page
Fixed:   App mount → render landing page instantly
         First visit to /valuation or /admin → trigger init → show skeleton → data ready
```

**Files:**
- `src/data/DataSourceContext.tsx` — don't auto-call `initialize()` on mount; expose a `triggerInit()` on context
- `src/data/dataverseDataSource.ts` — make `initialize()` idempotent (no-op if already done)
- `src/layouts/AdminLayout.tsx` — call `triggerInit()` when mounted if not initialized
- `src/features/valuation/ValuationPage.tsx` — same pattern

**Effect:** Landing page renders in ~200ms (just JS parse + React mount) instead of 4-10s.

**Effort:** Medium (~2-3 hours)

#### 3. React.lazy Route Code Splitting

**Problem:** All 7 page components + 10 dashboard charts are bundled into a single 1.1MB JS file. Route changes don't need to be lazy since everything is already loaded — but initial load downloads everything.

**Approach:** Split routes into lazy-loaded chunks:

```
Before: index.js (1.1 MB) — everything
After:  vendor-react.js (140 KB) — React, React DOM
        vendor-charts.js (250 KB) — Recharts
        vendor-animation.js (60 KB) — Framer Motion
        vendor-query.js (40 KB) — TanStack
        app-landing.js (50 KB) — Landing page only
        app-valuation.js (80 KB) — Wizard steps
        app-admin.js (200 KB) — Admin dashboard, tables, charts
```

**Files:**
- `src/app/router.tsx` — replace static imports with `React.lazy()` + `Suspense`

**Effect:** Landing page downloads ~250 KB instead of 1.1 MB. Each subsequent page loads its chunk on first navigation, then it's cached.

**Effort:** Small (~1 hour)

#### 4. React.memo on Chart Components

**Problem:** All 10 Recharts chart components re-render on every parent state update (filter change, sidebar toggle, etc.), causing visual stutter.

**Approach:** Wrap each chart component with `React.memo` + shallow data comparison.

**Files:**
- `src/features/admin/dashboard/charts.tsx` — add `React.memo` to all 10 exports

**Effect:** Charts only re-render when their specific data slice actually changes. Filter changes that affect one chart don't cause all 10 to re-render.

**Effort:** Small (~30 min)

---

### P2 — Medium Impact (UX Smoothness)

#### 5. Debounce Admin Search

**Problem:** Admin Queries and Vehicles pages filter/search on every keystroke. Scanning 14K vehicles on each character is wasteful.

**Approach:** Add a `useDebounce` hook and apply 300ms delay to search inputs.

**Files:**
- (new) `src/utils/debounce.ts` — `useDebounce` hook
- `src/features/admin/AdminQueriesPage.tsx` — debounce `search` state
- `src/features/admin/AdminVehiclesPage.tsx` — debounce `search` state (if applicable)

**Effect:** Search only processes after the user stops typing for 300ms. No wasted intermediate computations.

**Effort:** Small (~30 min)

#### 6. Eliminate Zustand Server-Data Mirrors

**Problem:** `useVehicles` and `useInquiries` hooks copy React Query data into Zustand stores via `useEffect`. This creates two sources of truth and an extra re-render per fetch.

**Approach:** Stop syncing server data to Zustand. Components read directly from React Query.

**Files:**
- `src/hooks/useVehicles.ts` — remove `useEffect` → `setVehicles`/`setTotal`
- `src/hooks/useInquiries.ts` — remove `useEffect` → `setInquiries`
- `src/stores/vehicleStore.ts` — remove `vehicles`, `setVehicles` fields
- `src/stores/inquiryStore.ts` — remove `inquiries`, `setInquiries` fields
- Every component that reads from these stores → use hook return values instead

**Effect:** One less re-render per data fetch. Cleaner architecture.

**Effort:** Medium (~2-3 hours due to cascade of component updates)

---

### P3 — Low Impact (Caching & Cleanup)

#### 7. Vendor/App Code Splitting in vite.config.ts

**Problem:** `manualChunks: undefined` puts everything in one JS file. If React or Recharts releases a patch, users re-download the full 1.1 MB instead of just the updated vendor chunk.

**Approach:** Define meaningful chunk groups.

**Files:**
- `vite.config.ts` — add `manualChunks` function

**Effort:** Small (~15 min)

#### 8. Remove Dead Code

**Problem:** `@tanstack/react-virtual` is in `package.json` but never imported anywhere. Unused icon imports exist in some page files.

**Approach:** Remove unused dependencies and imports.

**Files:**
- `package.json` — remove `@tanstack/react-virtual`
- Various page files — remove unused Lucide icon imports

**Effort:** Small (~15 min)

---

## Effort Summary

| Priority | Items | Total Effort |
|---|---|---|
| P0 (Bug fix) | 1 | ~15 min |
| P1 (High) | 3 | ~3-4 hours |
| P2 (Medium) | 2 | ~2.5-3.5 hours |
| P3 (Low) | 2 | ~30 min |
| **Total** | **8** | **~6-8 hours** |

---

## Verification Checklist

- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run typecheck` passes with zero errors
- [ ] Landing page loads without triggering vehicle fetch
- [ ] Valuation wizard end-to-end flow completes
- [ ] Admin dashboard loads & all 10 charts render
- [ ] Admin queries search feels responsive (debounced)
- [ ] Admin vehicles page renders correctly
- [ ] Navigate between all routes — no crashes
- [ ] Browser devtools → Network → chunks split correctly
- [ ] Repeat visit shows cached chunks (smaller download)
