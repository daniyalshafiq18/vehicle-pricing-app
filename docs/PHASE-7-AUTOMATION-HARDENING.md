# Phase 7 — Automation and Production Hardening

The detailed transport decision and alternatives are recorded in [DriveArabia Automation Decision: Power Automate Cloud vs Desktop](DRIVEARABIA-CLOUD-VS-PAD-DECISION.md).

## Goal

Turn the proven multi-source workflow into a reliable one-click administrator operation without weakening evidence separation, correlation, retry safety, or portal security.

Phase 7 does not replace the DriveArabia parser or normalized Dataverse evidence model. It automates transport around those proven boundaries.

## Delivery slices

| Slice | Outcome | Status |
|---|---|---|
| 7A. Secured one-click DriveArabia | Power Pages invokes a role-protected cloud flow, cloud flow runs PAD, PAD returns its exact Inbox ID, and the app processes that capture automatically | Implemented; replacement solution-native flow, authorized machine connection and site registration configured; live acceptance pending |
| 7B. Background completion | Processing continues safely when the administrator closes the page | Not started |
| 7C. Retry and bulk reliability | Immutable retry attempts, pacing, bounded bulk execution and per-source retry controls | Not started |
| 7D. Monitoring and retention | Stale-run visibility, diagnostic summaries, transient inbox cleanup and operational alerts | Not started |
| 7E. Security hardening | Administrator-only flow access, least-privilege table permissions and removal of broad temporary roles | Not started |

## Slice 7A contract

```text
Admin clicks Scrape
  → app creates one shared Vehicle Scrape Run and queued Source Results
  → YallaMotor executes through its existing cloud path
  → app invokes a Power Pages-associated cloud flow through the same-origin API
  → cloud flow runs PAD on the registered machine with DriveArabiaUrl
  → PAD captures HTML and uploads it to Azure ingest_html
  → PAD/cloud flow returns StatusCode=202 and the exact InboxId
  → app retrieves that InboxId directly and runs the existing parser/evidence writer
  → shared Run reaches its normal terminal state
```

The correlated URL remains available as the attended rollback path. If the flow is absent, unauthorized, unavailable, or returns an invalid result, the prepared Run is preserved and the dialog shows the manual PAD URL.

## Security boundary

- Use **When Power Pages calls a flow**, not a public HTTP/SAS trigger.
- Add the solution-aware flow to the Power Pages site and assign only the administrator web role.
- The portal invokes `/_api/cloudflow/v1.0/trigger/<guid>` through its authenticated session and CSRF token.
- `VPI/DriveArabiaCloudFlowId` contains the generated flow registration GUID as a runtime Power Pages site setting. It is not a trigger secret. `VITE_DRIVEARABIA_CLOUD_FLOW_ID` is only a local-development fallback.
- Keep the Azure `ingest_html` function key only inside PAD.
- Never assign this flow to Anonymous Users or general Authenticated Users.

### Temporary development exception (2026-08-25)

The site currently has duplicate Contact records and no populated External Identity rows, so the signed-in administrator Contact could not yet be identified reliably for the dedicated `VPI Administrators` role. To unblock live acceptance, the registered flow is temporarily assigned to **Authenticated Users** only. Anonymous Users remain denied. This exception is permitted only while the site is restricted to trusted testers and the registered machine is controlled; it must be removed before production acceptance by identifying the administrator Contact, assigning `VPI Administrators`, and replacing the broad flow role.

Official reference: <https://learn.microsoft.com/power-pages/configure/cloud-flow-integration>

## Cloud flow build contract

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

The production code site successfully resolves `VPI/DriveArabiaCloudFlowId` at runtime and submits the documented CSRF-authenticated, URL-encoded `eventData` envelope as the authenticated portal Contact. The Power Pages endpoint nevertheless returns HTTP 500 after its Contact and role lookups and before a Power Automate run is created. A response-only smoke flow reproduced the same failure with no run (correlation `7bfe875e-4b7d-4ddd-9aad-ecc13d9d0134`, `2026-08-28 09:52:59 UTC`), while manually running the production cloud flow successfully started PAD and returned Inbox ID `087ae330a1ef` with status `202`. The visible missing MVC `Error` view is secondary. This isolates the blocker to Power Pages dispatch and supplies a Microsoft support case; do not change the scraper, PAD or machine connection to address it.

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
