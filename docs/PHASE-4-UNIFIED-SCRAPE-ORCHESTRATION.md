# Phase 4 — Unified Scrape Orchestration

**Status:** Contract approved; implementation pending  
**Started:** 2026-08-20

## Objective

Replace the source-specific per-request scrape action with one source-neutral admin action that coordinates selected sources under one Vehicle Scrape Run while preserving each source's independent evidence and the proven legacy Missing Vehicle Request writes.

```text
Missing Vehicle Request
└── one shared Vehicle Scrape Run
    ├── YallaMotor Source Result      (Used Market Asking)
    └── DriveArabia Source Result     (Original Reference)
```

Phase 4 coordinates evidence collection. It does not combine prices, approve a price, promote a vehicle to Vehicle Data, or make PAD unattended.

## Confirmed constraints

- The existing Run and Source Result tables, relationships, choices, counts, correlation fields and alternate Result Correlation key are sufficient. No Dataverse metadata change is currently required.
- YallaMotor remains Azure-first with Power Automate Cloud fallback.
- DriveArabia remains an attended PAD capture followed by **Process PAD Inbox**.
- Existing legacy MVR writes remain enabled throughout migration.
- Existing standalone YallaMotor and uncorrelated DriveArabia paths remain available as rollback/compatibility paths until shared orchestration is live-proven.
- Captured HTML remains transient and is never copied into Dataverse.

## Admin interaction

The per-request **Scrape** button opens a source-selection dialog. Available sources are selected by default:

```text
Scrape vehicle
[x] YallaMotor    Used Market Asking
[x] DriveArabia   Original Reference
[ ] Dubizzle      Not available yet

Cancel                       Start scrape
```

Rules:

- At least one available source must be selected.
- Future sources appear in the same dialog instead of adding more scrape buttons.
- A retry opens the same dialog with only failed, blocked or no-data sources selected by default.
- The existing bulk action remains a clearly labelled YallaMotor-only operation until multi-source bulk/unattended processing is implemented.
- **Process PAD Inbox** remains visible during the attended DriveArabia phase.

## Initial shared Run

Starting a per-request scrape creates exactly one Run:

- Missing Vehicle Request lookup: selected request
- Trigger Type: `Single Request`
- Overall Status: `Running`
- Requested Source Count: number of selected sources
- Successful Source Count: `0`
- Failed Source Count: `0`
- Correlation ID: generated UUID
- Batch Correlation ID: optional; not required for a single request
- Started On: current timestamp
- Completed On and Error Summary: empty

The orchestrator then creates one queued Source Result for every selected source before starting transport work. This makes the requested work durable and visible even when DriveArabia finishes later.

## Queued Source Results

Each initial Source Result uses a deterministic alternate key:

```text
<run-correlation-id>:<normalized-source>:1
```

Common initial fields:

- Scrape Run lookup: shared Run
- Attempt Number: `1`
- Processing Status: `Queued`
- Source, transport and price type: source-specific values
- Prices, listing count, specifications and completion fields: empty until processed

Source contracts:

| Source | Initial transport | Price type |
|---|---|---|
| YallaMotor | Azure Function | Used Market Asking |
| DriveArabia | Power Automate Desktop | Original Reference |

If YallaMotor falls back to Power Automate Cloud, its existing queued result is updated to the actual transport.

## YallaMotor execution

The YallaMotor adapter receives an existing orchestration context containing the Run ID, Run correlation ID and queued Source Result ID. It:

1. Marks its Source Result `Running` and records Started On.
2. Runs the existing Azure-first/fallback scraper unchanged.
3. Preserves the proven legacy MVR update.
4. Updates the queued result to `Succeeded`, `No Data`, `Blocked` or `Failed` with source evidence and bounded diagnostics.
5. Requests parent Run aggregation.

It must not create or finalize a separate Run when an orchestration context is supplied. Its existing standalone dual-write entry point remains available during migration.

## DriveArabia correlation and execution

The orchestrator produces a PAD URL with a non-secret fragment containing the Run correlation and attempt:

```text
https://www.drivearabia.com/.../<year>/#vpiRun=<run-correlation-id>&vpiAttempt=1
```

The fragment does not affect the DriveArabia path used for vehicle matching. PAD already uploads the final `window.location.href`, and the Azure inbox already stores that URL, so no new Dataverse column or Azure queue field is required initially.

The attended flow remains:

1. Admin starts the shared scrape.
2. YallaMotor executes immediately.
3. The app presents/copies the correlated DriveArabia PAD URL.
4. Admin runs PAD and receives HTTP `202` plus an Inbox ID.
5. Admin clicks **Process PAD Inbox**.
6. The processor extracts the Run correlation, exactly matches the MVR and trim, and finds the queued DriveArabia Source Result under that Run.
7. The proven legacy MVR update is preserved.
8. The queued result is updated with DriveArabia evidence and the parent Run is re-aggregated.

Before storing Source URL evidence, the internal `vpiRun`/`vpiAttempt` fragment is removed.

### Correlation safety

- A valid explicit correlation must belong to the exact matched MVR and contain the expected DriveArabia attempt.
- Retrieve the prepared Run directly through `vpi_correlationkey` with only the fields required for resolution, then verify its MVR lookup and active status. Do not make the attended recovery path depend on a broad lookup-filtered Run listing or optional Run columns.
- A mismatched, missing or ambiguous correlated target is never guessed.
- A correlated capture is acknowledged as Complete only after its prepared Source Result persists successfully. Resolution or persistence warnings keep the capture Pending and visible for retry.
- An uncorrelated legacy PAD capture continues through the existing standalone DriveArabia dual-write path.
- Only one active shared Run is allowed per MVR. Starting another requires completing/cancelling the active Run or explicitly entering retry behavior.
- Redirect preservation of the URL fragment is a live acceptance gate. If DriveArabia drops it, the fallback design is an explicit correlation value in the PAD payload—not attachment to the newest Run by guesswork.

## Run aggregation

Aggregation uses the latest Source Result attempt for every source requested by the Run.

| Latest source states | Parent Run state |
|---|---|
| Any `Queued` or `Running` | `Running` |
| All `Succeeded` | `Completed` |
| At least one `Succeeded`; all others terminal non-success | `Partial Success` |
| No `Succeeded`; all terminal | `Failed` |
| Explicitly cancelled | `Cancelled` |

Counts:

- Successful Source Count = latest results in `Succeeded`
- Failed Source Count = latest terminal results in `No Data`, `Blocked`, `Failed` or `Skipped`
- Requested Source Count does not change after the Run starts
- Completed On is written only when every requested source is terminal
- Error Summary is a bounded summary of terminal non-success results

No source may independently mark the shared Run Completed. Only the common aggregator finalizes it.

## Retry contract

Retries are immutable and auditable:

- A retry creates a new Run with Trigger Type `Retry`.
- Only selected failed/blocked/no-data sources are requested.
- Successful evidence from the previous Run is not overwritten or re-scraped unless explicitly selected.
- The new Run receives new Source Result rows and its own correlation ID.
- Attempt Number increments for that MVR/source history where practical; Result Correlation ID remains unique regardless.
- Previous Runs and Source Results remain unchanged.

This avoids reopening completed Runs and preserves a clear attempt history.

## Failure isolation

- A source transport failure updates only that source's result.
- A successful source remains successful when another source fails.
- A legacy MVR update remains visible if normalized evidence persistence later fails.
- Run aggregation/finalization failure is surfaced as an evidence warning and never rewrites source evidence inaccurately.
- Duplicate alternate-key creation is treated as an idempotency signal: retrieve/update the existing target rather than creating another logical attempt.

## Planned application structure

- `multiSourceOrchestrator.ts`: shared Run creation, queued result creation, source dispatch and aggregation
- `vehicleScrapeRunState.ts`: pure latest-attempt selection, counts and Run-status calculation
- `useTriggerMultiSourceScrape.ts`: mutation lifecycle, query invalidation and administrator feedback
- Source-selection dialog in Admin Missing Vehicles
- YallaMotor adapter overload/context for an existing queued result
- DriveArabia evidence target resolution from PAD correlation
- Existing source-specific functions retained as compatibility wrappers until live acceptance

## Implementation slices

1. [x] Add pure orchestration/status types and aggregation tests.
2. [x] Add shared Run plus queued Source Result creation with rollback-safe warnings.
3. [x] Adapt YallaMotor to update an existing queued result.
4. [x] Add correlated DriveArabia PAD URL generation and parsing.
5. [x] Adapt PAD processing to update the queued DriveArabia result, with legacy fallback.
6. [x] Add the source-selection dialog and unified per-request action.
7. [x] Clarify the existing bulk action as YallaMotor-only.
8. [ ] Run automated verification, build/upload, and complete live acceptance.

## Live acceptance gate

For one fresh MVR with both sources selected:

1. One Run is created with Requested Sources `2`.
2. Exactly two attempt-1 Source Results are created under that Run.
3. YallaMotor succeeds under the shared Run without creating another Run.
4. The correlated PAD URL survives DriveArabia navigation.
5. Process PAD Inbox updates the queued DriveArabia result under the same Run.
6. Legacy MVR fields continue to update.
7. The Run becomes Completed with counts `2/2/0`.
8. The two results retain independent price types and prices.
9. No duplicate Runs or Source Results are created.
10. A separate partial-failure/retry test proves that only the failed source is retried and previous evidence remains unchanged.

## Out of scope

- Automatic final price selection or blending
- Evidence comparison/approval UI
- Vehicle Data promotion
- Unattended/cloud-triggered PAD
- Automatic PAD inbox polling
- Multi-source bulk scraping
- Dubizzle implementation
- Removal of legacy MVR scrape fields
- Production permission hardening
