# ⚠️ DEPRECATED — Power Automate Cloud + Desktop Flow Design

> **⚠️ This document is STALE. It predates the discovery that Power Automate Cloud flows (HTTP premium connector) work without Desktop (RPA).**
>
> **Refer to `docs/power-automate-cloud-only-design.md` for the current, tested design.**
>
> **Date:** 2026-07-13 (deprecated as of 2026-07-15)
> **Status:** ❌ Superseded — Cloud-only flows work without Desktop RPA

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Dataverse Schema Updates Needed](#3-dataverse-schema-updates-needed)
4. [Flow A: YallaMotor Accessibility Test](#4-flow-a-yallamotor-accessibility-test)
5. [Flow B: Production Scraping Flow](#5-flow-b-production-scraping-flow)
6. [Desktop Flow: YallaMotor Scraper](#6-desktop-flow-yallamotor-scraper)
7. [Implementation Order](#7-implementation-order)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture Overview

### End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  POWER AUTOMATE CLOUD FLOW (runs in Microsoft cloud)                │
│                                                                     │
│  Trigger: New MVR record created                                    │
│  Action:  Run Power Automate Desktop flow on your machine           │
│  Action:  Write results back to Dataverse                           │
│  Action:  Notify admin (optional)                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ via Microsoft Gateway
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POWER AUTOMATE DESKTOP FLOW (runs on YOUR Windows PC)              │
│                                                                     │
│  1. Launch Chrome (your real installed browser)                     │
│  2. Navigate to YallaMotor                                          │
│  3. Wait for page to load naturally                                 │
│  4. Check for Cloudflare challenge                                  │
│  5. Extract listing data                                            │
│  6. Return results to cloud flow                                    │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DATAVERSE                                                          │
│                                                                     │
│  vpi_missingvehiclerequests (MVR)                                   │
│  ┌─────────────────────────────────────┐                            │
│  │ Make, Model, Year, Trim            │ ← User's search            │
│  │ ScrapeStatus                       │ ← Pending/InProgress/Done  │
│  │ ScrapeResults (JSON)               │ ← Scraped listings         │
│  │ YallaMotorAccessible               │ ← true/false (test)        │
│  │ LastScrapedAt                      │ ← timestamp                │
│  └─────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture Works

| Concern | How It's Solved |
|---|---|
| **Cloudflare** | Real Chrome on your Windows PC — no automation fingerprint |
| **Real-time** | Cloud flow triggers desktop flow on-demand |
| **Your PC must be on** | Yes — but it's the only way to pass Cloudflare |
| **No open ports** | Microsoft Gateway handles secure tunnel — no firewall config |
| **Results available** | Scraped data written directly to Dataverse |

---

## 2. Prerequisites

### What You Need Before Starting

| # | Item | Notes |
|---|---|---|
| 1 | **Power Automate license** | Included with Microsoft 365 Business/Enterprise |
| 2 | **Power Automate Desktop installed** | [Download here](https://powerautomate.microsoft.com/en-us/desktop/) — free |
| 3 | **On-premises data gateway** | [Download here](https://learn.microsoft.com/en-us/data-integration/gateway/service-gateway-install) — connects cloud flow to your PC |
| 4 | **Dataverse environment** | Already set up (your Power Pages environment) |
| 5 | **Chrome browser installed** | Your normal Chrome — the one Cloudflare trusts |
| 6 | **YallaMotor accessible from your PC** | Open `https://uae.yallamotor.com` in Chrome — does it load? |

### Gateway Installation Steps (Step 3)

The gateway is the critical piece — it's how the cloud flow talks to the desktop flow on your PC:

```
1. Download & run the on-premises data gateway
2. Sign in with your Microsoft 365 account
3. Register a new gateway:
   - Name: "VehiclePricingGateway"
   - Region: UAE / closest to you
4. After install, verify it appears in:
   → powerautomate.microsoft.com → Data → Gateways
5. IMPORTANT: Gateway must run on the SAME machine that will run the Chrome scraping
```

Without the gateway, the cloud flow cannot trigger the desktop flow on your machine.

---

## 3. Dataverse Schema Updates Needed

The MVR table needs a few new columns to support scraping. Add these in the Power Pages / Dataverse designer:

### New Columns on `vpi_missingvehiclerequests`

| Display Name | Logical Name | Type | Purpose | Default |
|---|---|---|---|---|
| **Scrape Status** | `vpi_scrapestatus` | Choice (see below) | Current state of the scrape | 1 (Pending) |
| **Scrape Results** | `vpi_scraperesults` | Multiple Lines of Text | JSON array of scraped listings | (blank) |
| **YallaMotor Accessible** | `vpi_yallamotoraccessible` | Yes/No | Test result — is YallaMotor reachable? | No |
| **Last Scraped At** | `vpi_lastscrapedat` | Date & Time | When the last scrape completed | (blank) |
| **Scrape Error** | `vpi_scrapeerror` | Multiple Lines of Text | Error message if scrape failed | (blank) |
| **Scrape Screenshot** | `vpi_scrapescreenshot` | Image | Screenshot of the page (for debugging) | (blank) |

### Scrape Status Choice Options

| Label | Value | Meaning |
|---|---|---|
| Pending | 1 | Waiting to be scraped |
| Testing | 2 | Running accessibility test |
| In Progress | 3 | Scraping in progress |
| Success | 4 | Scrape completed with results |
| Failed | 5 | Scrape failed |
| Unreachable | 6 | YallaMotor is not accessible |

---

## 4. Flow A: YallaMotor Accessibility Test

**Purpose:** Test if YallaMotor is accessible from your Windows machine before building the full scraping flow. This is the **first thing to build** — it confirms the gateway + Chrome combination works.

### Cloud Flow: "MVR - Test YallaMotor Accessibility"

#### Trigger: Manual (for initial testing)

```
Trigger: Manually trigger a flow
  ▼ Inputs:
    - MVR Lookup (optional — link to a test MVR record)
    - Make (text)
    - Model (text)
    - Year (number)
```

#### Step 1: Update MVR → ScrapeStatus = "Testing"

```
Action: Update a row (Dataverse)
  ▼ Table: Missing Vehicle Requests
  ▼ Row ID: (from trigger)
  ▼ Columns:
    - vpi_scrapestatus: 2 (Testing)
```

#### Step 2: Run Desktop Flow

```
Action: Run a flow built with Power Automate Desktop
  ▼ Gateway: VehiclePricingGateway
  ▼ Machine: (your PC)
  ▼ Desktop Flow: "YallaMotor Accessibility Test" (we'll build this next)
  ▼ Input Parameters:
    - TargetURL: "https://uae.yallamotor.com/used-cars/toyota/camry"
    - TimeoutSeconds: 30
```

**This step WAITS for the desktop flow to complete.** The cloud flow pauses until the desktop flow finishes on your PC and returns the results.

#### Step 3: Parse Desktop Flow Output

```
Action: Compose
  ▼ Input: Output from Step 2 (the desktop flow returns a JSON-like text)
```

#### Step 4: Update MVR with Test Results

```
Action: Update a row (Dataverse)
  ▼ Table: Missing Vehicle Requests
  ▼ Row ID: (from trigger)
  ▼ Columns:
    - vpi_yallamotoraccessible: (true/false from desktop flow)
    - vpi_scrapestatus: If accessible → 4 (Success), Else → 6 (Unreachable)
    - vpi_scrapeerror: (any error message)
    - vpi_lastscrapedat: utcNow()
```

#### Step 5: Notify (Optional)

```
Action: Send an email (or notification) with test result
```

### Cloud Flow Editor View (Pseudocode)

```
When a new test is manually triggered
  └→ Update MVR Record (Status = Testing)
  └→ Run Desktop Flow "YallaMotor Accessibility Test"
  │     ├─ Input: TargetURL
  │     └─ Waits for completion
  └→ Compose output
  └→ If output.IsAccessible = true:
  │     └→ Update MVR: Accessible = Yes, Status = Success
  └→ Else:
        └→ Update MVR: Accessible = No, Status = Unreachable, Error = output.ErrorMessage
```

---

## 5. Flow B: Production Scraping Flow

**Purpose:** When a user submits a Missing Vehicle Request, automatically scrape YallaMotor for pricing data.

### Cloud Flow: "MVR - Scrape YallaMotor on Request"

#### Trigger: When MVR Record Is Created

```
Trigger: When a row is added, modified or deleted (Dataverse)
  ▼ Change type: Added
  ▼ Table: Missing Vehicle Requests
  ▼ Scope: Organization
```

#### Step 1: Filter — Only Process New Requests

```
Condition: @equals(triggerOutputs()?['body/vpi_scrapestatus'], null)
  ▼ True: Proceed with scraping
  ▼ False: Terminate (already scraped or updated externally)
```

#### Step 2: Update MVR → ScrapeStatus = "In Progress"

```
Action: Update a row (Dataverse)
  ▼ Table: Missing Vehicle Requests
  ▼ Row ID: triggerOutputs()?['body/vpi_missingvehiclerequestid']
  ▼ Columns:
    - vpi_scrapestatus: 3 (In Progress)
```

#### Step 3: Build YallaMotor Search URL

```
Action: Compose
  ▼ Input: 
    concat(
      'https://uae.yallamotor.com/used-cars/',
      toLower(triggerOutputs()?['body/vpi_make']),
      '/',
      toLower(triggerOutputs()?['body/vpi_model'])
    )
```

#### Step 4: Run Desktop Scraper Flow

```
Action: Run a flow built with Power Automate Desktop
  ▼ Gateway: VehiclePricingGateway
  ▼ Machine: (your PC)
  ▼ Desktop Flow: "YallaMotor Scraper" (the main scraping flow)
  ▼ Input Parameters:
    - TargetURL: (output from Step 3)
    - Make: triggerOutputs()?['body/vpi_make']
    - Model: triggerOutputs()?['body/vpi_model']
    - Year: triggerOutputs()?['body/vpi_modelyear']
    - TimeoutSeconds: 45
```

**Deskptop Flow Returns:**
- `Listings` (JSON array) — title, price, mileage, year, sourceUrl
- `IsAccessible` (boolean) — was the page loaded?
- `PageTitle` (text) — what the page title was
- `ErrorMessage` (text)
- `ListingCount` (number)

#### Step 5: Parse and Save Results

```
Action: Update a row (Dataverse)
  ▼ Table: Missing Vehicle Requests
  ▼ Row ID: (from trigger)
  ▼ Columns:
    - vpi_scrapestatus: 4 (Success) or 5 (Failed)
    - vpi_scraperesults: (JSON array of listings)
    - vpi_yallamotoraccessible: (true/false)
    - vpi_minprice: (calculated min from listings)
    - vpi_maxprice: (calculated max from listings)
    - vpi_scrapeerror: (blank if success, error text if failed)
    - vpi_lastscrapedat: utcNow()
```

**Price Calculation Logic:**
- If listings returned → compute min/max prices from listing prices
- If no listings → keep existing min/max from user input

#### Step 6: Log Completion (Optional)

```
Action: Add a row (Dataverse — Scrape Log table, or just update the MVR record)
```

### Cloud Flow Editor View (Pseudocode)

```
When a row is added to MVR table
  └→ Condition: ScrapeStatus is empty (new record)
  │     └→ True:
  │         └→ Update MVR: Status = In Progress
  │         └→ Compose YallaMotor URL from Make/Model
  │         └→ Run Desktop Flow "YallaMotor Scraper"
  │         │     ├─ Input: URL, Make, Model, Year, Timeout
  │         │     └─ Waits for completion (up to 60s)
  │         └→ Parse returned JSON
  │         └→ Compute min/max prices
  │         └→ Update MVR with results
  └→ False: Do nothing
```

---

## 6. Desktop Flow: YallaMotor Scraper

**Purpose:** The actual RPA flow that runs on your Windows machine, launches real Chrome, and scrapes YallaMotor.

### Flow A: "YallaMotor Accessibility Test"

This is the simpler version — just check if the page loads.

```
Input: TargetURL, TimeoutSeconds (default 30)

1. Launch new Chrome
     → URL: TargetURL
     → Window state: Maximized
     → Clear cache/cookies: Yes
     → Wait for page to load: Yes

2. Wait (5 seconds) — let Cloudflare challenge resolve if present

3. Get page details
     → Get: Page title
     → Get: Page text content (first 1000 chars)
     → Take screenshot → save as "YallaMotor_Test.png"

4. Check if Cloudflare blocked us
     If page title contains "Just a moment" OR
        page text contains "security verification" OR
        page text contains "Checking your browser" OR
        page URL contains "cdn-cgi/challenge-platform"
     Then:
         → IsAccessible = False
         → ErrorMessage = "Cloudflare challenge detected: " + page title
         → ScreenshotPath = (path to screenshot)
     Else:
         → IsAccessible = True
         → ErrorMessage = ""
         → ScreenshotPath = (path to screenshot)

5. Close Chrome

6. Return output:
     {
       "IsAccessible": true/false,
       "PageTitle": "Used Cars for Sale in UAE | YallaMotor",
       "ErrorMessage": "",
       "ScreenshotPath": "C:\\...\\YallaMotor_Test.png",
       "TestedAt": "2026-07-13T10:00:00Z"
     }
```

### Flow B: "YallaMotor Scraper" (Full Version)

```
Input: TargetURL, Make, Model, Year, TimeoutSeconds (default 45)

1. Launch new Chrome
     → URL: TargetURL
     → Window state: Maximized
     → Clear cache/cookies: No (normal browsing)
     → Wait for page to load: Yes (max wait: TimeoutSeconds)

2. Wait (3 seconds) — natural load

3. Check accessibility (same checks as test flow)
     If blocked by Cloudflare:
         → Close Chrome
         → Return: { IsAccessible: false, ErrorMessage: "Cloudflare blocked", Listings: [] }

4. Scroll down slowly (triggers lazy load)
     → Get page height
     → Scroll down 500px
     → Wait (1 second)
     → Repeat until bottom of page or max 10 scrolls

5. Extract listing cards
     → Find all elements matching selectors (try each until one works):
         - "css: .listing-card"
         - "css: [data-testid='listing-card']"
         - "css: .vehicle-card"
         - "css: .car-listing"
         - "css: article"
     → For each card found:
         Extract: Title (text)
         Extract: Price (text → remove "AED", commas → number)
         Extract: Mileage (text → extract numbers)
         Extract: Year (text → regex \b(19|20)\d{2}\b)
         Extract: Link (href attribute)
         → Add to Listings array

5b. Fallback: If NO cards found by CSS selectors
     → Use full page text extraction
     → Search for price patterns (AED \d+[\d,]*)
     → Extract any listing-like patterns from the raw text

6. If no listings found
     → Try alternate URL: concat(TargetURL, "?page=1&per_page=20")
     → Repeat steps 4-5

7. Take screenshot → save as debug artifact

8. Close Chrome

9. Aggregate results
     → ListingCount = length of Listings
     → Compute EstimatedMinPrice = min of all prices
     → Compute EstimatedMaxPrice = max of all prices
     → Filter: remove listings with price < 1000 AED or > 5,000,000 AED

10. Return output:
    {
      "IsAccessible": true,
      "PageTitle": "...",
      "ListingCount": 8,
      "EstimatedMinPrice": 88000,
      "EstimatedMaxPrice": 105000,
      "Listings": [
        { "title": "Toyota Camry 2025 LE", "price": 88000, "mileage": 15000, "year": 2025, "sourceUrl": "..." },
        ...
      ],
      "ErrorMessage": "",
      "ScreenshotPath": "..."
    }
```

### CSS Selectors to Try (for Extraction)

YallaMotor's actual CSS may change over time. The desktop flow should try these in order:

| Priority | Selector | Target |
|---|---|---|
| 1 | `[data-testid="listing-card"]` | Data-testid attribute |
| 2 | `.listing-card` | CSS class |
| 3 | `.vehicle-card` | CSS class |
| 4 | `.car-listing` | CSS class |
| 5 | `.search-result-item` | Common pattern |
| 6 | `article` | HTML5 article tag |
| 7 | `.card` | Generic card class |

**Before building the desktop flow, manually inspect the actual page to confirm selectors:**
1. Open Chrome → DevTools (F12)
2. Navigate to `https://uae.yallamotor.com/used-cars/toyota/camry`
3. Inspect a listing card
4. Note the actual CSS selector
5. Update this document with the confirmed selector

---

## 7. Implementation Order

Do these steps **in this exact order**. Each step validates the next.

### Step 1: Manual Test (5 minutes)
```
□ Open Chrome → go to https://uae.yallamotor.com/used-cars/toyota/camry
□ Does it load? Or Cloudflare challenge?
□ Take a screenshot manually
□ Record the actual CSS selectors of listing cards
```

### Step 2: Install Prerequisites (30 minutes)
```
□ Install Power Automate Desktop
□ Install on-premises data gateway
□ Configure gateway (same machine as Chrome)
□ Verify gateway appears in Power Automate portal
```

### Step 3: Add Dataverse Columns (10 minutes)
```
□ Open Power Pages / Dataverse → MVR table
□ Add the new columns from Section 3
□ Publish changes
```

### Step 4: Build Desktop Test Flow (20 minutes)
```
□ Open Power Automate Desktop
□ Create new flow: "YallaMotor Accessibility Test"
□ Follow Section 6 Flow A
□ Run it manually from Power Automate Desktop to verify
```

### Step 5: Build Cloud Test Flow (15 minutes)
```
□ Go to https://make.powerautomate.com
□ Create new cloud flow: "MVR - Test YallaMotor Accessibility"
□ Follow Section 4
□ Run the test flow manually
```

### Step 6: Build Desktop Scraper Flow (45 minutes)
```
□ Create new flow: "YallaMotor Scraper"
□ Follow Section 6 Flow B
□ Run it manually with sample data to verify extraction
```

### Step 7: Build Cloud Scraper Flow (20 minutes)
```
□ Create new cloud flow: "MVR - Scrape YallaMotor on Request"
□ Follow Section 5
□ Test end-to-end by creating a test MVR record
```

---

## 8. Troubleshooting

### "Desktop flow not found" when running cloud flow

| Cause | Fix |
|---|---|
| Desktop flow name doesn't match | Check the exact name in Power Automate Desktop |
| Gateway not running | Open gateway app → verify it's connected |
| Machine not selected in cloud flow | Go to cloud flow → edit → select your machine |

### Cloudflare still blocks even from desktop flow

| Cause | Fix |
|---|---|
| Chrome launched with automation flags | Don't use "Launch new Chrome" with special flags — use default |
| Chrome profile is clean/fresh | Configure the action to use your existing Chrome profile (cookies, history) |
| Too fast — no human delay | Add 2-3 second waits between navigation and extraction |

### No listings extracted even though page loaded

| Cause | Fix |
|---|---|
| CSS selectors are wrong | Manually inspect the page → update selectors |
| Content is dynamically loaded | After page load, wait 3-5 seconds, scroll slowly |
| Page structure has changed | YallaMotor may have updated their HTML |

### Gateway connection fails

```powershell
# Test gateway connectivity from your machine
# Open "On-premises data gateway" app
# → Status should show "Connected"
# → If not, check Windows firewall (port 443 outbound)
```

---

## Appendix: Desktop Flow Action Cheat Sheet

| Task | Power Automate Desktop Action | Location |
|---|---|---|
| Launch Chrome | `Launch new Chrome` | Browser automation → Launch |
| Navigate to URL | `Go to web page` | Browser → Web page |
| Wait | `Wait` | System → Scripting |
| Get page title | `Get details of web page` | Browser → Web page |
| Get page text | `Get details of web page` | Browser → Web page |
| Take screenshot | `Take screenshot` | Browser → Web page |
| Scroll page | `Scroll webpage` | Browser → Web page |
| Find elements | `Extract data from web page` | Browser → Web extraction |
| Extract element text | `Get details of element on web page` | Browser → Web page |
| Run JavaScript | `Run JavaScript on web page` | Browser → Advanced |
| Close browser | `Close web browser` | Browser → Web page |
| Parse JSON | `Parse JSON` | Data → JSON |
| Return value | `Set output variable` | Flow → Output |
| If/Else | `If` | Conditions |
| Loop | `Loop` | Loops |

---

> **Next Step:** Let me know when you're ready to start Step 1 (manual test) — I'll guide you through it. Or if you want, I can walk through the Power Automate Desktop interface step-by-step when building the flows.
