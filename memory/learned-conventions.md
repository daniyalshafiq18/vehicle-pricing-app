---
name: learned-conventions
description: Recurring patterns, coding preferences, and lessons learned from development sessions
metadata:
  type: feedback
---

# Learned Conventions & Preferences

## Architecture Preferences
- **Data flow is strictly downward**: Components → Hooks → Repositories → IDataSource → Implementation. Never bypass layers.
- **IDataSource is the contract**: All data access goes through this interface. Dataverse is the current implementation via the Power Pages Web API.
- **Keep the project root clean**: No loose files — docs in `docs/`, config in root, code in `src/`. Screenshots, test artifacts, and duplicate exports should be removed.
- **Env vars are for future use only**: Currently the app uses Dataverse directly. Don't add env var consumption until a configurable backend is needed.

## Code Quality
- **No console.log in production code** — the only console call is in `error-boundary.tsx` for error reporting
- **No unused dependencies** — `@types/jquery` was removed since jQuery isn't used
- **No dead path aliases** — `@services` was removed because the directory was empty
- **Build scripts must use JavaScript-compatible regex syntax** — Node does not support PCRE atomic groups like `(?>...)`; use standard capturing or non-capturing groups in `.mjs` scripts.
- **Portal orphan cleanup is opt-in** — avoid deleting large batches of Power Pages web-file records during normal builds; large deletion payloads can make `pac paportal upload` time out.
- **Strict TypeScript** — `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` are enabled
- **Configuration-absence tests must override loaded Vite env values explicitly** (2026-08-12) — `.env.local` is loaded during Vitest, so a test that calls an adapter with default options does not prove the “unconfigured URL” path on developer machines. Pass `functionBaseUrl: ''` (or the equivalent explicit empty override) so the test cannot silently become a live network request and time out.
- **Never hardcode live credentials / SAS tokens in committed source** (2026-08-05) — Power Automate HTTP-trigger URLs carry a `sig=` SAS that lets anyone invoke premium flows (credit burn + unauthorized Dataverse writes). Read such values from a `VITE_*` env var; keep the live value in **gitignored `.env.local`** and in the build environment. Two honest caveats: (1) a client-invoked trigger key is still visible in the shipped JS bundle (Vite inlines env at build time), and (2) old tokens live on in git history forever — **rotating the trigger key is the only action that actually invalidates a leaked copy**.
- **When migrating a hardcoded secret to an env var, restore the value into `.env.local` in the SAME change** (2026-08-05) — otherwise the feature breaks the moment the hardcoded line is removed, until someone sets the env. Pair the migration with immediate restoration so functionality is never regressed mid-transition.
- **Centralize currency display** — use `formatCurrency()` for user-facing prices and display the `AED` ISO currency code consistently; do not add a Dirham SVG or custom currency font
- **Typography convention** — use Inter for all UI text. Reserve `font-mono` for actual code/preformatted text; use `tabular-nums` for aligned prices, counts, dates, and metrics.
- **Price entry UX** — show `AED` inside price inputs and format thousands separators while typing; keep state and submitted payloads digit-only, without a duplicate formatted preview below the fields
- **Splash progress represents complete startup** — vehicle pagination must not consume 100%; reserve the final progress segment for API data that layouts/pages request immediately, and prefetch it into React Query before routes mount

## Documentation Standards
- All documentation goes in `docs/` — nothing at root except `README.md`
- `CLAUDE.md` for project architecture and workflow rules
- `MEMORY.md` with index linking to individual memory files in `memory/`
- When making changes, update `docs/CHANGELOG.md` with a dated entry

## Cleanup Rules
- Empty directories should be removed (e.g. `public/`, `src/services/`)
- Duplicate/stale exports should be cleaned up (e.g. `vehicle-pricing-intelligence-platform/`)
- Unused env files should be removed (`.env`, `.env.production` not consumed)
- `.prettierignore` should only have entries NOT already in `.gitignore`
- Build artifacts (`tsconfig.tsbuildinfo`, `.vite/`) belong in `.gitignore`

## YallaMotor Scraping Patterns

- **Label-case discipline between parser halves** (2026-08-07) — `extractRegionalSpecs` (yallaJsonLd.ts) returns **lowercase** generic spec phrases (`"american specs"`) and the keyword `'Non-GCC'`; `mapCategory` (mappers.ts) **must be case-insensitive** (`toLowerCase()` before `includes`) and must carry a branch for `'Non-GCC'` (no "Specs" substring). A case-sensitive `includes('Specs')` here silently dropped the MVR **Category** field (blank in Dataverse) for every non-GCC listing while all other fields wrote fine — null was invisible until queried live. Lesson: the label→value boundary (`normalizeToDataverse`) can silently omit a field; when one mapped field is blank but others vary, compare case/spelling between the two parser halves before touching Dataverse.

### Multi-source transport discipline (PAD — 2026-08-07, see `docs/power-automate-desktop-scraper-guide.md`)
- **IP reputation is the decisive anti-bot layer, not technique.** All three sources block datacenter IPs (Railway/AWS/Vercel/**Azure**) even with byte-perfect TLS and `cloudscraper`; a real browser on a **residential IP** passes. PAD = real Chrome on the user's home IP → defeats both DriveArabia's Cloudflare and Dubizzle's Imperva.
- **Keep extraction OUT of PAD.** PAD flows are selector-brittle; the tested `src/parsers` TS brain stays the single extractor. PAD only captures raw HTML and relays it (via the existing Azure function) to the browser, which parses + writes Dataverse with `transport:'pad'`.
- **The Category bug class applies to every new source** — label→value boundary is case-sensitive; always reuse `normalizeToDataverse`/`mapCategory` and add a fixture test per new source markup (guide §7.5 rule).
- **PAD `Invoke web service` form-encodes the whole body** (2026-08-11) — not just percent-encoding: a **space arrives as `+`** and a genuine `+` as `%2B`. Decode with **`urllib.parse.unquote_plus`** (replaces `+`→space then decodes `%XX`); `unquote` alone leaves `+` in place and silently corrupts every space in the captured HTML (`<html lang=` → `<html+lang=`, parser → 0 rows). Lesson: when a smoke test uses a hand-built `%7b…%7d` body with **no spaces**, it can pass while the real client's form-encoding breaks the payload — replicate the client's exact byte encoding in the test, spaces included.
- **DriveArabia repeats section labels in tab navigation and content** (2026-08-12) — the per-model-year page renders `Original Trim Prices` once as a tab label and again above the real table. Anchoring on the first occurrence makes the first trim absorb overview text and get discarded. Scope from the final visible heading to the next section boundary, then fixture-test the first row explicitly. Do not make drivetrain-specific assumptions: accept the known `FWD`/`RWD`/`AWD`/`4WD`/`4x4`/`2WD` labels.
- **PAD inbox items do not carry an MVR GUID** (2026-08-12) — never associate a capture by queue order or a fuzzy vehicle name. Derive make/model from the captured DriveArabia URL, year/trim from parser rows, and update only exact matches in the loaded MVR set. A valid unmatched item must remain `Pending` so it can be retried after the MVR exists; only malformed/unsupported/write-failed items become `Error`.
- **Azure Functions platform CORS can intercept OPTIONS before function code** (2026-08-12) — a browser JSON POST to `inbox_status` triggered preflight; Azure returned a headerless `204`, so the Dataverse write succeeded but acknowledgement never ran and the item stayed Pending. For this anonymous content-type-agnostic endpoint, send JSON text as safelisted `text/plain;charset=UTF-8` to make it a simple CORS request. A correct `_preflight()` inside the Python function does not help when the platform consumes OPTIONS first.
- **DriveArabia attended acceptance contract is proven** (2026-08-12) — PAD's four actions are: launch the per-model-year page, return `JSON.stringify({source,url,kind,html})`, save the payload locally, and POST it to `ingest_html`. Success means PAD receives `202`, the admin processor writes the exact MVR with `transport:'pad'`, `inbox_status` marks `Complete`, the Blob lookup becomes `blob_missing`, and `next_pending` becomes `no_pending`.
- **DriveArabia per-year pages mix multi-trim prices with dynamically mounted engine specs** (2026-08-13, extended 2026-08-17) — visible copy mentions several engines/fuels and can produce a plausible but wrong spec. The JSON-LD block safely identifies one selected trim, while closed Radix Specs accordions are absent from `document.outerHTML`. PAD must render and serialize every group into the capture; map other trims only through one unique capacity + layout + hybrid + drivetrain signature. Missing/ambiguous groups stay price-only.
- **A programmatic click does not make React accordion content synchronously readable** (2026-08-17) — clicking every DriveArabia Specs button and reading its controlled region in the same PAD JavaScript call captured only the initially open group. Start a timer-paced collector, wait in a separate PAD action, then validate captured count equals button count before building/uploading the HTML payload.
- **Use DriveArabia's short model-year route as the stable input** (2026-08-17) — build `/carprices/uae/<make>/<model>/<year>/` from the exact MVR and let DriveArabia redirect to its canonical, sometimes make-prefixed slug. PAD must upload `window.location.href` after navigation. Do not maintain a brittle table of canonical aliases in the app.
- **DriveArabia trim labels do not always include drivetrain** (2026-08-17) — newer pages may say `2.5L I4 SE FWD`, while older pages can say only `2.4L sedan`. Bound price extraction to the actual **Original Trim Prices** section and validate label length/prices; do not use `FWD`/`RWD`/`AWD` as a mandatory row delimiter.
- **Older DriveArabia commercial trims need conservative spec bridging** (2026-08-17) — an exact selected trim such as `2.4L sedan` can omit `I4/FWD` while the captured Specs group includes them. Merge that group only when engine capacity identifies exactly one group; duplicate capacities stay unmerged.
- **DriveArabia commercial and Specs labels can disagree** (2026-08-18) — MINI Cooper 2024 prices label the base trim `1.5TC I4 Cooper FWD`, while its Specs accordion and overview identify `1.5 TC I3 FWD` and `1.5 L`. Treat `TC` as a capacity suffix, prefer the accordion's explicit Engine Size/Layout rows, and bridge an exact commercial trim by capacity only when exactly one captured group has that capacity. Do not treat the price-row cylinder token as authoritative mechanical evidence.
- **Generic DriveArabia price trims require field-level consensus** (2026-08-18) — labels such as Isuzu D-Max `D-Max` map to several engine configurations and contain no capacity/layout evidence. When the selected commercial trim matches exactly, merge only fields defined identically by every captured Specs group (for example Diesel and I4); omit conflicting capacity, drivetrain, transmission, power, and torque values. Never copy the first/default accordion into a generic trim.
- **A field existing in Dataverse/docs does not mean the application write contract includes it** (2026-08-13) — `vpi_horsepower` existed on MVR and appeared on the Dataverse form, but was absent from `MISSING_VEHICLE_REQUEST_FIELDS`, the TypeScript model, DataSource/repository update types, PATCH body, and approval mapping. When adding a scraped field, audit the complete read → update → approve path; display is a separate UI decision.
- **Preserve even item counts in two-column specification grids** (2026-08-13) — adding one standalone Horsepower tile made the MVR modal/card visually unbalanced. A field can remain stored and available in Dataverse/provenance without being added as a separate summary tile; review grid parity before changing these compact layouts.

### Flow 3 Architecture
- Flow 3 is an HTTP-triggered Power Automate Cloud flow (SAS token auth) that scrapes YallaMotor in real-time.
- The flow uses a **Try/Catch Scope** with a `-1` sentinel for `count` to signal YallaMotor being unreachable (Cloudflare block).
- Two HTTP requests: (1) search results page → pricing data + first listing URL, (2) detail page → spec fields.

### Transport Architecture — Azure primary, Flow 3 fallback (2026-08-06)
- `src/lib/azureYallaMotorScraper.ts` `scrapeWithFallback` is now the single scrape entry point: **Azure probe first, Power Automate Flow 3 on ANY Azure shortfall** (unconfigured URL, blocked, HTTP error, no listings, no listing URL, detail failure). No live scrape is ever lost, and rollback = just leave `VITE_AZURE_FUNCTION_URL` empty.
- Both transports return the identical `Flow3ScrapeResult` shape and every result carries a `transport: 'azure' | 'flow3'` marker recorded in `scrapedListings` — that's the field to check when verifying which path produced an admin row.
- **Seats is unavailable on YallaMotor for BOTH paths** — the JSON-LD has no seating capacity and the HTML has no seats tile. It is permanently out of scope (neither Flow 3 nor Azure writes it).

### JSON-LD Extraction (Search Page)
- YallaMotor uses Next.js with structured data in `<script type="application/ld+json">` blocks.
- The **WebPage** JSON-LD block comes first and has `.mainEntity` with an `ItemList` of vehicles.
- Key search page extraction patterns:
  - `count`: `"numberOfItems":"` → split on `"`
  - `minPrice` / `maxPrice`: split `heading-h2-content">` on `–` and strip `AED`
  - `heading`: split `heading-h2-content">` on `</span>`
  - First listing URL: extract `<article>` HTML, then split on `href="`, prepend domain

### JSON-LD Extraction (Detail Page — schema.org Vehicle)
- The detail page has an `AutoDealer` JSON-LD block with `itemOffered` containing vehicle properties.
- Fields available in JSON-LD:
  - `bodyType`: `"vehicleBodyType":{"name":"` → split on `"`
  - `fuelType`: `"fuelType":"` → split on `"`
  - `transmission`: `"vehicleTransmission":"` → split on `"`
  - `driveType`: `"driveWheelConfiguration":"` → split on `"` (returns schema.org URL like `https://schema.org/RearWheelDriveConfiguration`)
  - `mileage`: `"mileageFromOdometer":{"@type":"QuantitativeValue","value":` → could be a **quoted string** (`"value":"130161"`, like engine size) OR **unquoted number** (`"value":130161`). Hardened expression (2026-07-31) tries the string pattern first, then numeric. **Verified on real Pajero JSON-LD (2026-07-31): the value is an UNQUOTED number** (`130161` with `"unitCode":"KMT"`) — the string branch correctly stays silent, the numeric branch fires.
  - `engineSize`: nested at `"engineDisplacement":{"@type":"QuantitativeValue","value":"` → split on `"` (NOT flat `"engineDisplacement":"`). Verified: `2972` on Pajero. Note: **engine size's value IS a quoted string** while mileage's is unquoted — always check which before assuming.
  - `doors`: `"numberOfDoors"` → structure varies (nested `{"@type":"QuantitativeValue","value":N}` OR plain `"numberOfDoors":N`). Hardened expression (2026-07-31) checks nested first, then plain int. Both use `}`-then-`,` split so a trailing comma **or** closing brace works (`"value":4}` → `4`). Verified on Pajero: nested with `"unitCode":"C62"` (comma present, so the `,`-only split also worked there — the `}`-then-`,` is insurance for listings without unitCode).
  - `regionalSpecs`: **HTML table row primary** (`Regional Specs` label → `<td>`), `description` JSON-LD as fallback (hardened 2026-07-31). Frontend keyword-matches for `GCC Specs` / `Non-GCC` / `Other Specs`. **Verified (2026-07-31): "Regional Specs" is ABSENT from the JSON-LD** (HTML-only, like Cylinders) — but `description` contains `GCC Specs`, so the fallback always reaches GCC.
- **Seats (`vehicleSeatingCapacity`)** is NOT reliably available in YallaMotor listing JSON-LD — skip it.
- **Power Automate single-parameter functions reject a trailing `''`** — `trim()`, `first()`, `last()`, etc. take a fixed arg count. A `, ''` meant for the `if()` false-branch that lands inside `trim(first(...), '')` fails at runtime: `InvalidTemplate: 'trim' must have only one parameter`. The `if()`'s closing `, '')` must come after the inner function's close paren. (Hit on `Extract_Doors`, fixed 2026-07-31 — pattern now matches `Extract_Mileage`.)

### HTML DOM Extraction (Detail Page)
- Some fields are only in the Vehicle Highlights tiles (HTML), not JSON-LD. **The real markup (verified view-source, Pajero 2026-07-31) is a grid of `<div>` cards, NOT a `<table>`:**
  ```html
  <div class="mb-1 text-sm text-gray-600 capitalize" title="LABEL">LABEL</div>
  <div class="text-base font-semibold text-gray-900 lg:text-base" title="VALUE">VALUE</div>
  ```
  - **Cylinders / Regional Specs extraction pattern:** split on `title="LABEL"`, then split the following segment on `title="` (the value div's title attribute), then split on `"`:
    `trim(first(split(first(skip(first(skip(split(body, 'title="Number of Cylinders"'), 1)), 'title="'), 1)), '"')))` → `6`.
  - **In-repo TS mirror (2026-08-06, Azure adapter):** the same pattern now lives as a tested regex in `src/parsers/specTable.ts` (`extractCylinders(html)` — anchor `title="Number of Cylinders"`, read the value div's `title`), pinned by `tests/fixtures/wrangler-detail-spec-section.html` (a trimmed slice of a raw Azure-probe capture). This lets the Azure transport produce the exact cylinders Flow 3 does.
  - ❌ **A `contains()` diagnostic does NOT prove HTML structure.** The earlier `<th>Number of Cylinders</th><td>4</td>` table assumption was WRONG — there are NO `<td>` tags on the page. `split(..., '<td>')` returned Null at runtime. Always get the actual view-source snippet (~300 chars around the label) before writing HTML extraction. (Hit on Extract_Cylinders, fixed 2026-07-31.)
  - **Listing URL**: Two-step: (1) find `<article>` element, (2) within it, `split(article, 'href="')` → take second segment → `split on '"'` → `concat('https://uae.yallamotor.com', url)`

### YallaMotor URL Structure
- Search page: `https://uae.yallamotor.com/used-cars/{make}/{model}/vr_{trim}/yr_{year}_{year}`
- Detail page: `https://uae.yallamotor.com/used-cars/{make-slug}-{model-slug}-{year}-{listing-id}` (e.g. `/used-cars/mercedes-benz-c-class-2021-sharjah-2104988`)
- The first `"url":"` match in the search page response gives the WebPage canonical URL, NOT the listing URL. The listing URL must be extracted from the `<article>` HTML.

### Cloudflare Rate Limiting
- YallaMotor is behind Cloudflare. Repeated rapid test calls (3+ in quick succession) trigger 403 Forbidden.
- Need ~30 minute cooldown after hitting rate limit.
- Full HTTP headers including `sec-ch-ua*` help but don't prevent rate limiting on high-frequency calls.
- Flow 3's Try/Catch Scope handles 403 errors gracefully.
- Test strategy: wait between manual tests, or test from Power Automate's "Test → Automatic" with saved data.
- **Anti-bot, live-proven (2026-08-06, Azure egress `52.149.247.118`):** on a Microsoft/Azure IP, YallaMotor's Cloudflare emits a *solvable* JS challenge instead of a hard block — but only a client that can **run the challenge JS** gets through. Node `fetch`, Python `requests`, and TLS-only `curl_cffi` were **all blocked from the same IP**; Python `cloudscraper` (Chrome TLS + JS-challenge solver) passed 3/3 at HTTP 200. Headers alone don't save a request — the TLS handshake + challenge-solving capability are what decide. Detection nuance: `hasCfChallenge`/`just a moment` strings appear on **successful** pages too (marker scripts embedded in normal markup) — it's only a block when the marker is present AND no content/JSON-LD came through. And when a request *isn't* gated, Cloudflare simply never challenged it — nothing to solve, which is how plain clients get lucky runs before the behavior flag kicks in (the "works twice, then 403" pattern).

## Dataverse Option Sets — Verify, Don't Assume

### Option-set maps in code MUST be verified against the actual Dataverse option set
Two fields on the Missing Vehicle Request table had code maps that were WRONG because they were never checked against Dataverse (verified 2026-07-31):
- **`vpi_fueltype`**: code assumed `Electric`=1, `Hybrid`=2, `Petrol/Diesel`=3 — that's the Vehicle *Powertrain* option set, copied by mistake. Actual MVR set: `Petrol`=1, `Diesel`=2, `Hybrid`=3, `Electric`=4. Consequence: scraped `Petrol` was written as value 3 → displayed **Hybrid** in Dataverse.
- **`vpi_bodytype`**: the code map had fabricated labels ("Convertable", "Targah", "Wide Body Minus Bus") and wrong values (Sedan=42, Suv=47). The actual MVR set is its own **68-option** set (Sedan=44, SUV=53, `SUV - Crossover`=57). Consequence: scraped `SUV / Crossover` matched nothing → field never written.
**Rule:** before trusting a label→value map, open the field in the Power Apps maker portal (Table → field → edit Choice) and copy the exact labels AND integer values. Renaming a label in Dataverse keeps its value (safe) — but the code map must match the final labels exactly.
**YallaMotor value formats:** `SUV / Crossover` (slash separator) will not match the Dataverse label `SUV - Crossover` (hyphen separator) in an exact lookup. Normalise by comparing lowercase alphanumeric-only (`suvcrossover` == `suvcrossover`) — this also covers `Compact/Mini MPV` and `Coupe/Cabriolet`, whose slashes are legitimate.
**The Vehicle Data table had the same disease:** the code `BODY_TYPE` map (Sedan=46, SUV=55, "Landaulet"/"Minivan"/"Pickup Truck") was fabricated too. The real Vehicle Data `vpi_bodytype` set is 68 options with values **identical to the MVR set** (Sedan=44, SUV=53, `SUV Crossover`=57). The labels were then cleaned in Dataverse on 2026-07-31 (uppercase `LWB`, uniform ` - ` separator) so both sets are now fully identical — the code mirrors that by aliasing `MISSING_VEHICLE_BODY_TYPE = BODY_TYPE` (one map, can't drift). When two tables' option sets share values, cross-table mapping still needs label-aware conversion: approving an MVR maps `fuelType` → Vehicle `powertraintype`, and "Petrol"/"Diesel" have no exact label in the powertrain set — they must be collapsed to `Petrol/Diesel` (3).

### Label round-trips in read → write flows silently drop fields — keep the raw integer
When a value is written to Dataverse as an option-set **integer**, read back as a formatted **label**, and then converted to an integer again before writing to another table, a casing/separator mismatch in the label lookup returns `null` and the field is silently skipped. Hit on `vpi_category` (2026-08-03): scrape writes `1/2/3`, `parseRawRecord` reads the label (`"Non-GCC"`, `"Other/Standard"`), and `approveAndCreateVehicle` converted it via `categoryValue()` — exact-match `toValue` — against map keys `"NON-GCC"`/`"OTHER/STANDARD"`, so Category never made it into Vehicle Data. **Fix:** capture the raw option-set integer alongside the label (`categoryValue` on the type) and pass it straight through; use the label lookup only as a fallback. Rule: if a field is stored as a choice and both tables share the same option-set values, thread the raw integer end-to-end instead of round-tripping the label. **Verified live 2026-08-04:** user approved an MVR → Vehicle Data and confirmed the Category field populates successfully.
