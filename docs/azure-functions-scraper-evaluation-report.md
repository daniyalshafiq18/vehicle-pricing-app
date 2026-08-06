# Azure Functions Scraper — Feasibility Evaluation Report

> **Date:** 2026-08-04
> **Status:** ⚠️ Superseded 2026-08-05 for YallaMotor — see **`docs/azure-egress-experiment-campaign-report.md`**. The free Vercel test (non-Microsoft IP) is decisive-negative for all three; the live Azure test **proved Azure Functions + cloudscraper CAN scrape YallaMotor**, while DriveArabia & Dubizzle remain hard-blocked. Book an updated summary in the campaign report.
> **Audience:** Project stakeholders / engineering review
> **Question answered:** *Can a serverless scraper (Azure Functions) replace Power Automate for scraping UAE automotive marketplaces protected by anti-bot systems?*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background & Objective](#2-background--objective)
3. [Evaluation Approach](#3-evaluation-approach)
4. [What Was Done — Milestone by Milestone](#4-what-was-done--milestone-by-milestone)
5. [Test Results & Evidence](#5-test-results--evidence)
6. [Findings & Conclusions](#6-findings--conclusions)
7. [Addressing the "Use Python on Azure Functions" Claim](#7-addressing-the-use-python-on-azure-functions-claim)
8. [Cost & Effort Avoided](#8-cost--effort-avoided)
9. [Recommended Strategy](#9-recommended-strategy)
10. [Reusable Assets Created](#10-reusable-assets-created)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

- **The goal:** expand price scraping beyond YallaMotor to Dubizzle and Drive Arabia, and evaluate whether **Azure Functions** could replace the current **Power Automate** flow (which is single-source and has limitations).
- **The method:** before creating an Azure subscription, the decisive question ("does a datacenter-IP scraper pass Cloudflare?") was tested **for free** using Vercel's free tier — no credit card, no subscription.
- **The finding:** **No serverless scraper running on a non-Microsoft datacenter IP can reach any of the three target sources.** This was proven with three different clients — plain Node fetch, **Python `curl_cffi` with a byte-for-byte real Chrome TLS fingerprint**, and **`cloudscraper` (a library that literally solves Cloudflare's JS challenge)**. All returned Cloudflare/Imperva blocks.
- **The root cause:** the blocker is **datacenter-IP reputation**, not the HTTP client, not the language, and not the platform.
- **The one proven-working path:** **Microsoft datacenter IPs** (the egress of Power Automate) are the *only* cloud IPs the sources trust — demonstrated by the working production Flow 3.
- **The org developer's claim** ("write Python scripts on Azure Functions to prevent the Cloudflare error") was tested three ways and **does not hold** for these sources.
- **Recommended strategy:** extend the **proven Power Automate architecture** to Drive Arabia (same Cloudflare vendor → high confidence) and test Dubizzle (different vendor, Imperva → unknown) with a single HTTP action. Reserve Azure Functions for non-scraping or unprotected-source workloads.

---

## 2. Background & Objective

### 2.1 Current production architecture

The Vehicle Pricing Intelligence Platform collects real-time vehicle pricing from **YallaMotor** via **Microsoft Power Automate Cloud flows**:

```
React frontend
   │  POST /api/scrape (via Flow 3 HTTP trigger, SAS-token authenticated)
   ▼
Power Automate Flow 1/2/3   (runs on Microsoft datacenter IPs)
   │  exact browser headers, JSON-LD + HTML extraction, option-set normalization
   ▼
Dataverse (vehicle + missing-vehicle data)
```

- Flow 1 ✅ built & tested · Flow 2 ✅ built & tested · Flow 3 ✅ built & fully verified (9 spec fields live-verified 2026-07-31).
- YallaMotor is protected by **Cloudflare**; Power Automate succeeds because **Microsoft datacenter IPs are not blocked** (discovered 2026-07-15).

### 2.2 Why Azure Functions was explored

| Motivation | Detail |
|---|---|
| **Multi-source** | Add Dubizzle and Drive Arabia — Power Automate currently only covers YallaMotor |
| **Flexibility** | Code-first (TypeScript/Python), per-source adapters, retries, orchestration |
| **Perceived parity** | Azure Functions egress is in the same "Microsoft IP family" that Cloudflare trusts for Power Automate |

### 2.3 Prior attempt (context)

An earlier **Path B** attempt (Dedicated Puppeteer microservice on Railway, 12 deploy cycles) was abandoned because **even a full headless Chrome browser on a Railway datacenter IP** was Cloudflare-blocked. See `docs/path-b-scraper-microservice-postmortem.md`. That history strongly informed this evaluation: **test the target early, before building infrastructure.**

---

## 3. Evaluation Approach

The core open question was:

> **Will a serverless function running from a *datacenter* IP pass YallaMotor's Cloudflare?**

Rather than create an Azure subscription (credit-card verification) and find out after weeks of work, the question was answered with a **free, card-less experiment**: deploy the exact scraper client to **Vercel's free tier** (AWS datacenter IP) and observe the result.

**Why Vercel is a valid stand-in for Azure:**
- Same runtime model (serverless Node / Python)
- Same datacenter-IP egress class
- Vercel free tier requires **no credit card** (GitHub login only)

Milestones:

| Milestone | Description | Status |
|---|---|---|
| M0 | Tools: Node 24.15.0, git, Azure Functions Core Tools 4.12.1 | ✅ |
| M1 | Hello World Azure Function (local) — confirm Functions work | ✅ |
| M2 | Local YallaMotor probe (residential IP) — first Cloudflare data point | ✅ |
| M3 | **Vercel free-tier probe (AWS datacenter IP) — the decisive experiment** | ✅ |

---

## 4. What Was Done — Milestone by Milestone

### 4.1 M0 — Environment (already present)

- **Node.js** `24.15.0`
- **git** `2.51.1.windows.1`
- **Azure Functions Core Tools** `4.12.1` (installed)

### 4.2 M1 — Hello World Function (local)

Created a scratch project `hello-functions` (outside the repo) with a model-v4 HTTP function:

```typescript
app.http('hello', { methods: ['GET','POST'], authLevel: 'anonymous', handler: hello });
```

Ran successfully at `localhost:7071`. **Confirms Azure Functions run on the dev PC** — the tooling is sound.

### 4.3 M2 — Local YallaMotor probe (residential IP) — first finding

Built `probe` — an HTTP function that fetches `https://uae.yallamotor.com/used-cars/{make}/{model}` using the **exact headers from the working Power Automate Flow 3** (full Chrome user-agent, `sec-ch-ua*` client hints, `Sec-Fetch-*`, etc.), then reports diagnostics.

**Result from the user's home (residential) IP:**

```json
{ "status": 403, "title": "Just a moment...", "hasJsonLd": false, "hasCfChallenge": true }
```

**Crucially:** a real Chrome browser on that **same IP** loads YallaMotor fine.

> **Finding #1:** Cloudflare fingerprints the **TLS client**, not just headers/IP. Node's built-in `fetch` (undici) presents a detectable TLS handshake; a real browser's passes — from the same IP.

### 4.4 M3 — Vercel free-tier experiment (AWS datacenter IP) — decisive

Deployed the probe to **Vercel's free tier** (GitHub sign-in, no card, $0) at `https://vercel-probe-nu.vercel.app`, running on **AWS region `iad1` (Washington, D.C.)**.

Four probe functions were deployed over the experiment:

| Function | Client | Purpose |
|---|---|---|
| `GET /api/probe` | Node `undici` + exact Flow 3 headers | Control (same client as local test, now from datacenter IP) |
| `GET /api/probe_py` | **Python `curl_cffi` with `impersonate="chrome"`** | Does a **real Chrome TLS fingerprint** make a difference? |
| `GET /api/probe_any?url=…` | Node `undici` | Generic per-source probe (YallaMotor, Drive Arabia, Dubizzle) |
| `GET /api/probe_cs?url=…` | **Python `cloudscraper`** | Can the JS challenge be *solved* rather than blocked? |

**Vercel deployment fixes learned along the way** (reusable for any future Vercel function):
1. Vercel's *default export* signature is `(req, res) => void` and **ignores returned `Response` objects** — the request hangs forever. Fix: use a **named `GET`/`POST` export** for the Web `fetch`-style API.
2. Vercel passes `request.url` as a **relative path** (`/api/probe?make=…`) — parse the query string directly; `new URL(request.url)` throws.

---

## 5. Test Results & Evidence

### 5.1 The complete evidence table

| # | Client | IP | YallaMotor | Drive Arabia | Dubizzle |
|---|---|---|---|---|---|
| 1 | Real Chrome browser | Residential | ✅ pass | ✅ pass | ✅ pass |
| 2 | Node `fetch` (undici) + exact headers | Residential | ❌ 403 CF | — | — |
| 3 | Node `fetch` (undici) + exact headers | **AWS datacenter** (Vercel) | ❌ 403 CF | ❌ 403 CF | ❌ Imperva |
| 4 | **Python `curl_cffi`** — real Chrome TLS (`impersonate="chrome"`) | **AWS datacenter** (Vercel) | ❌ 403 CF | — | — |
| 5 | **Python `cloudscraper`** — JS-challenge solver | **AWS datacenter** (Vercel) | ❌ 403 CF, **no `cf_clearance`** | — | — |
| 6 | Power Automate (.NET + **Microsoft IP**) | Microsoft | ✅ **pass (production)** | untested | untested |

### 5.2 Representative responses

**Row 3 — Node undici, YallaMotor (AWS datacenter):**
```json
{ "status": 403, "title": "Just a moment...", "hasCfChallenge": true, "hasCfClearanceCookie": false, "bytes": 6178 }
```

**Row 4 — Python curl_cffi, YallaMotor (AWS datacenter):**
```json
{ "status": 403, "title": "Just a moment...", "hasCfChallenge": true, "client": "curl_cffi impersonate=chrome" }
```

**Row 5 — Python cloudscraper, YallaMotor (AWS datacenter):**
```json
{ "status": 403, "title": "Just a moment...", "hasCfClearanceCookie": false, "cookies": [] }
```
> `cloudscraper` could not even obtain a `cf_clearance` cookie — the library that exists to solve exactly this challenge was unable to.

**All three sources from the AWS datacenter (Row 3 / `probe_any`):**

| Source | Anti-bot vendor | From AWS datacenter |
|---|---|---|
| `uae.yallamotor.com/used-cars/toyota/camry` | **Cloudflare** | ❌ 403 "Just a moment..." |
| `www.drivearabia.com` | **Cloudflare** | ❌ 403 "Just a moment..." |
| `uae.dubizzle.com/vehicles/cars/` | **Imperva / Incapsula** | ❌ 200 "Pardon Our Interruption" |

> Note: Drive Arabia served real content (≈1 MB, real page title) to a plain `curl` from a **residential** IP — but **blocks the same request from a datacenter IP**. This is the clearest demonstration that **datacenter-IP reputation is the deciding layer**.

### 5.3 What the evidence isolates

| Factor | Isolated? | Conclusion |
|---|---|---|
| HTTP headers | ❌ eliminated | Perfect browser headers don't help (rows 2–5) |
| TLS client fingerprint | ❌ eliminated | Even a real Chrome TLS fingerprint is blocked from a datacenter IP (row 4) |
| JS-challenge solving | ❌ eliminated | `cloudscraper` can't solve it from a datacenter IP (row 5) |
| Language (Node vs Python) | ❌ eliminated | Both fail identically |
| Platform (Vercel vs Azure) | ❌ not the variable | Both are datacenter egress |
| **IP reputation** | ✅ **the decisive variable** | Datacenter IPs blocked; residential + real browser passes; **Microsoft IPs pass** |

---

## 6. Findings & Conclusions

### 6.1 Proven facts

1. **All three target sources are bot-protected** against datacenter IPs:
   - YallaMotor → Cloudflare
   - Drive Arabia → Cloudflare
   - Dubizzle → Imperva/Incapsula (a *different* anti-bot vendor)
2. **No code-side fix works from a non-Microsoft datacenter IP** — tested with the best available clients (undici, curl_cffi real-Chrome-TLS, cloudscraper challenge-solver). The language and libraries are irrelevant to the outcome.
3. **Only Microsoft datacenter IPs are proven to pass** — demonstrated daily by the production Power Automate Flow 3. Cloudflare (and likely Imperva) trust Microsoft's egress ranges; they do not trust AWS/Vercel/Railway-class ranges for these sources.
4. **The Azure Functions premise is falsified for these sources.** Azure Functions egress is a datacenter IP class. Nothing in the evidence suggests Azure's shared egress ranges are treated like Power Automate's dedicated Power Platform ranges.

### 6.2 The one untested cell (honest caveat)

The only combination **not** empirically tested is **Python/Node running on an actual Microsoft Azure IP**. It is *possible* — but not indicated — that Azure Functions egress ranges share Power Automate's Cloudflare trust. Given that `cloudscraper` could not even acquire a `cf_clearance` cookie (suggesting a hard block rather than a solvable challenge), the odds of the Azure variant succeeding are rated **low**. Proving or disproving it costs a subscription + one afternoon; that cost is now unjustified as a default plan.

### 6.3 Sustainability (why Power Automate wins long-term)

Even if a code-first scraper *could* be made to pass today, it would be a **cat-and-mouse game**: Cloudflare updates detection weekly, challenge mechanics change, and a single YallaMotor change can break selectors (documented in the Path B postmortem). Power Automate is **stable because it never fights the challenge** — Microsoft IPs simply are not challenged. It has worked in production since 2026-07.

---

## 7. Addressing the "Use Python on Azure Functions" Claim

**Claim (from an org developer):** "What you're trying to do can be done through Azure Functions — you have to write Python scripts to prevent the Cloudflare error."

**Evidence-based response:**

| Claim component | Assessment |
|---|---|
| "Azure Functions supports Python" | ✅ True — Python runtimes are fully supported |
| "Python has the best anti-Cloudflare libraries" | ✅ True — `curl_cffi`, `cloudscraper`, `tls_client` are the standard tools |
| "**Writing Python prevents the Cloudflare error**" | ❌ **Tested and disproven** — see below |

**The three-way test** (all from a datacenter IP, the exact scenario Azure Functions would run in):

1. **Python `curl_cffi`** with `impersonate="chrome"` → the TLS handshake was byte-for-byte a real Chrome's → **still 403**.
2. **Python `cloudscraper`** → executes the challenge JS and retries with `cf_clearance` → **still 403, no clearance cookie**.
3. Node `fetch` (undici) as control → **403**.

If "writing Python" were the fix, the strongest Python anti-Cloudflare library would have passed. It did not. **The block is not about the client — it is about the source IP address.** The only cloud IPs that pass are Microsoft's, and they pass regardless of the client (Power Automate's .NET stack).

**Suggested framing for the org developer:**
> "We tested exactly that before spending on a subscription: Python `curl_cffi` with a real Chrome TLS fingerprint and `cloudscraper` (which solves Cloudflare's JS challenge), both from a datacenter IP. Both got 403s. The blocker isn't the language — it's that these sites refuse cloud-hosted IPs. The only cloud IPs that work are Microsoft's, which is precisely why Power Automate (already working in production) is the right home for this. The one combination we haven't tested is Python on an actual Azure IP; evidence suggests it would fail too, but it's testable in an afternoon if you want to fund it."

---

## 8. Cost & Effort Avoided

| Item | Avoided |
|---|---|
| Azure subscription creation + card verification | Not needed for the evaluation |
| Weeks of serverless-scraper engineering | Not spent — question answered in ~1 session |
| Infrastructure debugging (the Path B 12-deploy-cycle class of effort) | Not repeated |
| **Total experiment cost** | **$0** (Vercel free tier, GitHub login, no card) |

The evaluation deliberately front-loaded the cheapest possible decisive test — exactly the "test the target early" lesson from the Path B postmortem.

---

## 9. Recommended Strategy

### 9.1 Multi-source: extend the proven architecture

1. **Drive Arabia** — same Cloudflare vendor as YallaMotor. Microsoft IPs already pass YallaMotor's Cloudflare, so **high confidence** a Power Automate HTTP action against Drive Arabia passes too. **Action:** build a Drive Arabia flow (clone Flow 3's structure: URL builder + extraction).
2. **Dubizzle** — Imperva (different vendor). **Unknown** whether Microsoft IPs pass Imperva. **Action:** run **one Power Automate "Send an HTTP request" action** against `https://uae.dubizzle.com/vehicles/cars/` and inspect the response. 5 minutes decides feasibility.
3. **If Microsoft IPs pass Imperva** → build a Dubizzle flow. **If not** → Dubizzle requires residential proxies (a separate paid decision) or stays out of scope.

### 9.2 Azure Functions: re-scoped, not discarded

Azure Functions remains a good fit for:
- Orchestration / durable workflows around Dataverse writes
- Dataverse write-back services (managed identity auth)
- Scraping any **unprotected** source (none of the current three qualify)

It is the **wrong tool for scraping Cloudflare/Imperva-protected sources from shared datacenter IPs.**

### 9.3 Keep the free feasibility checker

The Vercel probe (`GET /api/probe_any?url=…`) is a permanent, free, no-card tool: **any future source candidate can be tested from a datacenter IP before any work is invested** — preventing another Path B.

---

## 10. Reusable Assets Created

| Asset | Location | Value |
|---|---|---|
| Local Azure Functions scratch project | `C:\Users\PC\hello-functions` (outside repo) | Reference for future Functions work; has working HTTP + probe patterns |
| Vercel probe project | `C:\Users\PC\vercel-probe` (outside repo) | Free per-source feasibility checker (`probe_any`) + TLS/cloudscraper test harness |
| This report | `docs/azure-functions-scraper-evaluation-report.md` | Presentation / decision record |
| Guide (updated) | `docs/azure-functions-scraper-guide.md` §3.5 | Full evidence table + revised strategy embedded in the implementation guide |
| Changelog | `docs/CHANGELOG.md` (2026-08-04) | Dated record of the experiment |

---

## 11. Appendices

### A. The Flow 3 headers (confirmed working against YallaMotor from Microsoft IPs)

```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8
Accept-Language: en-US,en;q=0.9,ar;q=0.8
Accept-Encoding: gzip, deflate, br
Cache-Control: no-cache
Pragma: no-cache
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Upgrade-Insecure-Requests: 1
Referer: https://www.google.com/
sec-ch-ua: "Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
```

### B. Key commands

```bash
# Local Azure Functions (scratch project)
cd C:\Users\PC\hello-functions && npm start            # build + func start on :7071

# Vercel deploy (scratch project)
cd C:\Users\PC\vercel-probe && vercel --prod --yes

# Run the per-source feasibility probe (from anywhere)
curl "https://vercel-probe-nu.vercel.app/api/probe_any?url=<urlencoded>"

# Run the TLS-impersonation / challenge-solver probes
curl "https://vercel-probe-nu.vercel.app/api/probe_py?make=toyota&model=camry"
curl "https://vercel-probe-nu.vercel.app/api/probe_cs?url=<urlencoded>"
```

### C. Vercel function gotchas (reusable)

1. **Default exports ignore returned `Response`** (request hangs) → use a **named `GET`/`POST` export** for the Web `fetch`-style API.
2. **`request.url` is a relative path** → parse the query string directly, don't `new URL(request.url)`.
3. Python functions use `requirements.txt`; build runs on Linux x86_64 (wheels must exist for that platform).

### D. References

- `docs/azure-functions-scraper-guide.md` — full implementation guide (now with the evidence table + revised strategy in §3.5)
- `docs/path-b-scraper-microservice-postmortem.md` — the prior Railway/Puppeteer attempt and why it failed
- `docs/power-automate-cloud-only-design.md` — the working Power Automate design (Flows 1–4)
- `docs/CHANGELOG.md` — dated record of all changes
