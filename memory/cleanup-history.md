---
name: cleanup-history
description: Record of files and code removed during project cleanup on 2026-06-17
metadata:
  type: reference
---

# Cleanup History

## 2026-08-19 — Multi-source Schema Contract Added
- Added the configuration and TypeScript contract for the normalized Vehicle Scrape Run and Vehicle Scrape Source Result tables, plus MVR decision fields. No existing scraper or legacy MVR write path was removed in this foundation step; runtime migration is intentionally deferred until Power Pages Web API exposure is confirmed.
- Added the Power Pages CRUD/repository foundation after the two table settings were enabled and downloaded. The legacy MVR scrape path remains intact; no consumer was switched and no code was removed.
- Moved YallaMotor scrape orchestration and Missing Vehicle Request mapping out of `useTriggerScrape` into the dedicated `yallaMotorDualWrite` service. The hook now contains only React Query/toast behavior; no legacy scrape fields, Azure-first/Flow-3-fallback behavior, or admin controls were removed.
- Removed the normalized Source Result Average Price and MVR Approved Average Price contracts because YallaMotor supplies only minimum/maximum evidence and the stored source average was only a calculated midpoint. Master Vehicle pricing averages and analytics were deliberately retained.

## 2026-07-31 — Fabricated Option-Set Maps Replaced + MVR Map Collapsed
- **Removed fabricated option-set maps** in `src/data/dataverseOptionSets.ts` that were never verified against the real Dataverse:
  - `MISSING_VEHICLE_BODY_TYPE` (MVR) — the 68-entry literal was fabricated (Sedan=42, Suv=47, non-existent labels "Convertable"/"Targah"). Replaced with the real set (Sedan=44, SUV=53, `SUV - Crossover`=57). After the user cleaned labels in Dataverse on BOTH tables, the MVR and Vehicle Data sets became fully identical → the duplicate literal was **collapsed into an alias** of `BODY_TYPE` (`MISSING_VEHICLE_BODY_TYPE = BODY_TYPE`).
  - `MISSING_VEHICLE_FUEL_TYPE` (MVR) — was copied from the Vehicle *Powertrain* set (Electric=1, Hybrid=2, Petrol/Diesel=3). Replaced with the real 4-value set (Petrol=1, Diesel=2, Hybrid=3, Electric=4).
  - `BODY_TYPE` (Vehicle Data) — was fabricated (Sedan=46, SUV=55, "Landaulet"/"Minivan"/"Pickup Truck"). Replaced with the real 68-value set.
- Rationale: unverified maps silently dropped scrape results (body type never wrote) or wrote wrong values (Petrol stored as Hybrid). Full story in `docs/CHANGELOG.md` (2026-07-31) + `memory/learned-conventions.md`.

## 2026-07-29 - Power Pages Stale Asset Cleanup
- Removed obsolete hashed Vite asset web-file directories from `vehicle-pricing-intelligence-platform/.powerpages-site/web-files/`, including the failing `analyticsRepository-Bim_5Jb3.js`, because PAC was trying to upload stale generated assets that no longer match the current build.
- Left only the current `dist/assets` web-file directories in the Power Pages package and broadened the cleanup matcher in `scripts/update-portal-template.mjs` to catch legacy lowercase `analyticsrepository`/`usepricing` chunks plus old `charts-*` and `table-*` chunks.

## 2026-07-23 — Design Language Audit Removed
- Removed `docs/design-language-audit.md` and `docs/design-language-evolution.md` at user's request

## 2026-07-20 — Dirham Symbol Integration Removed
- Removed the `dirham` package, web-font import, Tailwind font fallbacks, Unicode symbol constants, and embedded PDF font at the user's request
- Restored the simpler `AED` text convention across all currency displays

## 2026-07-13 — Scraper Service Removal (Abandoned Path B)

### Removed — Puppeteer Scraping Microservice
- **`scraper-service/`** — Entire directory removed. Reason: YallaMotor Cloudflare protection blocks all automated browsers from datacenter IPs. After 12 Docker/Chrome deploy cycles and extensive anti-detection efforts, Puppeteer proved unable to bypass Cloudflare. Pivoting to Power Automate Desktop (RPA with real Chrome browser on Windows).
- Full postmortem documented in `docs/path-b-scraper-microservice-postmortem.md`
- The mock scraper (`src/lib/yallaMotorScraper.ts`) was **kept** — it's still used by the Step3Result UI and will be repurposed to read from Power Automate output

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
