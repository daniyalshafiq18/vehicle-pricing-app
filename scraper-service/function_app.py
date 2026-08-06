"""
Azure Functions (Python v2) — YallaMotor `cloudscraper` transport.

Adapted from the live-verified probe pattern (guide §6.2 / §6.4 / §6.6) that
scraped YallaMotor cleanly from egress IP `52.149.247.118`:

    POST /api/probe_py?url=<yallamotor-url>&client=cloudscraper

This is a TRANSPORT ONLY — it fetches the HTML and reports diagnostics. The
JSON-LD → Dataverse extraction "brain" lives in the app at `src/parsers/`
(see the guide §7 pointer) and is shared by both Power Automate and this path.

Deployed 2026-08-06 to `vpi-probe-py-20260805` (Linux Consumption, Python 3.11).
Publish updates with:
    func azure functionapp publish <app> --python   (Oryx remote build)
"""

import json
import logging
import random
import time

import azure.functions as func
import cloudscraper

# §6.1 — keep `br` OUT of Accept-Encoding unless `brotli` is installed; YallaMotor
# then serves br-compressed bodies that decode to mojibake and break JSON-LD parsing.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
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

# Two-state Cloudflare check (guide §6.4): marker scripts exist on SUCCESSFUL pages
# too — it is only a block when the marker is present AND no real content came through.
CHALLENGE_MARKER_RE = ["just a moment", "attention required", "cdn-cgi/challenge-platform"]


def _is_blocked(html: str, status: int) -> bool:
    if status == 403:
        return True
    marker_present = any(m in html.lower() for m in CHALLENGE_MARKER_RE)
    content_delivered = "application/ld+json" in html or len(html) > 50_000
    return bool(marker_present and not content_delivered)


app = func.FunctionApp()


@app.route(route="probe_py", auth_level=func.AuthLevel.ANONYMOUS)
def probe_py(req: func.HttpRequest) -> func.HttpResponse:
    url = req.params.get("url")
    if not url:
        return func.HttpResponse(json.dumps({"error": "Missing ?url= parameter"}), status_code=400,
                                 mimetype="application/json")

    client = (req.params.get("client") or "cloudscraper").lower()
    time.sleep(random.uniform(0.5, 2.0))  # §6.6 human pacing — the behaviour layer

    start = time.time()
    try:
        # cloudscraper embeds a JS runtime that solves the Cloudflare challenge (§6.5)
        s = cloudscraper.create_scraper(browser={"browser": "chrome", "platform": "windows", "desktop": True})
        r = s.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
    except Exception as exc:  # network / solver failure
        logging.error("fetch failed for %s: %s", url, exc)
        return func.HttpResponse(
            json.dumps({"error": f"fetch failed: {exc}"}), status_code=502, mimetype="application/json"
        )

    html = r.text
    blocked = _is_blocked(html, r.status_code)
    diagnostics = {
        "url": url,
        "client": client,
        "httpStatus": r.status_code,
        "bytes": len(r.content),
        "ms": int((time.time() - start) * 1000),
        "hasCfChallenge": any(m in html.lower() for m in CHALLENGE_MARKER_RE),
        "hasCfClearanceCookie": "cf_clearance" in r.headers.get("Set-Cookie", ""),
        "hasJsonLd": "application/ld+json" in html,
        "blocked": blocked,
        "reason": "challenge page, no content" if blocked and r.status_code != 403 else (f"HTTP {r.status_code}" if blocked else None),
    }

    if blocked:
        logging.warning("blocked %s status=%s", url, r.status_code)
        return func.HttpResponse(json.dumps(diagnostics), status_code=r.status_code, mimetype="application/json")

    # Success — include diagnostics and raw HTML for the adapter layer to parse.
    return func.HttpResponse(
        json.dumps({**diagnostics, "html": html}),
        status_code=200,
        mimetype="application/json",
    )