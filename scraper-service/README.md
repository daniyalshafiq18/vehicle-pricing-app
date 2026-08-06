# scraper-service — Azure Functions `cloudscraper` transport (scaffold)

Deployable Python transport for the YallaMotor Azure adapter. **Deployed
2026-08-06 to `vpi-probe-py-20260805`** (Linux Consumption, Python 3.11) and
proven end-to-end: the probe + in-repo `src/parsers/` reproduce Power Automate
Flow 3's output exactly (search count / min / max and all detail integers —
see CHANGELOG 2026-08-06). Power Automate Flow 3 remains the app's **live**
path; the adapter is not wired to the frontend yet.

## What's here

| File | Purpose |
|---|---|
| `function_app.py` | Python v2 HTTP function `probe_py` — the §6.2-verified `cloudscraper` pattern. Requires `?url=`, human-pacing jitter, `gzip, deflate` only, and the §6.4 two-state Cloudflare check (marker present BUT content delivered = success). Returns JSON diagnostics + raw HTML on success. |
| `requirements.txt` | `azure-functions` + `cloudscraper` (Oryx remote build). |
| `host.json` / `.funcignore` | Functions host config + publish ignore rules. |
| `local.settings.json.example` | Local config template — copy to `local.settings.json` (gitignored; will hold function keys later). |

## The adapter contract

`probe_py` returns the raw HTML. The JSON-LD → `Flow3ScrapeResult` extraction
"brain" lives **in the app** at `src/parsers/` (guide §7 pointer), shared by
both the Power Automate path and this path, so the extraction logic is tested
once against the real fixtures in `tests/fixtures/`.

## Publish & rollout (guide §14)

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

Publish (from this directory):

```powershell
func azure functionapp publish <app> --python
```

Verify from the Azure portal: `POST /api/probe_py?url=<yallamotor-url>&client=cloudscraper`.

## Gotchas baked in

- **No `br` in Accept-Encoding** — without the `brotli` module the body comes
  back mojibake and JSON-LD parsing breaks (§6.1).
- **Do not blind-retry on 403** — it burns the IP further; surface the friendly
  "Live Data Unavailable" state instead (§6.6).
- **`cloudscraper` solves a fresh challenge per request** (`hasCfClearanceCookie:
  false`) — fine at low volume; pace big batches (§6.5).
