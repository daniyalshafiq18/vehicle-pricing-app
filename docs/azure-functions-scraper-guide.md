# Azure Functions Multi-Source Scraper — Implementation Guide (From Scratch)

> **Goal:** Replace the single-source Power Automate scraping setup (Flow 1/2/3 → YallaMotor) with a code-first **Azure Functions** scraper that supports **many sources** (YallaMotor, Drive Arabia, Dubizzle, …), with the same response contract the frontend already expects.
> **Guiding principle:** Power Automate keeps running until Azure Functions is proven. Every step is reversible, and the swap is a one-line URL change in the frontend.
> **Status:** ⏳ Guide — not yet implemented.

---

## Table of Contents

1. [Target Architecture](#1-target-architecture)
2. [Pre-requisites (Phase 0)](#2-pre-requisites-phase-0)
3. [Feasibility Probe — the make-or-break test (Phase 1)](#3-feasibility-probe--the-make-or-break-test-phase-1)
4. [Project Scaffold & Structure (Phase 2)](#4-project-scaffold--structure-phase-2)
5. [Core Types & Adapter Pattern (Phase 3)](#5-core-types--adapter-pattern-phase-3)
6. [Anti-Bot Layer (Phase 4)](#6-anti-bot-layer-phase-4)
7. [YallaMotor Adapter — Porting Flow 3 (Phase 5)](#7-yallamotor-adapter--porting-flow-3-phase-5)
8. [HTTP Trigger Functions (Phase 6)](#8-http-trigger-functions-phase-6)
9. [Dataverse Write-Back (Phase 7)](#9-dataverse-write-back-phase-7)
10. [Durable Orchestration (Phase 8, optional)](#10-durable-orchestration-phase-8-optional)
11. [Deployment & CI/CD (Phase 9)](#11-deployment--cicd-phase-9)
12. [Monitoring & Operations (Phase 10)](#12-monitoring--operations-phase-10)
13. [Testing Strategy (Phase 11)](#13-testing-strategy-phase-11)
14. [Migration & Rollout (Phase 12)](#14-migration--rollout-phase-12)
15. [Cost Summary](#15-cost-summary)
16. [Security Notes](#16-security-notes)
17. [Appendix A — Complete Command Reference](#appendix-a--complete-command-reference)
18. [Appendix B — Troubleshooting](#appendix-b--troubleshooting)

---

## 1. Target Architecture

```
Frontend (React)
  │  POST /api/scrape  {make, model, trim, year}
  ▼
┌──────────────────────────────────────────────────────────────┐
│                Azure Functions (Node 20 + TS)                 │
│                                                              │
│   /api/scrape (HTTP trigger) ─────────────────────────────┐  │
│       │  (drop-in replacement for Flow 3 URL)             │  │
│       ▼                                                   │  │
│   Durable Orchestrator (optional)                         │  │
│       │  fan-out across sources                            │  │
│       ▼                                                   │  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │  │
│   │ YallaMotor   │   │ Drive Arabia│   │ Dubizzle    │     │  │
│   │ adapter      │   │ adapter     │   │ adapter     │     │  │
│   └──────┬───────┘   └──────┬──────┘   └──────┬──────┘     │  │
│          ▼                  ▼                 ▼             │  │
│   ┌───────────────────────────────────────────────┐        │  │
│   │          Anti-bot layer (per-source)           │        │  │
│   │  headers · cookies · retry/backoff · proxy     │        │  │
│   └───────────────────────────────────────────────┘        │  │
│          │                                                  │  │
│          ▼                                                  │  │
│   Normalization boundary → ONE schema → Dataverse option    │  │
│   sets (reuses src/data/dataverseOptionSets.ts maps)        │  │
│                                                              │  │
│   Write-back: Dataverse Web API (managed identity / app reg) │◀┘
└──────────────────────────────────────────────────────────────┘
```

**What stays the same for the frontend:** the response contract. The frontend calls `scrapeViaFlow3()` (`src/lib/yallaMotorHttpScraper.ts`) and expects `Flow3ScrapeResult` JSON. Our `/api/scrape` function returns **exactly that shape** (including the `count < 0` sentinel for unreachable), so the swap is changing one URL constant.

**What moves:** the logic in Flow 1/2/3 expressions → TypeScript in your git repo, versioned and testable.

---

## 2. Pre-requisites (Phase 0)

### 2.1 Azure subscription
- A Microsoft/Azure account with an active subscription (the **Free tier** works — you get $200 credit for 30 days; a Consumption plan Function at your volume is ~free forever after).
- Verify with: `az account show` after login.

### 2.2 Local machine (Windows — your environment)
| Tool | Version | Why | Verify |
|---|---|---|---|
| **Node.js** | 22 LTS (recommended) or 24.x — both supported | Functions Node worker + your TS tooling | `node -v` |
| **npm** | bundled with Node | package management | `npm -v` |
| **Azure Functions Core Tools** | 4.x | Local runtime + publish | `func --version` |
| **Azure CLI** | latest | Create resources, deploy | `az --version` |
| **Git** | any | You already have it | `git --version` |
| **Azurite** (optional) | latest | Local Storage emulator — needed only for queue/durable functions locally | `azurite --version` |
| **VS Code** (optional) | latest | Functions extension for debug/deploy | — |

Install commands (PowerShell):
```powershell
# Azure CLI (winget or manual from aka.ms/installazurecliwindows)
winget install Microsoft.AzureCLI

# Azure Functions Core Tools v4
npm install -g azure-functions-core-tools@4

# Azurite (only if doing Phase 8 queues/durables)
npm install -g azurite
```

> ⚠️ **Supported versions are Node 22.x and 24.x** (per the official Functions Node.js reference, updated 2026 — Node 22 is the recommended LTS). If your global Node is older than 22, either upgrade or use `nvm` to switch per-project. Check with `node -v`. At deploy time set the app's Node version explicitly (`WEBSITE_NODE_DEFAULT_VERSION=~22` on Windows, `linuxFxVersion "node|22"` on Linux, or `--runtime-version 22` in the create command).

### 2.3 Accounts & access you'll need
| Access | Needed for | Notes |
|---|---|---|
| **Azure Portal** | Create Function App, app registration | `portal.azure.com` |
| **Power Platform admin center** | Add the app user / managed identity to the environment + assign security role | `admin.powerplatform.microsoft.com` |
| **Dataverse Web API** | Write-back; needs your environment URL | `https://<org>.crm.dynamics.com` (find in Power Platform admin → Environment URL) |
| **make.powerautomate.com** | Keep the working flows as fallback + reference | Already have it |
| **YallaMotor** | Target site (already scraping successfully) | — |

### 2.4 Pre-flight checklist (run before touching anything)
```powershell
node -v          # expect v22.x or v24.x
npm -v
func --version   # expect 4.x
az --version
az login         # opens browser; confirm it succeeds
az account list --output table   # confirm your subscription shows
```

> **Decision gate:** if all five checks pass, continue. If `func` is missing, install Core Tools. If `az login` fails, you don't have subscription access yet — stop here and resolve that first.

### 2.5 Existing artifacts you'll reuse (read these first)
| Artifact | Location | What you take from it |
|---|---|---|
| **Flow 3 working headers** | `docs/power-automate-cloud-only-design.md` §"Step 4 (inside Try): HTTP Request" | The exact header set that passes Cloudflare — copy verbatim into `headers.ts` |
| **Flow3ScrapeResult** contract | `src/lib/yallaMotorHttpScraper.ts` | The JSON shape `/api/scrape` must return |
| **Search URL construction** | `src/lib/yallaMotorHttpScraper.ts` (`slugify` + URL template) | Reuse the same URL logic so results match |
| **Extraction patterns** | `docs/flow3-deep-scrape-debugging-retrospective.md` | The 9 spec-field extraction expressions → port to code |
| **Option-set maps** | `src/data/dataverseOptionSets.ts` | The label→value maps for writing to Dataverse |
| **Path B lessons** | `docs/path-b-scraper-microservice-postmortem.md` | Don't repeat: test the target first, keep debug endpoints, never assume selectors |

---

## 3. Feasibility Probe — the make-or-break test (Phase 1)

**The #1 lesson from Path B postmortem:** *"Test against the real target early."* Before building anything, deploy **one** HTTP function that does a single `fetch()` to YallaMotor with the exact Flow 3 headers and reports what comes back. This one afternoon answers the entire Cloudflare question.

### 3.1 Scaffold the probe app
```powershell
# In the repo root
func init scraper-service --worker-runtime node --language typescript --model V4
cd scraper-service
npm install
npm install @azure/functions@4
```

### 3.2 The probe function
`scraper-service/src/functions/probe.ts`:
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BROWSER_HEADERS } from '../shared/headers';   // built in Phase 4 — see §6.1

export async function probe(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const make = (request.query.get('make') ?? 'toyota').trim();
  const model = (request.query.get('model') ?? 'camry').trim();
  const url = `https://uae.yallamotor.com/used-cars/${make}/${model}`;

  let body: Record<string, unknown>;
  try {
    const res = await fetch(url, { method: 'GET', headers: BROWSER_HEADERS });
    const html = await res.text();
    body = {
      status: res.status,
      finalUrl: res.url,
      title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null,
      hasJsonLd: html.includes('application/ld+json'),
      hasCfChallenge: /just a moment/i.test(html) || html.includes('cdn-cgi/challenge-platform'),
      hasCfClearanceCookie: (res.headers.get('set-cookie') ?? '').toLowerCase().includes('cf_clearance'),
      bodySnippet: html.slice(0, 300),
      bytes: html.length,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    body = { status: 0, error: err instanceof Error ? err.message : String(err) };
  }
  context.log('Probe result', body);
  return { jsonBody: body };
}

app.http('probe', { methods: ['GET', 'POST'], authLevel: 'anonymous', handler: probe });
```

### 3.3 Run locally first
```powershell
cd scraver-service   # note: use correct folder name
cd scraper-service
func start
# In another terminal:
curl "http://localhost:7071/api/probe?make=toyota&model=camry"
```

### 3.4 Deploy the probe
```powershell
az login
az group create --name rg-vehicle-scraper --location uaenorth
az storage account create --name vpscraperstore --resource-group rg-vehicle-scraper --location uaenorth --sku Standard_LRS
az functionapp create --resource-group rg-vehicle-scraper --consumption-plan-location uaenorth `
  --runtime node --runtime-version 22 --functions-version 4 `
  --name vp-scraper-probe --storage-account vpscraperstore
func azure functionapp publish vp-scraper-probe
```

### 3.5 The decision gate — read the probe result
Open: `https://vp-scraper-probe.azurewebsites.net/api/probe?make=toyota&model=camry`

| Probe result | Verdict | Next action |
|---|---|---|
| `status: 200`, `hasJsonLd: true`, `hasCfChallenge: false` | ✅ **FEASIBLE** — Microsoft IPs + full headers pass, same as Power Automate | Proceed to Phase 2 |
| `status: 200` but `hasJsonLd: false` | Partial — HTML present, structure differs | Port parsing, verify fixtures |
| `status: 403` or `hasCfChallenge: true` | Cloudflare is blocking Azure IPs specifically | Try §Appendix B variations; if persistent, add a proxy (§6.7) or keep this source on Power Automate |
| `status: 0` / network error | IP range or TLS blocked hard | Same as above — proxy or fallback |

> **Why this is non-negotiable:** your docs prove Microsoft IPs pass YallaMotor's Cloudflare today (Power Automate egress). Azure Functions is the same network family, but Cloudflare reputation is **per-IP**, so it must be verified empirically. If the probe passes, the entire premise holds. If it fails, you've spent one afternoon — not two weeks — to learn it.

> **⚠️ REAL-WORLD FINDING (2026-08-04, local probe):** from a clean residential IP with a real browser, YallaMotor loads fine — but the same IP with **Node's built-in `fetch`** (undici) and the **exact Flow 3 headers** was Cloudflare-challenged (`403`, title "Just a moment...", `hasCfChallenge: true`). **Conclusion: Cloudflare fingerprints the TLS/HTTP client, not just headers/IP.** A real Chrome TLS handshake passes; undici's does not. Implications:
> 1. **Local live-testing with plain `fetch` is blocked** — local development must use **saved HTML/JSON-LD fixtures** (§13), never the live site.
> 2. The **deployed Azure-IP probe is the decisive test** — the only untested variable left. If Azure passes (like Power Automate's Microsoft IPs + .NET TLS), we're done. If Azure also challenges, the fallback is a **TLS-impersonating client** (`curl-cffi` / `tls-client` / Playwright-with-real-Chromium) in the anti-bot layer (§6) — which Power Automate structurally cannot do, so we're still ahead.

> **⚠️⚠️ UPDATED REAL-WORLD FINDING (2026-08-04, Vercel free-tier experiment):** the "deployed probe" hypothesis was tested **for free on Vercel's free tier** (AWS datacenter IP, `iad1`) before committing to any subscription — reusing the exact same `probe.ts` plus a Python `curl_cffi` variant. Results were decisive:
>
> | Client | IP | Result |
> |---|---|---|
> | Node `fetch` (undici) + exact Flow 3 headers | AWS datacenter (Vercel) | ❌ 403 "Just a moment..." |
> | curl_cffi `impersonate="chrome"` (real Chrome TLS) | AWS datacenter (Vercel) | ❌ 403 "Just a moment..." |
> | cloudscraper (JS-challenge solver; `js2py` interpreter) | AWS datacenter (Vercel) | ❌ 403, no `cf_clearance` cookie |
> | Node `fetch` (undici) | residential | ❌ 403 challenge |
> | Real Chrome browser | residential | ✅ pass |
> | Power Automate (.NET + Microsoft IP) | Microsoft | ✅ pass (production, proven) |
>
> **Both undici AND a real Chrome TLS fingerprint are challenged from a non-Microsoft datacenter IP** — and the same AWS IP blocks **DriveArabia** (also Cloudflare) and **Dubizzle** (Imperva/Incapsula "Pardon Our Interruption"). **Every target source is bot-protected against datacenter IPs**, so the deciding layer is **datacenter-IP reputation**, not the client and not the platform.
>
> **Strategic implication:** a code-first scraper on any non-Microsoft IP family (Vercel/AWS, Railway, almost certainly Azure Functions) cannot reliably reach these sources. Only **Microsoft datacenter IPs** are proven to pass. For multi-source, the proven path is to **extend Power Automate to DriveArabia** (same Cloudflare vendor → Microsoft IPs likely pass, as with YallaMotor) and **test Dubizzle with one Power Automate HTTP action** (Imperva → unknown). An Azure subscription probe is no longer the default plan — the card step is only justified if you specifically want to test whether *Microsoft* Azure IPs pass for a non-Power-Automate client. If any *unprotected* source is ever identified, the Azure Functions scraper in this guide applies to it directly.

---

## 4. Project Scaffold & Structure (Phase 2)

### 4.1 Directory layout
```
scraper-service/
├── package.json
├── tsconfig.json
├── host.json
├── local.settings.json        # gitignored (contains secrets for local dev)
├── .funcignore                # what NOT to publish (node_modules, src tests, .git)
├── src/
│   ├── index.ts               # entry point (v4 model auto-discovers functions)
│   ├── shared/
│   │   ├── headers.ts         # BROWSER_HEADERS + per-source header builders
│   │   ├── httpClient.ts      # fetch wrapper: retry/backoff, proxy, timeout, logging
│   │   ├── optionSets.ts      # Dataverse label↔value maps (port of dataverseOptionSets.ts)
│   │   ├── normalize.ts       # NormalizedListing → Dataverse field mapping
│   │   └── urls.ts            # slugify + per-source URL builders
│   ├── adapters/
│   │   ├── types.ts           # IScraperAdapter, SearchQuery, NormalizedListing
│   │   ├── yallaMotorAdapter.ts
│   │   ├── driveArabiaAdapter.ts    # Phase 5b
│   │   ├── dubizzleAdapter.ts       # Phase 5c
│   │   └── index.ts           # registry: [source] → adapter, enable/disable flags
│   ├── parsers/
│   │   ├── yallaJsonLd.ts     # the 9 spec-field extractions (ported from Flow 3)
│   │   └── yallaTiles.ts      # HTML title-tile parsing (cylinders, regional)
│   ├── functions/
│   │   ├── probe.ts           # Phase 1
│   │   ├── scrape.ts          # POST /api/scrape — drop-in for Flow 3
│   │   ├── sync.ts            # Timer trigger — scheduled multi-source sync
│   │   └── debug.ts           # GET /api/debug — HTML/cookie dump (postmortem lesson)
│   ├── dataverse/
│   │   ├── auth.ts            # token acquisition (managed identity / app reg)
│   │   ├── client.ts          # Dataverse Web API helpers (upsert, patch)
│   │   └── mvr.ts             # write MVR + scraped results (ports missingVehicleApi.ts)
│   └── orchestration/
│       ├── scrapeOrchestrator.ts   # Durable: fan-out across sources (Phase 8)
│       └── approvalWorkflow.ts     # Durable: MVR → approval → notify (Phase 8)
├── tests/
│   ├── fixtures/              # saved real YallaMotor HTML/JSON-LD (from your debugging)
│   │   ├── yallamotor-pajero.html
│   │   └── yallamotor-pajero.jsonld.json
│   └── adapters/              # vitest unit tests against fixtures
└── .github/workflows/deploy.yml    # Phase 9
```

### 4.2 `tsconfig.json` (strict, matching your app's style)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

### 4.3 `host.json` (base config)
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": { "samplingSettings": { "isEnabled": true } },
    "logLevel": { "default": "Information" }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

### 4.4 `local.settings.json` (gitignored — secrets stay local)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DATAVERSE_ORG_URL": "https://YOURORG.crm.dynamics.com",
    "DATAVERSE_TENANT_ID": "",
    "DATAVERSE_CLIENT_ID": "",
    "DATAVERSE_CLIENT_SECRET": "",
    "SCRAPER_SOURCES_ENABLED": "yallamotor,drivearabia",
    "HTTP_TIMEOUT_MS": "30000",
    "PROXY_URL": ""
  }
}
```

### 4.5 `.funcignore` (what NOT to upload — keeps deploys fast and secret-free)
```
node_modules
tests
tsconfig.json
*.ts
!dist/**
```
*(When publishing, `func azure functionapp publish` uploads the compiled `dist/` — with v4 TS this uses `--build` or a prepublish `npm run build`.)*

### 4.6 `package.json` scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "func start",
    "watch": "tsc -w",
    "test": "vitest run",
    "publish:dev": "npm run build && func azure functionapp publish vp-scraper-dev",
    "publish:prod": "npm run build && func azure functionapp publish vp-scraper-prod",
    "validate:expressions": "node scripts/validate-port.mjs"  // optional: sanity-check ports
  },
  "dependencies": { "@azure/functions": "^4.0.0" },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^2",
    "@types/node": "^20"
  }
}
```

---

## 5. Core Types & Adapter Pattern (Phase 3)

The whole multi-source value lives here. Every source implements the same interface; everything downstream only knows the normalized schema.

### 5.1 `src/adapters/types.ts`
```typescript
/** What a user/search is asking for (mirrors the frontend's scrape params). */
export interface SearchQuery {
  make: string;
  model: string;
  trim?: string;
  year?: number;
  bodyType?: string;
  cylinders?: string;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
}

/** ONE normalized listing shape — every source maps into this. */
export interface NormalizedListing {
  source: string;                 // 'yallamotor' | 'drivearabia' | 'dubizzle'
  title: string;
  price: number;                  // AED, number only (parse errors → filtered)
  mileage?: number;               // km
  year?: number;
  bodyType?: string;              // label form: "SUV / Crossover"
  fuelType?: string;              // "Petrol" | "Diesel" | ...
  transmission?: string;          // "Automatic"
  driveType?: string;             // "All Wheel Drive"
  cylinders?: string;             // "6"
  engineSize?: string;            // "2972"
  doors?: string;                 // "4"
  regionalSpecs?: string;         // "GCC Specs"
  sourceUrl: string;
  scrapedAt: string;
}

/** Aggregated result a source returns for a search. */
export interface SourceResult {
  source: string;
  ok: boolean;
  error?: string;                 // only when ok === false
  heading?: string;               // "12 listings · AED 30,000 – 110,000"
  minPrice?: number;
  maxPrice?: number;
  listings: NormalizedListing[];  // NEVER throws — empty on failure
}

/** Every source adapter implements this. Adding a source = one new file. */
export interface IScraperAdapter {
  readonly source: string;        // must match registry key
  readonly enabled: boolean;      // config-driven toggle
  search(query: SearchQuery, ctx: ScrapeContext): Promise<SourceResult>;
}
```

### 5.2 `ScrapeContext` — what the anti-bot layer gives adapters
```typescript
export interface ScrapeContext {
  fetchHtml(url: string): Promise<{ status: number; html: string; finalUrl: string; headers: Headers }>;
  fetchJson<T>(url: string): Promise<T>;
  log(level: 'info' | 'warn' | 'error', msg: string, meta?: unknown): void;
}
```
Adapters **never** build raw `fetch()` calls — they go through `ctx.fetchHtml`, so retry/backoff lives in one place (§6.3) and proxy logic in §6.7.

### 5.3 The normalization boundary
`src/shared/normalize.ts` — the single place a `NormalizedListing` becomes Dataverse field values:
```typescript
import {
  MISSING_VEHICLE_FUEL_TYPE,
  MISSING_VEHICLE_BODY_TYPE,
  MISSING_VEHICLE_CYLINDERS,
  TRANSMISSION,
  DOORS,
  DRIVE_TYPE,
  CATEGORY,
} from './optionSets';   // ported from src/data/dataverseOptionSets.ts

export function normalizeToDataverse(l: NormalizedListing) {
  return {
    vpi_bodytype: MISSING_VEHICLE_BODY_TYPE[l.bodyType ?? ''] ?? null,
    vpi_fueltype: MISSING_VEHICLE_FUEL_TYPE[l.fuelType ?? ''] ?? null,
    vpi_transmissiontype: TRANSMISSION[l.transmission ?? ''] ?? null,
    vpi_cylinders: MISSING_VEHICLE_CYLINDERS[l.cylinders ?? ''] ?? null,
    vpi_doors: DOORS[l.doors ?? ''] ?? null,
    vpi_drivetype: DRIVE_TYPE[l.driveType ?? ''] ?? null,
    vpi_category: CATEGORY[l.regionalSpecs ?? ''] ?? null,
    vpi_enginesize: l.engineSize ? Number(l.engineSize) : null,
    vpi_mileage: l.mileage ?? null,
  };
}
```
> **Why this file matters:** your Aug 3 lesson — the *label round-trip bug* — is exactly what this boundary prevents. `normalizeToDataverse` maps **label → raw option-set integer** once, and the write path uses integers. Never convert integer → label → integer again.

### 5.4 Adapter registry (enable/disable per source, no code change)
`src/adapters/index.ts`:
```typescript
import { IScraperAdapter } from './types';
import { yallaMotorAdapter } from './yallaMotorAdapter';
import { driveArabiaAdapter } from './driveArabiaAdapter';

const ENABLED = (process.env.SCRAPER_SOURCES_ENABLED ?? 'yallamotor').split(',');

const REGISTRY: Record<string, IScraperAdapter> = {
  yallamotor: yallaMotorAdapter,
  drivearabia: driveArabiaAdapter,
  // dubizzle: dubizzleAdapter,   // enabled when ready
};

export function getAdapters(): IScraperAdapter[] {
  return ENABLED.map(s => REGISTRY[s]).filter(Boolean);
}
```

---

## 6. Anti-Bot Layer (Phase 4)

> **✅ 2026-08-06 VERIFIED against a live Azure egress (Aug-05 experiment) + Azure portal re-test.** This section corrects the original scaffold with a hard-won truth:
>
> | Original scaffold assumed | Live-proven reality |
> |---|---|
> | Node `fetch` + the Flow-3 header set is enough | ❌ **Blocked from a genuine Microsoft IP** even with byte-identical headers (probe matrix row 1: 403). Headers alone don't save it. |
> | The Azure IP is what gets you through | ⚠️ **Partly.** The IP earns a *solvable* challenge from YallaMotor's Cloudflare — not a free pass. |
> | A client that can *solve* the JS challenge does the rest | ✅ **Python `cloudscraper` scraped YallaMotor 3/3 at 200** (~1.4 MB, real JSON-LD) from egress IP `52.149.247.118`. |
>
> **Bottom line:** the verified transport is **Python `cloudscraper`, not Node `fetch`.** Use §6.2; treat the old Node wrapper (§6.3) strictly as reference — it maps to the Power Automate / Python-plain-client level that fails.

This is the layer Power Automate cannot have, and the reason the whole move is worth it.

### 6.1 `src/shared/headers.ts` — the exact working headers
Copy **verbatim** from the Flow 3 design doc §"Step 4" — this set is confirmed to pass Cloudflare's managed challenge:
```typescript
export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
  Referer: 'https://www.google.com/',
  'sec-ch-ua': '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

export function sourceHeaders(source: string): Record<string, string> {
  // Per-source overrides go here (e.g. Drive Arabia may not need sec-ch-ua, Dubizzle different UA).
  return { ...BROWSER_HEADERS };
}
```
> **Python gotcha (live-tested, Aug-05):** keep `Accept-Encoding` free of `br` unless the `brotli` module is installed. Without it, YallaMotor serves `br`-compressed bodies that decode to **mojibake** and break JSON-LD parsing (§4.6 of the egress report). `gzip, deflate` is what the verified §6.2 transport sends.

### 6.2 Python `cloudscraper` transport — ✅ VERIFIED (use this)

The transport proven live against YallaMotor from a real Microsoft IP (`52.149.247.118`, Linux Consumption plan, Functions v2). The working probe is `C:\Users\PC\azure-probe-py\function_app.py` — this is the same shape `/api/probe_py` you test from the portal with `?url=…&client=cloudscraper`.

```python
import random, time, logging, cloudscraper, azure.functions as func

HEADERS = {  # §6.1 — with `br` REMOVED from Accept-Encoding (see 6.1 note below)
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://www.google.com/",
}

app = func.FunctionApp()

@app.route(route="probe_py", auth_level=func.AuthLevel.ANONYMOUS)
def probe_py(req: func.HttpRequest) -> func.HttpResponse:
    url = req.params.get("url")
    if not url:
        return func.HttpResponse("Missing ?url= parameter", status_code=400)
    time.sleep(random.uniform(0.5, 2.0))   # human pacing (§6.6) — avoid the "scripted" flag
    s = cloudscraper.create_scraper()      # Chrome-TLS + JS-challenge solver (§6.5)
    r = s.get(url, headers=HEADERS, timeout=30)
    logging.info("status=%s bytes=%s cf=%s jsonld=%s", r.status_code, len(r.content),
                 "just a moment" in r.text, '<script type="application/ld+json"' in r.text)
    return func.HttpResponse(r.text if r.ok else f"blocked {r.status_code}", status_code=r.status_code)
```

- **Why `cloudscraper`:** it sends a genuine Chrome TLS handshake *and* runs the Cloudflare JS challenge when offered — the two live-verified ingredients. Plain `requests`, TLS-only `curl_cffi`, and Node `fetch` all failed from the **same** IP.
- **Why a Python worker and not the Node wrapper:** the Azure Functions Node v4 host has no JS-challenge solver; the Python runtime brings `cloudscraper` in via `requirements.txt` (Oryx remote build on `func publish --python`).

### 6.3 `src/shared/httpClient.ts` — ⚠️ DEMOTED (reference only; proven blocked on Azure)
```typescript
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  opts: { maxRetries?: number; backoffMs?: number; timeoutMs?: number } = {},
): Promise<{ status: number; html: string; finalUrl: string; headers: Headers }> {
  const { maxRetries = 3, backoffMs = 2000, timeoutMs = 30_000 } = opts;

  for (let attempt = 0; ; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timer);
      return { status: res.status, html: await res.text(), finalUrl: res.url, headers: res.headers };
    } catch (err) {
      const isRateBlock = err instanceof HttpError && (err.status === 429 || err.status === 403);
      if (attempt >= maxRetries || !isRateBlock) throw err;
      await sleep(backoffMs * 2 ** attempt + randomInt(0, 500));   // exponential + jitter
    }
  }
}
```
- **Backoff + jitter** — mimics human pacing; Power Automate had fixed retry only.
- **403/429 handled separately** — a Cloudflare block is *not* retried blindly (it would burn your IP further); it surfaces to the caller so the frontend shows the friendly "Live Data Unavailable" state.

### 6.4 Cloudflare detection (two-state, refined after the live test)
The old single-grep check (`/just a moment/`) is **not** enough — the Aug-06 portal test returned `hasCfChallenge: true` on a **fully successful** page: YallaMotor embeds Cloudflare's marker scripts in normal page markup, so the strings are present even when you were never gated. The flag is only meaningful *combined with a content check*:

```typescript
const CHALLENGE_RE = /just a moment|attention required|cdn-cgi\/challenge-platform/i;

// A genuine block = challenge/page marker WITHOUT real content.
// A successful page = marker strings present AND content delivered (JSON-LD / large body).
export function classifyResponse(status: number, html: string): { blocked: boolean; reason?: string } {
  if (status === 403) return { blocked: true, reason: `HTTP ${status}` };
  const marker = CHALLENGE_RE.test(html);
  const contentDelivered = html.includes('application/ld+json') || html.length > 50_000;
  if (marker && !contentDelivered) return { blocked: true, reason: 'challenge page, no content' };
  return { blocked: false };
}
```
- A real challenge page is a **few KB** of "Just a moment" boilerplate with **no** JSON-LD. If content came through, you were not gated — treat as success (as the live Pajero run was).

### 6.5 Challenge solving — the capability Power Automate structurally cannot have
Cloudflare's guard has three doors: *serve directly* (good IP + browser look), *hand you a JS puzzle*, or *hard-block*. On a Microsoft IP, YallaMotor takes the **middle door** — it offers a *solvable* challenge. Who wins then:

| Client | Can run the JS puzzle? | Result on Azure (live) |
|---|---|---|
| Node `fetch`, Python `requests` | ❌ No JS runtime | 403 — can't even attempt it |
| `curl_cffi` (Chrome TLS only) | ❌ No JS runtime | 403 — perfect handshake, still can't solve |
| **`cloudscraper`** | ✅ embeds a JS runtime that executes the challenge | **200** — solves it, gets the token, walks in |

So the decisive capability is **running + solving the challenge JavaScript**, not just looking like a browser on the network. `cloudscraper.create_scraper()` gives you that out of the box. (In the live trace it solved fresh per request — `hasCfClearanceCookie: false` — which is fine at low volume, but for big batches treat each request as a fresh challenge and pace accordingly, §6.6.)

### 6.6 Human pacing — the behavior layer that keeps you out of the MIDDLE door
The "after two or three requests" Power Automate failure was the **behavior** signal: machine-perfect timing and repeated identical requests. In `cloudscraper`, apply:

```python
import random, time
time.sleep(random.uniform(0.5, 2.0))     # between independent scrapes (not just retries)
```
- Jitter **between requests**, not only on retries — a fixed 5-second gap is as recognizable as no gap.
- On a **403 block**: do **not** blind-retry (it burns the IP further) — back off for minutes and surface the friendly "Live Data Unavailable" state to the frontend instead.

### 6.7 Proxy hook (only when a source blocks MS IPs)
Add to `httpClient` — if `PROXY_URL` app-setting is set, route through it. In Node, the simplest approach is an authenticated proxy via a scraping-API host (e.g. Bright Data / ScraperAPI format URLs):
```typescript
const proxyUrl = process.env.PROXY_URL;   // e.g. https://user:pass@brd.superproxy.io:33335
async function resolveUrl(url: string): Promise<string> {
  return proxyUrl ? `${proxyUrl.replace(/\/$/, '')}/${encodeURIComponent(url)}` : url;
}
```
> This is the **only** lever that fixes "Microsoft IP blocked" per-site, and it's the one Power Automate structurally cannot do.

---

## 7. YallaMotor Adapter — Porting Flow 3 (Phase 5)

> **Status (2026-08-06):** the JSON-LD extraction core now lives **in-repo** at
> `src/parsers/` (see §7.3) with real fixtures in `tests/fixtures/` (see §7.5) —
> built as part of the in-repo adapter scaffold and unit-tested against the
> live-scraped Pajero/Camry JSON-LD. The full service layout below stays as the
> target for the deployable adapter.

### 7.1 Search URL (reuse the frontend's logic exactly)
Port `slugify` + the URL template from `src/lib/yallaMotorHttpScraper.ts` so URLs match today's working behavior:
```typescript
export function yallaSearchUrl(q: SearchQuery): string {
  const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const trim = q.trim ? `/vr_${slug(q.trim)}` : '';
  const year = q.year ? `/yr_${q.year}_${q.year}` : '';
  return `https://uae.yallamotor.com/used-cars/${slug(q.make)}/${slug(q.model)}${trim}${year}`;
}
```

### 7.2 Heading parse (count / min / max) — port of Flow 2/3 heading extraction
Pattern: `12 listings · AED 30,000 – 110,000 · 2022–2022` from the `heading-h2-content` div.

### 7.3 The 9 spec fields — port `src/parsers/yallaJsonLd.ts`
Take every extraction expression from `docs/flow3-deep-scrape-debugging-retrospective.md` (all live-verified on the Pajero) and write them as pure functions over the JSON-LD `script` blocks:

| Field | Source | Verified value (Pajero) |
|---|---|---|
| `bodyType` | JSON-LD `vehicleBodyType.name` | `SUV / Crossover` |
| `fuelType` | JSON-LD `fuelType` | `Petrol` |
| `transmission` | JSON-LD `vehicleTransmission` | `Automatic` |
| `driveType` | JSON-LD `driveWheelConfiguration` | `https://schema.org/AllWheelDriveConfiguration` |
| `engineSize` | JSON-LD `vehicleEngine.engineDisplacement.value` | `2972` |
| `doors` | JSON-LD `numberOfDoors` | `4` |
| `mileage` | JSON-LD `mileageFromOdometer.value` | `130161` |
| `cylinders` | HTML `title="Number of Cylinders"` tile | `6` |
| `regionalSpecs` | HTML `title="Regional Specs"` tile (desc fallback) | `GCC Specs` |

```typescript
// Sketch — each spec is a small pure function; test against saved JSON-LD fixtures.
export function extractBodyType(jsonLd: Record<string, unknown>): string | undefined {
  const v = (jsonLd as any).vehicleBodyType?.name;
  return typeof v === 'string' && v ? v : undefined;
}
// ... one per field, mirroring the verified expressions.
```

### 7.4 HTML tile parsing — `src/parsers/yallaTiles.ts`
The killer bug you solved: the page has **zero `<td>` tags** — specs live in `<div title="LABEL">` tiles. Port the split-on-`title="LABEL"` pattern as a function:
```typescript
export function extractTileValue(html: string, label: string): string | undefined {
  // Split after title="<label>", read until next title="
  const idx = html.indexOf(`title="${label}"`);
  if (idx === -1) return undefined;
  const after = html.slice(idx + label.length + 8); // skip title="..." + closing quote
  const next = after.indexOf('title="');
  const chunk = next === -1 ? after : after.slice(0, next);
  const match = chunk.match(/>([^<]+)</);
  return match?.[1]?.trim();
}
```

### 7.5 Save real fixtures for tests
You already have real YallaMotor HTML + Pajero JSON-LD from the debugging session. Save them into `tests/fixtures/` — this is what makes the whole project **testable without hitting the target** (the single biggest effort win over Power Automate).

---

## 8. HTTP Trigger Functions (Phase 6)

### 8.1 `src/functions/scrape.ts` — the drop-in replacement for Flow 3
Returns **exactly** `Flow3ScrapeResult` so the frontend swap is one line:

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { yallaSearchUrl } from '../shared/urls';
import { getAdapters } from '../adapters';
import { isCloudflareBlocked } from '../shared/httpClient';

app.http('scrape', {
  methods: ['POST'],
  authLevel: 'function',   // function key in the URL — mirrors Flow 3's SAS token
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const { make, model, trim, year } = await req.json() as SearchQuery & { year?: number };

    const adapters = getAdapters();
    const results = await Promise.all(adapters.map(a => a.search({ make, model, trim, year }, ctxFor(a, context))));

    // ——— aggregate across sources (ports aggregator.ts from Path B) ———
    const all = results.flatMap(r => r.listings);
    const prices = all.map(l => l.price).filter(p => p >= 1000 && p <= 5_000_000);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const count = all.length;

    const unreachable = results.every(r => !r.ok);   // every source blocked/failed
    if (unreachable) {
      return { jsonBody: { success: true, make, model, trim, year, count: -1, minPrice: 0, maxPrice: 0, heading: '', sourceUrl: '' } };
    }

    const sourceUrl = yallaSearchUrl({ make, model, trim, year });
    return {
      jsonBody: {
        success: true, make, model, trim, year,
        count, minPrice, maxPrice,
        heading: `${count} listings · AED ${minPrice.toLocaleString()} – ${maxPrice.toLocaleString()} · ${year ?? ''}`,
        sourceUrl,
        // Deep-scrape specs from the first source that returned them:
        ...pickFirstSpec(results, 'bodyType'),
        // ... (fuelType, transmission, driveType, cylinders, engineSize, doors, seats, mileage, regionalSpecs)
      },
    };
  },
});
```

**Contract checklist (must match `Flow3ScrapeResult`):**
- `success: true` always for HTTP 200 (a scrape that found nothing is still "success", like the flow)
- `count < 0` (`-1`) means **unreachable** → frontend shows the amber "Live Data Unavailable"
- All `make/model/trim/year` echoed back (frontend uses them for the URL + heading)
- Spec fields only present when non-empty (frontend guards with `asString`)

### 8.2 `src/functions/sync.ts` — scheduled multi-source refresh (optional)
```typescript
import { app, Timer } from '@azure/functions';
// Runs every 6 hours; scrapes configured sources for a configured make/model list,
// writes results to Dataverse (Phase 7). This is your "Flow 2" replacement.
app.timer('sync', { schedule: '0 0 */6 * * *', handler: async (timer: Timer, context) => { /* ... */ } });
```

### 8.3 `src/functions/debug.ts` — the postmortem lesson, kept
A `/api/debug?url=...` endpoint that dumps `title / finalUrl / CF cookie present / body mentions challenge / html snippet`. This single endpoint saved Path B weeks of guessing — keep it from day one.

---

## 9. Dataverse Write-Back (Phase 7)

Replaces the SAS-token approach with proper AAD auth. Two options — **managed identity is recommended** (no secrets).

### 9.1 Option A (recommended): system-assigned managed identity
1. **Azure side:** `az functionapp identity assign --name vp-scraper-dev --resource-group rg-vehicle-scraper` → note the returned `principalId`.
2. **Power Platform side:** Power Platform admin center → your environment → **Settings → Users + permissions → Application users → New app user** → search the function app's identity → add it.
3. **Security role:** assign a role with **Create/Update** on `Missing Vehicle Request` and `Vehicle Data` (create a custom role if "Basic User" is too limited).
4. **Code** — no secret anywhere:
```typescript
import { ManagedIdentityCredential } from '@azure/identity';

export async function getToken(dataverseUrl: string): Promise<string> {
  const cred = new ManagedIdentityCredential();
  const token = await cred.getToken(`${dataverseUrl}/.default`);
  return token.token;
}
```

### 9.2 Option B: app registration + client secret (works from anywhere)
1. Azure AD → **App registrations** → New → note `Application (client) ID` and `Directory (tenant) ID`.
2. **Certificates & secrets** → New client secret → store in **Key Vault** (best) or an app setting.
3. Same Power Platform **Application user** step as Option A.
4. Code:
```typescript
export async function getToken(dataverseUrl: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.DATAVERSE_CLIENT_ID!,
    client_secret: process.env.DATAVERSE_CLIENT_SECRET!,
    scope: `${dataverseUrl}/.default`,
    grant_type: 'client_credentials',
  });
  const res = await fetch(`https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}
```

### 9.3 `src/dataverse/client.ts` — Web API helpers
```typescript
export async function patchRecord(orgUrl: string, entityPlural: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const token = await getToken(orgUrl);
  await fetch(`${orgUrl}/api/data/v9.2/${entityPlural}(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'OData-Version': '4.0',
      'OData-MaxVersion': '4.0',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(fields),
  });
}
```

### 9.4 What to write — mirror the existing app logic
- **Scrape result → MVR:** PATCH the MVR record with `vpi_scraped_minprice/maxprice`, `vpi_scraped_listings` (the `scrapedListings` JSON), `vpi_mileage`, `vpi_scrapestatus` — port of `updateMissingVehicleScrapeResult`.
- **Approval → Vehicle Data:** create the Vehicle Data record with `vpi_enginesize`, `vpi_doors`, `vpi_category` (via `normalizeToDataverse`, integers only — your Aug 3 lesson), `vpi_minprice/maxprice`, and the `Make Model Trim` name — port of `approveAndCreateVehicle`.
- **Use `normalizeToDataverse` (integer output) for every option-set field.** Never label→label round-trip.

---

## 10. Durable Orchestration (Phase 8, optional but recommended)

This collapses the Flow 1–4 *chain* into one version-controlled workflow. Add it **after** the simple HTTP path is proven (it's a phase, not a requirement).

```typescript
import { app, DurableOrchestrationClient } from '@azure/functions';

app.http('scrapeWorkflow', {
  methods: ['POST'], authLevel: 'function',
  handler: async (req, context) => {
    const client = DurableOrchestrationClient.getClient(context);
    const payload = await req.json();
    const instanceId = await client.startNew('scrapeOrchestrator', { input: payload });
    return { jsonBody: { instanceId, statusQueryGetUri: await client.getManagementUrls(instanceId).status } };
  },
});

app.orchestration('scrapeOrchestrator', function* (context) {
  const q = context.df.getInput();
  // 1. Fan out — one activity per source (runs in parallel)
  const results = yield context.df.task.all(
    getAdapters().map(a => context.df.callActivity('scrapeSource', { source: a.source, query: q }))
  );
  // 2. Normalize + dedupe + aggregate
  const deduped = dedupeBySourceUrl(results.flatMap(r => r.listings));
  // 3. Write to Dataverse
  yield context.df.callActivity('writeToDataverse', { listings: deduped });
  // 4. (Optional) wait for human approval — durable "human interaction" pattern
  yield context.df.waitForExternalEvent('approved');
  // 5. Notify (port of Flow 4)
  yield context.df.callActivity('sendApprovalEmail', { mvrId: q.mvrId });
  return { count: deduped.length };
});
```

**Why this matters for multi-source:** fan-out means 5 sources run in parallel (Power Automate ran serially). `waitForExternalEvent('approved')` gives you the MVR approval pause in code. Retries and status UI come free.

---

## 11. Deployment & CI/CD (Phase 9)

### 11.1 App settings (the values your code reads)
```powershell
az functionapp config appsettings set --name vp-scraper-dev --resource-group rg-vehicle-scraper --settings `
  DATAVERSE_ORG_URL="https://YOURORG.crm.dynamics.com" `
  DATAVERSE_TENANT_ID="<tenant>" `
  DATAVERSE_CLIENT_ID="<client>" `
  DATAVERSE_CLIENT_SECRET="<secret>" `
  SCRAPER_SOURCES_ENABLED="yallamotor" `
  HTTP_TIMEOUT_MS="30000" `
  PROXY_URL=""
```
> **Secrets:** prefer Key Vault references (`@Microsoft.KeyVault(SecretUri=...)`) for `DATAVERSE_CLIENT_SECRET` over a plain app setting.

### 11.2 `.github/workflows/deploy.yml` (GitHub Actions)
```yaml
name: Deploy scraper
on:
  push:
    branches: [main]
    paths: ['scraper-service/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: scraper-service/package-lock.json }
      - run: npm ci
        working-directory: scraper-service
      - run: npm test
        working-directory: scraper-service
      - uses: Azure/functions-action@v1
        with:
          app-name: vp-scraper-prod
          package: scraper-service
          publish-profile: ${{ secrets.AZURE_FUNCTIONS_PUBLISH_PROFILE }}
```

### 11.3 If you need fixed outbound IPs (e.g. an allowlist demands it)
Consumption plan outbound IPs are a range that can change. **Premium plan gives fixed outbound IPs** (plus runs headless browsers — needed for Dubizzle):
```powershell
az functionapp plan create --name vp-scraper-premium --resource-group rg-vehicle-scraper --sku EP1 --location uaenorth
az functionapp create --resource-group rg-vehicle-scraper --plan vp-scraper-premium `
  --runtime node --runtime-version 22 --functions-version 4 `
  --name vp-scraper-prod --storage-account vpscraperstore
az functionapp show --name vp-scraper-prod --resource-group rg-vehicle-scraper --query "outboundIpAddresses"
```

---

## 12. Monitoring & Operations (Phase 10)

- **Application Insights** is auto-instrumented when you create the Function App (enable on creation). Every invocation logs duration + exceptions; add `context.log()` in adapters.
- **Per-source failure isolation** is structural: `SourceResult.ok` per adapter; one source 403s → others still return. The frontend already handles partial data.
- **`/api/debug`** endpoint stays for remote inspection (the Path B lesson).
- **Alert rule** idea: "any adapter failed 3× in a row" → `az monitor metrics alert` on Function error count, or Application Insights custom metric.

---

## 13. Testing Strategy (Phase 11)

| Layer | Tool | What |
|---|---|---|
| **Adapter unit tests** | Vitest | Every extraction function tested against saved real HTML/JSON-LD fixtures — no network |
| **Normalization tests** | Vitest | `normalizeToDataverse` label→integer correctness (guards the Aug 3 label bug permanently) |
| **httpClient tests** | Vitest + mocked `fetch` | Retry/backoff math, Cloudflare detection, proxy URL rewrite |
| **Local smoke** | `func start` + curl | Full function against localhost |
| **Live smoke** | Deployed + curl | One real call post-deploy; check Application Insights |
| **Contract test** | Vitest | Assert `/api/scrape` output shape matches `Flow3ScrapeResult` (a regression guard for the frontend) |

**Fixture rule:** any time a live run reveals new markup, save the HTML/JSON-LD into `tests/fixtures/` and add a case. The target's markup becomes documentation, and future regressions get caught locally.

---

## 14. Migration & Rollout (Phase 12)

```
1.  Phase 1 probe          → deploy, verify Cloudflare passes          → gate
2.  YallaMotor adapter     → local tests against fixtures              → gate
3.  /api/scrape live       → curl a real search, compare to Flow 3 output
4.  Keep BOTH running      → Power Automate stays live, unchanged
5.  Frontend swap (dev)    → point scrapeViaFlow3() FLOW_3_URL at the function URL
6.  Verify in dev          → user compares old vs new results side-by-side
7.  Frontend swap (prod)   → flip; keep old URL commented for rollback
8.  Add Drive Arabia       → new adapter + fixture + live check
9.  Add Dubizzle           → API-sniff first, browser only if needed
10. (Optional) Durable     → orchestration + timer sync; retire Flow 2
11. Retire flows           → only AFTER Functions proven for weeks
```

**The frontend swap** (`src/lib/yallaMotorHttpScraper.ts`) is intentionally minimal:
```typescript
const FLOW_3_URL = 'https://15c7cf15.../invoke?...';              // Power Automate (fallback)
const SCRAPER_URL = 'https://vp-scraper-prod.azurewebsites.net/api/scrape?code=<function-key>';
// Flip SCRAPER_URL / FLOW_3_URL to switch back.
```
Because `/api/scrape` returns the identical `Flow3ScrapeResult` shape, no other frontend change is needed.

**Rollback:** revert the constant. Two-minute rollback, zero data loss (Flow 3 was never disabled).

---

## 15. Cost Summary

| Component | Cost | Notes |
|---|---|---|
| **Consumption Functions** | **~$0–5/mo** at your volume | Free tier ~1M executions/mo; a scrape is 1–3 executions |
| **Premium plan** (browsers / fixed IPs) | ~$200–450/mo | Only when Dubizzle forces Playwright |
| **Rotating proxy** | Optional, ~$100+/mo | Only if a source blocks MS IPs |
| **Power Automate** | Keep as-is during migration | License already paid — no change until retirement |
| **Dataverse** | No change | Same environment |
| **Developer time** | ~3–6 dev-days to the working `/api/scrape` | Most of it is porting Flow 3 expressions to tested code |

---

## 16. Security Notes

1. **Function keys** — `authLevel: 'function'` puts a key in the URL, mirroring Flow 3's SAS token. Protect it like the current token.
2. **Never store secrets in code** — use app settings, preferably Key Vault references.
3. **Managed identity > client secret** for Dataverse (Option A) — removes the secret entirely.
4. **Respect the target sites** — add random jitter, keep request volume sane, honor 403/429 (don't hammer). A ban is worse than a failed scrape.
5. **Don't scrape login-gated or personal data** — only public listing pages, same as today.

---

## Appendix A — Complete Command Reference

```powershell
# ── Pre-reqs ──────────────────────────────────────────────
winget install Microsoft.AzureCLI
npm install -g azure-functions-core-tools@4
npm install -g azurite
node -v && func --version && az --version && az login

# ── Scaffold ──────────────────────────────────────────────
func init scraper-service --worker-runtime node --language typescript --model V4
cd scraper-service && npm install && npm install @azure/functions@4
func new --template "HTTP trigger" --name probe

# ── Local ─────────────────────────────────────────────────
func start                      # http://localhost:7071/api/...
curl "http://localhost:7071/api/probe?make=toyota&model=camry"

# ── Azure resources ───────────────────────────────────────
az group create --name rg-vehicle-scraper --location uaenorth
az storage account create --name vpscraperstore --resource-group rg-vehicle-scraper --location uaenorth --sku Standard_LRS
az functionapp create --resource-group rg-vehicle-scraper --consumption-plan-location uaenorth `
  --runtime node --runtime-version 22 --functions-version 4 --name vp-scraper-dev --storage-account vpscraperstore
az functionapp identity assign --name vp-scraper-dev --resource-group rg-vehicle-scraper
az functionapp config appsettings set --name vp-scraper-dev --resource-group rg-vehicle-scraper --settings @appsettings.json

# ── Deploy ────────────────────────────────────────────────
npm run build
func azure functionapp publish vp-scraper-dev

# ── Premium (only if needed) ──────────────────────────────
az functionapp plan create --name vp-scraper-premium --resource-group rg-vehicle-scraper --sku EP1 --location uaenorth
az functionapp create --resource-group rg-vehicle-scraper --plan vp-scraper-premium `
  --runtime node --runtime-version 22 --functions-version 4 --name vp-scraper-prod --storage-account vpscraperstore
```

---

## Appendix B — Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Probe: `403` / `hasCfChallenge: true` | Azure IP specifically flagged, or headers incomplete | Verify headers are byte-identical to §6.1; try the `uaecentral` region; then add proxy (§6.7) |
| Probe: `status: 0` | Network/TLS block or timeout | Check `HTTP_TIMEOUT_MS`; try from a different region; proxy |
| `hasJsonLd: false` but 200 | YallaMotor changed page structure | Save the HTML to fixtures, re-derive extraction, add a test |
| `/api/scrape` returns nothing for one source | Adapter threw (it shouldn't — adapters never throw) | Check Application Insights for that adapter's `context.log` |
| Count differs from Flow 3 | URL construction differs | Confirm `slugify` matches the frontend exactly; compare `sourceUrl` |
| Deploy fails on `dist` missing | Publishing TS source without build | Ensure `npm run build` runs before publish (CI does this) |
| Frontend shows "Live Data Unavailable" | `count < 0` returned — all sources unreachable | Check each source's `SourceResult.ok`; look at `hasCfChallenge` |
| Cloudflare blocked during dev | Too many requests from one IP | Slow down (jitter), test against fixtures locally, don't hammer live |
</parameter>
