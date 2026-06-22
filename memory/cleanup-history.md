---
name: cleanup-history
description: Record of files and code removed during project cleanup on 2026-06-17
metadata:
  type: reference
---

# Cleanup History

## 2026-06-17 — Full Project Cleanup

### Removed — API Work
- `src/webapi/` — entire directory (dataverseAjax, safeAjaxLoader, vehicleFetcher, inquiryService, optionSetMappings, types, index)
- `src/data/dataverseDataSource.ts` — Dataverse data source implementation
- `src/data/vehicleComputations.ts` — Vehicle computations file

### Removed — Stale Artifacts
- `vehicle-pricing-intelligence-platform/` — 73 MB duplicate Power Pages export directory
- `admin-test.png`, `app-screenshot.png`, `vehicles-test.png` — dev screenshots
- `C:Vehicle-Pricing-Appscreenshot-test.cjs` — test script with malformed filename
- `e2e-test.mjs` — standalone screenshot test
- `tsconfig.tsbuildinfo` — build artifact
- `src/services/` — empty directory
- `public/` — empty directory

### Removed — Dependencies
- `@types/jquery` — not used anywhere in the project

### Removed — Unused Files (not consumed by app)
- `.env` — development env vars (not consumed)
- `.env.production` — production env vars (not consumed)
- Kept `.env.example` as documentation of available vars

### Removed — Dead Code
- `@services` path alias from `tsconfig.json` and `vite.config.ts` (directory was empty)

### Consolidated — Documentation
- Moved `Documentation/` → `docs/` (SETUP.md, DEVELOPMENT.md, MIGRATION.md, context.md, CHANGELOG.md)
- Added `dataverse-schema.md` to `docs/`
- Updated all cross-references in README and docs

### Simplified
- `.prettierignore` — removed entries duplicated in `.gitignore` (Prettier respects it automatically)
- `.gitignore` — added `.vite/`

### Reverted (API-related changes)
- `tsconfig.json` — removed `@webapi` path alias
- `vite-env.d.ts` — removed `VITE_DATAVERSE_URL`, kept `VITE_DATA_SOURCE`
- `.env` / `.env.production` — restored `VITE_DATA_SOURCE=excel`, removed `VITE_DATAVERSE_URL`
- `main.tsx` — removed `safeAjaxLoader` import
- `DataSourceContext.tsx` — reverted to `ExcelDataSource`
- Various files reverted to Phase-1 state
