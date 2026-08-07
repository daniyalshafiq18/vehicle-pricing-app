# Azure Functions Scraper — Implementation Report

> **Status:** BUILD COMPLETE + DEPLOYED · **live side-by-side proof PENDING** (PIM role expired — see §8)
> **Date written:** 2026-08-06 · **Series:** [evaluation-report](azure-functions-scraper-evaluation-report.md) → [campaign-report](azure-egress-experiment-campaign-report.md) → **this implementation report**
> This is an end-to-end "how it is built today" reference for the Azure Functions YallaMotor scrape path, its integration with the app, and its automatic Power Automate Flow 3 fallback.

---

## 1. Context & Objective

The app values vehicles by scraping **YallaMotor** into Dataverse. Historically that scrape ran exclusively through **Power Automate Flow 3** (`src/lib/yallaMotorHttpScraper.ts`). Microsoft Power Automate scrapes from a genuine Microsoft IP, but it is a **closed, non-serverless, hard-to-version** pipeline.

The Azure egress experiment (2026-08-05) proved the decisive cell: **Python `cloudscraper` on a real Azure datacenter IP can pass YallaMotor's Cloudflare** (3/3 at HTTP 200 from `52.149.247.118`), while Node `fetch`, `requests`, and `curl_cffi` all failed from the same IP. That opened a migration path to a **first-party, serverless Azure Functions scraper**.

**The objective (user-chosen direction, 2026-08-06):** build the Azure path as the **primary** transport, with Flow 3 kept as an **automatic fallback** so no live scrape is ever lost during the transition. Long-term goal: **eliminate Power Automate entirely** once the Azure path is battle-tested.

**Scope boundary:** Seats stays out of scope for **both** paths — YallaMotor exposes no seats in either JSON-LD or markup, so neither Flow 3 nor Azure can capture it.

---

## 2. Architecture

Three-layer split keeps the "brain" (extraction) shared and the transport swappable:

```
React app (browser)
   │  useTriggerScrape → scrapeWithFallback
   ▼
src/lib/azureYallaMotorScraper.ts        ── PRAGMA: Azure primary, Flow 3 fallback
   │  probe()                              (transport = cloudscraper on Azure Functions)
   │  scrapeViaAzure()                     syncs to Flow 3  (transport = Power Automate)
   ▼
src/parsers/ (pure extraction core)  ◄── 0000 shared by BOTH transports
   types.ts · yallaJsonLd.ts · mappers.ts · normalize.ts
   jsonLdFromHtml.ts · specTable.ts
   │
Azure probe (remote)
   ▼
scraper-service/function_app.py  ──────  THIN Python `cloudscraper` transport
   └─ the ONLY thing that speaks to YallaMotor over HTTP
```

**Key principle:** `src/parsers/` is the single extraction "brain." Both Power Automate and Azure deliver the JSON-LD/HTML; the brain turns it into Dataverse option-set integers. This is what lets Azure be a drop-in replacement for Flow 3 without touching the mutating flow in `useTriggerScrape`.

---

## 3. Extraction Core — `src/parsers/`

Pure, network-free, tested (see §7). **Never throws** — every function degrades to `undefined`/`[]` on bad input.

| File | Responsibility |
|---|---|
| `types.ts` | `DetailSpecs`, `SearchResult`, `NormalizedListing` (label-level + integer-level shapes) |
| `yallaJsonLd.ts` | `parseDetailJsonLd` / `parseSearchJsonLd` — pull labels out of schema.org JSON-LD blocks |
| `mappers.ts` | Label normalisers: `mapDriveType` (schema URL → RWD/FWD/AWD/4X4), `mapCategory` (GCC / NON-GCC / OTHER/STANDARD), `mapFuelType` (Petrol/Diesel/Hybrid/Electric), `lookupDoorsValue`/`lookupSeatsValue` |
| `normalize.ts` | `normalizeToDataverse` — **the single label→integer boundary** (permanently guards the 2026-08-03 label-round-trip bug) |
| `jsonLdFromHtml.ts` | `extractJsonLdBlocks(html)` — pulls every `application/ld+json` `<script>` block; skips malformed |
| `specTable.ts` | `extractCylinders(html)` — cylinders live only in the rendered spec grid, not JSON-LD |

**Why the label→integer boundary matters (the guarded bug):** 2026-08-03, a Category silently dropped on approval because the scrape wrote an integer (`1`/`2`/`3`) but re-read a label (`Non-GCC`) and an exact-match lookup (`NON-GCC`) returned null. `normalizeToDataverse` is a single, tested boundary so this cannot recur silently.

**Mapped integers (verified against real fixtures):**

| Field | Label | Dataverse int |
|---|---|---|
| Body Type | `SUV / Crossover` | 57 |
| Fuel Type | `Petrol` | 1 |
| Drive Type | `AllWheelDriveConfiguration` → `AWD` | 2 |
| Category | `GCC Specs` → `GCC` | 1 |
| Cylinders | `6` | 4 |
| Doors | `4` | 4 |
| Engine Size | `2972` | 2972 |
| Mileage | `130161` | 130161 |

**`@parsers` path alias** added to `tsconfig.json` + `vite.config.ts`.

---

## 4. Python Transport — `scraper-service/function_app.py`

The **only** module that speaks HTTP to YallaMotor. Deployed to `vpi-probe-py-20260805` (Linux Consumption, Python 3.11, Oryx remote build).

```
POST /api/probe_py?url=<yallamotor-url>&client=cloudscraper
```

- **Client:** `cloudscraper` with Chrome/Windows/desktop fingerprint — embeds a JS runtime that solves the Cloudflare challenge (guide §6.5).
- **Headers (§6.1 of the guide):** Chrome-128 UA; `Accept-Encoding: gzip, deflate` — **`br` deliberately excluded** (Brotli bodies decode to mojibake and break JSON-LD parsing unless `brotli` is installed).
- **Human pacing (§6.6):** `time.sleep(random.uniform(0.5, 2.0))` *between* requests — closes the "scrapes twice then 403" signal.
- **Cloudflare detection (§6.4, two-state):** blocks **only** when a challenge marker is present **AND** no real content (`application/ld+json` present or `len(html) > 50_000`) arrived. A naive marker-only grep would mis-flag healthy 200 pages — YallaMotor embeds CF marker scripts in normal markup.
- **Diagnostics:** returns `httpStatus`, `bytes`, `ms`, `hasCfChallenge`, `hasCfClearanceCookie`, `hasJsonLd`, `blocked`, `reason` alongside `html` on success.
- **CORS (added 2026-08-06):** `Access-Control-Allow-Origin: *` on every response + full OPTIONS preflight answer — required because the Power Pages portal browser calls the probe **cross-origin**.

---

## 5. Adapter Integration — `src/lib/azureYallaMotorScraper.ts`

The app-side orchestrator (imports `@parsers`; output shape is the same `Flow3ScrapeResult` used by Flow 3).

**Request flow (`scrapeViaAzure`):**
1. `buildYallaMotorSearchUrl(params)` → search URL (shared builder → identical `sourceUrl` to Flow 3)
2. `probe(searchUrl)` → search HTML
3. `extractJsonLdBlocks` → `parseSearchJsonLd` → `count` / `minPrice` / `maxPrice` / `heading` / `firstListingUrl`
4. if `count > 0` → `probe(firstListingUrl)` → `parseDetailJsonLd` + `extractCylinders(detailHtml)`
5. `assembleAzureResult(...)` — a fully-populated `Flow3ScrapeResult`

**`probe()` guards (each returns a clear failure so fallback can trigger):**
- function URL unconfigured → "Azure function URL is not configured (set VITE_AZURE_FUNCTION_URL)"
- `body.blocked` checked **first** (probe returns HTTP 403 with a `blocked:true` body; the reason string is more useful than the code)
- non-OK status → "Azure probe HTTP <n>"
- no `html` payload → "Azure probe returned no HTML payload"

**`scrapeWithFallback` (the resilience layer):**
```text
azure = scrapeViaAzure(params)
if azure.success  →  return {...azure, transport: 'azure'}
else              →  flow3 = scrapeViaFlow3(params); return {...flow3, transport: 'flow3'}
```
**ANY** Azure shortfall — unconfigured / blocked / HTTP error / no listings / no detail / thrown exception — falls back to Flow 3, tagging `transport: 'azure' | 'flow3'` so the frontend can show which path produced the row.

---

## 6. Frontend Wiring

- `useTriggerScrape.ts` now calls **`scrapeWithFallback`** instead of `scrapeViaFlow3` directly, and records `transport` into `scrapedListings` — this is what makes the live side-by-side verification observable.
- The inline `...Value` mappers in the hook were replaced with `normalizeToDataverse(result)` (behavior-preserving: same mutations, statuses, toasts, query invalidation).
- **Env var:** `VITE_AZURE_FUNCTION_URL` added to `.env.example` + `vite-env.d.ts`. The live value stays in the gitignored `.env.local` / build env (never committed).

---

## 7. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npx vitest run src/parsers src/lib` | ✅ **40/40** (8 files; all network-free) |
| eslint (every touched file) | ✅ clean |
| Live portal smoke (Flow 3 path, Jeep Wrangler) | ✅ fully populated row — confirms `normalizeToDataverse` refactor is behavior-preserving end-to-end |
| Azure probe live reproduction (Wrangler search + first detail) | ✅ HTTP 200, `blocked=false`, 1.3 MB HTML |

**Azure ↔ Flow 3 live parity (captured 2026-08-06):**

| Metric | Flow 3 | Azure probe |
|---|---|---|
| Search count | 3 | 3 |
| Price range | AED 93,000–129,000 | AED 93,000–129,000 |
| Body Type | `SUV / Crossover` | 57 |
| Engine | 3600 | 3600 |
| Doors | 4 | 4 |
| Category | `GCC` | 1 |
| Drive | `AWD` (source) | 2 |
| Mileage | 123,000 | 123000 |

**Premises for the migration (carried forward from the prior reports):**
- YallaMotor ✅ proven scrapeable from Azure (cloudscraper passes Cloudflare).
- DriveArabia / Dubizzle ❌ remain hard-blocked from datacenter IPs → still require Power Automate (not in scope for this path).

### (LIVE) side-by-side proof — captured 2026-08-07 (PIM active, deployed)
> Ran `src/lib/azureLiveProbe.test.ts` against the **real deployed Azure probe** (`vpi-probe-py-20260805`) and the **real Flow 3** trigger URL from `.env.local`. Jeep Wrangler search (the report's parity vehicle).
> - [x] Azure primary live — `transport === "azure"` **and** cylinders populated ✅
> - [x] Fallback routing live — broken `VITE_AZURE_FUNCTION_URL` → `transport === "flow3"` selected ✅
> - [ ] Flow 3 **data delivery** live — ⏳ the Power Automate host (`…environment.api.powerplatform.com`) is **unreachable from the dev box's network** (connect refused, even non-sandboxed); this final hop must be confirmed via a browser/portal scrape click.
> - [x] **RESULT (2026-08-07):**
>   ```json
>   [LIVE azure] { "transport": "azure", "count": 3,
>     "minPrice": 93000, "maxPrice": 129000,
>     "cylinders": "6", "bodyType": "SUV / Crossover",
>     "sourceUrl": "https://uae.yallamotor.com/used-cars/jeep/wrangler/vr_3-6l-automatic/yr_2021_2021" }
>   [LIVE flow3] { "transport": "flow3", "success": false, "error": "fetch failed" }
>   ```
> **Notes from the live run:** the Azure probe is **flaky at the Cloudflare layer** — cold first probe is often 403/`blocked:true`, retries pass 3/3 (HTTP 200, JSON-LD, 1.3 MB). The `azureLiveProbe.test.ts` retries up to 5× before giving up.

---

## 8. Live Rollout Status — the only unresolved cell

**Code: complete and merged (`e3c57b4`). Analysis: fully built. Live side-by-side: DONE except the Flow 3 data hop (browser-only).**

**Rollout checklist (status 2026-08-07, PIM window active 10:00–18:00):**
1. [x] **PIM activation** (scheduled 2026-08-07 10:00) — Contributor for sub `a870d3b2-…` (`SBS-PTN-BNF-2400`), usable within the daily 8h window
2. [x] `az account get-access-token` + `az functionapp list` to confirm access
3. [x] `cd scraper-service; func azure functionapp publish vpi-probe-py-20260805 --python` (CORS deploy)
4. [x] `.env.local`: `VITE_AZURE_FUNCTION_URL=https://vpi-probe-py-20260805.azurewebsites.net/api/probe_py`
5. [x] `npm run publish` — ✅ **`Power Pages website upload succeeded` (574 s, exit 0)** after deleting 4 corrupt stale `powerpagecomponent` blob records (`analyticsRepository-DtkRFhD5`, `usePricing-ApzTY_mN`, `usePricing-CfCVzFjm`, `analyticsRepository-Dk3cLwHk`) that threw Azure `InvalidRange`/`0x80040216` on download
6. [x] Trigger a scrape → `transport:"azure"` + cylinders ✅ (live, §7)
7. [x] Break the Azure URL → `transport:"flow3"` routing ✅ (§7) — but the live Flow 3 **data delivery** hop is unverified because the Power Automate host is unreachable from the dev box network (see §7); confirm with a portal scrape click.

**Remaining (1 item, browser):** in the deployed admin UI, scrape a vehicle with Flow 3 (temporarily set `VITE_AZURE_FUNCTION_URL` to a dead value) and confirm the row lands with `transport:"flow3"`.

---

## 9. Limitations & Scope

- **Multi-source:** YallaMotor-only for the Azure path. DriveArabia/Dubizzle still hard-blocked from datacenter IPs; not addressed here.
- **Single listing detail:** Azure scrapes the **first** listing in the search (same behavior as the prior Flow-3 default) — not a deep multi-listing crawl.
- **Cylinders via HTML only:** architectural, JSON-LD has none; depends on the spec-grid markup staying stable.
- **Seats:** out of scope for both transports (source does not expose it).
- **Cost/latency:** one warm start + padded human jitter (0.5–2s) per request (2 requests per scrape); Consumption plan, cold-start latency applies.
- **Dependency:** runtime uses `cloudscraper`, which keeps pace with Cloudflare challenge changes — a $net-maintenance risk (not always-up garbage).

---

## 10. Docs & Memory Updated (auto-update rule)

- `docs/CHANGELOG.md` — three dated entries (2026-08-06)
- `docs/azure-egress-experiment-campaign-reports.md` (+260) · `docs/azure-functions-scraper-evaluation-report.md` (+344)
- `docs/azure-functions-scraper-guide.md` — §6 Anti-Bot rewritten, §7 pointer, §13 fixtures, §14 rollout
- `memory/learned-conventions.md` — Anti-bot section
- `CLAUDE.md` — Project Structure + Path Aliases updated

---

*Report drafted 2026-08-06 (as-built). §7 live cell to be filled after PIM re-activation + rollout checklist (§8) completion.*