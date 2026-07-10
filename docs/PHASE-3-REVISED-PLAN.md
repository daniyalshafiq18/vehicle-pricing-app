# Phase 3 Revised Plan — Vehicle Pricing Intelligence Platform

> **Date:** 2026-07-09
> **Status:** Planning Complete — Ready for Implementation
> **Previous Plan:** `docs/PHASE-3-PLAN.md` (original, superseded by this revision)
> **Key Change:** Simplified flow, real-time scraping replaces mock, user price suggestions merged into missing vehicle flow

---

## 1. Business Goal

Create the largest and most accurate UAE vehicle valuation database through a combination of:

- **Real-time web scraping** (YallaMotor, Dubizzle, Drive Arabia)
- **User-submitted price intelligence** (crowd-sourced market data)
- **Admin validation** (review before data enters master)
- **Email notification** (user gets notified when their vehicle is added)

---

## 2. The Complete User Flow (Revised)

```
User visits site
    │
    ▼
Step 1 — Personal Info (name, email, phone, city, country)
    │
    ▼
Step 2 — Vehicle Search
    │
    ├── Vehicle EXISTS in database → Show valuation result
    │   └── Option: "Suggest Market Price" if user disagrees (Price Suggestion feature)
    │
    └── Vehicle NOT in database
        │
        ▼
Step 3 — Missing Vehicle Request
        │  (User fills: Cylinders, Fuel Type, Transmission, Drive Type, Mileage)
        │
        ▼
        User clicks "Submit Request" ─────► MVR created in Dataverse (instant, < 1s)
        │
        ▼
        ┌─── REAL-TIME SCRAPER ACTIVATES ───┐
        │                                    │
        │  1. YallaMotor (headless browser)  │
        │  2. Dubizzle (headless browser)    │
        │  3. Drive Arabia (headless browser)│
        │                                    │
        │  Parallel execution: 5-15 seconds   │
        │                                    │
        └───────────┬────────────────────────┘
                    │
                    ▼
        Scraped results shown to user:
        ├── Min / Max price estimate
        ├── Per-site listing breakdown
        ├── Direct source links
        └── "Suggest Your Own Price" form
                    │
                    ▼
        User can submit correction:
        ├── Their own min/max price
        ├── Source URL (where they saw the price)
        └── Optional comment
                    │
                    ▼
        Success state shown to user (scraper results + their correction saved)
                    │
                    ▼
        [LATER — when admin approves]
        Email sent: "Your requested vehicle is now available!
                     Check its valuation at {link}."
```

---

## 3. Admin Flow

```
Admin logs into /admin/missing-vehicles
    │
    ▼
Table shows all MVRs with:
├── Vehicle details (Make, Model, Year, Spec, Body Type)
├── Requested By (name, email)
├── Scraped Price (min/max from scraper)
├── User Suggested Price (min/max from user correction, if any)
├── Source URLs (from scraper + user)
├── Status (Pending / Under Review / Approved / Rejected)
├── Submitted Date
└── Action → StatusSelect dropdown + View Detail
    │
    ▼
Admin opens detail modal:
┌──────────────────────────────────────────────────┐
│  Missing Vehicle Detail                          │
│                                                  │
│  Toyota Camry 2025 LE                            │
│  Requested By: ahmed@email.com                   │
│                                                  │
│  ┌── Scraped Data ──────────────────────┐        │
│  │  Min: AED 88,000                     │        │
│  │  Max: AED 105,000                    │        │
│  │  8 listings from YallaMotor/Dubizzle/         │
│  │  Drive Arabia (clickable links)       │        │
│  └──────────────────────────────────────┘        │
│                                                  │
│  ┌── User Suggested Price ──────────────┐        │
│  │  Min: AED 92,000                     │        │
│  │  Max: AED 110,000                    │        │
│  │  Source: dubizzle.com/listing-123     │        │
│  └──────────────────────────────────────┘        │
│                                                  │
│  Admin Decision:                                 │
│  Final Min: [____92,000____] ← pre-filled       │
│  Final Max: [____110,000___] ← pre-filled       │
│                                                  │
│  [ Approve & Push to Master Data ]               │
│  [ Reject with Note ]                             │
│  [ Mark Under Review ]                              │
└──────────────────────────────────────────────────┘
    │
    ▼
Admin approves → approveAndCreateVehicle() runs:
├── Step 1: Create Vehicle Data record in vpi_vehicledatas
│   (Make, Model, Year, Spec, Body Type, Cylinders,
│    Powertrain, Transmission, Drive Type, Min/Max Price)
├── Step 2: Update MVR status to "Approved"
├── Step 3: Link MVR to new Vehicle via vpi_MissingVehicle lookup
│
▼
Email sent to user:
"Your requested vehicle (Toyota Camry 2025 LE) is now available.
Check its valuation at {link}."
```

---

## 4. Price Suggestions for Existing Vehicles (Separate Feature)

This is the existing feature that's already built and working:

```
User searches → Vehicle EXISTS in database
    │
    ▼
Valuation result shown
    │
    ▼
User clicks "Suggest Market Price" (if they disagree with valuation)
    │
    ▼
Dialog: Min Price, Max Price, Source URL, Comment
    │
    ▼
Submitted to vpi_pricesuggestionses table
    │
    ▼
Admin reviews at /admin/price-suggestions
    └── Can approve → updates master vehicle pricing
    └── Can reject → stays in queue
    └── Can edit prices → auto-sets status to "Edit & Approve"
```

This feature is **not affected** by the revised plan — it remains as-is.

---

## 5. Scraping Timing Decision — Live Results vs Email

This was a key discussion point. Two approaches were evaluated:

### Approach A: Async Scrape + Email (REJECTED)

```
User submits request → "We'll email you the results"
                     → Background scraper runs (minutes)
                     → Email sent to user with scraped results
```

**Problem:** User submits a request and gets nothing back immediately. They wait minutes/hours for an email. Poor UX.

### Approach B: Live Real-Time Scrape (SELECTED)

```
User submits request → Loading spinner (5-15 seconds)
    "Searching YallaMotor..." → ✓
    "Searching Dubizzle..."   → ✓
    "Searching Drive Arabia..." → ✓
                     → Results appear directly in browser
                     → User can see listings + prices + source links immediately
                     → User can suggest own price right away
```

**Why this was chosen:**
- 5-15 seconds is acceptable for a user to wait with a progress animation
- User sees results immediately — no waiting for email
- User can correct prices + add source URLs in the same session
- Better engagement and trust (user sees the data sources)

### When Email IS Still Needed

Email notification is **not eliminated entirely** — it's deferred to the **admin approval step**:

```
Admin approves MVR → Vehicle pushed to master data
                   → Email SENT to user:
                     "Your requested Toyota Camry 2025 LE is now available!
                      Check its valuation at {link}."
```

This email is a **separate concern** — implemented as a Power Automate Flow triggered on MVR status change to "Approved". Not part of the frontend build.

---

## 6. Dataverse Schema Changes

### Current MVR Fields (already exist)

| Field | Purpose |
|---|---|
| `vpi_make` | Make |
| `vpi_model` | Model |
| `vpi_trim` | Spec/Trim |
| `vpi_modelyear` | Year |
| `vpi_bodytype` | Body Type |
| `vpi_cylinders` | Cylinders |
| `vpi_fueltype` | Fuel Type |
| `vpi_transmissiontype` | Transmission |
| `vpi_drivetype` | Drive Type |
| `vpi_Contact` | Contact lookup |
| `vpi_status` | Status |
| `vpi_minmilage` / `vpi_maxmilage` | Mileage range |
| `vpi_minprice` / `vpi_maxprice` | User-suggested price |

### New MVR Fields Needed (in Dataverse)

| Field | Type | Purpose |
|---|---|---|
| `vpi_scraped_minprice` | Currency | Scraper's estimated minimum — locked after creation |
| `vpi_scraped_maxprice` | Currency | Scraper's estimated maximum — locked after creation |
| `vpi_scraped_avgprice` | Currency | Average price across all scraped listings |
| `vpi_scraped_listings` | Multiple Lines | Raw JSON array of scraped listings |
| `vpi_scraped_sources` | Multiple Lines | Source site names (e.g. "YallaMotor, Dubizzle") |
| `vpi_scraped_at` | DateTime | When scraper completed |
| `vpi_user_sourceurl` | URL | User's listing URL when submitting correction |
| `vpi_user_comment` | Multiple Lines | User's comment on their suggested price |

### New Table — Scrape Job Queue (optional, for async fallback)

| Field | Type | Purpose |
|---|---|---|
| `vpi_scrapejobid` | GUID | Primary Key |
| `vpi_mvr_lookup` | Lookup → MVR | Links to the MVR |
| `vpi_make` / `vpi_model` / `vpi_year` | Text / Number | Vehicle details |
| `vpi_source` | Choice | Which source to scrape (or "ALL") |
| `vpi_status` | Choice | Queued / Running / Complete / Failed |
| `vpi_result_json` | Multiple Lines | Scraped result as JSON |
| `vpi_attempts` | Whole Number | Retry count |
| `vpi_queued_on` / `vpi_completed_on` | DateTime | Timing |

---

## 7. Scraping Architecture — Three Evaluated Approaches

### Path A: Power Pages Proxy Only (C#)

```
React App → POST /_api/scrape-proxy → C# HttpWebRequest → Source Sites
```

**Build time:** 3-4 days
**Gets real data?** ❌ No — YallaMotor and Dubizzle are SPAs that render via JavaScript.
C# HttpWebRequest only gets server-rendered HTML (empty shell).
**Deployment:** None needed
**Verdict: NOT RECOMMENDED** — will likely return zero listings

---

### Path B: Dedicated Scraping Microservice ✅ RECOMMENDED

```
React App ──→ POST /api/scrape ──→ Node.js + Puppeteer ──→ YallaMotor
                                          │                    → Dubizzle
                                          │                    → Drive Arabia
                                      ← Response: {listings[], prices}
```

**Build time:** 5-7 days (first working version in **3 days**)
**Gets real data?** ✅ Yes — full headless browser renders all JS
**Deployment:** $5-15/mo (Railway, Render, or DigitalOcean)
**Verdict: RECOMMENDED**

---

### Path C: Power Pages + Azure Function Hybrid

```
React App → POST /_api/scrape-proxy → Power Pages (C#) → Azure Function (Puppeteer) → Sources
```

**Build time:** 6-10 days
**Gets real data?** ✅ Yes
**Deployment:** Serverless (Azure Functions, ~$0-5/mo)
**Verdict:** Over-engineered. CORS is easily solvable — the extra layer adds cost, complexity, and cold-start latency without benefit.

---

### Decision: Path B — Dedicated Scraping Microservice

#### Architecture

```
scraper-service/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             → Express server, POST /api/scrape
│   ├── types.ts             → Shared types + IScraperProvider interface
│   ├── aggregator.ts        → Combine + dedup + compute min/max/avg
│   ├── providers/
│   │   ├── yallaMotorProvider.ts
│   │   ├── dubizzleProvider.ts
│   │   └── driveArabiaProvider.ts
│   └── utils.ts
├── Dockerfile
└── README.md
```

#### API Contract

```typescript
// Request
interface ScrapeRequest {
  make: string;
  model: string;
  year: number;
  spec: string;
  bodyType?: string;
  cylinders?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
}

// Response
interface ScrapeResult {
  estimatedMinPrice: number;
  estimatedMaxPrice: number;
  averagePrice: number;
  currency: string;                 // "AED"
  listings: ScrapedListing[];
  sourcesScraped: number;           // How many sites returned data
  scrapedAt: string;                // ISO timestamp
}

interface ScrapedListing {
  title: string;
  price: number;
  mileage: number;
  year: number;
  transmission: string;
  fuelType: string;
  bodyType: string;
  source: string;                   // "YallaMotor", "Dubizzle"
  sourceUrl: string;                // Direct listing link
}
```

#### Fallback Strategy

If scraper service is unreachable or returns error:
1. Show message: "Scraping service temporarily unavailable. We'll review your request manually."
2. Still create MVR record in Dataverse (without prices)
3. Queue MVR for background scrape job
4. Admin can still add vehicle manually

---

## 8. Capabilities & Division of Work

This section defines what the AI (Claude) can do vs what requires you.

### ✅ What Claude Can Do (Code)

| Capability | Details |
|---|---|
| **Write all code** | Full scraper microservice, frontend changes, type/config updates — complete, production-ready code |
| **Define architecture** | Provider interfaces, data flow, API contracts, deployment scripts |
| **Write Dockerfile + deploy config** | Container setup for Railway/Render/any Docker host |
| **Write documentation** | All docs, README, setup guides, this plan document |
| **Debug code issues** | Fix compilation errors, type mismatches, logic bugs |
| **Write test scripts** | Unit tests for providers, aggregator, API endpoint |

### ❌ What Requires You

| Task | Why Claude Can't Do It | Fallback / How-To |
|---|---|---|
| **Create Dataverse columns** (`vpi_scraped_minprice`, etc.) | Column creation is UI work in Power Platform (make.powerpages.com). No API access. | I'll give you exact column names and types (e.g. "Add `vpi_scraped_minprice` as Currency field"). Takes 5 minutes. |
| **Deploy scraper service** | I don't have access to Railway, Render, Azure, or any hosting platform | I'll write the full `Dockerfile` and a step-by-step deploy guide. You create a free account, connect the repo, click "Deploy". |
| **Test against real YallaMotor/Dubizzle** | I can't browse live sites from here — anti-bot, IP blocks, no browser | I'll write the providers with well-known selectors. You run it, tell me if listings come back. If blocked, I adjust selectors or add stealth plugin. |
| **Handle anti-bot blocks** | Puppeteer may get blocked by captchas or JS challenges | I can add: stealth plugin, rotating user agents, random delays, residential proxy support (BrightData). You tell me the error, I fix. |
| **Create Power Automate Flow for email** | Email notification is configured in Power Automate UI | I'll document the exact trigger, condition, and action steps. You click-configure in 10 minutes. |
| **DNS / CORS configuration** | I can't modify your domain's DNS or CORS headers | I'll give you exact settings. You apply them in Railway/Render dashboard or Power Pages config. |
| **Purchase / configure hosting** | I don't have payment methods | I recommend cheapest option: Railway ($5/mo basic plan). You sign up and upgrade. |

### What to Do When Something Goes Wrong

| Problem | What You Do | What I Do |
|---|---|---|
| Scraper returns empty/zero listings | Run it, show me the HTML response or error | I fix selectors or add fallback logic |
| CORS error in browser | Check browser console, paste the error message | I fix CORS config on the service |
| Deploy fails on Railway | Paste the build log | I fix the Dockerfile or build config |
| Dataverse API returns 400 | Paste the request body and error response | I fix field names or data formatting |
| Puppeteer gets blocked | Run the provider, paste the error/output | I add stealth measures or proxy config |

### Communication Rule

Whenever you hit something I can't do (Dataverse columns, deploy, test against real site, email flow), just:

1. Tell me what you're trying to do
2. Paste any error messages or unexpected results
3. I'll respond with exact steps you need to take

This way we keep moving forward without either of us getting blocked.

---

## 9. Implementation Phases

### Phase 3A — Scraper Service (Days 1-3)

| Day | Task | Deliverable |
|---|---|---|
| 1 | Scaffold Express + Puppeteer + IScraperProvider interface | Working endpoint |
| 1-2 | Build YallaMotor provider | 1 source working |
| 2 | Build Dubizzle provider | 2 sources working |
| 2 | Build Drive Arabia provider | 3 sources working |
| 3 | Build aggregator (dedup, min/max/avg) | Reliable aggregation |

### Phase 3B — Frontend Integration (Days 4-5)

| Day | Task | Deliverable |
|---|---|---|
| 4 | Rewrite `yallaMotorScraper.ts` — replace mock with real HTTP call | Real data flows |
| 4 | Add scraper progress indicators in Step3Result | "Searching YallaMotor..." |
| 4 | Add fallback handling | Resilient to failures |
| 5 | Update dataverseConfig/types/api — add scraped price fields | Schema aligned |
| 5 | Update missingVehicleApi — POST/GET scraped fields separately from user fields | Both sets saved |

### Phase 3C — Admin Enhancements (Days 5-6)

| Day | Task | Deliverable |
|---|---|---|
| 5 | Admin modal: Scraped Price + User Suggested Price side-by-side | Admin sees both |
| 5 | Scraped listings list with clickable source links | Admin can verify |
| 6 | Approve flow: admin picks which prices to use | Admin chooses final prices |

### Phase 3D — Deployment (Day 7)

| Day | Task | Deliverable |
|---|---|---|
| 7 | Deploy scraper service to Railway / Render | Production server |
| 7 | Update .env.example + setup docs | Documentation |
| 7 | Update CHANGELOG.md | Complete |

### Future: Email Notification

After admin approves: Power Automate Flow triggered on status = "Approved" sends email to user's contact email. Not part of initial implementation.

---

## 10. Files That Stay Unchanged

| File | Why |
|---|---|
| `AdminPriceSuggestionsPage.tsx` | Handles existing-vehicle price suggestions — separate concern |
| `usePriceSuggestions.ts` / `priceSuggestionApi.ts` | Already working |
| `SplashScreen.tsx` / `App.tsx` | Already working |
| `Step2VehicleSelection.tsx` / `Step1PersonalInfo.tsx` | Unchanged |
| `AdminQueriesPage.tsx` / `AdminDashboard.tsx` | Unchanged |

## 11. Files That Need Changes

| File | Change Required |
|---|---|
| `src/lib/yallaMotorScraper.ts` | **Rewrite** — replace mock with HTTP call to scraper service |
| `src/features/valuation/Step3Result.tsx` | **Update** — progress indicators, scraped vs user prices |
| `src/features/admin/AdminMissingVehiclesPage.tsx` | **Update** — side-by-side prices in modal |
| `src/types/missingVehicleRequest.ts` | **Update** — add scraped fields |
| `src/types/datasource.ts` | **Update** — add scraped fields to interface |
| `src/data/dataverseConfig.ts` | **Update** — add scraped price field names |
| `src/data/dataverseDataSource.ts` | **Update** — pass-through scraped fields |
| `src/lib/missingVehicleApi.ts` | **Update** — POST/GET scraped fields |
| `src/repositories/missingVehicleRepository.ts` | **Update** — pass scraped fields |
| `src/hooks/useMissingVehicleRequests.ts` | **Update** — pass scraped fields |
| `.env.example` | **Update** — add `VITE_SCRAPER_API_URL` |
| **NEW: scraper-service/** | **Create** — entire scraping microservice |

---

## 12. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| YallaMotor/Dubizzle block Puppeteer | Medium | High | Rotate user agents, stealth plugin, add delays |
| Sites change HTML structure | High | Medium | Isolate selectors per provider, log parse failures |
| Scraper takes > 15 seconds | Medium | Medium | Set 20s timeout, show per-site progress, fall back gracefully |
| Scraper service goes down | Low | Medium | Show "unavailable" message, MVR still saved, admin can work without it |
| CORS misconfiguration | Low | Medium | Test during Phase 3B, configure headers on service |
| Hosting cost | Low | Low | $5-15/mo for MVP |

---

## 13. Decision Made: Path B — Dedicated Scraping Microservice

After evaluating all three paths:

1. **Path A (Power Pages proxy)** was rejected because C# HttpWebRequest cannot render JavaScript SPAs — it would return empty pages from YallaMotor and Dubizzle
2. **Path C (Hybrid)** was rejected because it adds complexity (two failure points, cold start latency) without real benefit over Path B
3. **Path B (Dedicated Microservice)** chosen because:
   - Full headless browser renders all SPAs
   - Provider pattern makes it easy to add more sources later
   - Fastest working version (3 days for end-to-end)
   - Clean separation of concerns
   - Well-understood technology stack (Node.js + Puppeteer + Express)

**Estimated cost:** $5-15/month for hosting
**Estimated build:** 5-7 days total, first end-to-end working version in 3 days
**Next step:** Build scraper service scaffold + YallaMotor provider