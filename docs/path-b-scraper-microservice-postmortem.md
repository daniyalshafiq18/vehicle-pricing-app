# Path B: Dedicated Puppeteer Scraping Microservice — Postmortem

> **Date:** 2026-07-13
> **Author:** Project Documentation
> **Status:** ❌ Abandoned — blocked by YallaMotor Cloudflare protection
> **Next approach (final):** Power Automate Cloud-only (discovered 2026-07-15 — Microsoft datacenter IPs are NOT blocked by Cloudflare; see `docs/power-automate-cloud-only-design.md`)
> **Previous next approach (overtaken):** Power Automate Desktop (RPA) — initially planned but never needed

---

## Table of Contents

1. [What We Were Trying to Achieve](#1-what-we-were-trying-to-achieve)
2. [Architecture Overview](#2-architecture-overview)
3. [What We Built](#3-what-we-built)
4. [The 12 Deploy Cycles — Docker/Chrome War](#4-the-12-deploy-cycles)
5. [The Actual Failure — Cloudflare](#5-the-actual-failure)
6. [Debugging Effort — `GET /api/debug-html`](#6-debugging-effort)
7. [Anti-Detection Arsenal — Everything We Tried](#7-anti-detection-arsenal)
8. [Why Cloudflare Cannot Be Beaten This Way](#8-why-cloudflare-cannot-be-beaten-this-way)
9. [What We Learned](#9-what-we-learned)
10. [What We'd Keep in a Future Attempt](#10-what-wed-keep)
11. [Conclusion](#11-conclusion)

---

## 1. What We Were Trying to Achieve

### Business Goal

The Vehicle Pricing Intelligence Platform needs **real-time price data** from UAE auto marketplaces (YallaMotor, Dubizzle, Drive Arabia) to show users accurate market valuations for vehicles — especially for vehicles not yet in the master database.

### The Flow We Designed

```
User submits Missing Vehicle Request
           │
           ▼
    ┌─── REAL-TIME SCRAPER ACTIVATES ───┐
    │  1. YallaMotor                     │  ← headless browser
    │  2. Dubizzle (planned)            │
    │  3. Drive Arabia (planned)        │
    │                                    │
    │  Parallel execution: 5-15 seconds   │
    └───────────┬────────────────────────┘
                │
                ▼
    Scraped results shown to user:
    Min/Max price estimate per marketplace
    Individual listings with source links
                │
                ▼
    User can submit correction prices
                │
                ▼
    Both sets of prices saved in Dataverse
```

The key requirements were:
- **Real-time** — results in 5-15 seconds while user waits with a loading spinner
- **Multi-source** — aggregate prices from 3+ marketplaces
- **Resilient** — individual provider failures never block the response
- **Cost-effective** — fit within $5-15/mo hosting budget

### Why Real-Time? Why Not Email?

We explicitly chose live scraping over async email notification because:
- User submits a request → gets nothing back → poor UX
- 5-15 seconds is acceptable with a progress animation
- User can immediately see prices and correct them in the same session
- Better engagement and trust (user sees the data sources)

---

## 2. Architecture Overview

The chosen architecture was evaluated against three options in the Phase 3 Revised Plan:

| Path | Approach | Verdict |
|---|---|---|
| **A** | Power Pages C# Proxy | ❌ Rejected — cannot render JS SPAs |
| **B** ✅ | **Dedicated Puppeteer Microservice** | Selected (this project) |
| **C** | Power Pages + Azure Function Hybrid | ❌ Rejected — over-engineered |

### High-Level Design

```
Frontend (React)              Scraper Service (Node.js)
                                     ┌─────────────┐
  POST /api/scrape  ──────────────►  │  Express     │
  {make, model, year, ...}          │  Server      │
                                     └──────┬──────┘
                                            │
                                     ┌──────▼──────┐
                                     │  Puppeteer  │
                                     │  (Chrome)   │
                                     └──────┬──────┘
                                            │
                            ┌───────────────┼───────────────┐
                            ▼               ▼               ▼
                     ┌────────────┐  ┌────────────┐  ┌────────────┐
                     │YallaMotor  │  │Dubizzle    │  │Drive Arabia│
                     │Provider    │  │Provider    │  │Provider    │
                     │  (built)   │  │ (planned)  │  │ (planned)  │
                     └─────┬──────┘  └────────────┘  └────────────┘
                            │
                     ┌──────▼──────┐
                     │ Aggregator  │
                     │ (dedup,     │
                     │  min/max,   │
                     │  sort)      │
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │  JSON       │
                     │  Response   │
                     └─────────────┘
```

### Key Design Decisions

1. **Express + Puppeteer** — familiar stack, rapid development
2. **Single browser instance** — launched once, reused across requests; auto-relaunched on disconnect
3. **Provider pattern** — `IScraperProvider` interface makes adding new marketplaces a plug-in
4. **Sequential providers, shared page** — shares a single Puppeteer `Page` across all providers to minimize memory (one Chrome process, ~150-250 MB)
5. **Fault isolation** — providers never throw; errors return empty arrays
6. **Resource blocking** — images, stylesheets, fonts, media all blocked during scraping for speed
7. **Randomised delays** — 1-3s between actions to mimic human behaviour
8. **Debug mode** — screenshots + HTML dumps on failure for remote troubleshooting

---

## 3. What We Built

### File Structure

```
scraper-service/
├── package.json              # Express 4, Puppeteer 23, stealth plugin, cheerio, TypeScript 5
├── tsconfig.json             # ES2022, strict mode, CommonJS output
├── Dockerfile                # Single-stage, Google Chrome Stable from official apt repo
├── README.md                 # Full docs: architecture, API contract, Railway deploy guide
├── src/
│   ├── index.ts              # Express server (POST /api/scrape, GET /health, GET /api/debug-html)
│   ├── types.ts              # Shared types + IScraperProvider interface
│   ├── aggregator.ts         # Combine listings, filter bad prices, sort, compute min/max
│   ├── utils.ts              # parsePrice, parseMileage, normaliseUrlSegment, delay, randomInt
│   └── providers/
│       └── yallaMotorProvider.ts   # YallaMotor UAE headless scraper
└── tsconfig.json
```

### API Contract

```typescript
// POST /api/scrape
// Request
{ make: "Toyota", model: "Camry", year: 2025, spec: "LE",
  bodyType?: "Sedan", cylinders?: "4", fuelType?: "Petrol",
  transmissionType?: "Automatic", driveType?: "FWD" }

// Response (success)
{ success: true,
  data: { estimatedMinPrice: 88000, estimatedMaxPrice: 105000,
          currency: "AED", listingsCount: 8,
          listings: [{ title, price, mileage, year, source, sourceUrl, ... }],
          sourcesScraped: 1, scrapedAt: "2026-07-10T12:00:00.000Z" },
  sourcesTried: 1 }

// Response (error)
{ success: false, error: "Missing required fields: make, model, year" }

// GET /health
{ status: "ok", browserConnected: true, uptime: 12345 }
```

### IScraperProvider Interface

```typescript
interface IScraperProvider {
  readonly name: string;       // "YallaMotor"
  readonly enabled: boolean;   // config-driven toggle
  scrape(params: ScrapeRequest): Promise<ScrapedListing[]>;
  // 🚫 Never throws — returns empty array on failure
}
```

### YallaMotor Provider — Scrape Strategy

1. **Build search URL** from make/model (e.g. `https://uae.yallamotor.com/used-cars/toyota/camry`)
2. **Navigate** with `waitUntil: 'networkidle2'` (20s timeout)
3. **Randomised delay** (1-3s) to appear human
4. **Smooth scroll** (600px) to trigger lazy-loaded content
5. **Wait for listing cards** — tries 7 different CSS selectors in order (e.g. `[data-testid="listing-card"]`, `.listing-card`, `.vehicle-card`, etc.)
6. **If no cards found** → fallback to alternative URL (`/used-cars?make=Toyota&model=Camry`)
7. **Scroll to bottom** to load remaining content
8. **Extract listings** via `page.evaluate()` — runs DOM queries inside the browser:
   - Title: 7 selector attempts (h3, h2, `a[title]`, `img[alt]`)
   - Price: 7 selector attempts (data-testid, CSS classes)
   - Mileage: 7 selector attempts
   - Source URL: first `a[href]` on the card
   - Year: regex-matched from title (`\b(19|20)\d{2}\b`)
9. **Return up to 20 listings** (configurable via `MAX_LISTINGS`)

### Aggregator — Post-Processing

- Filters out prices below AED 1,000 and above AED 5,000,000 (parse error guard)
- Sorts by price ascending
- Caps at 50 listings total
- Computes `estimatedMinPrice` / `estimatedMaxPrice` from the clean set

### Dockerfile

Key characteristics of the final Dockerfile:
- **Base image:** `node:22-slim` (not the Puppeteer Docker image — it had ENTRYPOINT conflicts)
- **Chrome source:** Google's official apt repo (`dl.google.com/linux/chrome/deb/`) — NOT Chromium
- **Chrome binary:** `/usr/bin/google-chrome-stable` (explicitly set via `CHROMIUM_PATH`)
- **Puppeteer config:** `PUPPETEER_SKIP_DOWNLOAD=true` (Chrome installed via apt, not bundled)
- **User:** Non-root `scraper` user with home directory (Chrome needs `~/.local`)
- **Port:** 8080 (Railway default)
- **Health check:** HTTP GET `/health` every 30s

### Deployed URL

`https://vehicle-pricing-app-production-f262.up.railway.app`

---

## 4. The 12 Deploy Cycles — Docker/Chrome War

Getting Chrome to run inside a Docker container on Railway took **12 separate deploy cycles**. Each cycle: edit code → commit → push → Railway auto-deploys → check logs → repeat.

| # | Commit | Problem | Fix |
|---|---|---|---|
| 1 | `03c0270` | Initial scaffold | Basic Express + Puppeteer setup |
| 2 | `831d3bd` | Multi-stage build lost Chrome in final stage | Switched to **single-stage** build |
| 3 | `0c6b601` | Debian 13 package names (`libnss3t64`) don't exist on Debian 12 | Changed to Debian 12 (Bookworm) package names without `t64` suffix |
| 4 | `83c25c6` | `npm ci` failed — no `package-lock.json` in builder stage | Added `COPY package-lock.json` to Dockerfile |
| 5 | `e6760e7` | Chromium launch failed — missing shared libs | Added ALL Debian 12 Chromium dependencies explicitly |
| 6 | `41d8e9f` | Chrome binary not found in expected cache dir | Set `PUPPETEER_CACHE_DIR` + copy Chrome binary between stages |
| 7 | `b8ee37d` | Chromium not found | Switched from bundled Chromium to `apt-get install chromium` |
| 8 | `7172476` | ENTRYPOINT conflict with Puppeteer Docker image | Switched to official `ghcr.io/puppeteer/puppeteer` image |
| 9 | `2d90877` | Chrome not found again | Installed **Google Chrome Stable** from official repo instead of Chromium, set `PUPPETEER_SKIP_DOWNLOAD=true` |
| 10 | `8f1bac1` | Port mismatch — Railway expects 8080 | Changed port from 3001 → **8080** |
| 11 | `327f38e` | Chrome crash: `--no-sandbox` + missing home dir | Added `useradd -m`, Chrome flags (`--no-sandbox`, `--disable-dev-shm-usage`), Chrome needs writable `~/.local` |
| 12 | `68f745d` | Cloudflare suspected, needed to confirm | Added **`/api/debug-html`** endpoint to inspect actual page content |

### The Cruel Twist

After cycle 11, **Chrome was finally running inside Docker on Railway**. The health check passed. Puppeteer could launch the browser. Everything *looked* fine.

But when we actually tried to scrape YallaMotor, the service returned **zero listings every time**.

---

## 5. The Actual Failure — Cloudflare

### The Discovery

The `GET /api/debug-html` endpoint (cycle 12) revealed the truth. When Chrome loaded `https://uae.yallamotor.com/used-cars/toyota/camry`, the page content was:

> **"Just a moment... Performing security verification"**

And in the raw HTML:

```html
<!-- Page Title: Just a moment... -->
<!-- Final URL: https://uae.yallamotor.com/cdn-cgi/challenge-platform/... -->
<!-- CF bypassed: false -->
```

**YallaMotor uses Cloudflare's bot detection page** — the JS challenge that checks for browser automation signatures before granting access to the actual page content.

### What Cloudflare Does

Cloudflare's bot detection (specifically the **"I'm Under Attack Mode"** JS challenge) works by:

1. **Serving a challenge page** — a JavaScript "proof of work" that a real browser computes and submits
2. **Checking browser fingerprints** — `navigator.webdriver`, headless Chrome flags, user agent, WebGL, canvas fingerprinting, plugin enumeration, font enumeration
3. **Checking cookie support** — sets `__cf_bm` and `cf_clearance` cookies
4. **Checking TLS handshake** — real browsers have a specific TLS fingerprint
5. **Checking IP reputation** — data centre IPs (Railway) are flagged
6. **Checking request patterns** — automated patterns trigger re-challenge

Even if the JS challenge is computed, headless Chrome's **TLS fingerprint** differs from a real browser, and **data centre IPs** are on Cloudflare's block lists.

---

## 6. Debugging Effort — `GET /api/debug-html`

The `/api/debug-html` endpoint was a dedicated diagnostic endpoint that:

1. Created a **fresh browser page** (not reusing the scraped page)
2. Applied **extra anti-detection** overrides
3. Did **NOT block resources** (Cloudflare needs to load its challenge JS)
4. Set **`Accept-Language`** HTTP headers
5. Navigated with a **45-second timeout** (more than double the normal 20s)
6. **Waited 8 seconds** after page load for the challenge to resolve
7. Dumped: page title, final URL, HTML content (full), body text (first 5000 chars), cookies (checking for CF cookies)

The output was unambiguous:

| Check | Result |
|---|---|
| Page title | `"Just a moment..."` |
| Final URL | `https://uae.yallamotor.com/cdn-cgi/challenge-platform/...` |
| CF cookie present | `false` |
| Body mentions "security verification" | `true` |
| CF bypassed | **`false`** |

---

## 7. Anti-Detection Arsenal — Everything We Tried

Here is the complete list of anti-detection measures we applied. **None worked.**

### Code-Level

| Measure | Implementation | Effect |
|---|---|---|
| **Stealth plugin** | `puppeteer-extra-plugin-stealth` | Evades basic checks, not Cloudflare |
| **`navigator.webdriver` override** | `Object.defineProperty(navigator, 'webdriver', { get: () => false })` | Overridden |
| **`navigator.plugins` override** | `Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] })` | Overridden |
| **`navigator.languages` override** | `Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })` | Overridden |
| **Realistic user agent** | `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36` | Standard |
| **Realistic viewport** | 1440×900 | Standard |
| **`--disable-blink-features=AutomationControlled`** | Chrome launch flag | Removes `navigator.automation` flag |
| **`Accept-Language` header** | `en-US,en;q=0.9` | Set via `setExtraHTTPHeaders` |
| **Randomised delays** | 1-3 seconds between actions | Mimics human pacing |
| **Smooth scrolling** | `window.scrollBy()` with `behavior: 'smooth'` | Triggers lazy loading |
| **Resource blocking OFF for debug** | Cloudflare JS needs to load | Was allowed to load fully |

### Docker-Level

| Measure | Implementation | Effect |
|---|---|---|
| **`--no-sandbox`** | Chrome launch flag | Required for Docker |
| **`--disable-dev-shm-usage`** | Chrome launch flag | Prevents shared memory issues |
| **`--disable-gpu`** | Chrome launch flag | Standard headless |
| **`--disable-extensions`** | Chrome launch flag | Removes extension traces |
| **`--no-first-run`** | Chrome launch flag | Prevents first-run dialogs |
| **`--no-crash-diagnostics`** | Chrome launch flag | Cleaner start |
| **Home directory** | `useradd -m` creates `~/.local` | Chrome needs this |
| **Google Chrome Stable** | Installed from official repo | Latest Chrome, not Chromium |

### What We Did NOT Try (and Why Each Would Likely Fail)

| Approach | Why We Didn't | Likely Outcome |
|---|---|---|
| **Residential proxies (BrightData)** | Cost ($20-50/mo) + configuration complexity | Cloudflare still detects headless TLS fingerprint |
| **`puppeteer-extra-plugin-anonymize-ua`** | Plugin exists but doesn't fix TLS fingerprint | Wouldn't help |
| **Puppeteer in `--headless=new`** | Was added in Chrome 112+; we used it implicitly via latest Chrome | Already have the new headless mode |
| **Puppeteer Stream/WebSocket mode** | Different transport, same Chrome process | Same fingerprint |
| **`undetectable-chromium`** / **`playwright`** | Same underlying Chrome/Chromium engine | Same Cloudflare detection |
| **Using `curl` with cookie reuse** | Not a browser — Cloudflare JS challenge can't execute | Would fail immediately |
| **Selenium with ChromeDriver** | Same Chrome engine, different control protocol | Same fingerprint |

---

## 8. Why Cloudflare Cannot Be Beaten This Way

### The Fundamental Problem

Cloudflare's bot detection is a **multi-layered defense** that checks:

```
Layer 1: JS Challenge │  "compute this proof of work"
Layer 2: TLS Fingerprint │  "does this TLS handshake look like a real Chrome?"
Layer 3: HTTP/2 Fingerprint │  "does this HTTP/2 connection match Chrome's?"
Layer 4: Browser API Checks │  "does navigator, WebGL, canvas, fonts match real Chrome?"
Layer 5: IP Reputation │  "is this IP from a known datacenter?"
Layer 6: Behavioural │  "is this user moving the mouse, scrolling naturally?"
```

A headless browser in a Docker container on Railway fails on **multiple layers simultaneously**:

1. **TLS fingerprint** — Puppeteer's underlying Node.js HTTP stack (even through Chrome) has a subtly different TLS handshake than a real user's Chrome. Cloudflare's `ja3` fingerprinting picks this up.
2. **IP reputation** — Railway's IP ranges are known datacenter IPs, not residential ISPs. Cloudflare's threat intelligence flags them.
3. **No real user behaviour** — no mouse movements, no scrolling patterns, no tab switching. Even with randomised delays, the navigation is visibly automated.
4. **No browser profile** — no cookies, no local storage, no browsing history, no extensions — a clean Chrome profile is itself suspicious.

### Cat-and-Mouse Reality

Even if we somehow bypassed Cloudflare today, the approach would be **fragile**:
- Cloudflare updates detection weekly
- YallaMotor could enable CAPTCHA
- A single code change on YallaMotor could break selectors
- Maintenance burden would be **continuous**, not one-time

---

## 9. What We Learned

### Technical Lessons

| Lesson | Details |
|---|---|
| **Docker + Chrome is tricky** | 12 deploy cycles for a working Chrome in Docker. Every detail matters: Debian version, Google Chrome vs Chromium, sandbox flags, home directory permissions |
| **Cloudflare is a hard blocker** | Not a config issue — it's a fundamental limitation of automated browsers from datacenter IPs |
| **Stealth plugins have limits** | `puppeteer-extra-plugin-stealth` evades basic checks but cannot defeat multi-layered bot detection |
| **Debug endpoints are essential** | The `/api/debug-html` endpoint saved us weeks of guessing. Without it, we'd still be wondering if it was a selector issue |
| **Real Chrome ≠ real user** | Even with the latest Google Chrome Stable, the way it's *controlled* (headless automation) is detectable |

### Process Lessons

| Lesson | Details |
|---|---|
| **Test against the real target early** | We built the provider, aggregator, Docker infrastructure, and deployment *before* confirming YallaMotor was accessible. A quick test in week 1 would have saved 12 deploy cycles |
| **Check website protection before building** | Before writing a web scraper, check `curl -I <url>` for `cf-ray` headers, or try loading in a fresh browser to see if there's a challenge page |
| **Docker debugging is slow** | Every deploy cycle on Railway took ~3-5 minutes. 12 cycles = ~1 hour of just waiting for deploys |
| **Logging wins** | Comprehensive logging in `index.ts` and `yallaMotorProvider.ts` made diagnosing remote issues possible |

---

## 10. What We'd Keep in a Future Attempt

If we revisit automated scraping in the future, these components are **reusable**:

| Component | Reuse Value |
|---|---|
| **`IScraperProvider` interface** | Clean abstraction for any browser-based scraper |
| **`aggregator.ts`** | Pure data processing — no browser dependency, fully reusable |
| **`utils.ts`** | `parsePrice`, `parseMileage`, `normaliseUrlSegment`, `delay`, `randomInt` — all reusable |
| **Provider pattern** | The provider pattern works well; the implementation technology changes |
| **API contract** | `POST /api/scrape` → `ScrapeResult` — service boundary is well-defined |
| **Dockerfile** | Working template for Node.js + Chrome in Docker (for non-Cloudflare targets) |

### What Would NOT Transfer

- **`yallaMotorProvider.ts`** — the selectors, URL construction, and anti-detection are Cloudflare-specific
- **`index.ts` anti-detection code** — the `evaluateOnNewDocument` overrides, stealth plugin, and resource blocking are specific to automated browser evasion

---

## 11. Conclusion

### What We Achieved

✅ **A production-ready scraping microservice** — Express server with health checks, graceful shutdown, auto-relaunching browser, fault isolation, debug mode, comprehensive error handling

✅ **Working Chrome in Docker on Railway** — after 12 deploy cycles, Chrome launches successfully, navigates to URLs, and captures page content

✅ **Dual-URL fallback** — YallaMotor provider tries primary and alternative URLs before giving up

✅ **Rich debug infrastructure** — screenshot + HTML dump on failure, debug HTML endpoint for remote inspection

### What Blocked Us

❌ **YallaMotor Cloudflare protection** — a multi-layered bot detection system that automated browsers from datacenter IPs cannot bypass

### Final Verdict

**Path B (Dedicated Puppeteer Microservice)** was the right architectural choice — a headless browser was necessary for rendering JavaScript SPAs. However, **Cloudflare's bot detection** is an external constraint no amount of code could solve.

The 12 Docker/Chrome deploy cycles, while frustrating, were **not wasted** — they proved the service itself worked. The failure was at the target website, not in our implementation.

### The Pivot

The recommended alternative is **Power Automate Desktop (RPA)**:
- Runs a **real Chrome browser** on a Windows machine
- Cloudflare trusts it because it's the user's genuine installed browser
- Not detected as automation because it controls the browser through UI automation, not the DevTools protocol
- Can be scheduled or triggered to scrape prices periodically
- Results can be pushed to Dataverse via Power Automate HTTP actions

---

## Appendix A: Dockerfile Evolution

```
Cycle 1-2:  Multi-stage build (Chrome lost in final stage ❌)
Cycle 3-4:  Debian 13 package names on Debian 12 ❌
Cycle 5-6:  Missing shared libs + no package-lock.json ❌
Cycle 7:    Chromium from apt (wrong binary location) ❌
Cycle 8:    Puppeteer Docker image (ENTRYPOINT conflict) ❌
Cycle 9:    Google Chrome from official repo + skip download ✅
Cycle 10:   Port 8080 for Railway ✅
Cycle 11:   Non-root user with home dir ✅
Cycle 12:   Debug endpoint (confirmed Cloudflare) ✅
```

## Appendix B: Key Commands

```bash
# Build
cd scraper-service && npm run docker:build

# Deploy to Railway (via git)
git add scraper-service/
git commit -m "message"
git push

# Test health
curl https://vehicle-pricing-app-production-f262.up.railway.app/health

# Test scrape
curl -X POST https://vehicle-pricing-app-production-f262.up.railway.app/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"make":"Toyota","model":"Camry","year":2025,"spec":"LE"}'

# Debug HTML
curl "https://vehicle-pricing-app-production-f262.up.railway.app/api/debug-html?make=toyota&model=camry"
```

## Appendix C: Key Files Referenced

| File | Purpose |
|---|---|
| `docs/PHASE-3-REVISED-PLAN.md` | Full Phase 3 plan with architecture decisions |
| `docs/CHANGELOG.md` | Chronological change log |
| `scraper-service/README.md` | Service documentation |
| `scraper-service/src/index.ts` | Express server + Puppeteer lifecycle |
| `scraper-service/src/providers/yallaMotorProvider.ts` | YallaMotor scraper implementation |
| `scraper-service/src/aggregator.ts` | Listing aggregation |
| `scraper-service/Dockerfile` | Container definition |
| `memory/scraper-service-built.md` | Memory file — current blocker status |
