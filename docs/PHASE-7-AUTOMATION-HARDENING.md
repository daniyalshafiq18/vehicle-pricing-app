# Phase 7 — Automation and Production Hardening

The detailed transport decision and alternatives are recorded in [DriveArabia Automation Decision: Power Automate Cloud vs Desktop](DRIVEARABIA-CLOUD-VS-PAD-DECISION.md).

## Goal

Turn the proven multi-source workflow into a reliable one-click administrator operation without weakening evidence separation, correlation, retry safety, or portal security.

Phase 7 does not replace the DriveArabia parser or normalized Dataverse evidence model. It automates transport around those proven boundaries.

## Delivery slices

| Slice | Outcome | Status |
|---|---|---|
| 7A. Secured one-click DriveArabia | A queued Dataverse Source Result triggers the cloud flow, PAD returns its exact Inbox ID to that row, and the app processes that capture automatically | Dataverse flow and application handoff implemented; live acceptance pending |
| 7B. Background completion | Processing continues safely when the administrator closes the page | Not started |
| 7C. Retry and bulk reliability | Immutable retry attempts, pacing, bounded bulk execution and per-source retry controls | Not started |
| 7D. Monitoring and retention | Stale-run visibility, diagnostic summaries, transient inbox cleanup and operational alerts | Not started |
| 7E. Security hardening | Administrator-only flow access, least-privilege table permissions and removal of broad temporary roles | Not started |

## Slice 7A contract

```text
Admin clicks Scrape
  → app creates one shared Vehicle Scrape Run and queued Source Results
  → YallaMotor executes through its existing cloud path
  → added DriveArabia/Queued Source Result triggers the automated Dataverse flow
  → flow marks that result Running and runs PAD with its correlated Source URL
  → PAD captures HTML and uploads it to Azure ingest_html
  → flow writes StatusCode=202 and the exact InboxId back to the same Source Result
  → app polls that exact row and runs the existing parser/evidence writer for its InboxId
  → shared Run reaches its normal terminal state
```

The correlated URL remains available as the attended rollback path. If the flow is absent, unauthorized, unavailable, or returns an invalid result, the prepared Run is preserved and the dialog shows the diagnostic PAD URL.

## Security boundary

- Use the Microsoft Dataverse **When a row is added, modified or deleted** trigger with Added, Organization scope, and `vpi_source eq 2 and vpi_processingstatus eq 1`.
- Keep the flow solution-aware and use the authorized Desktop flows connection reference for the registered machine.
- Serialize attended executions with trigger concurrency set to one.
- Do not expose a signed HTTP callback, connection credential, or machine credential to Power Pages or the SPA.
- Keep the Azure `ingest_html` function key only inside PAD.

### Temporary development exception (updated 2026-08-28)

The duplicate Contact problem is resolved and the signed-in Entra user now maps to one authenticated Contact. Dedicated `VPI Administrators` enforcement was deliberately deferred, so the registered flow remains temporarily assigned to **Authenticated Users** on the private trusted-test site. Anonymous Users remain denied. This exception must be removed before production acceptance by assigning the authenticated Contact to `VPI Administrators` and replacing the broad flow role.

Official reference: <https://learn.microsoft.com/power-pages/configure/cloud-flow-integration>

## Active Dataverse cloud flow build contract

1. Create a solution-aware automated flow with Microsoft Dataverse **When a row is added, modified or deleted**.
2. Configure Added, `Vehicle Scrape Source Results`, Organization scope, and filter rows `vpi_source eq 2 and vpi_processingstatus eq 1`.
3. Enable trigger concurrency and set degree of parallelism to one.
4. Update the triggering Source Result by its primary ID: Processing Status Running and Started On `utcNow()`.
5. Invoke **Run a flow built with Power Automate for desktop** through the authorized Desktop flows connection reference. Select `PAD - DriveArabia`, Attended mode, and pass the trigger's Source URL into `DriveArabiaUrl`.
6. On success, update the same Source Result with PAD `InboxId`, PAD `StatusCode`, and Captured On `utcNow()`; keep Processing Status Running until evidence processing validates the capture.
7. In a parallel branch configured to run only when the PAD action fails, times out, or is skipped, update the same row to Failed with `PAD_DISPATCH_FAILED`, a bounded diagnostic message, and Completed On `utcNow()`.
8. Save and turn on the flow. Creating a new matching source-result is the test event; existing rows do not retrigger an Added-only flow.

The application owns the parent MVR lifecycle around this asynchronous flow. Successful preparation sets MVR Scrape Status to In Progress. While DriveArabia remains outstanding, that state overrides any early standalone-compatible YallaMotor legacy status. Final shared aggregation writes Scraped when at least one selected source succeeded, Failed when all selected sources failed, or keeps In Progress while the Run remains active.

## Legacy Power Pages cloud flow contract (diagnostic only)

1. Create a solution-aware instant cloud flow with **When Power Pages calls a flow**.
2. Add four trigger inputs whose names and types exactly match the properties carried inside the Power Pages API's fixed outer `eventData` envelope:
   - `driveArabiaUrl` — Text
   - `missingVehicleRequestId` — Text
   - `runCorrelationId` — Text
   - `attemptNumber` — Number
3. Do not add a trigger input named `eventData` and do not add a Parse JSON action. `eventData` is the transport envelope used by `/_api/cloudflow/v1.0/trigger/<guid>`; Power Pages maps its inner properties directly to the four trigger inputs before creating the flow run.
   The portal client must submit that envelope as URL-encoded form data equivalent to `{ eventData: JSON.stringify(inputs) }`. Use Power Pages `shell.ajaxSafePost` when the template exposes it; otherwise acquire the CSRF token through `shell.getTokenDeferred()` and make the equivalent authenticated form POST. Do not reuse the Dataverse `webapi.safeAjax` JSON transport for this endpoint; it can fail inside Power Pages before a cloud-flow run is created.
4. Invoke **Run a flow built with Power Automate for desktop** on the registered machine/machine group.
5. Pass the trigger's `driveArabiaUrl` value directly into PAD's existing `DriveArabiaUrl` input.
6. PAD must expose two output variables after `Invoke web service`:
   - `InboxId` — parsed from `WebServiceResponse.inboxId`
   - `StatusCode` — the existing HTTP status code
7. Add **Return value(s) to Power Pages** with `InboxId` (Text) and `StatusCode` (Number).
8. Add the flow to the Power Pages site and grant only the administrator web role. During the documented development exception, Authenticated Users may be used temporarily; Anonymous Users must never be granted.
9. Copy the generated Power Pages cloud-flow URL. Store its final GUID in the `VPI/DriveArabiaCloudFlowId` Power Pages site setting so a later replacement does not require rebuilding the SPA:

   ```ini
   VPI/DriveArabiaCloudFlowId=<generated-guid>
   ```

   `VITE_DRIVEARABIA_CLOUD_FLOW_ID` may be used as a local-development fallback when the SPA shell is not rendered by Power Pages.

## Acceptance gate

### Current platform blocker (2026-08-28)

The production code site successfully resolves `VPI/DriveArabiaCloudFlowId` at runtime and submits the documented CSRF-authenticated, URL-encoded `eventData` envelope as the authenticated portal Contact. The Power Pages endpoint nevertheless returns HTTP 500 after its Contact and role lookups and before a Power Automate run is created. A response-only smoke flow reproduced the same failure with no run (correlation `7bfe875e-4b7d-4ddd-9aad-ecc13d9d0134`, `2026-08-28 09:52:59 UTC`), while manually running the production cloud flow successfully started PAD and returned Inbox ID `087ae330a1ef` with status `202`. Exact recovery of that ID completed the intended MG 5 MVR, Run and Source Result without consuming an older Captiva capture. The visible missing MVC `Error` view is secondary. This isolates the blocker to Power Pages dispatch and supplies a Microsoft support case; do not change the scraper, PAD or machine connection to address it.

### Direct HTTP diagnostic proof (2026-08-31)

A temporary copy of the cloud flow replaced the Power Pages trigger with **When an HTTP request is received**, retained the attended PAD action, and returned PAD outputs through an asynchronous HTTP Response. A Postman Web request using the exact application-prepared payload returned `202 Accepted`; the cloud flow then completed PAD, received Inbox `e9fa983b3483` with ingest status `202`, and returned the mapped values. Processing that exact Inbox ID completed one correlated capture and updated the prepared MG 5 request under Run correlation `6ead7d6a-f91e-4f21-b542-bed6f0d05f49`.

This proves every component after the Power Pages dispatch boundary. It does not complete 7A: the HTTP trigger was temporarily set to **Anyone**, its signed callback URL is a credential, Postman supplied the request manually, and the administrator manually processed the returned Inbox ID. Never place that callback URL in the SPA. Production still requires either repair of the role-protected Power Pages association or another server-side authorization/dispatch boundary, followed by automatic asynchronous Inbox completion.

The diagnostic also confirmed two operational rules:

- An arbitrary correlation is retained for retry because no prepared Run/Source Result can own it. Always prepare the scrape in the application first and pass the exact `driveArabiaUrl`, MVR ID, Run correlation, and attempt number.
- Attended PAD can exceed synchronous client limits. Postman's Cloud Agent disconnected after 30 seconds, while Power Automate inbound synchronous requests are bounded. The HTTP diagnostic therefore uses asynchronous response and treats the flow run plus exact Inbox ID as the durable completion state.

### Dataverse-triggered replacement implemented (2026-08-31)

The secure replacement avoids browser dispatch entirely. Preparation writes the complete correlated PAD URL into the queued DriveArabia Source Result's existing `vpi_sourceurl` field before Dataverse creates the row. The configured automated flow triggers on a newly added Source Result where Source is DriveArabia (`2`) and Processing Status is Queued (`1`), sets it Running with Started On, invokes PAD with Source URL, and writes the returned Inbox ID/status/Captured On back to that same row. Its parallel failure branch marks the same result Failed with a durable code, message and Completed On. No signed HTTP callback or Power Pages flow registration is exposed to the SPA, and no Dataverse schema change is required.

The unified application path no longer invokes the existing Power Pages flow or waits on a Power Pages-cached Dataverse receipt. It polls Azure `next_pending` by the exact prepared Run correlation and attempt, validates the returned URL fragment, and processes only that Inbox ID. The Dataverse flow still writes Inbox/status/timing for durable audit. The old Power Pages and direct-HTTP flows remain diagnostic artifacts until live acceptance and cleanup; the correlated URL and record-scoped exact-Inbox action remain controlled rollback.

### Dataverse dispatch live result (2026-09-01)

A fresh portal scrape created DriveArabia Source Result `35cbb3d5-c4a5-f111-aaac-70a8a5539ec6` at `05:20:25Z`. The Dataverse-triggered flow launched without a browser flow call, completed PAD in roughly 32 seconds, and received Inbox `03df3cede18b` with HTTP `202`. The actual **Record PAD Receipt** inputs and the saved Dataverse row both contained that Inbox ID, status, Running state and capture timestamp. Processing the exact Inbox manually completed the prepared result successfully.

At that point, this closed the secure-dispatch and durable-receipt portions of the gate. A Volkswagen PASSAT CC retest confirmed that change tracking plus cache reset still did not expose a workflow receipt promptly, so the cached Source Result read was removed from the completion path. Azure correlation lookup was then awaiting Azure Function deployment, portal deployment and one fresh live acceptance run; the following section records completion of that gate.

### Final correlated workflow acceptance (2026-09-04)

The correlation-aware Azure Function and portal workflow are deployed and accepted live. Automatic Dataverse dispatch, published PAD execution, valid native-PAD JSON upload, exact Run/attempt discovery, exact Inbox retrieval, parser persistence, Source Result success, parent Run completion, MVR `Scraped` status, Inbox `Complete` acknowledgement and HTML purge all pass without manual Inbox entry. Nissan Patrol `SE Titanium` and the distinct `LE Titanium+` grade also pass with specifications, closing the remaining marker-free split-grade acceptance gate. Record-scoped exact-Inbox processing remains available as recovery rather than a normal workflow step.

- One admin Scrape action prepares both sources.
- YallaMotor succeeds exactly as before.
- DriveArabia PAD starts without copying a URL or manually pressing Run.
- PAD returns `StatusCode=202` and a non-empty `InboxId`.
- The app processes that exact capture without **Process PAD Capture**.
- DriveArabia Source Result succeeds in the same shared Run.
- Manual correlated URL and record-scoped processing remain usable as rollback.
- A non-admin portal user receives Forbidden when attempting to invoke the flow.

## Known boundary after 7A

The portal performs the final HTML parsing and Dataverse evidence write after the cloud flow returns. If the page closes before that handoff, the Azure inbox item remains Pending and can be recovered through the record-scoped action by entering its exact Inbox ID. Slice 7B will move completion to an authorized background worker so it no longer depends on an open browser session.
