
# ⚠️ SUPERSEDED — Phase 3 Original Plan

> **⚠️ This document is the ORIGINAL Phase 3 plan. It has been superseded by `docs/PHASE-3-REVISED-PLAN.md` which reflects the actual scraper architecture (Power Automate Cloud-only flows) after Path B (Puppeteer) was abandoned.**
>
> **Date:** 2026-07-02
> **Status:** ❌ Superseded (see revised plan)

---

## Business Goal

Create the largest and most accurate UAE vehicle valuation database.

### Existing Vehicles
Enrich records already in Dataverse — vehicles that exist but are missing values like:
- Min / Avg / Max Price
- Doors / Seats / Cylinders / Engine Size / Horsepower / Body Type

System should **discover missing values** automatically.

### New Vehicles
Vehicle not found in Dataverse but discovered on source websites.
- Example: Dataverse has Toyota Camry 2024 GCC, but Dubizzle now lists Toyota Camry 2025 GCC.
- System should discover it and propose it for addition.

### User-Discovered Vehicles
User searches for a vehicle not in the database:
- Capture request → Save → Queue → Admin review → Admin approval → Add to Dataverse
- This becomes a **crowd-sourced acquisition channel**.

---

## High-Level Architecture

```
External Sources (YallaMotor, Dubizzle, Drive Arabia)
        │
        ▼
  Scraping Engine (IScraperProvider interface)
        │
        ▼
  Staging Dataverse Tables (Vehicle Import Queue)
        │
        ▼
  Admin Review Portal (Approve / Reject / Merge)
        │
        ▼
  Vehicle Data Table (Master Data)
        │
        ▼
  Public Valuation Platform
```

**Cardinal rule:** Never write directly into Vehicle Data table from scraper. Everything must pass through review.

### Why Review Is Mandatory

Source websites are not always accurate. You may encounter:
- Duplicate vehicles
- Incorrect prices
- Wrong specs
- Bad formatting
- Missing values

Without review:
> Bad Data In → Bad Valuation Out → Bad valuation destroys trust.

---

## New Dataverse Tables

### Current Tables (already exist)
| Table | Status |
|---|---|
| `vpi_vehicledatas` | ✅ Existing |
| `contacts` | ✅ Existing |
| `vpi_vehicleinquiries` | ✅ Existing |
| `vpi_missingvehiclerequests` | ✅ Existing (needs alignment with plan) |
| `vpi_pricesuggestions` | ❌ Schema defined, not implemented |

### Table 1: Vehicle Import Queue (`vpi_vehicleimportqueues`)
Store raw scraped vehicles before admin review.

| Field | Type | Notes |
|---|---|---|
| `vpi_vehicleimportqueueid` | Unique Identifier | Primary Key |
| `vpi_source` | Text | Source name (e.g. "YallaMotor", "Dubizzle") |
| `vpi_sourceurl` | URL | Original listing URL |
| `vpi_make` | Text | |
| `vpi_model` | Text | |
| `vpi_year` | Whole Number | |
| `vpi_spec` | Text | Trim / variant |
| `vpi_price` | Currency | Listed price |
| `vpi_bodytype` | Choice | |
| `vpi_doors` | Whole Number | |
| `vpi_seats` | Whole Number | |
| `vpi_enginesize` | Decimal | |
| `vpi_horsepower` | Whole Number | |
| `vpi_cylinders` | Whole Number | |
| `vpi_scrapedjson` | Multiple Lines | Raw scraped data as JSON |
| `vpi_reviewstatus` | Choice | Pending / Approved / Rejected / Merged |

### Table 2: Missing Vehicle Requests (`vpi_missingvehiclerequests`)
Capture vehicles users searched for that don't exist in master data.

| Field | Type | Notes |
|---|---|---|
| `vpi_make` | Text | |
| `vpi_model` | Text | |
| `vpi_year` | Whole Number | |
| `vpi_spec` | Text | |
| `vpi_requestedcount` | Whole Number | Accumulated count of requests |
| `vpi_lastrequestedon` | DateTime | Last time this was requested |
| `vpi_status` | Choice | New / Under Review / Approved / Rejected / Imported |

### Table 3: Price Suggestions (`vpi_pricesuggestions`)
Allow users to improve valuation quality by suggesting market prices.

| Field | Type | Notes |
|---|---|---|
| Vehicle Lookup | Lookup → vpi_vehicledatas | |
| Suggested Min Price | Currency | |
| Suggested Max Price | Currency | |
| Suggested Avg Price | Currency | |
| Comment | Multiple Lines | User's justification |
| Source URL | URL | Link to listing |
| Submitted By | Text | |
| Created On | DateTime | |

---

## User Price Correction System

Users can submit **"Report Incorrect Price"** or **"Suggest Market Price"**.

### Flow
1. User sees valuation → believes it's wrong
2. Clicks "Suggest Market Price"
3. Submits: Min Price, Avg Price, Max Price, Comment, Source URL
4. Admin reviews
5. If approved → updates master vehicle record

This creates a **Human Intelligence Layer** that is more valuable than scraping alone.

---

## Best Data Sources

### Phase 3A — Start with 3 sources only

| Source | Purpose |
|---|---|
| **YallaMotor** | Vehicle specs, variants, generations, new models, pricing indicators |
| **Dubizzle Cars** | Actual market prices — **most important source** |
| **Drive Arabia** | Vehicle specs |

### Future Sources
- CarSwitch
- Cars24
- SellAnyCar
- Dealers

---

## Scraping Strategy

Do **NOT** start with prices. Start with specs — they're easier to verify.

### Phase 3A — Vehicle Discovery
Collect: make, model, year, trim/spec, body type, transmission, fuel type

### Phase 3B — Missing Attribute Completion
Fill: seats, doors, horsepower, cylinders, engine size

### Phase 3C — Price Intelligence
Collect: min, avg, max prices using **aggregation** (never trust a single listing).

**Example:** 20 Toyota Camry listings → Lowest = 88k, Highest = 105k, Average = 96k

---

## Handling 33k Existing Records — Job System

Do not rescrape all 33k at once. Create targeted jobs:

### Job Type 1: Missing Data Scan
Query for records where `Doors IS NULL` OR `Seats IS NULL` OR `Horsepower IS NULL` — only scrape those.

### Job Type 2: Price Refresh
Vehicles with pricing data older than 90 days.

### Job Type 3: New Vehicle Discovery
Search source websites for vehicles not in database.

---

## Admin Portal Features

### Dashboard
Show counts for: Pending Imports, Pending Reviews, Price Suggestions, Missing Vehicle Requests

### Import Review
Show scraped vehicle side-by-side with matched vehicle, highlighting differences. Admin can **Approve**, **Reject**, or **Merge**.

### Missing Vehicle Requests
Show **Most Requested Vehicles** (e.g. BYD Sealion 7 with 41 requests = high demand, import first).

---

## Implementation Phases (Agent-Based)

### Step 1 — Dataverse Tables
- Create all Phase 3 Dataverse tables in the Power Platform
- Generate schema documentation
- Generate TypeScript interfaces
- Generate mapping layer
- Do not modify existing functionality

### Step 2 — Admin Portal Pages
- Build admin pages for: Vehicle Import Queue, Missing Vehicle Requests, Price Suggestions
- Use existing architecture
- Create pages only — no scraping yet

### Step 3 — Scraper Framework
- Create provider-based scraping architecture
- Interface: `IScraperProvider`
- Implement: `YallaMotorProvider`, `DubizzleProvider`, `DriveArabiaProvider`
- Return normalized vehicle objects
- Store results in Vehicle Import Queue
- Never write directly into Vehicle Data

### Step 4 — Approval Workflow
- Create approval workflow
- Approved → updates Vehicle Data
- Rejected → remains in queue with notes
- Merged → updates existing record
- Log all actions

### Step 5 — User Feedback System
- Add "Report Incorrect Price" / "Suggest Market Price" button on valuation result
- Store in Price Suggestions table
- Create admin review workflow
- Do not auto-update Vehicle Data

---

## Long-Term Outcome (6–12 months)

```
Vehicle Data
    + Scraped Intelligence
    + Admin Validation
    + User Corrections
    + Market Pricing Signals
```

This combination creates a **proprietary UAE vehicle intelligence dataset** that supports:
- Vehicle valuation subscriptions
- Broker dashboards
- Dealer analytics
- Insurance pricing assistance
- Market trend reports
- Future AI valuation models

---

## Architectural Rule (Non-Negotiable)

> **Nothing scraped should ever go directly into the Vehicle Data master table. Everything flows through staging, review, approval, and audit.**
