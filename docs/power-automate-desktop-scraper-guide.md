# Power Automate Desktop (PAD) Multi-Source Scraper — Implementation Guide

> **Status:** IN PROGRESS · **The attended DriveArabia multi-trim workflow is live-proven end to end.** A single page capture now supplies exact prices plus uniquely matched petrol, V6, and hybrid engine groups. Automatic PAD launching/inbox processing and Dubizzle remain pending; YallaMotor stays untouched.
> **Date written:** 2026-08-07 · **Series:** [evaluation-report](azure-functions-scraper-evaluation-report.md) → [egress-campaign](azure-egress-experiment-campaign-report.md) → [implementation-report](azure-functions-scraper-implementation-report.md) → **this guide**
> **Companion to:** [azure-functions-scraper-guide.md](azure-functions-scraper-guide.md) (the single-source Azure path — still the YallaMotor transport).
>
> This is the end-to-end "how to build it from scratch" reference for bringing **DriveArabia** and **Dubizzle** into the platform using **Power Automate Desktop** as the browser transport, with extraction staying in the shared `src/parsers` brain.

---

## 1. Context & Objective

YallaMotor is now a solved, live scrape path (Azure Functions `cloudscraper` PRIMARY + Power Automate Flow 3 fallback — see the implementation report). But **the platform must not depend on a single source**. The two candidate sources, DriveArabia and Dubizzle, have been **continuously failing to fetch** since the beginning of this work.

**The reason they keep failing is now understood and decisive (evaluation report §4/§5):** the blocker is **IP reputation, not technique**. From datacenter IPs (Railway, Vercel/AWS, Azure Functions, even byte-perfect TLS fingerprints via `curl_cffi` and the JS-challenge-solving `cloudscraper`), both sites return Cloudflare / Imperva blocks. The *same* request from a **residential IP in a real browser** passes — DriveArabia served ~1 MB of real content to a plain `curl` from a residential IP while blocking the identical request from a datacenter IP.

**The objective (user-chosen direction, 2026-08-07):** bring in **DriveArabia and Dubizzle via Power Automate Desktop (PAD)** — a real Chrome browser running on a residential Windows machine, which is the one transport class proven to defeat both anti-bot vendors at once. YallaMotor is **frozen on its current path** until both new sources reach a conclusion.

### Decision record (2026-08-07)
| Question | Decision |
|---|---|
| Transport for the two hard-blocked sources | **Power Automate Desktop (attended first, graduate to unattended later)** |
| How PAD delivers scrapes | **PAD captures raw HTML → existing Azure function ingests/relays → shared `src/parsers` brain (in the browser) → Dataverse write-back** |
| YallaMotor | Untouched until DriveArabia + Dubizzle are live and verified |

**Scope boundary:** seats remain out of scope (neither source reliably exposes them). Listing depth stays "search page + first detail listing" (mirrors the current Flow-3/Azure default), not a deep crawl.

---

## 2. Why PAD is the right transport (the evidence)

| Source | Anti-bot vendor | Datacenter IP (Azure/AWS/Vercel/Railway) | **Residential IP + real browser (PAD)** |
|---|---|---|---|
| YallaMotor | Cloudflare | ✅ *proven pass* (Azure, cloudscraper) | ✅ |
| DriveArabia | Cloudflare | ❌ blocked | ✅ **passes** (plain curl from home IP served real content) |
| Dubizzle | Imperva / Incapsula | ❌ blocked (all 3 clients) | ✅ **expected pass** (real browser, residential reputation) |

- PAD launches a **real Chrome/Edge with a real user profile** — no headless flag, no automation marker — from the **user's home IP**. It therefore defeats **both** the fingerprint layer and the IP-reputation layer that every server-side attempt failed on.
- Power Automate Desktop was archived back on 2026-07-15 (plan §14) — but only because **Cloud-only was cheaper and worked for YallaMotor**, not because PAD failed. For Dubizzle's Imperva specifically, Cloud-only has an *untested* cell; PAD has a *guaranteed* pass. This is the case where PAD's cost is justified.

**Pitfall being deliberately avoided:** PAD flows are browser-selector-driven and fragile. The extraction logic must **not** be re-implemented inside the PAD flow (a "mini Flow 3"). Extraction stays in the tested `src/parsers` TypeScript; PAD stays a thin "resident browser that hands over HTML."

---

## 3. Architecture — the delivery pipeline

### 3.1 The constraint you must design around

- The **extraction brain** (`src/parsers/` + `normalizeToDataverse`) is **TypeScript that runs in the browser** (and in Vitest). It is transport-agnostic and tested once against live fixtures.
- The **existing Azure function** (`scraper-service/function_app.py`) is **Python, transport-only** — it fetches HTML and reports diagnostics; it does **not** run the TS brain.

Therefore *"existing Azure function → shared parser"* is **not literal**: the function **relays** HTML; the browser **parses**. The pipeline keeps the brain in one tested place and keeps PAD + the function thin.

### 3.2 Recommended pipeline (Option 2 — "inbox" relay via the existing function)

```
┌─────────────── Power Automate Desktop (on the user's Windows PC) ───────────────┐
│  real Chrome  → open DriveArabia/Dubizzle search URL                            │
│               → human pacing                                                     │
│               → open first listing detail                                        │
│               → capture FULL raw HTML (document.documentElement.outerHTML)       │
│               → POST {source, url, html} to the Azure function ingest endpoint   │
└──────────────┬──────────────────────────────────────────────────────────────────┘
               ▼   (POST /api/ingest_html — function-key auth, PAD side only)
┌────────────── Azure Functions (existing app vpi-probe-py-20260805) ─────────────┐
│  ingest_html  → validate size (≤ ~5 MB) → store Blob scrape-inbox/<source>/<id>.html │
│              → record metadata (source, url, status=Pending) → HTTP 202          │
│  next_pending → (browser-callable, CORS) → returns the next pending inbox item   │
└──────────────┬──────────────────────────────────────────────────────────────────┘
               ▼   (GET /api/next_pending — anonymous + CORS, like probe_py)
┌────────────── React app / Power Pages portal (browser) ─────────────────────────┐
│  processScrapeInbox() → poll next_pending                                       │
│                       → source-aware parse via src/parsers (NEW per-source entry)│
│                       → normalizeToDataverse(result)  (Category fix included)    │
│                       → updateMissingVehicleScrapeResult(...) transport:'pad'    │
│                       → mark inbox item Complete                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

`probe_py` (the YallaMotor Azure transport) is **unchanged** — the PAD path adds new endpoints alongside it.

### 3.3 Alternatives (when you'd choose them instead)

| Option | Shape | Choose when |
|---|---|---|
| **2 (recommended)** PAD → function ingest (Blob inbox) → browser parses → Dataverse | One new function + Blob; reuses probe infra, CORS pattern, and browser brain | This is the default — honors the chosen delivery model, zero Python extraction |
| **1** PAD → Dataverse scrape-queue table directly → app polls + parses | No function change; but PAD must authenticate to the Dataverse Web API (AAD app registration) and the app adds a queue-read | You'd rather not touch the function app at all; the AAD setup for PAD is the cost |
| **3** Second **Node.js** function running the TS parsers server-side | Most "shared brain on the server," but adds a second function app + bundling the TS parsers for Node | When you want zero client-side parse work long-term (future-proofing beyond PAD) |

All three write the **same MVR fields** with the **same `transport`/`scrapedSources` provenance**, so the choice can be revisited without touching the write-back layer.

---

## 4. Prerequisites

| # | Item | Detail |
|---|---|---|
| 1 | **Power Automate Desktop** | Installed from the Power Platform admin center / Microsoft 365; signed into your Power Platform account. Attended (logged-in) runs need the base Power Automate entitlement. |
| 2 | **A Windows machine that can stay up** | Your dev box is fine for **attended-first**. Unattended later needs an always-on machine + a Power Automate **per-user plan + unattended add-on** + a machine group. |
| 3 | Existing Azure function app | `vpi-probe-py-20260805` (Linux Consumption, Python 3.11). Reused as the ingest relay — publish with `func azure functionapp publish <app> --python`. |
| 4 | Azure Blob Storage (new) | For the `scrape-inbox` HTML store (or Azure Table for metadata). Same subscription/resource group as the function. |
| 5 | Dataverse MVR table | `vpi_missingvehiclerequestses` — already wired for scrape results (`vpi_scrapestatus`, `vpi_scraped_minprice/maxprice`, `vpi_scraped_sources`, `vpi_scraped_listings`). |
| 6 | Repo surface | `src/parsers/` (brain), `src/lib/missingVehicleApi.ts` (write-back), `src/lib/yallaMotorUrl.ts` (URL-builder pattern to clone), `tests/fixtures/` (fixture rule), `src/lib/azureYallaMotorScraper.ts` (probe + fallback pattern). |
| 7 | Env vars | `VITE_AZURE_FUNCTION_URL` exists. The **ingest function key lives only in PAD** (never in the browser bundle). No new committed env needed to start. |

---

## 5. The PAD desktop flow (per source — thin, attended first)

> One flow per source (`PAD-DriveArabia`, `PAD-Dubizzle`). Keep each flow to **exactly four responsibilities**: browse → pace → capture → POST. No extraction, no parsing, no Dataverse writes inside PAD.

### 5.1 Flow outline

1. **Receive the request URL** — create a required PAD input variable named `DriveArabiaUrl` with data type **Text**. An attended console run displays the Flow inputs dialog; paste the URL copied from **Admin Missing Vehicle Requests → request modal → Copy PAD URL**.
2. **Launch browser** — `Launch new Microsoft Edge/Chrome` with a **real user profile** (default session; never `--incognito`, never `--headless`, never `--disable-web-security`). Replace the fixed Camry Initial URL with `%DriveArabiaUrl%`.
3. **Human pacing** — wait 0.5–2 s randomly between navigations (mirrors guide §6.6). One listing at a time; no burst of tabs.
4. **Open the first listing detail** — read the search page listing link, `Go to web page`.
5. **Capture full HTML** — either:
   - **Browser automation → Run JavaScript on web page**: `document.documentElement.outerHTML` → store to a text variable, **or**
   - **Web → Get details of web page → WebPageContent**.
6. **POST to the ingest endpoint** — **Web → Invoke web service**: `POST https://vpi-probe-py-20260805.azurewebsites.net/api/ingest_html?code=<FUNCTION_KEY>`, JSON body:
   ```json
   { "source": "drivearabia", "url": "https://…/detail-…", "searchUrl": "https://…", "html": "<full page html>" }
   ```
   (Use **Application/JSON** content type; capture the returned `inboxId`.)
7. **Loop/stop** — for the attended first run, stop after one detail (manual validation); scale to N listings later.

### 5.2 DriveArabia multi-trim capture function

DriveArabia unmounts the contents of closed Specs accordions, so plain `document.documentElement.outerHTML` contains only the initially open engine. React also renders a programmatically opened accordion asynchronously: clicking every button and reading immediately captured only the first Camry group in live PAD acceptance on 2026-08-17. Use two JavaScript actions separated by a PAD wait.

**Action 2 — Start asynchronous spec capture.** Set its produced variable to `SpecCaptureStartResult`:

```javascript
function ExecuteScript() {
  const specs = document.querySelector('#specs');
  if (!specs) {
    return 'NO_SPECS_SECTION';
  }

  const buttons = Array.from(specs.querySelectorAll('button[aria-controls]'));
  const groups = [];

  function finish() {
    let marker = document.getElementById('vpi-pad-spec-groups');
    if (!marker) {
      marker = document.createElement('script');
      marker.id = 'vpi-pad-spec-groups';
      marker.type = 'application/json';
      document.body.appendChild(marker);
    }
    marker.dataset.expectedCount = String(buttons.length);
    marker.textContent = JSON.stringify(groups);
  }

  function captureAt(index) {
    if (index >= buttons.length) {
      finish();
      return;
    }

    const button = buttons[index];
    const captureRenderedGroup = function () {
      const regionId = button.getAttribute('aria-controls');
      const region = regionId ? document.getElementById(regionId) : null;
      const configuration = button.innerText.trim();
      const text = region ? region.innerText.trim() : '';
      if (configuration && text) {
        groups.push({ configuration, text });
      }
      captureAt(index + 1);
    };

    if (button.getAttribute('aria-expanded') === 'true') {
      captureRenderedGroup();
    } else {
      button.click();
      window.setTimeout(captureRenderedGroup, 750);
    }
  }

  captureAt(0);
  return 'STARTED:' + buttons.length;
}
```

**Action 3 — Wait:** add PAD's **Wait** action for **5 seconds**. This is intentionally outside JavaScript because PAD's browser action does not wait for Promise results.

**Action 4 — Build and validate the upload payload.** Keep its produced variable as `JavaScriptResult`, which the existing Write file / Invoke web service actions use:

```javascript
function ExecuteScript() {
  const marker = document.getElementById('vpi-pad-spec-groups');
  if (!marker) {
    throw new Error('DriveArabia spec capture did not finish');
  }

  const groups = JSON.parse(marker.textContent || '[]');
  const expected = Number(marker.dataset.expectedCount || '0');
  if (!expected || groups.length !== expected) {
    throw new Error(
      'DriveArabia spec capture incomplete: ' + groups.length + '/' + expected
    );
  }

  return JSON.stringify({
    source: 'drivearabia',
    url: window.location.href,
    kind: 'prices',
    html: document.documentElement.outerHTML
  });
}
```

The resulting flow is: enter `DriveArabiaUrl` → Launch Chrome → Start spec capture → Wait 5 seconds → Build payload → Write file → Invoke web service. The validation prevents an incomplete capture from being uploaded. The parser ignores marketing words and requires one unique engine signature: capacity + I/V cylinder layout + hybrid marker + drivetrain.

The app deliberately builds DriveArabia's short route:

```text
https://www.drivearabia.com/carprices/uae/<make>/<model>/<year>/
```

DriveArabia redirects this to its current canonical route. This is safer than encoding canonical aliases in the app; for example, canonical model segments may repeat the make name. The uploaded payload records `window.location.href`, so exact MVR matching uses the final redirected URL.

### 5.3 Anti-detection checklist (the layer PAD wins on — don't undo it)

- **Real browser, real profile** — do not add automation flags, don't disable JS, don't strip fingerprints.
- **Don't scrape the same site on a burst** — 0.5–2 s jitter; a handful of requests per run; space runs out.
- **Keep session cookies** — a single Edge/Chrome session across requests mirrors a human; don't clear cookies mid-flow.
- **Don't blind-retry on a challenge** — if the page shows a Cloudflare/Imperva interstitial, stop the flow and surface the URL (same principle as guide §6.6).
- **Use the source's own search/filters** (year, trim) to keep the URL human-shaped — clone the YallaMotor URL-builder approach.

### 5.4 Trigger options (attended → unattended)

- **Attended (now):** you click **Run** on the PAD desktop flow; it runs in your logged-in session. Zero extra licensing.
- **Unattended (graduate):** a Power Automate **cloud flow** with an HTTP trigger (same SAS-trigger pattern as Flow 3 — see §10 for the security lesson) invokes **Run desktop flow** against a machine group. The app can then call it the way it calls Flow 3 today.

---

## 6. Serverless side — new endpoints on the existing Azure function

Add to `scraper-service/function_app.py` (same app; do not touch `probe_py`).

### 6.1 `POST /api/ingest_html` (auth_level=function — key only in PAD)

- Reads JSON body: `source` (enum `drivearabia|dubizzle`), `url`, `html` (+ optional `searchUrl`).
- Validates: source known, URL present, `len(html) <= ~5_000_000` (reject over-sized bodies → 413).
- Stores HTML to Blob `scrape-inbox/<source>/<uuid>.html`; records metadata `{source, url, searchUrl, status:"Pending", inboxId:<uuid>, createdAt}` in Azure Table `scrapeinboxmeta`.
- Returns `202` + `{inboxId}`. **No extraction here** — this is storage + queueing only.

### 6.2 `GET /api/next_pending` (anonymous + CORS — browser-callable)

- Returns the oldest `Pending` inbox item as `{inboxId, source, url, searchUrl}` (metadata only). The browser then fetches the HTML itself (optionally the same endpoint can return `html` for a single `inboxId`, capped size).
- CORS headers identical to `probe_py` (`Access-Control-Allow-Origin: *` + OPTIONS preflight).

### 6.3 Dependencies & publish

- `requirements.txt`: add `azure-storage-blob` (+ `azure-data-tables` if using Table). Oryx remote build handles the rest.
- Publish: `func azure functionapp publish vpi-probe-py-20260805 --python`.
- Verify from the portal / curl: POST a small fixture body → 202; GET `next_pending` → returns it.

---

## 7. App-side integration

### 7.1 New module — `src/lib/multiSourceScraper.ts`

Keep it parallel to `azureYallaMotorScraper.ts`:

- **`processScrapeInbox()`** — implemented orchestrator: drain up to 25 `next_pending` items → load HTML → parse DriveArabia reference-price rows and selected-trim specs → derive make/model from the captured URL → match exact make/model/year/trim values among the admin's loaded MVR records → update each match with `transport:'pad'` → mark the item `Complete`.
- **`transport` provenance:** the value written is **`'pad'`** — a new third value alongside `'azure'` and `'flow3'`, so the frontend/admin can show exactly which path produced a row (the same observable the live side-by-side proof relies on).
- **Error handling:** a valid capture with no exact MVR match remains `Pending` and stops the drain, allowing the request to be created before retrying. Unsupported sources, invalid markup, or write failures become `Error` and keep their raw HTML for diagnosis; the processor never guesses a record association.
- **Acknowledgement transport:** `inbox_status` sends JSON text with `Content-Type: text/plain;charset=UTF-8` intentionally. This is a CORS-safelisted request and avoids Azure's platform handler returning a headerless `204` to the JSON POST preflight. The function body parser is content-type agnostic.

### 7.2 Source-aware extraction (keep the shared shape)

- Add per-source parser entry points in `src/parsers/` — e.g. `driveArabiaJsonLd.ts`, `dubizzleJsonLd.ts` — each returning the **same `DetailSpecs`** shape (see `types.ts`). `parseDetailJsonLd` stays YallaMotor-specific.
- Dispatch on `source` in `multiSourceScraper.ts`; the downstream `normalizeToDataverse` + mappers + option-set maps are **shared and unchanged** (including the Category case-sensitivity fix from 2026-08-07).
- Cylinders: on YallaMotor they live only in the HTML spec grid (JSON-LD has none). DriveArabia/Dubizzle may differ — the guide's discovery method (§8) decides whether a per-source `extractCylinders` HTML scraper is needed.

### 7.3 Per-source URL builders

`src/lib/driveArabiaUrl.ts` implements `buildDriveArabiaModelYearUrl({make, model, year})`. The Missing Vehicle Request modal copies that route for the attended PAD input; DriveArabia redirects it to the canonical model-year page, and PAD records the final `window.location.href` as provenance. A future `src/lib/dubizzleUrl.ts` should follow the same single-builder rule once its real page shape is captured.

### 7.4 Env vars

- Reuse `VITE_AZURE_FUNCTION_URL` for `next_pending`.
- The ingest **function key** is **PAD-side only** — stored in the PAD flow, never in `.env.local`/bundle/commit. (Browser never calls `ingest_html`.)

---

## 8. Extraction — the discovery method (unknowns are resolved this way)

DriveArabia's model landing and per-model-year HTML shapes are captured and fixture-pinned. Current per-year pages contain useful schema.org `Product`/`Vehicle` JSON-LD for one selected/default `vehicleConfiguration`, while other engine groups are dynamically mounted accordion bodies. The §5.2 PAD marker preserves those rendered groups; `src/parsers/driveArabia.ts` combines safe model-level JSON-LD fields with one uniquely matched engine group and uses serialized/bounded visible content for price rows. Because the price table contains multiple trims, specs are never copied across an ambiguous engine signature. Dubizzle remains uncaptured. For every new page shape, follow the same discovery method instead of guessing selectors:

1. **Capture real HTML fixtures** — run the PAD flow once per source, save the raw `outerHTML` into `tests/fixtures/` (`drivearabia-<model>-detail.html`, `dubizzle-<model>-detail.html`) + one search page each.
2. **Inspect for structured data** — grep for `application/ld+json` (schema.org `Car` / `Product` / `ItemList`). If absent, fall back to the rendered spec-grid HTML (the pattern already used for YallaMotor cylinders).
3. **Extend the parsers** — add the source-aware entry points (§7.2) mapping the discovered keys onto the existing `DetailSpecs` labels (body/fuel/transmission/drive/engine/doors/mileage/regionalSpecs/price).
4. **Add unit tests against the fixtures** — the fixture rule: new markup → save fixture + test case. Runs in `npm run test:run` with the rest of `src/parsers`.
5. **Live check** — a real PAD run → row lands with `transport:'pad'` and every field correct, incl. Category.

**Field targets (reuse the mapped integers already verified):**

| Field | Label example | Dataverse int (boundary: `normalizeToDataverse`) |
|---|---|---|
| Body Type | `SUV / Crossover` | 57 |
| Fuel Type | `Petrol` | 1 |
| Drive Type | `RWD` | 2 |
| Category | `NON-GCC` | 2 (case-insensitive `mapCategory` — 2026-08-07 fix) |
| Cylinders | `6` | 4 (source-dependent HTML extraction) |
| Doors | `4` | 4 |
| Engine Size | `2972` | 2972 |
| Mileage | `130161` | 130161 |

---

## 9. Dataverse write-back & provenance

Reuse the **existing** write path (`src/lib/missingVehicleApi.ts` → `updateMissingVehicleScrapeResult`):

- `vpi_scrapestatus` = `Scraped`
- `vpi_scraped_minprice` / `vpi_scraped_maxprice` from search page
- `vpi_scraped_sources` = the DriveArabia/Dubizzle listing URL(s)
- `vpi_scraped_listings` = `{..., transport: "pad", source: "drivearabia"|"dubizzle"}` JSON
- `vpi_category` = `categoryValue` from `normalizeToDataverse` (the label→integer boundary guards the 2026-08-03 round-trip bug and the 2026-08-07 case-sensitivity bug)

No new MVR columns required for the attended-first rollout. The queue lives outside MVR (Blob inbox or the Dataverse queue table per §3.3).

---

## 10. Security

- **Function key on `ingest_html`** — the browser never calls it; only PAD does. The key lives in the PAD flow, not in committed source.
- **The `VITE_FLOW3_URL` lesson (2026-08-05):** never commit live trigger keys; a client-invoked key is still visible in the shipped bundle — keep live values in the gitignored `.env.local` / build environment, and **rotate to invalidate** any leaked copy. Same rule for the PAD HTTP-trigger when it graduates to unattended.
- **Residential IP = the user's home IP.** PAD runs on your machine → every scrape comes from your IP. Respect source terms + rate limits; pace (§5.3); don't run crawls.
- **Inbox hygiene:** Blob inbox is transient — TTL-clean or purge on `Complete`/`Error`.

---

## 11. Deployment

```
1. Function: add ingest_html + next_pending → requirements + publish (func azure functionapp publish)
2. Verify endpoints (curl POST fixture → 202; GET next_pending → returns item)
3. App: multiSourceScraper.ts + parsers + fixtures + tests → npm run test:run
4. PAD: build the per-source flow (attended) → test a single listing
5. Publish portal: npm run publish (env: VITE_AZURE_FUNCTION_URL unchanged)
6. Live acceptance: PAD run → row lands with transport:'pad'
```

Rollback: stop the PAD flows; the app is unaffected — YallaMotor path is untouched end-to-end.

---

## 12. Testing & verification

| Check | Result expected |
|---|---|
| `npm run typecheck` | clean |
| `npm run test:run` (parsers + lib) | all pass incl. new per-source fixtures + existing 40 |
| Function smoke (curl) | `ingest_html` 202 · `next_pending` returns item · CORS preflight OK |
| **Live acceptance (the gate)** | Attended PAD run for DriveArabia AND Dubizzle → MVR row with `transport:'pad'`, correct body/fuel/drive/engine/doors/mileage/Category, `scraped_sources` = real source URL |
| YallaMotor regression | existing Azure/Flow 3 scrapes still land (`transport:'azure'`/`'flow3'`) |

---

## 13. Rollout checklist (gates — mirror the scraper-service README phases)

1. [x] **Inbox relay built** — `ingest_html` + `next_pending` (+ `inbox_status`) deployed + verified live (2026-08-11 smoke test 5/5) — see CHANGELOG entry
2. [x] **PAD-DriveArabia flow** (attended) captures real landing and per-model-year HTML fixtures (2026-08-11/12)
3. [x] **DriveArabia price path** — parser + app processor + live Dataverse price row + automatic `Complete`/Blob purge verified (2026-08-12)
4. [x] **DriveArabia enrichment live gate** — fresh Valuation-created Camry 2024 request completed through PAD/inbox processing with prices, mapped specifications, and the dedicated Horsepower write (2026-08-13)
5. [x] **DriveArabia multi-trim live gate** — revised six-action PAD flow captured all three Camry engine groups; Limited Hybrid received its own Hybrid/CVT/208 HP specifications rather than SE petrol specs (2026-08-17)
6. [x] **Dynamic DriveArabia navigation live gate** — Honda Accord `2.4 DX/LX` 2013 completed through `%DriveArabiaUrl%` → PAD/Azure capture → **Process PAD Inbox** → all required details and prices persisted in Dataverse (2026-08-18)
7. [ ] **PAD-Dubizzle flow** captures a real Dubizzle HTML fixture (Imperva confirms pass)
8. [ ] **Dubizzle parser** — fixture + unit tests + live row (`transport:'pad'`)
9. [x] **Frontend/admin** — `Process PAD Inbox` action added; parsed scrape details surface `transport`
10. [ ] **Keep YallaMotor untouched** — re-verify `azure`/`flow3` after each deploy
11. [ ] **Graduate to unattended** — only after both sources run reliably attended for weeks (licensing + machine group + HTTP-trigger cloud flow)

---

## 14. Risks & limitations

- **Selector/markup brittleness** — per-source extraction depends on the site's current DOM/JSON-LD; the fixture rule + tests are the safety net.
- **Browser/fingerprint escalation** — a site can tighten its anti-bot over time; PAD's real-browser advantage can shrink, so pace + volume discipline matters (§5.3).
- **Licensing** — attended is cheap; **unattended** adds per-user plan + unattended add-on + an always-on machine. Cost decision deferred until proven.
- **One machine** — PAD scales by machine, not horizontally; fine for low-volume valuations, not for crawls.
- **Residential-IP responsibility** — your home IP does the scraping; keep volume human.
- **No seats** — out of scope for both sources.
- **First-listing depth only** — search + one detail, same as today.

---

## 15. Docs & memory auto-update

- `docs/CHANGELOG.md` — dated entry (created 2026-08-07).
- `memory/learned-conventions.md` — multi-source transport discipline (PAD = real browser on residential IP; IP reputation is the decisive anti-bot layer; keep extraction out of PAD).
- `CLAUDE.md` — add this guide to the Documentation section; update Project Structure when the new modules land.

---

*Guide drafted 2026-08-07 as the decision record + build plan. Fixture-dependent sections (§8) are filled via the discovery method once the first PAD captures land.*
