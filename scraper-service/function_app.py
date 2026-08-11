"""
Azure Functions (Python v2) — YallaMotor `cloudscraper` transport + PAD inbox relay.

Adapted from the live-verified probe pattern (guide §6.2 / §6.4 / §6.6) that
scraped YallaMotor cleanly from egress IP `52.149.247.118`:

    POST /api/probe_py?url=<yallamotor-url>&client=cloudscraper

This is a TRANSPORT ONLY — it fetches the HTML and reports diagnostics. The
JSON-LD → Dataverse extraction "brain" lives in the app at `src/parsers/`
(see the guide §7 pointer) and is shared by both Power Automate and this path.

== PAD inbox relay (docs/power-automate-desktop-scraper-guide.md §6) ==
Power Automate Desktop captures raw DriveArabia/Dubizzle HTML on a residential
IP and POSTs it here; the browser app polls `next_pending`, runs `src/parsers`,
then marks the item Complete/Error via `inbox_status`.

    POST /api/ingest_html            (auth_level=function — key lives in PAD only)
    GET  /api/next_pending           (anonymous + CORS — browser-callable)
    POST /api/inbox_status           (anonymous + CORS — browser marks done/failed)

Blob + Table reuse the function's own `AzureWebJobsStorage` account (containers
`scrape-inbox`, table `scrapeinboxmeta`). Inbox hygiene (§10): the HTML blob is
purged when an item is marked Complete; kept on Error so it can be re-processed.

Deployed 2026-08-06 to `vpi-probe-py-20260805` (Linux Consumption, Python 3.11).
Publish updates with:
    func azure functionapp publish <app> --python   (Oryx remote build)
"""

import json
import logging
import os
import random
import time
import urllib.parse
import uuid
from datetime import datetime, timezone

import azure.functions as func
import cloudscraper
from azure.data.tables import TableServiceClient, UpdateMode
from azure.storage.blob import BlobServiceClient

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

# ----------------------------------------------------------------------------- #
#  PAD inbox relay — storage wiring (reuses the function's own storage account)  #
# ----------------------------------------------------------------------------- #

STORAGE_CONN = os.environ.get("AzureWebJobsStorage", "")
INBOX_CONTAINER = "scrape-inbox"
INBOX_TABLE = "scrapeinboxmeta"
MAX_HTML_BYTES = 5_000_000  # guide §6.1 — reject over-sized pages before storing
VALID_SOURCES = {"drivearabia", "dubizzle"}
VALID_STATUSES = {"Complete", "Error"}


def _is_blocked(html: str, status: int) -> bool:
    if status == 403:
        return True
    marker_present = any(m in html.lower() for m in CHALLENGE_MARKER_RE)
    content_delivered = "application/ld+json" in html or len(html) > 50_000
    return bool(marker_present and not content_delivered)


app = func.FunctionApp()

# The browser calls these functions cross-origin from the Power Pages portal,
# so every response carries CORS headers and we answer OPTIONS preflights.
CORS_HEADERS = {"Access-Control-Allow-Origin": "*"}


def _json_response(payload: dict, status_code: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(payload),
        status_code=status_code,
        mimetype="application/json",
        headers=CORS_HEADERS,
    )


def _preflight() -> func.HttpResponse:
    return func.HttpResponse(
        status_code=200,
        headers={
            **CORS_HEADERS,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600",
        },
    )


def _storage_unavailable() -> func.HttpResponse:
    return _json_response({"error": "AzureWebJobsStorage not configured"}, status_code=500)


def _blob_service() -> BlobServiceClient:
    return BlobServiceClient.from_connection_string(STORAGE_CONN)


def _table_service() -> TableServiceClient:
    return TableServiceClient.from_connection_string(STORAGE_CONN)


def _ensure_inbox_storage():
    """Idempotent container + table creation. Returns (BlobServiceClient, TableClient)."""
    from azure.core.exceptions import ResourceExistsError

    blob = _blob_service()
    container = blob.get_container_client(INBOX_CONTAINER)
    if not container.exists():
        container.create_container()
    table_client = _table_service().get_table_client(INBOX_TABLE)
    try:
        table_client.create_table()
    except ResourceExistsError:
        pass  # already exists
    return blob, table_client


def _find_by_inbox_id(table, inbox_id: str):
    """Find an inbox metadata entity by its InboxId (any partition)."""
    rows = list(table.query_entities("InboxId eq '%s'" % inbox_id))
    return rows[0] if rows else None


def _read_blob(blob, source: str, inbox_id: str) -> str | None:
    try:
        return (
            blob.get_container_client(INBOX_CONTAINER)
            .get_blob_client(f"{source}/{inbox_id}.html")
            .download_blob()
            .readall()
            .decode("utf-8", "replace")
        )
    except Exception as exc:  # blob gone / storage hiccup
        logging.warning("blob read failed for %s/%s: %s", source, inbox_id, exc)
        return None


def _purge_blob(blob, source: str, inbox_id: str) -> None:
    try:
        blob.get_container_client(INBOX_CONTAINER).get_blob_client(f"{source}/{inbox_id}.html").delete_blob()
    except Exception:
        pass  # best-effort hygiene — item is already marked Complete


def _try_parse_json(raw: bytes):
    """Parse a PAD request body. PAD's `Invoke web service` percent-URL-encodes
    the whole body (Content-Type stays application/json) — accept either as-is
    JSON or an encoded JSON payload. The encoded fallback only fires when the
    head looks encoded (%XX with no literal '{'), so a raw-JSON body whose html
    happens to contain '%' sequences is never mangled.

    Encoding must be decoded with `unquote_plus`, NOT `unquote`: PAD form-encodes
    (application/x-www-form-urlencoded semantics), so a space in the HTML arrives
    as '+' and a genuine '+' arrives as '%2B'. `unquote` leaves '+' untouched,
    which corrupted the first real DriveArabia capture (every space became '+',
    e.g. `<html lang=` -> `<html+lang=`); `unquote_plus` restores both.
    """
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        head = raw[:64]
        if b"%" in head and b"{" not in head:
            try:
                return json.loads(urllib.parse.unquote_plus(raw.decode("utf-8")))
            except Exception:
                return None
        return None


# ----------------------------------------------------------------------------- #
#  Existing YallaMotor transport (unchanged)                                      #
# ----------------------------------------------------------------------------- #


@app.route(route="probe_py", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET", "POST", "OPTIONS"])
def probe_py(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":  # CORS preflight
        return _preflight()

    url = req.params.get("url")
    if not url:
        return _json_response({"error": "Missing ?url= parameter"}, status_code=400)

    client = (req.params.get("client") or "cloudscraper").lower()
    time.sleep(random.uniform(0.5, 2.0))  # §6.6 human pacing — the behaviour layer

    start = time.time()
    try:
        # cloudscraper embeds a JS runtime that solves the Cloudflare challenge (§6.5)
        s = cloudscraper.create_scraper(browser={"browser": "chrome", "platform": "windows", "desktop": True})
        r = s.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
    except Exception as exc:  # network / solver failure
        logging.error("fetch failed for %s: %s", url, exc)
        return _json_response({"error": f"fetch failed: {exc}"}, status_code=502)

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
        return _json_response(diagnostics, status_code=r.status_code)

    # Success — include diagnostics and raw HTML for the adapter layer to parse.
    return _json_response({**diagnostics, "html": html})


# ----------------------------------------------------------------------------- #
#  PAD inbox relay — endpoints                                                    #
# ----------------------------------------------------------------------------- #


@app.route(route="ingest_html", auth_level=func.AuthLevel.FUNCTION, methods=["POST", "OPTIONS"])
def ingest_html(req: func.HttpRequest) -> func.HttpResponse:
    """Receive a PAD-captured page. Storage/queueing only — zero extraction (guide §6.1).

    Body: {"source": "drivearabia"|"dubizzle", "url": "...", "searchUrl": "..." (opt), "html": "..."}
    Returns 202 + {"inboxId": ...}.
    """
    if req.method == "OPTIONS":
        return _preflight()
    if not STORAGE_CONN:
        return _storage_unavailable()

    # Parse the body directly (content-type-agnostic) — PAD's Invoke web service
    # has been seen sending application/xml AND percent-URL-encoding the whole
    # body (the "invalid JSON body" 400 this fallback fixes). _try_parse_json
    # accepts raw JSON or a percent-encoded JSON payload. On a parse failure,
    # echo diagnostics so the PAD-side fix is obvious (and no redeploy
    # round-trip is needed to find out what arrived).
    raw = req.get_body() or b""
    body = _try_parse_json(raw)
    if not isinstance(body, dict):
        ct = req.headers.get("Content-Type") or "(none)"
        logging.warning("ingest invalid body: ct=%s bytes=%d preview=%r", ct, len(raw), raw[:160])
        return _json_response({"error": f"invalid JSON body (content-type={ct}, bytes={len(raw)}, preview={raw[:80]!r})"}, status_code=400)

    source = (body.get("source") or "").lower()
    if source not in VALID_SOURCES:
        return _json_response({"error": f"unknown source '{source}' (expected: {sorted(VALID_SOURCES)})"}, status_code=400)

    url = body.get("url")
    if not url:
        return _json_response({"error": "missing 'url'"}, status_code=400)

    html = body.get("html")
    if not isinstance(html, str) or not html.strip():
        return _json_response({"error": "missing or empty 'html'"}, status_code=400)
    if len(html.encode("utf-8")) > MAX_HTML_BYTES:
        return _json_response({"error": f"html exceeds {MAX_HTML_BYTES // 1_000_000}MB cap"}, status_code=413)

    inbox_id = uuid.uuid4().hex[:12]
    search_url = body.get("searchUrl") or ""
    kind = (body.get("kind") or "detail")[:16]  # optional forward-compat field

    try:
        blob, table = _ensure_inbox_storage()
        blob.get_container_client(INBOX_CONTAINER).get_blob_client(f"{source}/{inbox_id}.html").upload_blob(html, overwrite=False)

        now = datetime.now(timezone.utc)
        table.create_entity({
            "PartitionKey": source,
            "RowKey": f"{int(now.timestamp() * 1000):016d}-{inbox_id}",  # sortable oldest-first
            "InboxId": inbox_id,
            "Source": source,
            "Url": url,
            "SearchUrl": search_url,
            "Kind": kind,
            "Status": "Pending",
            "CreatedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
    except Exception as exc:
        logging.error("ingest storage failed: %s", exc)
        return _json_response({"error": f"ingest storage failed: {exc}"}, status_code=502)

    logging.info("ingested %s %s in=%s", source, inbox_id, now.strftime("%H:%M:%SZ"))
    return func.HttpResponse(
        json.dumps({"inboxId": inbox_id, "source": source, "status": "Pending"}),
        status_code=202,
        mimetype="application/json",
        headers=CORS_HEADERS,
    )


@app.route(route="next_pending", auth_level=func.AuthLevel.ANONYMOUS, methods=["GET", "OPTIONS"])
def next_pending(req: func.HttpRequest) -> func.HttpResponse:
    """Return the oldest Pending inbox item for the browser to parse (guide §6.2).

    Plain call  → {"inboxId", "source", "url", "searchUrl", "kind", "status"}
    ?inboxId=id → same metadata + the raw `html` blob (capped at the ingest limit).
    Empty queue → 404 {"error": "no_pending"}.
    """
    if req.method == "OPTIONS":
        return _preflight()
    if not STORAGE_CONN:
        return _storage_unavailable()

    try:
        blob, table = _ensure_inbox_storage()
    except Exception as exc:
        logging.error("next_pending storage init failed: %s", exc)
        return _json_response({"error": f"storage init failed: {exc}"}, status_code=500)

    try:
        inbox_id = req.params.get("inboxId")
        if inbox_id:
            entity = _find_by_inbox_id(table, inbox_id)
            if not entity:
                return _json_response({"error": "not_found"}, status_code=404)
            html = _read_blob(blob, entity["PartitionKey"], entity["InboxId"])
            if html is None:
                return _json_response({"error": "blob_missing"}, status_code=502)
            return _json_response({
                "inboxId": entity["InboxId"],
                "source": entity["Source"],
                "url": entity["Url"],
                "searchUrl": entity.get("SearchUrl", ""),
                "kind": entity.get("Kind", "detail"),
                "status": entity.get("Status"),
                "html": html,
            })

        pending = list(table.query_entities("Status eq 'Pending'"))
        if not pending:
            return _json_response({"error": "no_pending"}, status_code=404)
        pending.sort(key=lambda e: e.get("RowKey", ""))  # RowKey is zero-padded ms
        oldest = pending[0]
        return _json_response({
            "inboxId": oldest["InboxId"],
            "source": oldest["Source"],
            "url": oldest["Url"],
            "searchUrl": oldest.get("SearchUrl", ""),
            "kind": oldest.get("Kind", "detail"),
            "status": oldest.get("Status"),
        })
    except Exception as exc:
        logging.error("next_pending failed: %s", exc)
        return _json_response({"error": f"next_pending failed: {exc}"}, status_code=500)


@app.route(route="inbox_status", auth_level=func.AuthLevel.ANONYMOUS, methods=["POST", "OPTIONS"])
def inbox_status(req: func.HttpRequest) -> func.HttpResponse:
    """Browser marks an inbox item done/failed (guide §7.1).

    Body: {"inboxId": "...", "status": "Complete"|"Error"}
    Complete → purge the HTML blob (inbox hygiene §10). Error → keep the blob
    so the raw HTML can be re-processed. Anonymous + CORS because only the
    browser calls it, and a function key must never live in the client bundle.
    """
    if req.method == "OPTIONS":
        return _preflight()
    if not STORAGE_CONN:
        return _storage_unavailable()

    body = _try_parse_json(req.get_body() or b"")
    if not isinstance(body, dict):
        return _json_response({"error": "invalid JSON body"}, status_code=400)

    inbox_id = body.get("inboxId")
    status = (body.get("status") or "").strip()
    if not inbox_id:
        return _json_response({"error": "missing 'inboxId'"}, status_code=400)
    status = status[:1].upper() + status[1:].lower()  # "complete" -> "Complete"
    if status not in VALID_STATUSES:
        return _json_response({"error": f"invalid status (expected {sorted(VALID_STATUSES)})"}, status_code=400)

    try:
        blob, table = _ensure_inbox_storage()
        entity = _find_by_inbox_id(table, inbox_id)
        if not entity:
            return _json_response({"error": "not_found"}, status_code=404)

        # azure-data-tables upsert only supports REPLACE (not Merge) — rebuild the
        # entity from the known props with the new Status so nothing is lost.
        table.upsert_entity(
            {
                "PartitionKey": entity["PartitionKey"],
                "RowKey": entity["RowKey"],
                "InboxId": entity["InboxId"],
                "Source": entity["Source"],
                "Url": entity["Url"],
                "SearchUrl": entity.get("SearchUrl", ""),
                "Kind": entity.get("Kind", "detail"),
                "Status": status,
                "CreatedAt": entity.get("CreatedAt", ""),
            },
            mode=UpdateMode.REPLACE,
        )
        if status == "Complete":
            _purge_blob(blob, entity["PartitionKey"], entity["InboxId"])
            logging.info("inbox %s Complete (blob purged)", inbox_id)
        else:
            logging.info("inbox %s Error (blob kept for reprocessing)", inbox_id)
        return _json_response({"inboxId": inbox_id, "status": status})
    except Exception as exc:
        logging.error("inbox_status failed: %s", exc)
        return _json_response({"error": f"inbox_status failed: {exc}"}, status_code=500)