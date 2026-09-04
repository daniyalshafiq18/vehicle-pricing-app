
# Changelog

## 2026-09-04

### DriveArabia Nissan Patrol specification acceptance complete
- Live validation passed for `LE Titanium+`: the automatic Dataverse-triggered cloud flow, published PAD capture, Azure exact-correlation handoff, parser, Dataverse evidence writes and cleanup completed successfully with specifications. Together with the previously successful `SE Titanium` retest, this closes the remaining Nissan Patrol split-grade acceptance gate. Updated the canonical end-to-end guide, PAD guide, Phase 7 status, project context and development guidance to record the final accepted state.
- Reconciled the remaining architecture and decision-record wording with the accepted implementation: Azure exact Run/attempt lookup is the interactive completion boundary, Dataverse receipt fields are audit data, and the obsolete Power Pages flow registration is not a production dependency.

### Pre-commit Power Pages security cleanup
- Removed the downloaded response-only smoke-flow registration and its broad Workflow table permission from the local export, restored incidental Contact and generated entry-bundle export drift, and retired the legacy server-logic POST bridge. The tracked server-logic file no longer contains a signed Power Automate callback URL and now returns an explicit retired-path response.

## 2026-09-03

### DriveArabia end-to-end operational documentation
- Added `DRIVEARABIA-SCRAPE-END-TO-END.md` as the canonical account of the DriveArabia work from the original rendered-browser requirement through PAD/Azure relay, failed Power Pages dispatch, Dataverse-triggered automation, Power Pages receipt-cache diagnosis, exact Azure correlation, PAD JSON/version failures, trim/specification fixes, final status ownership, deployment, live acceptance, recovery, security and troubleshooting. Registered the document in the project documentation index.

### DriveArabia split-grade specification labels
- Live-tested six Nissan Patrol 2026 grade-only trims through the automatic PAD pipeline. All six completed with correct source evidence and prices, but `SE Titanium` and `LE Titanium+` remained price-only while XE, SE T2, LE T1 and LE Titanium received specifications.
- Corrected marker-free accordion alias extraction to read the complete rendered text of each Specs button rather than only its first text node. DriveArabia can split a commercial grade across nested spans, including a standalone `+`; those nodes now normalize into one alias before repeated engine groups are consolidated. Added exact split-span regressions for `SE Titanium` and `LE Titanium+`. Typecheck, 50 focused tests and focused ESLint pass; a fresh portal publish and live retry remain the acceptance gate.
- Post-publication live validation now passes for `SE Titanium`, including specifications. `LE Titanium+` completes with its correct price but remains price-only. Replaying the current parser against the retained real 157 KB Nissan Patrol HTML produces the complete `LE Titanium+` 3.5L/V6/Petrol/4WD/Automatic/425 HP/700 Nm result, so no broader matching fallback was added; the next gate is confirming the browser loaded the latest published bundle and, if it did, retaining the exact newly failing HTML for structural comparison.

## 2026-09-02

### Phase 7 correlated PAD completion accepted live
- Deployed the correlation-aware Azure Inbox relay to `vpi-probe-py-20260805` with a successful Python 3.11 remote build and trigger synchronization. A nonexistent correlation correctly returned `404 not_found`, proving that the endpoint does not guess an unrelated pending capture.
- Published the Power Pages SPA that polls `next_pending` by exact `runCorrelationId` plus `attemptNumber`, removing the cloud-flow-updated Dataverse row from the interactive receipt critical path.
- Diagnosed repeated PAD `JsonAsCustomObject.inboxId` failures to an invalid ingest body: the browser JavaScript result crossed the current PAD browser bridge as `[object Object]`, and a manually typed `%CustomObjectAsJson%` was later transmitted literally. Replaced the request construction with native **Get details of web page (Web page source)** → PAD Custom Object → **Convert custom object to JSON**, and inserted the JSON variable through PAD's variable picker.
- Confirmed desktop-flow version control was enabled: **Save draft** did not update cloud executions, which continued running the September 1 published version. Publishing the September 2 draft promoted the corrected version used by the Dataverse-triggered cloud flow.
- **Live acceptance passed:** PAD uploaded Inbox `0f25fd05aaa4`; exact-ID retrieval returned `200` for correlation `4e839dee-98fd-4ae1-b46b-bae4f967c95f`, and `POST /api/inbox_status` returned `200` with `status=Complete`. Automatic dispatch, Azure correlation discovery, exact capture retrieval, parsing/persistence, and acknowledgement now complete without manual Inbox entry or waiting for Power Pages' Dataverse cache.
- Native Web Page Source does not include the JavaScript-injected `vpi-pad-spec-groups` marker. The automatic handoff is accepted, but multi-trim specification completeness must be assessed separately before removing the prior rendered-DOM capture technique from the design.
- Added a marker-free DriveArabia specification fallback after the first automatic Nissan Patrol run completed with prices only. The parser now reads fully populated accordion bodies already serialized beneath `#specs`, requires every Specs control to expose a detailed engine block, and de-duplicates identical mechanical configurations while retaining every commercial grade-to-engine association. Explicit PAD markers remain authoritative and preserve their original ambiguity checks. The actual captured Nissan HTML resolves all nine grades across the 3.8 V6/316 HP and 3.5 TC V6/425 HP groups; parser and inbox-processor regression suites pass, while a fresh published-portal run remains the live specification gate.
- Diagnosed the first published marker-free retest for Nissan Patrol `LE Titanium+`: it completed successfully but selected the plain `LE Titanium` AED 347,900–348,000 row and persisted no specs. The first fallback discarded grade aliases while collapsing repeated engines, and general trim normalization erased the semantic `+` suffix. Grade aliases are now merged onto their shared mechanical group and `+` normalizes to `plus`, so the real capture resolves `LE Titanium+` to AED 359,900–360,000 plus 3.5L V6/4WD/Automatic/425 HP/700 Nm. Typecheck, 50 focused tests and focused ESLint pass; republish and a fresh attempt remain required.

## 2026-09-01

### Phase 7 Dataverse dispatch live validation
- Live-tested **MVR - DriveArabia - Dataverse Dispatch** from the portal with a freshly prepared GMC Sierra Source Result. Dataverse created the queued target at `05:20:25Z`, the flow started PAD automatically, and PAD returned accepted Inbox ID `03df3cede18b` with HTTP status `202` at approximately `05:21:09Z`.
- Verified the **Record PAD Receipt** update against Source Result `35cbb3d5-c4a5-f111-aaac-70a8a5539ec6`. Its actual connector inputs contained the correct row ID, `vpi_processingstatus=2`, `vpi_inboxkey=03df3cede18b`, `vpi_httpstatuscode=202`, and capture timestamp; the same values were present on the Dataverse record.
- Recovered the live capture through the record-scoped **Process PAD Capture** action. Exact-Inbox processing succeeded and moved the Source Result to Succeeded, proving dispatch, PAD, Azure Inbox, Dataverse receipt persistence, correlation resolution, parsing, and evidence persistence.
- Isolated the remaining acceptance gap to the browser receipt-read loop. The portal stayed in Preparing until its ten-minute timeout even though Dataverse held the receipt after roughly 45 seconds. The next fix is to verify and bypass stale Power Pages Web API GET responses during polling; manual Inbox entry remains a proven recovery path until that retest passes.
- Added an opt-in cache bypass to the Power Pages request wrapper. Portal `webapi.safeAjax` reads now receive jQuery `cache: false`, while the token-authenticated native Fetch fallback receives `cache: 'no-store'`; ordinary API calls retain their existing behavior.
- Enabled cache bypass for Vehicle Scrape Source Result reads so the three-second PAD receipt loop and active evidence polling cannot reuse an earlier Queued response. Added wrapper-level regression tests for both portal transports plus an API assertion that Source Result queries request fresh data. Typecheck, 14 focused tests and focused ESLint pass; a fresh live MVR remains the acceptance gate.
- **Live retest did not pass automatic completion:** the Audi RS 7 dispatch wrote Inbox `2d752a286bad` and HTTP `202` to Source Result `c53a34ac-eda5-f111-aaac-7ced8d33092e`, but the browser still reached its ten-minute deadline. A later portal GET returned the complete updated record, proving the code bundle, query, permissions and mapping were correct. The remaining delay is Power Pages' server-side Dataverse data cache, which client `cache: false`/`no-store` controls cannot bypass and Microsoft allows up to 15 minutes to refresh after external workflow updates.
- The receipt handoff must therefore stop relying on a time-sensitive Power Pages read of a cloud-flow-updated row. Change tracking should be verified as an environment health check, but the durable design must either complete processing outside the browser or expose completion through a non-cached secure boundary. Exact-Inbox recovery remains available for the live capture.
- Found **Track changes** disabled on the Vehicle Scrape Source Results table in the confirmed AI Hub environment and existing solution. Enabled and published it so Power Pages can receive table change notifications instead of depending only on cache expiry. A one-time server-cache clear and fresh MVR run remain required to measure the improvement; change tracking does not override Microsoft's documented cache SLA.
- A fresh Volkswagen PASSAT CC test still returned a cached Queued Source Result for more than five minutes after the Dataverse-triggered flow succeeded, even after change tracking, publishing, Preview cache reset and client cache bypass. The capture was recovered manually by exact Inbox ID. This closes the investigation: Power Pages reads cannot be the real-time receipt boundary.
- Extended the Azure Inbox relay's `next_pending` endpoint with exact `runCorrelationId` + `attemptNumber` lookup. The function filters Pending DriveArabia items and validates the correlation stored in each captured URL fragment, returning `404 not_found` until the exact capture exists and rejecting ambiguous matches.
- Replaced unified DriveArabia's cached Dataverse receipt polling with three-second Azure correlation polling. Once the exact Inbox item appears, the existing exact-ID HTML processor parses, persists and acknowledges it; the cloud flow's Dataverse Inbox/status write remains durable audit evidence but is no longer on the automatic-completion critical path.
- Added regression coverage for exact, unavailable and mismatched Azure correlations plus orchestration handoff identity. Typecheck, 30 focused tests and focused ESLint pass. Local Python compilation was unavailable because this workstation has no Python runtime; Azure Functions remote build remains the Python validation/deployment gate.

## 2026-08-31

### Phase 7 direct HTTP orchestration proof
- Created a temporary copy of the DriveArabia cloud flow with **When an HTTP request is received**, the existing attended PAD action, and an asynchronous HTTP Response. This bypassed the failing Power Pages site-associated dispatch boundary without changing the scraper, PAD capture, Azure inbox, parser, or Dataverse writers.
- Live-tested the HTTP flow with a Run prepared by the application. Correlation `6ead7d6a-f91e-4f21-b542-bed6f0d05f49` belonged to MVR `94498b42-10a5-f111-aaac-70a8a5539ec6`; PAD returned Inbox `e9fa983b3483` with ingest status `202`, and exact inbox processing completed one capture and updated one request successfully.
- Confirmed that manually invented correlations are safely retained for retry rather than attached to an unrelated Run. A direct HTTP probe must reuse the application-prepared MVR ID, Run correlation, attempt number, and correlated PAD URL.
- Confirmed that synchronous callers are unsuitable for attended PAD: Postman's Cloud Agent disconnected after 30 seconds and caused the final Response action to fail even though PAD had succeeded. Enabling **Asynchronous response** returned `202 Accepted` immediately while the flow continued to completion.
- The HTTP trigger is diagnostic only while configured for **Anyone**. Its signed callback URL is a secret and must not be shipped in the SPA or retained as the production authorization boundary. The remaining goal is a secure app-to-flow bridge plus automatic background Inbox processing.

### Phase 7 Dataverse-triggered dispatch started
- Added the correlated DriveArabia PAD URL to the queued DriveArabia Source Result at preparation time. The existing `vpi_sourceurl` field now carries the complete `vpiRun`/`vpiAttempt` job input before the row is created, allowing an automated Dataverse cloud-flow trigger to dispatch PAD without a browser-to-flow secret or a new schema field. Final evidence persistence still replaces it with the cleaned source URL.
- Added focused preparation coverage for first attempts and retries. YallaMotor queued results remain unchanged and receive no DriveArabia job URL.
- Replaced the browser-to-Power-Pages dispatch in the unified scrape execution with a durable Dataverse receipt handoff. After creating the queued DriveArabia target, the app polls that exact Source Result for the Inbox ID and HTTP status written by the automated flow, then processes only that correlated Inbox capture. Failed/blocked flow rows and non-2xx PAD receipts stop with source-specific diagnostics; the old correlated URL remains visible only for controlled recovery.
- Configured the solution-aware automated flow to trigger on added DriveArabia/Queued Source Results, serialize attended runs at concurrency one, mark the row Running, pass `vpi_sourceurl` to `PAD - DriveArabia`, persist Inbox/status/timestamps on success, and mark the same row Failed on PAD failure, skip, or timeout.
- Coordinated the legacy MVR Scrape Status with the shared multi-source lifecycle. A successfully prepared job enters In Progress; YallaMotor's standalone-compatible legacy write is reset to In Progress while DriveArabia remains outstanding; final Run aggregation maps any terminal success to Scraped, all-terminal failure to Failed, and active work back to In Progress. A dedicated status-only PATCH avoids overwriting prices or scrape payload fields.

### Power Pages deployment fix
- Corrected the Power Pages deployment diagnosis after PAC CLI 2.11.2 confirmed that SPA-specific `download-code-site` and `upload-code-site` commands do not accept `--modelVersion`. Restored their supported syntax and documented the required `pac pages list -v` model/site-identity preflight for an `adx_*` target mismatch. Classic `pac pages download/upload` use numeric model version `2` for Enhanced sites; that parameter must not be copied onto code-site commands.
- Verified the intended site is the sole active Enhanced SPA site in the AI Hub environment. A fresh code-site download detected and regenerated the corrupt local base manifest, removing the stale `adx_entitypermission` upload record that the Enhanced target rejected.
- Reordered `publish.ps1` to download fresh portal state before building and uploading. This preserves the build's new SPA-shell asset references and manifest additions instead of allowing a later download to overwrite them.
- Replaced the final `upload-code-site` call with `pac pages upload --modelVersion Enhanced` against the prepared `.powerpages-site` package. The SPA build already materializes its bundles as Power Pages web files, while the classic upload command provides the required Enhanced-model translation for table permissions and other downloaded `adx_*` configuration records.
- Replaced the first `download-code-site` call with the matching `pac pages download --modelVersion Enhanced`. Mixing the code-site download format with configuration upload failed because its simplified `website.yml` exposes `id`/`name` instead of the required `adx_websiteid`/`adx_name`; the publish pipeline now uses one consistent Enhanced configuration format end to end.
- Updated the post-build portal paths and final upload path for the Enhanced configuration export layout. `pac pages download` writes `website.yml`, `web-files/`, `web-templates/`, and `.portalconfig/` directly beneath `vehicle-pricing-intelligence-platform/`, rather than beneath the `.powerpages-site` wrapper produced by `download-code-site`.
- Updated the post-build asset writer and optional orphan cleanup for the Enhanced configuration export's flat `web-files/` layout. Generated assets now sit beside `<asset>.webfile.yml`, metadata uses `adx_webfileid` and other `adx_*` field names, and manifest IDs are read from either Enhanced or legacy metadata during transition.
- Separated compiled SPA publishing from portal-configuration deployment after the Enhanced configuration upload partially failed: generated component IDs did not exist and the 1.36 MB vendor bundle exceeded `powerpagecomponent.content`'s 1,048,576-byte limit. `npm run publish` now builds without mutating portal metadata and sends `dist/` through `upload-code-site` with `src/` as its isolated source root; the downloaded `adx_*` configuration export is outside the code-site upload root.
- Prevented `upload-code-site` from interpreting an isolated `src/` root as a new website. Publishing now stages `src/` in a unique Windows temporary directory with only the existing site's code-site `website.yml` identity marker, uploads `dist/`, and removes the temporary directory even on failure. No additional folder is created in the repository and no table-permission metadata enters the code upload.
- Replaced the unproven temporary-staging workaround with the live-verified deployment sequence. After removing the contaminated local site export, a fresh `download-code-site`, normal Vite build, and `upload-code-site` against `vehicle-pricing-intelligence-platform/` completed without errors. `publish.ps1` now reproduces those exact commands and no longer mixes classic Enhanced configuration commands with SPA code-site commands.

## 2026-08-28

### Phase 7 DriveArabia runtime configuration
- Moved the registered DriveArabia cloud-flow GUID from build-only configuration to the `VPI/DriveArabiaCloudFlowId` Power Pages site setting, exposed through `window.vpiRuntimeConfig` by both code-site entry documents (`Home.webpage.copy.html` and `SPA-Shell`). Production flow replacements now require a site-setting update and portal refresh rather than a new SPA build; the Vite variable remains a local-development fallback.
- Corrected the Blank Template CSRF fallback to extract the verification token from the hidden input element returned by the current `shell.getTokenDeferred()` implementation before invoking the cloud-flow endpoint.
- Live deployment verified that the runtime setting resolves to the replacement registration and the app sends the documented CSRF-authenticated form envelope. Power Pages still returns HTTP 500 after Contact/role evaluation and before any Power Automate run exists; correlation `296271a1-defd-4c8f-9504-8d7a848fc786` records the remaining platform-side dispatch blocker.
- A response-only Power Pages smoke flow reproduced the same pre-run HTTP 500, while a manual run of the production cloud flow successfully started PAD and returned Azure Inbox ID `087ae330a1ef` with status `202`. This isolates the active fault to Power Pages-to-cloud-flow dispatch.
- Corrected the temporary modal fallback so **Process PAD Capture** requires and retrieves the exact 12-character Inbox ID returned by PAD. It no longer selects an unrelated oldest Pending capture when stale items exist in the relay.
- **Live acceptance passed for exact recovery:** Inbox `087ae330a1ef` processed the intended MG 5 capture despite an older Captiva item remaining Pending, and the administrator verified the MVR, completed Run and succeeded Source Result in Dataverse. Automatic Power Pages dispatch remains the only open 7A gate.

### Phase 7 DriveArabia automation registration replaced
- Replaced the site registration for the inherited DriveArabia cloud flow after correctly authenticated Power Pages requests continued to fail before producing a Power Automate run. A new solution-native `MVR - DriveArabia - On Demand Scrape` flow now uses a newly authorized local-machine Desktop flows connection and a fresh Power Pages registration.
- Updated local build configuration to the replacement Power Pages cloud-flow registration GUID. Live one-click acceptance remains pending the rebuilt portal bundle and end-to-end run.

## 2026-08-27

### Phase 7 Power Pages trigger contract corrected
- Corrected the registered DriveArabia cloud flow after live authenticated requests returned HTTP 500 before creating a Power Automate run. The Power Pages API's outer `eventData` value is a transport envelope: its four inner properties now map directly to matching typed trigger inputs (`driveArabiaUrl`, `missingVehicleRequestId`, `runCorrelationId`, and `attemptNumber`), the redundant Parse JSON action was removed, and the PAD action receives `driveArabiaUrl` directly.
- Updated the Phase 7 architecture and development guidance to prevent confusing the fixed API envelope with a flow trigger input. The generated site-associated flow URL remains unchanged, so no application rebuild is required for this cloud-flow-only correction.
- Corrected the portal transport after re-registration still produced HTTP 500 with no Power Automate run: the dedicated adapter now uses Power Pages `shell.ajaxSafePost` with the serialized `eventData` form envelope instead of sending JSON through the Dataverse `webapi.safeAjax` wrapper.
- Added a CSRF-token form-post fallback for Blank Template SPA runtimes that expose `shell.getTokenDeferred()` but not the optional `shell.ajaxSafePost` convenience helper; the attended PAD URL remains available if neither portal authentication mechanism exists.

## 2026-08-25

### Phase 7 external automation registration
- Registered the solution-aware DriveArabia cloud flow with the Power Pages site and configured its generated non-secret registration GUID through local Vite configuration.
- Temporarily granted the flow to the default Authenticated Users web role so live automation testing can continue while duplicate portal Contacts prevent reliable assignment of the dedicated `VPI Administrators` role. Anonymous Users remain explicitly denied.
- Recorded this as a development-only security exception: administrator-only flow access and least-privilege evidence-table roles remain mandatory before production acceptance.

## 2026-08-24

### Phase 7 secured DriveArabia automation started
- Added a Power Pages cloud-flow adapter that invokes a site-associated, web-role-protected flow through the authenticated same-origin API. Only the generated registration GUID is configured; no HTTP trigger secret is shipped in the portal bundle.
- The unified Scrape action can now pass its correlated DriveArabia URL to PAD automatically, require PAD to return `StatusCode=202` plus the exact Azure Inbox ID, and process that one capture through the existing parser/evidence path without the manual inbox button.
- Preserved the correlated URL and record-scoped Process PAD Capture action as rollback whenever automation is unconfigured or fails. Added exact-Inbox processing and focused tests for flow invocation, response validation, orchestration and capture selection.
- Added `docs/PHASE-7-AUTOMATION-HARDENING.md` with the external cloud-flow/PAD contract, administrator-only security requirement, acceptance gate and background-processing boundary.
- Added a dedicated Cloud-vs-PAD architecture decision record explaining the current DriveArabia rendering constraint, why PAD-only and Cloud-only approaches do not meet the complete one-click requirement, the selected responsibility split, security and licensing boundaries, rollback behavior, alternatives, and objective gates for eventually removing PAD.

### Phase 6 Vehicle Data promotion completed
- Added an explicit **Push to Vehicle Data** action beneath the approved evidence decision. The ordinary MVR Status dropdown can no longer trigger Vehicle Data creation; it now manages only Pending, In Progress and Reject lifecycle states.
- Replaced client-object promotion with a guarded server-read workflow. Promotion reloads the MVR, requires an Approved pricing decision and valid approved range, verifies the Reviewed Run belongs to the request and is terminal, and accepts only Succeeded selected price/specification results from that Run.
- Vehicle Data identity remains the requested make/model/year/trim, while technical fields come from the Selected Specification Result with MVR fallback only where that evidence is absent. Prices come exclusively from Approved Minimum/Maximum Price; legacy scraped prices are no longer the promotion authority.
- Added idempotency guards: an existing MVR Vehicle Data lookup returns safely, one exact make/model/year/spec master match is linked instead of recreated, and ambiguous duplicate matches block promotion. Successful creation links the MVR and sets its ordinary status to Approved only afterward.
- Added MVR modal synchronization after query refresh so a newly saved Approved decision immediately unlocks promotion, plus focused regression coverage for authoritative mapping, non-approved rejection, existing-link idempotency and partial-failure recovery.
- **Live acceptance passed:** an Approved MVR was promoted successfully, the master Vehicle Data identity, approved price range and selected specifications matched, the MVR was linked and finalized, all normalized evidence remained intact, and the refreshed UI prevented duplicate promotion.

### Phase 5 evidence review started
- Added the guarded pricing-decision form beneath normalized evidence. After a Run becomes terminal, admins can choose the decision method/status, authoritative price result, specification result, approved min/max prices and notes. Active Runs remain read-only; invalid ranges, non-succeeded evidence and undocumented overrides/attention/rejection decisions are blocked client-side.
- Added the full MVR decision read/PATCH contract using the confirmed fields and case-sensitive lookup bindings for Reviewed Scrape Run, Primary Price Result and Selected Specification Result. Approved/Rejected decisions record Decided On; Vehicle Data promotion remains intentionally separate.
- Normalized Dataverse `null` values to `undefined` at the scrape-evidence API boundary so queued fields render as unavailable instead of literal `null` or misleading `AED 0`. Source cards also convert Schema.org drivetrain identifiers to concise `FWD`/`RWD`/`AWD`/`4WD` labels.
- Added a read-only Source Evidence section to the Missing Vehicle Request modal. It loads the latest normalized Run and displays source-specific status, price type, transport, min/max prices, listing count, trim and supported specifications side by side without changing the legacy Scrape Results section.
- Added active-Run polling plus explicit loading, empty and retryable error states. The panel stops polling after the latest Run becomes terminal.
- Hardened the MVR Run-list query by excluding the optional Requested By Contact lookup reference that caused the earlier broad Power Pages read to fail; the query retains the Run lifecycle, counts, correlation and ownership fields needed for review.

### Fixed
- Fixed a controlled-select mismatch in the pricing-decision form. MVR system statuses (`Awaiting Scrapes`/`Scraping`) are now normalized to `Ready for Review` when review unlocks, so the displayed default and submitted Dataverse value agree (`3`) without requiring an administrator to change away and back first.
- Extended conservative cross-source trim identity for the live Chevrolet Captiva case: attached `1.5T` and `1.5TC` notation now exposes the same numeric capacity and turbo identity, while `TD` remains distinct. The match still requires identical grade, compatible stated mechanics, the correct year and one unique candidate, allowing MVR `1.5T Premier` to resolve only to DriveArabia `1.5TC I4 Premier`.
- Fixed correlated DriveArabia PAD evidence resolution after live Power Pages returned HTTP `400` for the broad Run query filtered through `_vpi_missingvehiclerequest_value`. The processor now retrieves the exact Run through its `vpi_correlationkey` using a minimal `$select`, then independently verifies that the Run belongs to the matched Missing Vehicle Request and is still active.
- Prevented correlated PAD captures from being acknowledged as Complete when prepared evidence resolution or persistence fails. The capture remains Pending for retry, the successful legacy MVR write is refreshed in the UI, and the administrator receives the actual evidence warning instead of the unrelated “no matching vehicle request” message.
- Added regression coverage for minimal correlation-key Run retrieval, OData literal escaping, MVR ownership rejection, unresolved prepared targets, evidence-write warnings and acknowledgement suppression. Targeted verification passes with 28 tests.

## 2026-08-20

### Phase 4 unified orchestration contract approved
- Added the formal Phase 4 contract for one source-selection action, one shared Run, queued per-source results, common status aggregation, explicit DriveArabia PAD correlation, immutable retry Runs, legacy compatibility, and live acceptance gates.
- Confirmed through a read-only audit that the existing Dataverse tables and application CRUD contracts are sufficient; Phase 4 currently requires no new table or column.
- Kept attended PAD, final price decisions, Vehicle Data promotion, unattended automation, multi-source bulk and Dubizzle outside this phase.
- Added the first implementation slice: pure latest-attempt selection, shared Run aggregation, bounded error summaries and deterministic per-source attempt correlation IDs, with isolated coverage for running, completed, partial, failed, cancelled and retry outcomes.
- Added shared orchestration preparation: one Run and every selected source's queued evidence target are created before any transport starts. Partial setup is terminally failed, already-created targets are marked Skipped, and no scraper is dispatched against an incomplete evidence set.
- Added the prepared-target YallaMotor adapter. It updates an existing queued result through Running to its terminal state, preserves the legacy MVR write, records the actual Azure/Cloud fallback transport, and invokes the common Run aggregator instead of creating or independently completing another Run.
- Corrected the Source Result update type so `errorCode` and `errorMessage` can genuinely be cleared with `null`; their nullable update definitions previously intersected with the non-nullable create fields and lost `null` at compile time.
- Added pure DriveArabia PAD correlation helpers. Shared Runs can be carried in a non-secret `vpiRun`/`vpiAttempt` URL fragment, parsed after canonical redirect, and stripped before source provenance is persisted.
- Wired correlated DriveArabia PAD captures into their exact pre-created Source Result. The inbox processor now resolves the active shared Run and attempt, advances the prepared result through Running to Succeeded/Failed, strips internal URL-fragment markers from persisted provenance, and delegates parent counts/status to the common Run aggregator.
- Preserved legacy uncorrelated PAD dual-write as a compatibility path. Explicit but malformed or unresolved correlation now produces an evidence warning and never silently creates a duplicate standalone Run.
- Added the unified per-request admin Scrape action. It opens a source-selection dialog with YallaMotor and DriveArabia selected by default, prepares one shared Run, executes YallaMotor immediately into its prepared result, and presents the correlated DriveArabia URL for the attended PAD continuation.
- Kept pending DriveArabia work visible even if immediate YallaMotor scraping fails, so one source failure cannot hide or discard the other selected source. Clarified the existing bulk control as YallaMotor-only; multi-source bulk remains outside Phase 4.
- Added conservative cross-source trim resolution after the first unified live test exposed valid naming differences. YallaMotor `3.6L SXT (Mid Option)` can now map to the unique DriveArabia `3.6 V6 SXT` row through matching capacity and distinctive grade, while ambiguity and conflicting stated mechanics still refuse to match.
- Preserved both identities in evidence: DriveArabia Source Result/provenance uses the actual source trim, and normalized/raw evidence also retains the requested MVR trim when it differs. The Pending Dodge Charger capture can therefore be retried without another PAD run after deployment.
- Fixed the unified source-selection dialog rendering differently from modal, card and table triggers. The shared Dialog primitive now portals to `document.body`, preventing animated/transformed cards and table cells from clipping, repositioning, or lending text alignment to the overlay; nested dialog scroll locking also restores the prior body overflow state correctly.
- Temporarily personalized PAD inbox processing for live testing. The page-wide button was removed and each MVR modal now exposes **Process PAD Capture**, passing only that record to exact matching; the Azure relay still serves the oldest Pending item and never skips or guesses past an unrelated capture.

### Fixed
- Updated DriveArabia per-year price parsing to accept both rendered `Original Trim Prices` and `Trim Prices` headings. This fixes valid newer pages such as MG 5 2026 while retaining the existing bounded-section protection against unrelated AED ranges.

### DriveArabia dual-write implemented
- Added `driveArabiaDualWrite.ts`, which creates one normalized Run and DriveArabia Source Result for every exact MVR match produced by the existing PAD inbox processor. Runs from the same capture share the Inbox ID as their batch correlation key.
- Source Results record DriveArabia, Power Automate Desktop, Original Reference, attempt `1`, listing count, min/max prices, exact trim/year, supported specifications, source URL, Inbox ID, timestamps and sanitized normalized/raw JSON. Captured HTML is never written to Dataverse.
- Preserved the proven legacy MVR write, multi-trim matching, queue draining and Pending/Complete/Error acknowledgement behavior. Evidence failures no longer undo a successful legacy update; the admin receives a dedicated evidence warning and the Run is finalized as Failed where possible.
- Added isolated coverage for completed evidence, Run-creation failure, rejected Source Result with bounded diagnostics, inbox integration and warning propagation. Focused TypeScript, Vitest and ESLint verification passes.
- Refreshed the formal Phase 3 roadmap with the current seven-phase multi-source plan and marked DriveArabia dual-write complete after live acceptance.
- **DriveArabia dual-write live acceptance passed:** an MG 5 2026 `STD` request processed through PAD and **Process PAD Inbox**, updated the legacy MVR, created a linked Completed Run with counts `1/1/0`, and created a Succeeded DriveArabia/PAD/Original Reference Source Result with the expected AED 49,900–51,000 range and specifications.

## 2026-08-19

### YallaMotor dual-write migration implemented
- Routed the existing **Scrape Now** YallaMotor operation through a dedicated dual-write service. A successful scrape still updates the legacy Missing Vehicle Request fields and now also creates one linked Vehicle Scrape Run and one YallaMotor Vehicle Scrape Source Result.
- Run rows record the single-request trigger, correlation ID, lifecycle status, requested/successful/failed source counts, and timestamps. Source-result rows preserve YallaMotor price evidence, normalized specifications, source URL, listing count, transport provenance, processing status, attempt number, and a sanitized raw-result snapshot.
- Preserved the working admin experience and existing scraper fallback: Azure remains the primary transport, Power Automate Cloud remains the fallback, and **Scrape Now** still invalidates and refreshes Missing Vehicle Requests.
- Isolated migration risk from the proven legacy path. If a run or source-result write fails after YallaMotor succeeds, the Missing Vehicle Request update is retained and the administrator receives an evidence-storage warning rather than losing the scrape. Failed or blocked scrape attempts record diagnostic evidence when a run can be created.
- Moved orchestration and Dataverse mapping out of `useTriggerScrape` into `yallaMotorDualWrite.ts`; the hook is now limited to mutation lifecycle, notifications, and query invalidation.
- Added isolated regression coverage for successful dual-write, run-creation failure, source-result failure, oversized diagnostic truncation, failed scraping, blocked/unavailable scraping, and canonical regional-category persistence. Verification: TypeScript and focused ESLint pass; the full suite passes **95 tests with 2 live-network tests skipped**; and the production build succeeds.
- Fixed the first live acceptance failure before any Dataverse request was sent: the client validator incorrectly required RFC UUID version/variant bits, while Dataverse sequential record GUIDs may contain segments such as `f011`. Evidence APIs now accept the standard hexadecimal `8-4-4-4-12` Dataverse GUID shape, still reject malformed identifiers, and pin a non-RFC Dataverse-style MVR ID in regression coverage.
- Diagnosed the next live Source Result rejection through temporary Power Pages inner errors: `vpi_modelyear` had been created as Text while the normalized contract writes a Whole Number. The Dataverse column was recreated with the intended numeric type. A second diagnostic exposed that the full OData inner-error stack exceeded the Run's 2,000-character Error Summary limit, so dual-write now caps stored/admin-visible evidence errors at that schema boundary and can reliably finalize the Run as Failed.
- Aligned the Source Result pricing contract with the live column names confirmed in Dataverse: Minimum Price is `vpi_minprice`, Average Price is `vpi_averageprice`, and Maximum Price is `vpi_maxprice`. The previous invented `vpi_minimumprice`/`vpi_maximumprice` names caused the Source Result POST to fail before evidence could be stored; configuration, API fixtures, and schema documentation now pin the real names.
- Removed Source Result Average Price (`vpi_averageprice`) and MVR Approved Average Price (`vpi_approvedaverageprice`) from the application contract at the administrator's request. YallaMotor exposes only a listing range, so the former source average was merely the min/max midpoint and implied evidence the source did not provide. Source evidence and future admin decisions now retain explicit minimum and maximum prices only; unrelated master-vehicle valuation averages and analytics remain unchanged.
- Unified Source Result Category with the established MVR regional-spec logic. YallaMotor values such as `GCC Specs`, `american specs`, and `Other Specs` are now stored canonically as `GCC`, `NON-GCC`, and `OTHER/STANDARD`; Raw Result JSON retains the original extracted wording for auditability.
- **Live acceptance passed:** one YallaMotor **Scrape Now** action successfully preserved the legacy MVR fields, created a linked Completed Run, created a Succeeded YallaMotor Source Result, stored min/max prices and supported specifications/provenance, and finalized all three Power Pages requests with HTTP `204`. A follow-up American-specification capture stored canonical Source Result Category `NON-GCC` while preserving `american specs` in Raw Result JSON. Detailed Power Pages inner errors were returned to `false` after diagnosis.

### Multi-source Dataverse schema contract added
- Registered the confirmed `vpi_vehiclescraperuns` and `vpi_vehiclescrapesourceresults` entity set names, case-sensitive lookup schema names, source/run field contracts, and all verified choice integers in the application configuration.
- Added strongly typed `VehicleScrapeRun` and `VehicleScrapeSourceResult` models and extended `MissingVehicleRequest` with the admin-approved price, decision, evidence-selection, notes, contact, and timestamp fields.
- Kept the new MVR decision fields out of the active portal `$select` and did not add runtime CRUD yet. This preserves the working YallaMotor/DriveArabia behavior until the new tables and fields are enabled in the Power Pages Web API site-setting allow-lists.
- Added regression coverage that pins the two entity set names, five confirmed case-sensitive lookups, and every new Dataverse choice value. Updated the schema, architecture, and development references for the normalized MVR → run → source-result model.
- Recorded the temporary portal-permission state as a mandatory pre-production security item: remove Anonymous/Authenticated access from both evidence tables and grant the required access to Administrators only.
- Verification: TypeScript passes, the full suite passes 84 tests with 2 live-network tests skipped, focused lint on every changed TypeScript file passes, and the production build succeeds. Repository-wide lint still reports the existing unrelated backlog.

### Multi-source Power Pages API foundation implemented
- Downloaded and preserved the four live portal settings that enable `vpi_vehiclescraperun` and `vpi_vehiclescrapesourceresult` with `fields=*`, plus the two corresponding table-permission records. Both permissions currently grant read/create/write/append/append-to, deny delete, and retain the temporarily accepted Anonymous/Authenticated role assignments.
- Added `vehicleScrapeApi.ts` with validated-GUID create/read/update operations for scrape runs and source results. Writes use the confirmed case-sensitive lookup navigation names; reads use the lowercase lookup-reference fields and deliberately exclude navigation properties from `$select`.
- First source-result creation explicitly writes `Attempt Number=1` because Dataverse provides no column default. Run/source choice values, timestamps, price/specification evidence, provenance, and error details round-trip into typed application models.
- Wired the new operations through `IDataSource`, `DataverseDataSource`, and `VehicleScrapeRepository`. Existing YallaMotor, DriveArabia, Scrape Now, and Process PAD Inbox behavior remains unchanged because no UI or scraper calls the new repository yet.
- Added four isolated Web API regression tests covering lookup bindings, entity-set URLs, default status/attempt values, result mapping, sparse PATCH bodies, and malformed-GUID rejection. No live Dataverse test rows were created.
- Verification: TypeScript passes, the full suite passes 88 tests with 2 live-network tests skipped, focused lint for the new API/repository/schema files passes, and the production build succeeds. Repository-wide lint retains its pre-existing unrelated backlog.

## 2026-08-18

### DriveArabia turbocharged engine-size parsing fixed
- Fixed DriveArabia specification enrichment for commercial trims that concatenate turbocharged notation with capacity, such as **MINI Cooper 2024 `1.5TC I4 Cooper FWD`**. `TC` is now accepted when resolving engine capacity, so the unique 1.5-litre Specs group can supply `1500 cc` instead of leaving Engine Size empty.
- Captured Specs accordions now prefer their explicit **Engine Size** and **Engine Layout** rows over values inferred from a configuration heading. This safely handles DriveArabia's MINI inconsistency where the price row says `1.5TC I4`, but the Specs group and overview identify the engine as `1.5 TC I3` / `1.5 L`.
- Added regression coverage for the inconsistent MINI labels and retained the conservative rule that capacity-based enrichment occurs only when the commercial trim matches exactly and one unique capacity group exists. Focused DriveArabia parser/inbox verification passes **32/32** tests; the full suite passes **80 tests / 2 live tests skipped**, TypeScript and focused ESLint are clean, and the production build succeeds.

### DriveArabia generic-trim consensus enrichment implemented
- Exact generic commercial trims that do not identify an engine, such as **Isuzu D-Max 2019 `D-Max`**, now receive only mechanical values shared by every PAD-captured Specs group. The live page's 2.5L/3.0L configurations unanimously support Diesel and I4, so Cylinders can safely become `4` while Engine Size remains empty.
- Conflicting drivetrain, transmission, horsepower, torque, and engine-size values are deliberately omitted instead of copying the first/default accordion. Shared model fields from JSON-LD remain available, and non-exact request trims still receive no cross-trim enrichment.
- Added a D-Max regression covering unanimous and conflicting fields. Focused DriveArabia parser/inbox verification passes **33/33** tests; the full suite passes **81 tests / 2 live tests skipped**, TypeScript and focused ESLint are clean, and the production build succeeds.

### DriveArabia non-Camry live acceptance passed
- Successfully processed a fresh **Honda Accord 2.4 DX/LX 2013** Missing Vehicle Request through the dynamic attended workflow: the request-specific URL was supplied through `DriveArabiaUrl`, PAD captured and uploaded the page, Azure accepted it, and **Process PAD Inbox** populated all required vehicle details and prices in Dataverse.
- This closes the dynamic-navigation and non-Camry compatibility gate. The next planned milestone is one-click cloud-triggered PAD orchestration so the app can start DriveArabia scraping and process its correlated result without Copy PAD URL, manually running PAD, or manually processing the inbox.

## 2026-08-17

### Dynamic DriveArabia PAD navigation implemented
- Added `buildDriveArabiaModelYearUrl()` with regression coverage for Toyota, Land Rover, and Mercedes-Benz routes. It emits DriveArabia's short `/uae/<make>/<model>/<year>/` route and lets DriveArabia redirect to its current canonical, make-prefixed route instead of hard-coding site aliases in the app.
- Added **Copy PAD URL** to each Missing Vehicle Request modal. The copied URL is built from that request's make, model, and model year, so the attended PAD flow is no longer tied to the Toyota Camry 2024 page.
- Changed the documented PAD setup to use a required text input variable named `DriveArabiaUrl` as the Launch Chrome initial URL. Each attended run now prompts for the copied request URL; the capture, Azure inbox, exact matching, and Dataverse processing stages remain unchanged.
- Verification is clean: **33/33** focused URL/parser/inbox tests pass, TypeScript type-checking and new-module ESLint pass, and the production build succeeds. Live acceptance with a non-Camry MVR remains the explicit rollout gate.
- **First non-Camry live capture diagnosed:** dynamic navigation correctly opened and uploaded Honda Accord 2011, but inbox processing failed with `DriveArabia capture produced no price rows`. The retained payload contained two valid rows (`2.4L sedan` and `3.5L sedan`); the parser had incorrectly required every trim label to contain a drivetrain token. Price extraction now accepts bounded trim-table labels without `FWD`/`RWD`/`AWD`, while the existing section boundary still excludes unrelated vehicle prices.
- **Honda cylinder follow-up:** the successful `2.4L sedan` write initially left Cylinders empty because that commercial trim omits `I4`; the captured Specs group is named `2.4 I4 FWD`. Exact JSON-LD-selected trims can now inherit mechanical fields from a single uniquely matching engine capacity. If multiple groups share that capacity, the parser keeps the selected JSON-LD fields and does not guess.
- The Honda follow-up passes **31/31** focused parser/inbox tests, changed-parser ESLint, TypeScript type-checking, and the production build.

### DriveArabia multi-trim specification mapping implemented
- Added a PAD capture protocol for DriveArabia's Specs accordions. Closed Radix accordion bodies are unmounted from `document.outerHTML`, so the capture script now opens each engine group, records its rendered text, and embeds the groups in a `vpi-pad-spec-groups` JSON marker before upload.
- **First multi-trim live capture diagnosed:** Azure accepted the capture and the processor updated two exact Camry price requests, but the Limited Hybrid remained price-only. The retained local PAD payload proved the marker contained only `2.5 I4 FWD` (`groups=1`); React had not mounted the next accordion before the single synchronous JavaScript action read it. This was a capture-timing issue, not a parser, matching, Azure, or Dataverse failure.
- Replaced the single capture function with a two-stage PAD protocol: start a timer-paced accordion collector, wait five seconds in PAD, then build the upload payload only after `groups.length` equals the recorded button count. Incomplete captures now fail before Azure upload instead of silently degrading to price-only.
- **Multi-trim live acceptance passed:** the revised six-action PAD flow returned HTTP `202`, **Process PAD Inbox** completed, and the existing Limited Hybrid request received its required vehicle details. The retained payload contained all three expected engine groups: `2.5 I4 FWD` (Petrol/8A/204 HP), `3.5 V6 FWD` (Petrol/8A/298 HP), and `2.5 H I4 FWD` (Hybrid/CVT/208 HP). This proves the Hybrid request was enriched from its correct engine group rather than the selected SE data.
- Added `extractDriveArabiaSpecGroups()` and `extractDriveArabiaSpecsForTrim()`. Commercial trims are matched to engine groups only by a normalized signature of engine capacity, I/V cylinder layout, hybrid marker, and drivetrain; marketing labels such as Sport/Limited are ignored.
- Multiple commercial trims may safely share one unique engine group (for example both 3.5L V6 Camry trims). Missing or ambiguous engine groups produce price-only updates instead of guessed specifications, and captures without the new marker retain the previously proven selected-JSON-LD-trim behavior.
- Updated the PAD inbox processor to resolve specifications independently for every exact MVR trim. Added parser and processor regression tests covering petrol SE, both V6 commercial trims, Limited Hybrid, legacy captures, and ambiguous duplicate groups. Focused verification passes **29/29**; the full suite passes **73 tests / 2 live tests skipped**; changed-file ESLint, TypeScript type-checking, and the production build are clean. Live PAD multi-trim validation has passed.

## 2026-08-13

### DriveArabia exact-trim specification enrichment implemented
- PAD inbox failure notifications now include the processor's retained Dataverse/API error detail instead of reporting only completed/failed counts. This makes rejected enrichment writes diagnosable directly from the admin page on the next capture.
- Extended `extractDriveArabiaSpecs()` to prefer the current per-year page's schema.org `Product`/`Vehicle` JSON-LD over generic visible page copy. It now returns the selected `vehicleConfiguration`, year, normalized body/transmission, fuel, drive, cylinders, engine size, doors, horsepower, torque, and country of origin when present.
- Fixed a real correctness issue: generic Camry page copy mentions several engines and could incorrectly report `Hybrid` for the selected petrol trim.
- Updated the PAD inbox processor to apply specification fields only when the JSON-LD trim/year exactly match the Missing Vehicle Request. Other trims in the same price table receive prices only, preventing cross-trim contamination.
- Existing MVR fields now receive body type, fuel, transmission, drive, cylinders, engine size, doors, and horsepower through the repository/DataSource path. Horsepower also threads into Vehicle Data on approval. Torque and origin remain in scrape provenance because MVR has no dedicated columns for them.
- Generalized the shared drive mapper to accept short labels (`FWD`, `RWD`, `AWD`, `4WD`, `4x4`) as well as schema.org URLs.
- Added fixture-backed parser and processor regression coverage. Focused suites pass **34/34**, the full suite passes **68 tests / 2 live tests skipped**, focused ESLint passes, TypeScript type-checking is clean, and the production build succeeds.
- **First enrichment live acceptance:** inbox `d6438800e4ce` wrote exact Camry SE prices and body/fuel/transmission/drive/cylinders/engine/doors correctly; provenance preserved `204 hp`, `243 Nm`, and `Japan`. This exposed and fixed an application mapping omission for the already-existing `vpi_horsepower` MVR column.
- **Fresh-request end-to-end acceptance passed:** after deleting the previous test MVR, submitting the exact Toyota Camry 2024 trim through Valuation created a new Missing Vehicle Request; a fresh PAD capture and **Process PAD Inbox** completed successfully and updated it through the published Horsepower-enabled path. This closes the attended DriveArabia enrichment live gate.
- Removed the separate Horsepower tiles from the Missing Vehicle modal and summary card after live visual review. Adding one tile made both two-column grids odd-length and left a single unpaired tile; horsepower remains stored in Dataverse and in scrape provenance without changing the balanced UI layout.

## 2026-08-12

### DriveArabia PAD inbox processor implemented in the admin app
- Added `src/lib/multiSourceScraper.ts`: derives relay endpoints from `VITE_AZURE_FUNCTION_URL`, drains a safety-capped batch of pending captures, loads raw HTML, dispatches DriveArabia price parsing, and acknowledges every processed item as `Complete` or `Error`.
- Resolved the missing-MVR-ID contract safely without guessing: the processor derives make/model from the captured DriveArabia URL and matches parser-produced year/trim values exactly against MVR records already loaded by the admin page. One capture can update every exact matching request. A valid unmatched capture remains `Pending` for retry; unsupported, malformed, and write-failed captures become `Error` and keep their Blob evidence.
- Successful writes use the existing repository/DataSource path and persist the price range, source URL, inbox ID, `source:'DriveArabia'`, and `transport:'pad'` in the scrape-result JSON. A successful `Complete` acknowledgement purges the relay Blob.
- Added `useProcessScrapeInbox` plus a **Process PAD Inbox** admin action with React Query invalidation and toast summaries. The scrape detail panel now displays transport provenance.
- Added `multiSourceScraper.test.ts` covering a real 2024 PAD fixture success, reversed-range write, Complete acknowledgement, empty queue, safe unmatched-record waiting, unsupported-source Error acknowledgement, and queue draining.
- **Verification:** `npm run typecheck` passes; full suite **66 passed / 2 live tests skipped**; production build passes and refreshed the tracked Power Pages SPA shell asset references; new processor/hook/test files pass ESLint.
- **Read-only live relay check:** `next_pending` returned DriveArabia item `e2b396579733`; its fetched HTML is correctly decoded (**391,377 bytes, 17,188 literal spaces, valid `<html ...>`, no `<html+...>` corruption, 42 visible AED range occurrences**). This confirms the deployed relay is on the `unquote_plus` revision. The item was deliberately left `Pending`; no acknowledgement or Dataverse mutation was performed.
- **First live Dataverse acceptance passed:** inbox `e2b396579733` matched the Toyota Camry 2024 `2.5L I4 SE FWD` MVR and wrote `Scraped`, count `1`, AED `111,900–112,000`, source `DriveArabia`, transport `PAD`, source URL, inbox ID, trim, and year; the admin modal and raw Dataverse JSON both showed the expected values.
- **Live acknowledgement bug found and fixed:** the Dataverse PATCH succeeded but the item remained `Pending`. Azure's platform-level CORS handler intercepted the browser's `OPTIONS` preflight with `204` and no allow headers, so `POST /inbox_status` never reached the function. The client now sends its JSON body with safelisted `Content-Type: text/plain;charset=UTF-8`; `_try_parse_json` is content-type agnostic, so this avoids preflight without changing the server contract. The already-applied item was marked `Complete` directly and its Blob was purged; queue advanced to the next capture.
- **Queue cleanup after frontend republish:** the next item, `a68628c4aa6a` (`toyota-camry/?page=2`), was verified as a valid DriveArabia summary page but contained only year-card “Orig. From” values and no exact trim-level ranges, so it could not safely match an MVR. It was marked `Error` (Blob retained) and the pending queue was confirmed empty. No Dataverse write was attempted for it.
- **Second live run — full automatic completion passed:** the completed four-action PAD flow (Chrome 2024 page → JSON payload via JavaScript → local payload file → `Invoke web service`) returned HTTP `202` with inbox `894f3e21ca95`. Read-only validation found correctly decoded 120,204-byte HTML and all four 2024 trim ranges. Clicking **Process PAD Inbox** updated the existing exact Camry SE MVR and automatically acknowledged the item: direct lookup now returns `502 blob_missing` (expected after `Complete` purge) and the queue returns `404 no_pending`. The `text/plain` acknowledgement fix is therefore live-proven end-to-end.
- **DriveArabia price-transport gate:** complete for the attended single-page path. Full specification enrichment was still pending at this point; see the 2026-08-13 entry. Dubizzle and unattended scheduling remain deferred.

### DriveArabia per-model-year price parsing completed and fixture-pinned
- Added a real PAD-captured fixture for the Toyota Camry 2024 per-model-year page: `tests/fixtures/drivearabia-camry-2024-pad.html`.
- Completed `extractDriveArabiaTrimPrices(html)` in `src/parsers/driveArabia.ts`. It reads the page year from the canonical URL, data layer, or title, then extracts full trim names and normalized AED min/max ranges from the bounded visible **Original Trim Prices** table.
- Fixed a duplicate-heading bug found in the real fixture: DriveArabia renders the label in both tab navigation and the table heading, so extraction now anchors on the final occurrence and stops at the following dealer/spec section.
- Generalized drivetrain matching from FWD-only to `FWD`, `RWD`, `AWD`, `4WD`, `4x4`, and `2WD`; supports hyphen/en-dash/em-dash price separators and defensively handles missing years/headings, duplicates, invalid prices, reversed ranges, and oversized matches.
- Added four per-year test cases. The real fixture asserts all four 2024 Camry trims and the live reversed-range glitch; synthetic coverage verifies non-FWD variants, de-duplication, section boundaries, and missing-input behavior. DriveArabia parser suite: **17/17 passing**.
- Exported the new extractor through `src/parsers/index.ts` and removed the temporary `scripts/scratch-map-2024.mjs` investigation artifact.
- Made the Azure “no probe URL configured” unit test deterministic by explicitly overriding `.env.local` with an empty function URL; previously it could make a live request and time out on developer machines with `VITE_AZURE_FUNCTION_URL` configured.
- **Verification:** `npm run typecheck` passes; full suite **61 passed / 2 live tests skipped**; production build passes; changed parser/test files pass ESLint. Repository-wide ESLint still reports the pre-existing application backlog outside this change.
- **Next:** confirm the deployed Azure Function contains the `unquote_plus` relay fix, then build `src/lib/multiSourceScraper.ts` and produce the first live Dataverse row with `transport:'pad'`.

## 2026-08-11

### ingest_html URL-decode fix — PAD's Invoke web service percent-encodes the request body
- **Root cause found live:** the user's first real PAD run returned `400 invalid JSON body` with a diagnostic preview showing the body was **percent-URL-encoded** (`%7b%22source%22%3a...` = `{"source":"drivearabia"...`), even with `Content-Type: application/json` correctly set. PAD's `Invoke web service` URL-encodes the whole body regardless of content type — this is PAD behaviour, not a header mistake.
- **Fix (transport hardened to accept both):** new `_try_parse_json(raw)` helper in `scraper-service/function_app.py` — tries `json.loads` on the raw body first (regression-safe), and only when the head looks encoded (`%XX` present, no literal `{`) retries via `urllib.parse.unquote` before parsing. The encoded fallback is narrow by design so a raw-JSON body whose html happens to contain `%` sequences is never mangled. `inbox_status` got the same helper (uniformity, future PAD-driven marks).
- **Verified live (PIM window, 2026-08-11):** PAD-shaped lowercase-hex encoded body (`%7b...%7d`) → `202 {inboxId}` and landed in the queue; `?inboxId=` round-trip returns the **decoded** `<html>...` (not `%3chtml%3e`); raw-JSON body still `202` (no regression); both smoke items cleaned up (Complete/Error), queue drained → `404 no_pending`.
- **PAD-side note for the user:** nothing to change in the flow — the endpoint now accepts whatever `Invoke web service` sends. If a future PAD version exposes a request-body "format/encoding" option, "Raw"/"as-is" keeps the wire clean, but it's no longer required.
- **Status:** PAD live hand-off is UNBLOCKED. User presses **Run** in PAD → expect `ingest: {"inboxId": "...", "source": "drivearabia", "status": "Pending"}` (HTTP 202). ⚠ **Superseded the same day** — see the follow-on entry below: real PAD bodies *also* form-encode spaces as `+`, so the fallback had to move from `unquote` to `unquote_plus`.

### Inbox relay deployed + live-verified on vpi-probe-py-20260805 (PAD pipeline, §13 gate #1 ✅)
- **Three new endpoints** added to `scraper-service/function_app.py` beside the untouched `probe_py` (guide §6): `POST /api/ingest_html` (auth=function — validates source/url/html, 5 MB cap, stores HTML to Blob `scrape-inbox/<source>/<uuid>.html`, records `Pending` metadata in Table `scrapeinboxmeta` with sortable RowKey, returns `202 {inboxId}`); `GET /api/next_pending` (anonymous + CORS — oldest `Pending` item, `?inboxId=` returns the raw HTML); `POST /api/inbox_status` (anonymous + CORS, browser-only — `Complete` purges the blob per §10 inbox hygiene, `Error` keeps it for re-processing).
- **Storage reuses `AzureWebJobsStorage`** — no new storage account needed; `requirements.txt` gained `azure-storage-blob` + `azure-data-tables`, Oryx remote build installed `12.30.0`/`12.7.0`.
- **Live smoke test (§12) all green** (PIM window 2026-08-11): ingest → 202 + inboxId; next_pending → item; `?inboxId=` → HTML byte-round-trip; inbox_status Complete → 200 + blob purged; queue drained → 404 `no_pending`. Security paths: ingest **without key → 401**; unknown source → 400.
- **Two SDK bugs hit + fixed on the live box:** (1) `TableClient` has no `exists()` (Blob-SDK API, not Table) → replaced with try/except `create_table()` on `ResourceExistsError`; (2) `upsert_entity` supports **Replace only** (not Merge) → rebuild the full entity with the new Status and `UpdateMode.REPLACE`. Both re-published; final re-test 5/5.
- **Status:** §13 gate #1 **DONE**. Next: (1) extend PAD flow with pacing `Wait`s + the `Invoke web service` POST using the `ingest_html` function key (PAD-side only, never committed), (2) app-side `src/lib/multiSourceScraper.ts` inbox polling (§7), (3) first real `transport:'pad'` row.

### PAD flow v1 (capture mode) built + live capture validated against the parser
- **User built the first Power Automate Desktop flow** (`PAD-DriveArabia`, capture-first shape): `Launch new Chrome` (real profile, `drivearabia.com/carprices/uae/toyota/toyota-camry/`) → `Run JavaScript function on web page` (`document.documentElement.outerHTML`) → `Write text to file` (`C:\Users\PC\Desktop\pad-camry.html`). This is the browse+capture half of the guide §5 contract; the traffic-light missing pieces are the human-pacing `Wait`s + the final `Invoke web service` POST (blocked until the serverless relay exists).
- **Live capture validated:** the 392 KB file is REAL content, not a block page — the Cloudflare marker scripts (`challenge-platform`/`captcha`) sit on their own line while the full serialized React payload delivered 40+ `\"AED min - max\"` pairs. Anchors the fixture rule (§8) with a genuine **residential-IP, PAD-produced** capture.
- **Parser needs zero changes:** `extractDriveArabiaPriceRows` on the PAD capture reproduces the reference fixture exactly — 21 rows, years `[2024, 2025]`, `2.5L I4 E FWD` → `109900–110000`, `max<min` guard holds on the live `AED 138,900 - 130,000` glitch.
- **New fixture pinned:** `tests/fixtures/drivearabia-camry-prices-pad.html` (392 KB, provenance PAD 2026-08-11) + 4 tests added to `driveArabia.test.ts` (now 13, suite 43/43 passing).
- **Status:** the PAD → fixture → parser leg of the pipeline is proven. Next: (1) extend the PAD flow with pacing + the `ingest_html` POST, (2) build `ingest_html` + `next_pending` on the Azure function (§6), (3) `multiSourceScraper.ts` browser-side inbox processing (§7).

### First real PAD run landed, but every space arrived as `+` — `unquote` → `unquote_plus` (live root-cause)
- **Symptom:** the user's first real PAD ingest returned `202 {"inboxId":"9a7723c334fa",...}` (the URL-decode fix above worked — the body parsed, item queued `Pending`), but fetching that item's HTML via `next_pending?inboxId=` and running `extractDriveArabiaPriceRows` returned **0 rows** (fixture: 21); specs read only a stray `fuelType:"Diesel"` from the page text.
- **Root cause:** the stored HTML is **form-encoded, not just percent-encoded**. PAD's `Invoke web service` encodes the whole body with `application/x-www-form-urlencoded` semantics — a **space becomes `+`** (and a genuine `+` becomes `%2B`). `urllib.parse.unquote` decodes every `%XX` but leaves literal `+` untouched, so the stored HTML had each space replaced by `+`: `<html lang=` arrived as `<html+lang=`, `"2.5L I4 E FWD"` as `"2.5L+I4+E+FWD"`. Verified in the live blob: **0 literal spaces, 17,410 `+`** in 390 KB. The smoke test missed it because its hand-crafted `%7b…%7d` body contained no spaces.
- **Fix (one line + doc):** `_try_parse_json` now decodes the encoded fallback with **`urllib.parse.unquote_plus`** (replaces `+`→space, then decodes `%XX`). Verified byte-for-byte locally on a synthetic PAD body carrying both spaces and a genuine `+`: `unquote` leaves `+` in place (`<html+lang=`…), `unquote_plus` restores the original exactly and preserves `%2B`→`+`. Regression-safe: the fallback still only fires when the head looks encoded (`%XX`, no literal `{`), so raw-JSON bodies are never touched.
- **Inbox hygiene:** corrupted item `9a7723c334fa` marked **`Error`** (blob kept per §10 as evidence) so it can't be picked up as the oldest `Pending` on the next run.
- **Status:** code fixed; **re-publish to `vpi-probe-py-20260805` pending (needs PIM window)**. After publish, re-run the PAD flow **unchanged** → the fresh item should parse to **21 rows** under the same 4-test assertions.

## 2026-08-07

### DriveArabia parser core built + fixture-pinned (PAD source 1)
- **New parser module** `src/parsers/driveArabia.ts` — first in-repo extraction code for the DriveArabia (PAD) source. Pure/network-free/never-throws, mirrors the YallaMotor `src/parsers` discipline. Feeds the master reference table (`vpi_vehicledatas`), not the used-listing scrape tables (see `docs/power-automate-desktop-scraper-guide.md`).
- **Two extractors:** `extractDriveArabiaPriceRows(html)` — walks the minified serialized React payload in document order, normalizing the escaped quotes (`\"` → `"`) so the trim name + `AED min - max` strings match as plain text, and assigns each price pair to the most recent `,2025,"109900",5,[` year marker; the max<min glitch degrades safely (max guarded to round to min). `extractDriveArabiaSpecs(html)` — reads fuel/drive/transmission/horsepower/torque from the **visible** DOM text (DriveArabia has no useable car JSON-LD; prices are escaped-quote React payload, specs are in the rendered DOM).
- **Fixture-pinned tests** (`driveArabia.test.ts`, 9 tests): real view-source captures `tests/fixtures/drivearabia-camry-prices.html` (Camry landing → 21 trim/price rows across years 2024+2025; `3.5L V6 Sport FWD` glitch guarded to 130000/138900; every row `max>=min`) + `tests/fixtures/drivearabia-camry-trim.html` (specs: `Hybrid / FWD / 8A / 201 hp / 240 Nm` from the Camry hybrid trim page). **39/39 parser tests pass; `tsc --noEmit` clean.**
- **Drives decision captured:** the landing page is a model **reference-price** page (stable trim + AED-range strings), not a used-listing feed; surrounding React keys (`_1488`) are minified/unstable so the stable strings are the match anchors. Extraction stays in the browser — PAD only captures + relays (no `selector-brittle` extraction in PAD).

### Multi-source direction: DriveArabia + Dubizzle via Power Automate Desktop (guide)
- **Decision (user-chosen):** add DriveArabia and Dubizzle using **Power Automate Desktop** as the browser transport — the one transport proven to defeat both anti-bot vendors (DriveArabia's Cloudflare + Dubizzle's Imperva) because it is a real Chrome browser on a **residential IP** (the decisive anti-bot layer per the evaluation report). YallaMotor is untouched until both land.
- **Delivery model:** PAD stays thin — captures raw HTML, posts it to a new `ingest_html` endpoint on the existing Azure function (function-key auth), which relays the HTML to a `scrape-inbox`; the browser app polls `next_pending` and runs the **shared `src/parsers` brain** + `normalizeToDataverse`, then writes Dataverse with `transport:'pad'` (a 3rd value alongside `azure`/`flow3`). Extraction never re-implemented inside PAD.
- **Attended first, graduate to unattended** later (licensing), consistent with user choice.
- New `docs/power-automate-desktop-scraper-guide.md` — from-scratch implementation guide covering evidence, architecture (inbox relay + 2 alternatives), PAD flow build, function endpoints, app integration, discovery-method extraction, write-back, security, deployment, tests, rollout, risks.
- **Symptom:** MVR `vpi_category` was **blank** for the Ford Mustang V6 ("american specs") after a successful Azure scrape, while every other mapped field (drive, engine, mileage, cylinders…) wrote correctly. Confirmed live via Web API — `vpi_category: null`.
- **Root cause:** case-mismatch across the two parser halves. `extractRegionalSpecs` (`src/parsers/yallaJsonLd.ts`) returns generic spec phrases **lowercase** (`"american specs"`), but `mapCategory` (`src/parsers/mappers.ts`) matched with **case-sensitive** `includes('Specs' | 'GCC Specs' | 'Other Specs')` → missed → `categoryValue` `undefined` → `updateMissingVehicleScrapeResult` omitted `vpi_category`. A second latent gap: the `'Non-GCC'` keyword (no "Specs" substring) had **no branch** at all. The GCC Wrangler worked only because `extractRegionalSpecs` hardcodes the capitalised `'GCC Specs'`.
- **Fix:** `mapCategory` is now case-insensitive + gained the `'Non-GCC'` → `NON-GCC` branch. Both transports (Azure + Flow 3) flow through the same `normalizeToDataverse` boundary, so the fix covers both. 3 regression tests added (`mappers.test.ts` — lowercase generic, lowercased GCC/Other, `Non-GCC`); 10/10 mapper tests pass.
- **Verified live** (2026-08-07): after `npm run publish` + re-scrape, Category **lands as Non-GCC**.
- Also fixed a `tsc -b` blocker in the live-probe test: `let r;` after the retry loop wasn't narrowed → TS18048; split into two guards (`!r` → throw, then `!r.success` → throw).

### Live rollout: publish unblocked + side-by-side proof captured (Azure primary)
- **Deploy fixed.** `npm run publish` was blocked by corrupt stale `powerpagecomponent` blob records that threw Azure `InvalidRange` / `0x80040216` on the pre-upload download (intermittent reads — `cloudscraper`-era chunk assets). Deleted the 4 corrupt records via the Dataverse Web API (`analyticsRepository-DtkRFhD5`, `usePricing-ApzTY_mN`, `usePricing-CfCVzFjm`, `analyticsRepository-Dk3cLwHk` — all verified unreferenced by the live SPA shell). **`Power Pages website upload succeeded` (574 s, exit 0).**
- **Live side-by-side proof** (`src/lib/azureLiveProbe.test.ts`, gated by `LIVE_AZURE_PROBE=1`, real URLs from `.env.local`):
  - Azure primary ✅ — Jeep Wrangler → `transport:"azure"`, **cylinders "6"**, `SUV / Crossover`, count 3, AED 93k–129k (matches the Flow 3 parity table). Cloudflare is **flaky on cold first probe** (403/`blocked:true`), retries pass 3/3 — test now retries up to 5×.
  - Fallback routing ✅ — broken Azure URL → `transport:"flow3"` selected. **Flow 3 data hop** still needs a portal click: the Power Automate host (`…environment.api.powerplatform.com`) is unreachable from the dev box's network (connect refused, even non-sandboxed).
- `docs/azure-functions-scraper-implementation-report.md` §7 live cell and §8 rollout checklist updated to match.

## 2026-08-06

### Implementation report for the Azure Functions scraper added
- New `docs/azure-functions-scraper-implementation-report.md` — end-to-end "how it is built today" reference completing the report series (evaluation → egress campaign → **implementation**). Covers: objective, architecture (thin Python transport + in-repo `src/parsers` brain), the parser core, `function_app.py`, the `azureYallaMotorScraper` adapter + `scrapeWithFallback`, frontend wiring, verification (40/40 + live Azure↔Flow-3 parity table), the live-rollout status with the PIM daily-window blocker, and limitations. The single §7 live side-by-side cell is marked PENDING until the PIM window opens (scheduled 2026-08-07 10:00) — filled live per §8 checklist.

### Azure Functions Scraper Guide — §6 Anti-Bot Layer revised with the live Azure findings
- **What:** reworked `docs/azure-functions-scraper-guide.md` §6 to fold in the evidence from the Azure egress experiment (Aug-05) + the live Azure portal re-tests (Aug-06).
- **Transport decision made explicit:** the live matrix proved Node `fetch` — the guide's original §6.2 `httpClient.ts` — is **blocked from a genuine Microsoft IP** even with the exact Flow-3 headers. The verified transport is **Python `cloudscraper`** (Chrome TLS + JS-challenge solver), which scraped YallaMotor 3/3 at HTTP 200 from egress IP `52.149.247.118`.
- **§6 restructure (numbers updated, all cross-references fixed):** 6.1 headers (+ `br`/`brotli` mojibake gotcha) · **6.2 Python `cloudscraper` transport (VERIFIED)** · 6.3 Node `fetch` wrapper (DEMOTED, reference only) · 6.4 two-state Cloudflare detection · 6.5 challenge solving · 6.6 human pacing (jitter between requests) · 6.7 proxy hook.
- **Detection fix:** the old single-grep check mis-flags successful pages — YallaMotor embeds Cloudflare marker scripts in normal markup (`hasCfChallenge: true` on a 200 page). New logic only blocks when the marker is present AND no content/JSON-LD was delivered.
- **Pacing gap closed:** the "works twice, then 403" behavior signal needs jitter *between* requests, not just retry backoff.
- Docs rule: lesson also captured in `memory/learned-conventions.md` (Anti-bot section).

### Azure Scraper Adapter — in-repo extraction core + Python transport scaffold (build-in-parallel)
- **Direction (user-chosen):** build the Azure adapter **in parallel** while Power Automate Flow 3 stays live as the fallback. This session scaffolds the two halves; nothing the app *calls* changed.
- **Test fixtures (real, live-captured):** `tests/fixtures/` holds the exact JSON-LD from today's live Azure portal runs — `yallamotor-pajero-detail.jsonld.json` (detail page: price `52999`, mileage `130161`, doors `4`, engine `"2972"`, drive `AllWheelDriveConfiguration`, fuel `Petrol`, body `SUV / Crossover`, trans `Automatic`, `GCC Specs` in description) and `yallamotor-camry-search.jsonld.json` (search page: count `503`, min/max `120`/`350000`, first listing Camry 3.5L SE+ 2019 @ AED `52000`). The `README.md` codifies the guide §13 fixture rule (new markup → save + test case).
- **`src/parsers/` — pure, tested extraction core:** `types.ts` (DetailSpecs/SearchResult/NormalizedListing), `yallaJsonLd.ts` (defensive `parseDetailJsonLd` / `parseSearchJsonLd`, never throws), `mappers.ts` (drive/category/fuel/doors/seats label mappers), `normalize.ts` (`normalizeToDataverse` — the single label→integer boundary, permanently guarding the Aug-03 label-round-trip bug), barrel `index.ts`.
- **`@parsers` path alias** added to `tsconfig.json` paths + `vite.config.ts` resolve.alias.
- **Hook refactor (behavior-preserving):** `useTriggerScrape.ts` inline mappers + `...Value` block replaced with `normalizeToDataverse(result)` — identical mutation flow, statuses, toasts, and query invalidation; verified by typecheck + the new unit tests.
- **Tests (no network):** `yallaJsonLd.test.ts` (exact live-verified values from fixtures), `normalize.test.ts` (body `SUV / Crossover`→57, fuel `Petrol`→1, doors `4`→4, category `GCC`→1, drive AWD→2, cylinders `6`→4, engine→2972, mileage→130161), `mappers.test.ts` (edge cases incl. `RearWheelDriveConfiguration`→RWD, `Not Sure`→OTHER/STANDARD, empty→undefined).
- **`scraper-service/` — Python `cloudscraper` transport scaffold (committed, NOT deployed):** `function_app.py` (v2 `probe_py`, `?url=` required→400, human-pacing jitter, `gzip, deflate` only, two-state Cloudflare check, returns raw HTML + diagnostics), `requirements.txt`, `host.json`, `.funcignore`, `local.settings.json.example`, `README.md` (guide §14 rollout order). `scraper-service/local.settings.json` added to `.gitignore`.
- Docs rule: CLAUDE.md Project Structure + Path Aliases updated; guide §7 gained a pointer to `src/parsers/`.
- **Verification (2026-08-06):** `npm run typecheck` clean; `npm run test:run` 22/22 pass (4 files, no network); `eslint src/parsers` clean after conforming the new files to the repo's `curly`/`eqeqeq` rules (braces on all single-line `if`s, `!= null` → explicit `!== undefined && !== null`). The repo-wide `npm run lint` still reports a large **pre-existing** backlog in untouched files (`dataverseDataSource.ts`, admin pages, UI primitives, etc.) — out of scope for the adapter, tracked separately.
- **Live portal smoke test (2026-08-06):** deployed via `npm run publish`; admin scrape of **Jeep Wrangler 2021 3.6L Automatic** through the still-live **Power Automate Flow 3** path returned a fully populated row — body `SUV / Crossover`, engine `3600`, cylinders `6`, fuel `Petrol`, trans `Automatic`, drive `AWD` (source label), doors `4`, mileage `123,000`, category `GCC`, 3 listings, AED 93,000–129,000. Confirms the `useTriggerScrape` → `normalizeToDataverse` refactor is behavior-preserving end-to-end. Flow 3 remains the app's live scrape path.
- **Azure probe deployed + live proof (2026-08-06):** published `scraper-service/` to `vpi-probe-py-20260805` (Oryx remote build, Python 3.11; the earlier `probe_py` pattern was replaced). Probed the Wrangler search + first listing detail at HTTP 200 (1.3 MB HTML, `blocked=false`). New `scripts/probe-yallamotor.mjs` extracts the `application/ld+json` blocks from the probe HTML into `tests/fixtures/`; new skipped-by-default `src/parsers/probeSmoke.test.ts` feeds that fixture through the real parsers and prints the mapped integers. The Azure path **reproduced Flow 3 exactly**: search `count 3 / AED 93,000–129,000`; detail body `57`, engine `3600`, doors `4`, category `GCC`→`1`, drive `AWD`→`2`, mileage `123000`. Live detail capture preserved as `tests/fixtures/yallamotor-wrangler-detail.jsonld.json` + a parser test case. Flow 3 still the app's live path; adapter not frontend-wired (guide §14 step 4+ pending).
- **Azure becomes the PRIMARY scrape transport with automatic Flow 3 fallback** (user-chosen direction: "keep both at the moment, then eliminate Power Automate in the long run"). Seats stays out of scope for both paths (YallaMotor exposes no seats — neither Flow 3 nor Azure can capture it). Full details in the plan `wise-leaping-dolphin.md`.
- **`src/lib/yallaMotorUrl.ts`** — `slugify` + `buildYallaMotorSearchUrl` lifted **verbatim** out of `scrapeViaFlow3` into one shared builder so both transports produce the identical `sourceUrl`; `yallaMotorHttpScraper.ts` refactored to use it (behavior-preserving). Tested (slugify edge cases + `vr_/yr_` URL shape).
- **`src/parsers/jsonLdFromHtml.ts`** — `extractJsonLdBlocks(html)`, the `application/ld+json` regex promoted from `scripts/probe-yallamotor.mjs` into a tested, transport-agnostic helper.
- **`src/parsers/specTable.ts`** — `extractCylinders(html)`: YallaMotor's JSON-LD has **no cylinders**, so Azure reads it from the rendered spec grid (`title="Number of Cylinders"` label div → following value div's `title`). Pattern confirmed against a raw Azure-probe capture of the Wrangler detail page and pinned by a trimmed fixture (`tests/fixtures/wrangler-detail-spec-section.html`) + test → `6`.
- **`src/lib/azureYallaMotorScraper.ts`** — `scrapeViaAzure` (search probe → `parseSearchJsonLd` → first-listing detail probe → `parseDetailJsonLd` + `extractCylinders`), pure `assembleAzureResult` (same `Flow3ScrapeResult` shape as Flow 3), `scrapeWithFallback` (Azure primary; **any** Azure shortfall → Flow 3, so no live scrape is lost), `transport: 'azure' | 'flow3'` marker. 9 tests: assemble + azure-success + blocked + unconfigured + no-listings + all three fallback branches, via injected `fetch`/`flow3` mocks.
- **Hook + env + CORS:** `useTriggerScrape.ts` now calls `scrapeWithFallback` and records `transport` in `scrapedListings` (side-by-side verification); `VITE_AZURE_FUNCTION_URL` added to `.env.example` + `vite-env.d.ts` (live value stays in gitignored `.env.local` / build env); `scraper-service/function_app.py` now sends `Access-Control-Allow-Origin: *` on every response + answers OPTIONS preflights (the browser calls the probe cross-origin from the portal).
- **Verification:** `npm run typecheck` clean · `npx vitest run src/parsers src/lib` **40/40** (8 files; the 4 new files are network-free) · `eslint` clean on every touched file (`specTable`, `jsonLdFromHtml`, `yallaMotorUrl`(+test), `azureYallaMotorScraper`(+test), `yallaMotorHttpScraper`, `useTriggerScrape`). The repo-wide `src/lib` lint backlog (`contactApi`/`inquiryApi`/`missingVehicleApi`/`priceSuggestionApi`/`safeAjax`/`vehicleApi`) is pre-existing and untouched.
- **Live rollout (next, user-run):** re-publish `scraper-service/` (CORS) → set `VITE_AZURE_FUNCTION_URL` in `.env.local` + build env → `npm run publish` → trigger a scrape (row should show `transport:"azure"` **and** cylinders) → temporarily break the Azure URL → scrape again (`transport:"flow3"`, data still lands) — guide §14 steps 4–7.

## 2026-08-05

### Azure Functions Egress Experiment — live egress test on the real Azure subscription
- **Context:** user obtained an Azure subscription (org `SBS-PTN-BNF-2400`, PIM Contributor, 2026-08-05 09:56–17:56 UTC) — which let us finally run the *one untested cell* of the Azure Functions feasibility evaluation: does a genuinely Microsoft datacenter IP + Python challenge-solver clients beat the anti-bot walls?
- **Setup:** scaffolded a Node probe (`C:\Users\PC\azure-probe`) and a Python v2 probe (`C:\Users\PC\azure-probe-py`, `?client=requests|curl_cffi|cloudscraper`) on the Linux Consumption plan in resource group `vpi-probe`, tested from egress IP `52.149.247.118`, all with the exact Flow-3 Chrome-128 header set.
- **Infra battles won:** `az.cmd` PATH staleness; `Microsoft.Storage` provider registration; `.cmd` arg-mangling (quotes + `|` pipe) worked around via ARM REST PATCH with a bearer token wrapped in `{"properties":{...}}`; **Node 24 unsupported by the Functions host (constant 503) → Node 22 fixed it**; removed **`br`** from Accept-Encoding to stop Brotli mojibake.
- **The breakthrough:** Python **`cloudscraper`** (a real Cloudflare JS-challenge solver) **successfully scraped YallaMotor from Azure** — HTTP 200, ~1.4 MB, reliable 3/3 across 5 real URLs (VW Tiguan used-search + detail, Kia Seltos used-search + new-car detail). Verified end-to-end by extracting the actual schema.org **JSON-LD** (`price`, `mileage`, `engine`, `doors`, `drive`, `fuel`, `body`, `transmission`, `color`, `city`) from both search pages (`ItemList`) and detail pages (`Product`/`Car`).
- **The boundary:** DriveArabia & Dubizzle remain **hard-blocked** for every client from Azure; only YallaMotor's Cloudflare emits a *solvable* challenge from a cloud IP.
- **Verdict update:** the earlier "Azure migration falsified" conclusion was **premature** — YallaMotor → **Azure Functions + cloudscraper is now proven viable** (serverless, no Power Automate), but it is **NOT** a multi-source solution; DriveArabia/Dubizzle still require Power Automate.
- **Scraper gotchas:** a `/used-cars/` URL can return **new** cars (`NewCondition`, 0 km) — read `itemCondition`, not the URL; engine/doors/drive appear only on **detail** pages.
- New doc: `docs/azure-egress-experiment-campaign-report.md` (full chronological evidence log).

## 2026-08-05

### Security — Hardcoded Power Automate SAS token removed from committed code

### Security — Hardcoded Power Automate SAS token removed from committed code
- **Critical finding from the full project audit:** `src/lib/yallaMotorHttpScraper.ts` hardcoded the Flow 3 HTTP trigger URL **including its live `sig=` SAS signature**, committed to git. Anyone with repo access could invoke premium Flow 3 on demand — burning Power Automate credits and writing scrapes to Dataverse.
- **Fix:** the trigger URL now reads from the `VITE_FLOW3_URL` env var (`src/lib/yallaMotorHttpScraper.ts`), typed in `vite-env.d.ts`, documented as a placeholder in `.env.example`. Added a graceful guard: if the var is unset, `scrapeViaFlow3` returns a clear "not configured" error instead of failing the fetch silently.
- **Functionality preserved:** the working Flow URL lives in **gitignored `.env.local`** (verified via `git check-ignore`; absent from `git status`), so the admin scrape feature behaves exactly as before for both `npm run dev` and the production `npm run publish` build. The token is no longer in any tracked file and won't be committed going forward.
- **Residual risk (documented honestly):** the token still exists in git history and, being a client-invoked trigger key, inside the shipped JS bundle. **Rotation completed 2026-08-05** — the user regenerated the Flow 3 trigger key; the new URL is set in `.env.local` and the previously-leaked `sig=` is now invalid. A complete fix (no flow-invoking credential exposed to the browser at all) needs an architectural follow-up.
- Files: `src/lib/yallaMotorHttpScraper.ts`, `vite-env.d.ts`, `.env.example`, `.env.local` (gitignored, not committed).

## 2026-08-04

### Hassan's Branch Merged into Main (PR #6)
- **Merged the `hassan` branch (Hassan's UI changes) into `main`** via GitHub PR #6 — merged locally with `26cb322 Merge pull request #6 from daniyalshafiq18/hassan`.
- **Reverse-merge strategy:** to make the PR conflict-free, `main` was merged into `hassan` first (`0aef78e Merge branch 'main' into hassan`), then hassan was pushed and the PR merged. This protected `main` and preserved Hassan's commit history (no rebase/squash).
- **Conflict resolution (manual):**
  - `src/features/admin/AdminMissingVehiclesPage.tsx` — combined main's logic with Hassan's styling: modal/card headings use `request.name` fallback (main) with Hassan's `text-[#071936] dark:text-white` token; Hassan's dark-mode `STATUS_CONFIG`/`SCRAPE_STATUS_CONFIG` tokens, `size="xl"` modal, card surface colors merged cleanly; main's deletion of the dead user-suggested Min/Max Price block kept.
  - `docs/CHANGELOG.md` — both sides' entries preserved; duplicate `## 2026-07-30` / `## 2026-07-31` sections (from an earlier merge) deduplicated.
  - `.powerpages-site` build artifacts (web-files/ + 2 manifests) — deleted (gitignored, regenerated by `npm run publish`); SPA-Shell/Home templates kept at main's version.
  - Stray 0-byte `-e` file (accidentally committed by Hassan) removed.
- **Hassan's changes now on main:** admin pages (Dashboard, Missing Vehicles, Price Suggestions, Queries, Vehicles), valuation Step 3 result, layouts, theme store, PDF export, and UI component updates.
- **Post-merge:** `npm run publish` run to regenerate the Power Pages build artifacts and deploy the merged app.
- Files: `src/features/admin/*`, `src/features/valuation/Step3Result.tsx`, `src/layouts/*`, `src/stores/themeStore.ts`, `src/utils/pdfExport.ts`, `src/components/ui/loading-screen.tsx`, `docs/CHANGELOG.md`.

### Category into Vehicle Data — Live Verified
- Re-tested the MVR → Vehicle Data approval flow after the Cloudflare cooldown and confirmed the **Category field populates successfully** in the Vehicle Data table. The Aug 03 raw option-set integer threading fix (label round-trip bug) is now **verified end-to-end live** — the last open item from the approval-flow work is closed.
- Docs/memory updated: `memory/recent-work-summary.md` (Category moved to ✅ Verified), `memory/learned-conventions.md` (entry annotated with live verification date).

### Azure Functions Multi-Source Scraper — Implementation Guide Added
- **Added `docs/azure-functions-scraper-guide.md`** — a complete from-scratch implementation guide for replacing the single-source Power Automate scraping setup (Flows 1–3 → YallaMotor) with a code-first, multi-source Azure Functions scraper.
- **Why:** the user is evaluating Azure Functions to scrape additional marketplaces (Dubizzle, Drive Arabia) that Power Automate cannot handle (no browser rendering, no proxies, fixed/truncated HTTP headers, serial execution, expression debugging vs 30-min Cloudflare cooldowns).
- **Key insight encoded:** Azure Functions runs on the same Microsoft/Azure IP family as Power Automate (which is NOT Cloudflare-blocked for YallaMotor per the design doc), so the Cloudflare "win" transfers — but it must be proven per-IP with a Phase 1 feasibility probe before any real work.
- **Guide covers, in 12 phases:** pre-requisites + pre-flight checks → feasibility probe (the make-or-break Cloudflare test) → project scaffold/structure → adapter pattern (`IScraperAdapter`, `NormalizedListing`, per-source registry) → anti-bot layer (exact working Flow 3 headers, retry/backoff, Cloudflare detection, proxy hook) → YallaMotor adapter (ports the 9 verified spec-field extractions + HTML tile parsing + `slugify` URL logic) → HTTP trigger functions (drop-in `Flow3ScrapeResult` contract, timer sync, debug endpoint) → Dataverse write-back (managed identity vs app registration, label→integer normalization that prevents the Aug-03 label round-trip bug) → Durable orchestration → deployment/CI/CD (Consumption vs Premium, fixed IPs) → monitoring → testing (fixtures-based, contract tests) → migration/rollback plan (frontend swap is a one-line URL change).
- **Reuses existing assets:** Flow 3's confirmed working headers, `Flow3ScrapeResult` shape from `src/lib/yallaMotorHttpScraper.ts`, option-set maps from `src/data/dataverseOptionSets.ts`, Path B postmortem lessons (test target early, keep debug endpoints). Typecheck N/A (doc only).
- Files: `docs/azure-functions-scraper-guide.md`, `docs/CHANGELOG.md`, `CLAUDE.md` (Documentation list).
- **Correction (same day):** guide's Node version requirement updated after verifying the official Functions Node.js reference — supported versions are **Node 22.x and 24.x** (Node 22 recommended LTS), not "20 LTS" as originally written. All scaffold/deploy commands now use `--runtime-version 22` / `node-version: 22`.
- **Azure Functions hands-on — Milestone 1 (Hello World) + Milestone 2 (YallaMotor probe) done locally:** Core Tools 4.12.1 installed on the dev PC; a scratch `hello-functions` project (outside the repo) runs an HTTP-triggered Node 20/24 model-v4 function at `localhost:7071`. **Real-world probe finding:** the local probe against YallaMotor with the exact Flow 3 headers got a Cloudflare 403 challenge ("Just a moment...") **even though a real browser on the same residential IP loads YallaMotor fine** → Cloudflare fingerprints the TLS client, not just headers/IP. Local live-testing with plain `fetch` is therefore blocked (fixtures become mandatory); the **deployed Azure-IP probe is the decisive feasibility test**, with TLS-impersonating clients (`curl-cffi`/`tls-client`/Playwright) as the documented fallback. Guide §3.5 updated with this finding.

### Azure Functions Scraper — Feasibility Evaluation Report Added
- **Added `docs/azure-functions-scraper-evaluation-report.md`** — a presentation-ready report the user can show stakeholders: full narrative of the Azure Functions evaluation (milestones, the free Vercel experiment, the complete evidence table, the three-way "Python can't fix it" test addressing the org developer's claim, cost avoided, and the recommended Power Automate-extension strategy). Cross-linked from CLAUDE.md Documentation list.

### Azure Functions Scraper — Cloudflare Question Answered for FREE via Vercel (decisive negative)
- **Ran the decisive "datacenter-IP probe" without an Azure subscription** by deploying the exact `probe.ts` to **Vercel's free tier** (GitHub login, no credit card) at `C:\Users\PC\vercel-probe` (outside repo). Also added `api/probe_py.py` (Python `curl_cffi` with `impersonate="chrome"`) and `api/probe_any.ts` (generic per-URL probe).
- **Results from Vercel's AWS datacenter IP (`iad1`), Node 24 undici + exact Flow 3 headers:**
  - YallaMotor → `403` "Just a moment..." (Cloudflare challenge)
  - DriveArabia → `403` "Just a moment..." (also Cloudflare)
  - Dubizzle → `200` "Pardon Our Interruption" (Imperva/Incapsula — different anti-bot vendor)
- **`curl_cffi` impersonating a real Chrome TLS fingerprint from the same AWS IP also got challenged** → the blocker is **datacenter-IP reputation**, not the TLS client and not the platform. Even a real browser only passes from a trusted (residential) IP.
- **`cloudscraper` (the Python lib that *solves* Cloudflare's JS challenge) also failed** from the AWS IP — `403` "Just a moment..." with **no `cf_clearance` cookie**. This directly addresses the org developer's suggestion ("write Python scripts to prevent the Cloudflare error"): tested three ways (undici, curl_cffi real-Chrome-TLS, cloudscraper challenge-solver), **no Python/Node code defeats it from a non-Microsoft datacenter IP** — the block is IP-reputation, not challenge-based. The only remaining untested combination is an actual Microsoft/Azure IP (needs the subscription); odds now rated low since cloudscraper couldn't even obtain a clearance cookie.
- **Conclusion (revised strategy):** serverless scraping of these three sources from non-Microsoft datacenter IPs is not feasible; **Power Automate (Microsoft IPs) is the only proven-working path**, and multi-source expansion should extend Power Automate to DriveArabia (same Cloudflare → likely passes) and test Dubizzle (Imperva → unknown) rather than build a code-first serverless scraper. An Azure subscription is no longer the default next step. Guide §3.5 rewritten with the full evidence table.
- **Vercel deploy fixes worth remembering (for future Vercel functions):** default export uses `(req,res)=>void` and **ignores returned `Response`** (request hangs) → use a named `GET`/`POST` export for the Web fetch-style API; `request.url` is a **relative path**, so parse the query string directly rather than `new URL(request.url)`.

## 2026-08-03

### Admin Missing Vehicle Card — Trim Card Removed (redundant with header)
- The card/grid header already shows the composite `Make Model Trim` title, so the dedicated **Trim** card in the details grid was redundant. Removed it; the freed slot was filled with **Engine Size** (`NNN cc`, mirroring the modal's Vehicle Specifications order) so the 2-column grid stays balanced at 6 cards: Body Type, Engine Size, Cylinders, Fuel Type, Transmission, Drive Type.
- Card header fallback updated to `[make, model, trim]` (was `[make, model]`) so legacy records without a `vpi_name` still show the trim in the header.
- Files: `features/admin/AdminMissingVehiclesPage.tsx`. Typecheck passes.

### MVR → Vehicle Data — Category Not Recording (label round-trip bug)
- **Bug:** Category was silently dropped when approving an MVR into Vehicle Data.
- **Root cause:** the scrape writes `vpi_category` to the MVR as an **integer** (1/2/3); `parseRawRecord` reads it back as the formatted **label**; `approveAndCreateVehicle` then converted the label back to an integer via `categoryValue()` which uses **exact-match** `toValue` against map keys `"NON-GCC"` / `"OTHER/STANDARD"`. Dataverse returns `"Non-GCC"` / `"Other/Standard"` (title-case/dash), so the lookup returned `null` and the field was silently skipped.
- **Fix:** capture the **raw option-set integer** (`categoryValue`) on read (coercing string-typed values), and in `approveAndCreateVehicle` prefer it directly, falling back to the label lookup. No label round-trip fragility.
- Files: `types/missingVehicleRequest.ts`, `lib/missingVehicleApi.ts`. Typecheck passes.

### Flow 4 Email — Trigger Changed from Scrape Complete → Vehicle Data Approval
- **Flow 4 (`MVR - Customer Email Notification`) previously emailed the user when the scrape completed** (`vpi_scrapestatus eq 4`). That meant users got notified before any human review and regardless of whether their request was approved.
- **Trigger changed to `vpi_status eq 2` (Approved)** — the email now fires only when the admin approves the MVR and it's pushed to the master **Vehicle Data** table. The frontend `approveAndCreateVehicle` action creates the Vehicle Data record *and then* sets MVR status to `Approved`, so the trigger lands at exactly the right moment.
- Email body wording updated: "Your request has been processed" → "Good news — your requested vehicle has been approved and is now available on our platform."
- **Power Automate-side change (user must re-save Flow 4 in make.powerautomate.com):** update the trigger's Filter rows expression from `vpi_scrapestatus eq 4` to `vpi_status eq 2`.
- Files: `docs/power-automate-cloud-only-design.md` (Flow 4 purpose, data-flow diagram, trigger filter, email body, test steps, checklist, status summary). No app code changed — email is server-side.

### MVR → Vehicle Data — Engine Size, Doors, Category Wired + Name Convention Aligned
- **Previously dropped fields now mapped** in `approveAndCreateVehicle`: Engine Size → `vpi_enginesize` (plain decimal), Doors → `vpi_doors` (via `DOORS` label map), Category → `vpi_category` (via `categoryValue`, `GCC/NON-GCC/OTHER-STANDARD`). Only set when a value exists and resolves.
- **Price mapping** — `approveAndCreateVehicle` now writes the Flow 3 scraped market range onto the new Vehicle Data record: `scrapedMinPrice` → `vpi_minprice`, `scrapedMaxPrice` → `vpi_maxprice` (only when the scrape returned prices). `vpi_avgprice` / `vpi_pricespreadpct` are left empty.
- **Name convention** — Vehicle Data NAME was `MVR-{make}-{model}-{modelYear}` (MVR- prefix, hyphen/space-mixed separators, no trim). Existing Vehicle Data records use `Make Model Trim` **without the Year**, so both Vehicle Data NAME and MVR `vpi_name` now use that exact convention (space-joined, e.g. `Mercedes Benz C-Class C 200`). This keeps approved vehicles, their source MVR, and the existing seed records all reading identically. Modal heading fallback updated to match.
- Doc comment updated to list the full field mapping.
- Files: `lib/missingVehicleApi.ts`, `features/admin/AdminMissingVehiclesPage.tsx`. Typecheck passes.

### Missing Vehicle `vpi_name` — Now Populated + Shown in UI
- **`vpi_name` (Primary Name) was never set** on MVR creation → records had blank titles in Dataverse views/lookups/Power Automate. The Inquiry table already composed its `vpi_name`; MVR was the one that didn't.
- **Create** (`missingVehicleApi.upsertMissingVehicleRequest`) now sets `vpi_name` = composite vehicle title `Make Model Trim` (no Year, matching the existing Vehicle Data convention — see the later "Name convention" entry this date), e.g. `Mercedes Benz C-Class C 200`.
- **Read** — added `NAME: 'vpi_name'` to `MISSING_VEHICLE_REQUEST_FIELDS`, mapped it in `parseRawRecord`, added the field to both `$select` lists.
- **Type** — `MissingVehicleRequest` gains `name?: string`.
- **UI** — detail-modal heading and card heading now show `request.name` (fallback to `Make Model` for legacy records).
- Schema doc: MVR table now documents `vpi_name` as Primary Name.
- Files: `dataverseConfig.ts`, `types/missingVehicleRequest.ts`, `lib/missingVehicleApi.ts`, `features/admin/AdminMissingVehiclesPage.tsx`, `docs/dataverse-schema.md`. Typecheck passes.

### Admin Missing Vehicle Detail Modal — Grouped Spec Order
- Split the detail-modal grid into two labelled groups: **Vehicle Specifications** and **Requester** (Requested By, Contact Email).
- Added the previously-unshown Engine Size card (`${engineSize} cc`); **removed** the Category (Regional Spec) card.
- **Mileage relocated** from the Scrape Results section into the Vehicle Specifications grid (after Doors), formatted as `80,000 km` (thousand-separated, lowercase `km` matching `cc`). Prefers `vpi_mileage`, falls back to parsed JSON, else `—`.
- Vehicle Specifications order: Body Type → Engine Size → Cylinders → Fuel Type → Transmission → Drive Type → Doors → Mileage.
- Files: `features/admin/AdminMissingVehiclesPage.tsx`. Typecheck passes.

### MVR Mileage — Min/Max Columns Replaced with Single `vpi_mileage`
- **Dataverse (maker-side, 2026-08-03):** removed the unused `vpi_minmilage` / `vpi_maxmilage` (Decimal) columns; added a single `vpi_mileage` (Decimal, scale 0) for the scraped listing mileage. Neither min/max value was ever populated by the wizard or any Flow.
- **App wiring** (`missingVehicleApi`, `dataverseConfig`, `types`, repo, datasource, hook): dropped all `minMileage`/`maxMileage` references; `MISSING_VEHICLE_REQUEST_FIELDS.MILEAGE = 'vpi_mileage'`; `parseRawRecord` reads `mileage`; both `$select` lists now request `vpi_mileage` instead of the removed columns (required — the old columns no longer exist, so selecting them would error the API calls).
- **Type:** `MissingVehicleRequest.minMileage/maxMileage` → `mileage?: number`.
- **UI:** modal Mileage card shows `request.mileage` (formatted with thousand separators) when set, falling back to the parsed scraped-listings JSON for records not yet populating the column.
- Files: `dataverseConfig.ts`, `types/missingVehicleRequest.ts`, `types/datasource.ts`, `lib/missingVehicleApi.ts`, `repositories/missingVehicleRepository.ts`, `hooks/useMissingVehicleRequests.ts`, `data/dataverseDataSource.ts`, `features/admin/AdminMissingVehiclesPage.tsx`, `docs/dataverse-schema.md`. Typecheck passes.
- **Scrape now writes mileage:** `useTriggerScrape` maps `result.mileage` → `mileageValue` and `updateMissingVehicleScrapeResult` PATCHes it into `vpi_mileage` (was previously only embedded in the `scrapedListings` JSON, so the column stayed empty). Added `mileageValue?: number` through repo → datasource → `datasource.ts` → api. Files: `useTriggerScrape.ts`, `missingVehicleApi.ts`, `missingVehicleRepository.ts`, `dataverseDataSource.ts`, `types/datasource.ts`. Typecheck passes.

### Admin Missing Vehicle Detail Modal — Refined Grid
- **Removed** the redundant identity cards (`Make`, `Model`, `Year`, `Spec / Trim`) — now carried by the heading — and the `Status` card (already editable via the header `StatusSelect`). Grid is spec-only + contact.
- **Added** previously-hidden scraped specs: `Doors` and `Category` (Regional Spec) cards.
- **Mileage** now shown in the Scrape Results section from the parsed scraped-listings JSON (`parsed.mileage`) — no schema change needed. (Forward plan: single `Mileage` column replacing the dead Min/Max Mileage once added in Dataverse.)
- **Heading fallback upgraded** to `Make Model Trim` (no Year, aligned with the final `vpi_name` convention) so legacy records (no `vpi_name`) keep full identity in the title.
- Files: `features/admin/AdminMissingVehiclesPage.tsx`. Typecheck passes.

### Admin Missing Vehicles — Removed Dead Min/Max Price Fields
- **`AdminMissingVehiclesPage.tsx`** — Removed the user-suggestion `Min Price` / `Max Price` displays, which are never populated for missing-vehicle (MVR) records (the scrape writes to `vpi_scraped_minprice`/`maxprice` instead).
- Removed in **3 places**: the two detail-modal grid cards, a dead `{/* Price info */}` block that was always guarded to no-render, and the table's two `Min Price`/`Max Price` columns (header + body cells) — table drops from 12 to 10 columns.
- Used the `Scraped Min` / `Scraped Max` fields as the single source of price truth in the admin UI; user-suggested pricing still lives in the Vehicles + Price Suggestions flows.
- `formatCurrency` retained (still used by scraped-price cells). Typecheck passes.

## 2026-07-31

### Valuation
- Fixed the valuation request-submitted success state so the title, vehicle name, and email render with readable dark-mode text contrast.

### Theme
- Made the full-screen loading screen light-first with explicit light/dark colors so portal uploads no longer show a black splash before the app theme initializes.

### Admin Vehicles
- Added colored spec/trim capsules in Vehicles table and card views, including named colors for common trims and deterministic fallback colors for unknown specs.

### Admin UI
- Strengthened admin page headings to bold across Dashboard, Vehicles, Queries, Missing Vehicles, and Price Suggestions.
- Refined Vehicles, Missing Vehicles, and Price Suggestions card views with unified white/dark surfaces, soft metadata tiles, cleaner price hierarchy, and consistent teal action states.
- Restored the admin header platform title link and refined vehicle spec/status capsules across tables, cards, and dashboard status summaries with UI-matched light/dark colors.
- Retinted the admin header platform title link to the teal brand palette in light and dark mode.
- Updated neutral Vehicles spec capsules to use the requested `#F6F5F2` background.

### Flow 3 — MVR Option-Set Mapping Fixed (Fuel + Body Type)
- **User verified the actual Dataverse option sets** for the Missing Vehicle Request table → the code maps were WRONG (assumed values, never verified against Dataverse).
- **Fuel Type (`vpi_fueltype`)** — actual: `Petrol`=1, `Diesel`=2, `Hybrid`=3, `Electric`=4. The old code map was copied from the Vehicle *Powertrain* set (Electric=1, Hybrid=2, Petrol/Diesel=3) → scraped `Petrol` was written as value 3 = **Hybrid** in Dataverse. Fixed `MISSING_VEHICLE_FUEL_TYPE` + `mapFuelType()` (Petrol→Petrol, Diesel→Diesel, Hybrid→Hybrid, Electric→Electric).
- **Body Type (`vpi_bodytype`)** — actual: its own **68-option set** (Sedan=44, SUV=53, `SUV - Crossover`=57). The old code used a fabricated 62-option map (Sedan=42, Suv=47, plus labels that don't exist like "Convertable"/"Targah") → scraped `SUV / Crossover` matched nothing → body type was never written. Replaced with the real values + added a **normalised fallback lookup** (case/separator-insensitive) so YallaMotor `SUV / Crossover` matches Dataverse `SUV - Crossover`.
- **User cleaned the labels in Dataverse** (acronym casing LWB/HR/MPV/SUV, uniform `SUV - ` separator for all SUV subtypes, `Electrical`→`Electric`). Code uses exactly those labels.
- **Schema doc lie corrected:** MVR `vpi_bodytype` does NOT share the global Vehicle Data option set — it has its own 68-value set (previously documented as shared). Added the real `vpi_fueltype` table too.
- Files: `src/data/dataverseOptionSets.ts`, `src/hooks/useTriggerScrape.ts`, `docs/dataverse-schema.md`, `docs/power-automate-cloud-only-design.md`.
- ✅ **Verified live 2026-07-31** after publish — re-ran the scrape (Mercedes C-Class C 200 2021): Body Type + Fuel Type now record correctly in Dataverse.

### Vehicle Data Option Sets — Body Type Fixed + Powertrain Approval Mapping
- **User shared the real Vehicle Data option sets** — Body Type `vpi_bodytype` and Powertrain Type `vpi_powertraintype`.
- **Body Type (`vpi_bodytype`)** — real set is 68 options with values **1:1 identical to the MVR set** (Sedan=44, SUV=53, `SUV Crossover`=57). Only label formatting differs: Vehicle Data has **no ` - ` separator** ("SUV Compact"…"SUV Crossover") and lowercase `Lwb` ("Mini Bus Lwb Wide Body HR"). The old `BODY_TYPE` map was FABRICATED (Sedan=46, SUV=55, labels like "Landaulet"/"Minivan"/"Pickup Truck") and shifted every value below 16 — replaced with the real set; `bodyTypeValue` now uses the normalised fallback lookup.
- **Powertrain Type (`vpi_powertraintype`)** — was already correct (Electric=1, Hybrid=2, Petrol/Diesel=3); added a VERIFIED note.
- **Approval flow fix:** `approveAndCreateVehicle()` mapped MVR `fuelType` directly through `powertrainValue()`, so MVR "Petrol"/"Diesel" → Vehicle powertrain was silently dropped (there is no exact "Petrol" label in the powertrain set). Added `mvrFuelToPowertrainLabel()` — Petrol/Diesel → `Petrol/Diesel` (3), Hybrid → 2, Electric → 1.
- Files: `src/data/dataverseOptionSets.ts`, `src/lib/missingVehicleApi.ts`, `docs/dataverse-schema.md`.

### Vehicle Data Body Type — Labels Synced with MVR + Maps Unified
- **User cleaned the Vehicle Data labels in Dataverse** on 2026-07-31: `Mini Bus Lwb Wide Body HR` → `Mini Bus LWB Wide Body HR` (uppercase `LWB`), and the four SUV subtypes gained the ` - ` separator (`SUV - Compact`…`SUV - Crossover`).
- The Vehicle Data and MVR body-type sets are now **fully identical** (labels AND values) — `MISSING_VEHICLE_BODY_TYPE` is now an alias of `BODY_TYPE` (single source of truth), replacing the duplicated 68-entry literal so the two can never drift again.
- Docs: `docs/dataverse-schema.md` tables + notes updated.

### Flow 3 Deep Scrape — Debugging Retrospective Documented
- **Added `docs/flow3-deep-scrape-debugging-retrospective.md`** — a complete, self-contained narrative of the entire Flow 3 deep-scrape journey, per user request ("document it, as it is").
- **Covers, in order:** where it started (patterns designed 2026-07-28 from *guessed* page structures), the full test timeline (Flow 1/2, Flow 3 Tests 1–7), the three live runs of 2026-07-31 (Doors `trim()` arity error → Cylinders Null-split crash → full clean sweep), root-cause analysis of each failure, a "where we were lacking → how we overcame" table, **the final verified extraction expressions** (all 9 fields, copied verbatim from the design doc), how the last run got every field, and the lessons learned.
- **Key insight preserved:** the killer bug was the assumed `<th>/<td>` table — the real page is `<div title="LABEL">` tiles with zero `<td>` tags. A `contains()` diagnostic proved the label exists but not the markup.
- **Documents the honesty audit** (evidence extraction is live, not hardcoded) and the remaining step: a second-vehicle credibility re-test after the Cloudflare cooldown.
- Linked from CLAUDE.md Documentation section and from the design doc's Test 7 section.

### Flow Expression Validator (`npm run validate:flows`)
- **Added `scripts/validate-flow-expressions.mjs`** — extracts every Power Automate expression from `docs/power-automate-cloud-only-design.md` and validates paren balance (ignoring string literals) **and** single-argument function arity (`trim`/`first`/`last`/etc. must receive exactly one argument).
- **Why:** The Flow 3 `Extract_Doors` `trim(first(...), '')` two-parameter error cost a Cloudflare-limited test cycle. Every live Flow test is expensive (~30 min cooldown), so catching expression typos locally before testing saves time.
- **Validated 49 expression blocks** across Flow 1/2/3 sections — all currently pass. Verified the tool catches the exact `trim` bug and stray-paren cases, and skips non-expression blocks (HTML templates, ASCII diagrams, URL/JS samples).
- **Workflow rule:** run `npm run validate:flows` before any live Flow test.
- Added `"validate:flows"` npm script + CLAUDE.md Commands/Project Structure entries.

### Flow 3 Deep Scrape — Live Retest (Mitsubishi Pajero)
- **Retested Flow 3** against a Mitsubishi Pajero GLS V6 2020 listing after the Cloudflare cooldown.
- **Now verified working:** Listing URL (`<article>` + `href` extraction), Body Type (SUV / Crossover), Fuel Type (Petrol), Transmission (Automatic), Drive Type (`https://schema.org/AllWheelDriveConfiguration`), Engine Size (`2972`).
- **Cylinders `contains()` diagnostic passed** — confirmed `Number of Cylinders` exists in the HTML DOM, so the HTML extraction path is viable.
- **Fixed `Extract Doors` expression** (§9b iv-g) — Power Automate error `InvalidTemplate: 'trim' must have only one parameter`. Root cause: a stray `, ''` was passed as a second argument to `trim(first(...), '')`. Corrected to `trim(first(...))`.
- **Catch Scope verified** — error was gracefully caught without failing the flow.

### Flow 3 Deep Scrape — Expression Hardening (pre-emptive, for next retest)
- **Doors hardened** (§9b iv-g) — The `trim()` fix still split on `,` only; if `"numberOfDoors"` is the last JSON-LD property (`"value":4}` no trailing comma), it would return `4}`. New nested-if handles: nested `QuantitativeValue` number **and** plain `"numberOfDoors":` integer, using a `}`-then-`,` split in both branches.
- **Mileage hardened** (§9b iv-i) — Old expression split on `,`, which breaks if the value is a quoted string (like verified engine size `"value":"2000"`). New nested-if tries the string pattern first, then the numeric pattern. Expected: `130161`.
- **Regional Specs hardened** (§9b iv-j) — Old expression relied on `description` JSON-LD only. New version extracts from the HTML table row (`Regional Specs</th><td>`) first (same server-rendered table as Cylinders, confirmed present), with `description` as fallback. Expected: `GCC Specs`.
- **All three expressions paren-validated** programmatically (Node script) before committing — DOORS/MILEAGE/REGIONAL all BALANCED.
- **Still pending:** Doors value, Cylinders numeric value, Mileage value, Regional Specs value (all on next live retest).

### Flow 3 Deep Scrape — Hardened Expressions Verified Against Real JSON-LD (Test 6)
- **User pasted the real Pajero JSON-LD** — simulated all hardened expressions against it. **All extract correct values:** Doors=`4`, Mileage=`130161`, Regional=`GCC Specs`, plus all previously-working fields re-confirmed.
- **Key structural findings recorded in the design doc (Test 6 section):**
  - **Mileage value is an UNQUOTED number** (`"value":130161`) — unlike engine size (quoted string `"value":"2972"`). This validates the dual-path Mileage expression: string branch stays silent, numeric branch fires.
  - **Doors has a `unitCode`** (`"value":4,"unitCode":"C62"`) — the old `,`-split would have worked *for this car*; the `}`-then-`,` hardening is insurance for listings where doors is the last property.
  - **"Regional Specs" is absent from JSON-LD** (HTML table only, same as Cylinders) — but `description` contains `GCC Specs`, so both the HTML branch and the description fallback reach GCC.
  - **JSON-LD wrapper is flat `["Product","Car"]`**, not `AutoDealer`/`itemOffered` — irrelevant to extraction, but recorded so future edits stop guessing.
- **Residual risk noted:** regional HTML branch assumes the table row is the first `Regional Specs` occurrence in the page — confirmed next live test.
- **Next step (user-side):** paste the 3 hardened expressions into Power Automate, run `npm run validate:flows` first, then retest (mind the ~30 min Cloudflare cooldown).

### Flow 3 Deep Scrape — Cylinders & Regional Specs `<td>` Bug Root-Caused + Fixed
- **Live retest failed at `Extract Cylinders`** with `InvalidTemplate: split expects first parameter of type string; provided value of type 'Null'`. The old expression split on `'Number of Cylinders'` → `<td>` → `</td>`.
- **Root cause (view-source verified):** the YallaMotor Vehicle Highlights section is a grid of **`<div>` cards — there are NO `<td>` tags anywhere on the page**. The `<th>/<td>` table assumption was wrong (the `contains()` diagnostic had only proved the label string exists, not the markup). `first(skip(split(after, '<td>'), 1))` → Null.
- **Real markup:** `<div class="mb-1 text-sm text-gray-600 capitalize" title="Number of Cylinders">Number of Cylinders</div><div class="text-base font-semibold text-gray-900 lg:text-base" title="6">6</div>` — label and value are sibling `<div>`s; the value's `title` attribute holds the data.
- **Fix:** both Cylinders (§9b iv-e) and Regional Specs (§9b iv-j) rewritten to split on `title="LABEL"` → the next `title="` → `"`:
  - Cylinders: `trim(first(split(first(skip(split(first(skip(split(body, 'title="Number of Cylinders"'), 1)), 'title="'), 1)), '"')))` → sim-verified `6`.
  - Regional Specs: same `title="Regional Specs"` tile pattern primary, JSON-LD `description` fallback (verified contains `GCC Specs`) → either branch reaches GCC.
- **Simulated all 10 extractions against a faithful reconstruction of the real page** (JSON-LD + Organization block + summary bar + tiles) — all correct: Doors=`4`, Mileage=`130161`, Engine=`2972`, Cylinders=`6`, Regional=`GCC Specs`, plus Body/Fuel/Transmission/Drive.
- **Bonus finding:** the sticky summary bar contains `<span>GCC Specs</span>` — plain-text region value in the page.
- **All 43 expressions re-validated** (paren + arity) after the edit.

### Flow 3 Deep Scrape — ✅ FULL CLEAN SWEEP (Mitsubishi Pajero) — Flow 3 Verified End-to-End
- **One live run, every field correct:** Listing URL ✅, Body Type `SUV / Crossover` ✅, Fuel `Petrol` ✅, Transmission `Automatic` ✅, Drive Type ✅, **Cylinders `6`** ✅, Engine Size `2972` ✅, **Doors `4`** ✅, **Mileage `130161`** ✅, **Regional Specs `GCC Specs`** ✅.
- **Both `<td>`-bug fixes confirmed live** — Cylinders and Regional Specs extracted correctly via the `title="LABEL"` tile pattern (no Null-split errors).
- **Full Response JSON correct** — all 9 specs + count=5, minPrice=54999, maxPrice=75500, heading, sourceUrl. No Catch Scope triggered.
- **Doc:** Test 7 entry added to `docs/power-automate-cloud-only-design.md` recording the full pass.
- **Flow 3 is now fully verified end-to-end** after the 2026-07-31 `<td>` bug journey (assumed table → Null split crash → view-source revealed `<div title="LABEL">` tiles → rewritten → sim-verified → live pass).

## 2026-07-30

### Public Navigation
- Locked public navigation visited-link states to the teal UI palette so selected/visited links no longer fall back to browser blue.

### Admin Dashboard
- Removed the admin dashboard header search and period pill, moved query/missing-vehicle KPI drill-downs directly under Weekly Stats, fixed KPI text wrapping, improved Powertrain center-label contrast in dark mode, and cleaned the leaderboard by removing TSV export, natural-casing headers, and tightening the table width after Max Price.
- Removed the remaining blank leaderboard table surface after Max Price, made KPI drill-down cards span the dashboard row, improved sidebar item line-height so lower menu labels are not clipped, and changed the default app theme from system-driven dark mode to light mode.
- Updated the premium leaderboard to use only Year, Make, Model, Spec, Min Price, and Max Price columns across the full table width, removed the Top 100 pill, improved modal header/body contrast in dark mode, and removed the vehicle modal price-range bar plus Comparable Vehicles section.
- Cleaned landing navbar hover underlines, removed the Vehicles detail modal Pricing Overview section, added resilient phone/location fallbacks for Queries table and detail modal, and corrected dark-mode styling for the Query detail modal header and valuation cards.
- Standardized Missing Vehicle and Price Suggestion modal sizing/header surfaces, removed the Price Suggestion modal vehicle banner, centered public header/footer wrappers on ultra-wide zoomed views, and migrated persisted default theme state back to light mode.
- Removed formatted currency preview text from Price Suggestion modal inputs, removed Market Insights from the valuation wizard result step, and improved valuation result label contrast in dark mode.
- Bumped the persisted theme store migration so existing saved dark/system theme preferences reset to the light default on next load.
- Rethemed generated valuation PDFs from the old violet report styling to the current navy/teal enterprise UI palette with matching price summary and table surfaces.

### Flow 3 Deep Scrape — Detail Page Verification & Doc Update
- **Manual detail page verification** — Confirmed all spec fields present on individual listing page (`used-mercedes-benz-c-class-2021-sharjah-2104988`).
- **Raw JSON-LD analyzed** — compared extraction patterns against actual page source → found 3 mismatches:
  - **Fixed Cylinders extraction** (§9b iv-e): **NOT in JSON-LD** at all. Changed from JSON-LD `"numberOfCylinders":"` → HTML DOM extraction (`Number of Cylinders</th>` → `<td>`).
  - **Fixed Engine Size extraction** (§9b iv-f): Value is nested at `vehicleEngine.engineDisplacement.value`. Changed from `"engineDisplacement":"` (flat) → `"engineDisplacement":{"@type":"QuantitativeValue","value":"` (nested path).
  - **Added Seats note** (§9b iv-h): Not present in verified JSON-LD, may need DOM extraction or graceful omission.
- **Added Test 5 entry** — Full "Vehicle Highlights" table with JSON-LD cross-reference: 8/10 fields in JSON-LD, 2 fields (Cylinders, Seats) HTML-only.
- **Doc clarity fixes**: Renamed `Listing URL Found?` → `Is Listing URL Found`. Clarified that `(empty)` means leave the value field blank (not type "empty"). Clarified that no action is needed in the "If no" branch (DetailResponseBody stays empty automatically). Added explicit placement note: extraction steps go AFTER the condition, not inside its branches.
## 2026-07-29

### Git Workflow — Hassan PR Merge (165 conflicts)
- **Merged `origin/hassan` into `main`** — Resolved 165 conflicts by categorizing: source files (manual), auto-generated build artifacts (accept theirs with `git checkout --theirs`), rename/delete edge cases (DD/UD → `git rm`, AU → `git add`).
- **Removed auto-generated files from git tracking** — `web-files/`, `manifest.yml`, `org*.yml` now in `.gitignore` + removed from tracking via `git rm --cached`. Future merges won't conflict on these.
- **Ran `npm run publish` post-merge** — SPA-Shell and Home.webpage auto-updated to the correct build hashes. Build succeeded: 3282 modules transformed.
- **Pushed to origin/main** — 3 commits ahead of remote synced. Remote was on "Revert 'Final Ui Yo'", now at f7a1650.
- **Key lesson learned**: After any merge, run `npm run publish` to regenerate asset references rather than manually fixing hashes.

### Git Workflow — publish script & .gitignore
- **Added `publish.ps1`**: Single PowerShell script that runs build → download portal state → upload to Power Pages.
- **Added `npm run publish`**: Calls `publish.ps1` — one command for the full deploy cycle.
- **Updated `.gitignore`**: Ignored `web-files/`, `manifest.yml`, and `org*.yml` — these auto-generated files caused merge conflicts when "accept both" was selected, leading to duplicate RecordIds and `PortalFileContentUploadFailed` errors.
- **After any merge**: Instead of manually fixing conflicts, just run `npm run publish`.

### Flow 3 Deep Scrape — Frontend Integration

### Flow 3 Deep Scrape — Power Automate Test & Doc Update
- **Tested deep scrape** from search results page: 4/10 fields extracted (Body Type, Fuel Type, Transmission, Mileage). Drive Type, Cylinders, Engine Size, Doors, Seats not available in search page JSON-LD.
- **Updated design doc** — Rewrote §9b for Option B (second HTTP request to listing detail page). Added `DetailResponseBody` variable, `Extract First Listing URL` Compose, `Listing URL Found?` Condition, `HTTP Detail Page` action, and re-pointed all 10 spec extraction steps to use `variables('DetailResponseBody')`.
- **Fixed heading expression** — Changed split delimiter from `'heading-h2-content'` to `'heading-h2-content">'` to strip the stray `">` prefix.
- **Added Test 4 entry** documenting the 2026-07-29 partial test results with a field-by-field analysis table.
- **Extended `Flow3ScrapeResult` interface** in `yallaMotorHttpScraper.ts`: Added `bodyType`, `fuelType`, `transmission`, `driveType`, `cylinders`, `engineSize`, `doors`, `seats`, `mileage`, and `regionalSpecs` fields. The `scrapeViaFlow3()` function now parses these from the Flow 3 JSON response.
- **Added `asString()` helper**: Safely extracts string values from unknown Flow 3 response fields.
- **Extended `MissingVehicleRequest` type**: Added `engineSize`, `doors`, `seats`, and `category` fields.
- **Updated `MISSING_VEHICLE_REQUEST_FIELDS` config**: Added `ENGINE_SIZE`, `DOORS`, `SEATS`, and `CATEGORY` field mappings.
- **Extended `updateMissingVehicleScrapeResult()`** through all layers (API → DataSource → IDataSource → Repository): Now accepts optional spec fields (`bodyTypeValue`, `fuelTypeValue`, `transmissionValue`, `driveTypeValue`, `cylindersValue`, `engineSizeValue`, `doorsValue`, `seatsValue`, `categoryValue`) and writes them to the MVR record in Dataverse.
- **Updated `fetchMissingVehicleRequests()` and `fetchMissingVehicleRequestById()`**: Include new spec fields in `$select` queries.
- **Added mapping logic in `useTriggerScrape.ts`**: 
  - `mapDriveType()` — converts schema.org drive URLs (e.g., `RearWheelDriveConfiguration`) to short labels (`RWD`).
  - `mapCategory()` — parses listing descriptions for regional-spec keywords (`GCC Specs`, etc.) → Dataverse category values.
  - `mapFuelType()` — normalises `Petrol`/`Diesel` → `Petrol/Diesel`.
  - `lookupDoorsValue()` / `lookupSeatsValue()` — look up DOORS/SEATS option set values.
  - After a successful scrape, all mapped spec field values are persisted alongside pricing data.

### Typography System
- Standardized the app on Inter as the single enterprise UI font, removed the mixed Plus Jakarta Sans/Montserrat/Roboto font stack, and added base typography inheritance for the full application.
- Normalized typography weights and sizes across shared UI primitives, public layout, valuation wizard, admin sidebar/header, dashboard cards/charts, tables, modals, and dense admin pages.
- Replaced UI monospace usage in dashboard values with Inter plus `tabular-nums`, preserving aligned numeric data without mixing font families.
- Updated the design/context documentation and memory conventions to reflect the new typography system.

### Power Pages Asset Cleanup
- Removed stale hashed Power Pages web-file assets, including the failing `analyticsRepository-Bim_5Jb3.js`, so PAC uploads only the current Vite build assets.
- Expanded the portal asset cleanup matcher to include legacy lowercase chunks plus chart/table chunks, preventing future stale generated web files from surviving cleanup.
- Fixed the SPA shell asset updater so it regenerates the full Vite asset block, removes stale module scripts, and keeps current vendor preload links available under `/assets`.
- Synced current generated web-file and annotation records into the PAC base manifest and marked stale generated records deleted, fixing upload failures such as `vendor-charts-BIOnAA2Y.js`.
- Rotated the `vendor-charts-BIOnAA2Y.js` Power Pages webfile and annotation IDs after PAC continued targeting the corrupted content record, while marking the old failing IDs deleted in both manifests.
- Made the portal template updater recover from an empty `{}` PAC manifest by recreating required manifest sections and ensuring exact web-file directories exist for every current Vite asset.
- Changed regenerated PAC manifest sections with no records to use explicit empty lists, preventing PAC 2.8.1 from crashing with `ArgumentNullException` during compiled artifact cleanup.
- Renamed the Recharts vendor chunk from `vendor-charts-*` to `vendor-recharts-*`, cleaned stale generated web-file folders, and made manifest cleanup retire all duplicate stale record-id occurrences.

### Admin UI
- Aligned sidebar notification count badges with the teal notification dropdown badge color.
- Fixed admin dark mode across the dashboard shell by darkening the sidebar, dashboard cards, chart cards, leaderboard table, vehicle table surfaces, list-page search/tabs, status summaries, and vehicle intelligence modal.
- Unified Vehicles, Queries, Missing Vehicles, and Price Suggestions grid headers with muted blue-gray natural-case labels, reordered the Vehicles toolbar to search/export/icon toggle, and aligned the admin table/card toggles to icon-only controls.

## 2026-07-28

### Manifest Rebuild for Current Build & SPA Shell Fix
- **Root cause of blank screen**: The SPA Shell web template (`SPA-Shell.webtemplate.source.html`) had hard-coded `<script>` references to `index-CmbBBwOb.js`, `index-B3MGuNjE.js`, and `index-BxUExJa3.js` — two of which don't exist in the current build and one that's a code-split chunk, not the entry point.
- **Updated SPA Shell**: Replaced stale script refs with the correct entry point (`index-K_KmhXy2.js`) and its modulepreloads (`vendor-C5Q43FSy.js`, `vendor-query-dtloYRUI.js`, `vendor-animation-B9wsIYe3.js`).
- **Rebuilt manifest**: Added all 12 current build files (from `dist/assets/`) as `IsDeleted: false` entries with proper RecordIds from their `.webfile.yml` files.
- **Marked old build files deleted**: 9 old entries (`analyticsRepository-*.js`, `index-*.js.map`, `vendor-animation-D39qNG4p.js`, `style-CVBBNNQb.css`) changed to `IsDeleted: true`.
- **Added missing `index.html`**: The `index.html` webfile itself was absent from the manifest — added it.

### Power Pages Deployment Fix — Duplicate Manifest Entries
- Removed 9 duplicate `IsDeleted: true` stub entries from `manifest.yml` that had RecordIds also appearing as `IsDeleted: false` with real filenames — these were causing `PortalFileContentUploadFailed` errors during deployment.
- Each duplicate was a GUID-as-DisplayName `IsDeleted: true` entry conflicting with the proper filename entry later in the file; Power Pages processed the stub first, tripping the upload conflict.

### Flow 3 — Extract Mileage trim() Syntax Fix
- Fixed `trim(first(...), '')` → `trim(first(...))` in Extract Mileage expression — the `trim()` function in Power Automate only accepts one parameter.

### User-Facing Teal Color Alignment
- Retinted the public loader, landing page badge/hover/card/CTA colors, public header/footer hover states, valuation wizard progress indicator, Step 1 form borders/focus rings/city dropdown/consent card, vehicle-selection dropdown hover/selected states, and valuation result cards to match the dashboard teal palette.
- Removed the remaining valuation-page old color hooks by retinting the valuation canvas/card shell, Step 2 dropdown focus rings/search surfaces, empty-result borders, and valuation spec-card hover states to teal.
- Removed the remaining landing-page orange/indigo accents by retinting global primary/accent theme tokens, shimmer text, grid glow, focus rings, and the public header wordmark to the dashboard teal palette.
- Pinned landing navigation active/focus/pressed states and shared gradient CTA buttons to teal-only colors, and improved valuation dark-mode text contrast for page headings, form labels, and form inputs.
- Locked shared button link states so landing CTAs and outline buttons keep teal/white text for visited, hover, focus, and pressed interactions instead of falling back to browser amber/blue link colors.
- Added Montserrat, Plus Jakarta Sans, and Roboto Google Font loading, and set the global app sans stack to Plus Jakarta Sans with Montserrat and Roboto fallbacks.

### Admin Dashboard UI Revamp
- Rebuilt the admin dashboard with a reference-inspired pale blue canvas, compact white metric cards, navy typography, teal/soft-blue chart colors, responsive chart ordering, borderless leaderboard table styling, and matching vehicle intelligence modal surfaces while preserving existing dashboard text, navigation, data, and interactions.
- Refined the dashboard and related admin surfaces: Top Models, Top Makes, and Body Types now show top five results; Powertrain and Top Models share matching chart height; the dashboard layout is sectioned without the previous blank left-column space; the admin canvas uses `#e5e7eb`; and Vehicles, Queries, Missing Vehicles, Price Suggestions, status dropdowns, tabs, hover states, cards, header, and notifications were retinted to the teal/reference UI system.
- Polished the remaining admin chrome: added dark-mode aware header, notification, notification-count, and theme-switcher colors; retinted shared filter dropdown hover/selected/focus states to teal; removed colored top bars from Query and Price Suggestion cards; and aligned Missing Vehicles scrape action hover styling with the dashboard palette.
- Removed the remaining admin indigo/orange token usage by switching notifications, notification counts, theme controls, Settings accents, Vehicles filter action buttons, Query pending text, and legacy admin chart helpers to the teal dashboard palette; also made the admin shell and dashboard canvas visibly respond to dark mode.
- Restyled admin pagination across Vehicles, Queries, Missing Vehicles, and Price Suggestions with teal active page buttons, soft teal hover states, compact white controls, cleaner disabled arrows, aligned wrapping, and a styled Vehicles rows-per-page selector.
- Moved the admin sidebar collapse control into the compact Admin Center brand row with a small panel icon treatment that matches the sidebar UI in expanded, collapsed, and hover-expanded states.
- Reworked the admin header by removing the subtitle, moving a larger search field into the left title area, removing the old right-side search field, simplifying the notification bell away from the filled gradient style, and removing the Weekly Stats brand strip.
- Fixed Top Models chart labels so make names are not duplicated when the model already includes the make, and widened/shifted the Y-axis label area for cleaner left alignment.
- Reduced the Top Models chart label gutter so the horizontal bars start further left with less empty space.
- Removed the admin header page icon/title block so the search field sits further left, removed the Weekly Stats circular car icon, and strengthened the Overall Performance Dashboard title weight.

### Power Automate — Flow 3 Deep Scrape for Vehicle Specs
- **Deep scrape designed** for Flow 3 (`MVR - On-Demand Scraper`): extracts complete vehicle specs from first listing's detail page via JSON-LD
- **New Flow 3 steps (inside Try/heading-found branch):**
  - Extract First Listing URL from search results
  - HTTP Deep Scrape → listing detail page
  - Extract: Body Type, Fuel Type, Transmission, Drive Type, Cylinders, Engine Size, Doors, Seats, Mileage
  - Updated Response to include all spec fields
- **Design doc updated** with full deep scrape steps, extraction expressions, data flow diagram, and Dataverse option set mapping reference
- **Frontend changes documented** — `yallaMotorHttpScraper.ts`, `useTriggerScrape.ts`, and repository need updates to write specs to Dataverse

### 🐛 Flow 3 Fix — Deep Scrape URL + Cloudflare
- **Removed step 9b(i) `Extract First Listing URL`** — extracted listing detail URLs (`/used-cars/{make}-{model}-{year}-{city}-{listingID}`) always return 404 on YallaMotor. That URL format is invalid.
- **Removed `HTTP Deep Scrape` action entirely** — making a second HTTP request to YallaMotor triggers Cloudflare's JS challenge.
- **All spec extraction now uses `variables('ResponseBody')`** — the response from Step 4 (HTTP Search) is cached here. All 10 extraction expressions changed from `body('HTTP_Deep_Scrape')` → `variables('ResponseBody')`, avoiding the Cloudflare issue entirely.
- **Updated HTTP headers in Steps 4 & 7:** Added `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform` (User-Agent Client Hints) and bumped Chrome 125 → 128. Cloudflare's managed challenge requires these Client Hint headers — without them, it returns a JS challenge page ("Just a moment..."). Applied to both Flow 1 and Flow 3 HTTP actions.
- **Design doc updated** with new headers, Cloudflare explanation, and simplified no-second-request approach.

### Power Automate — Flow 4 Built, Tested & Verified
- **Flow 4 (`MVR - Customer Email Notification`) built & tested** — email sends successfully when scrape completes
- **Fixed:** `vpi_contact` (schema name) vs `_vpi_contact_value` (internal field name) — Select columns uses schema name, expression uses internal name
- **Fixed:** Dynamic content must be inserted via **Dynamic content picker**, not typed as literal expressions
- **Fixed:** Email link text changed to "Click here to visit the site"
- **Fixed:** Email body wording — "We've reviewed your request" → "Your request has been processed"
- **Docs updated** with corrected template, accurate instructions, and checked-off setup checklist
- **Memory saved:** Dataverse lookup field naming convention (schema vs internal)

## 2026-07-27

### Power Pages Upload Metadata Fix
- Added the required `adx_websiteid` and `adx_name` fields to the local Power Pages `website.yml` using the existing site id and name so PAC 2.8.1 can validate uploads.

### Admin Sidebar Toggle Icon Update
- Replaced the sidebar collapse/expand chevron icons with compact panel-style icons matching the provided reference while keeping the existing toggle functionality unchanged.

### Build Script Regex Fix
- Fixed `scripts/update-portal-template.mjs` so the portal manifest cleanup regex no longer uses unsupported JavaScript atomic groups, resolving the `Invalid regular expression: Invalid group` error during `npm run build`.
- Made portal orphan cleanup opt-in via `CLEAN_PORTAL_ORPHANS=true` so normal builds do not create hundreds of web-file deletions that can make Power Apps CLI uploads time out.

### Admin Sidebar UI Revamp
- Restyled the admin sidebar into a compact white layout matching the provided reference: slimmer width, smaller navigation rows, pale icons, subtle grey active state, compact brand area, and bottom "Back to site" link while preserving all existing navigation labels, routes, badges, and collapse behavior.

### Power Automate — Flow 4 Design: Customer Email Notification
- **New flow designed** — `MVR - Customer Email Notification` sends an email to the requesting user when their MVR's scrape status changes to `Scraped (4)`
- **Trigger:** Dataverse "When a row is modified" on Missing Vehicle Requests with filter `vpi_scrapestatus eq 4`
- **Actions:** Get Contact row (resolves `_vpi_contact_value` lookup) → Send Email (Office 365 Outlook)
- **Email template:** Professional notification with vehicle details, platform link, and CTA — no pricing/listings in email body
- **All flows renamed** with consistent `MVR -` prefixing:
  - Flow 1: `MVR - Connectivity Test` (was `MVR - Test YallaMotor Accessibility`)
  - Flow 2: `MVR - Automated Scraper` (was `MVR - Scrape YallaMotor (Automated)`)
  - Flow 3: `MVR - On-Demand Scraper` (was `MVR - Scrape YallaMotor (HTTP)`)
  - Flow 4: `MVR - Customer Email Notification` (new)
- **`docs/power-automate-cloud-only-design.md`** — Updated status summary, renamed all flow headings, added complete Flow 4 design section with Filter rows approach (simpler, no extra Condition step)

### Fixed — YallaMotor URL slug: periods now convert to hyphens
- **Root cause:** Trim "2.4L" produced `vr_2.4l` in Flow 3's URL (period kept) and `vr_24l` in frontend slugify (period stripped). YallaMotor expects `vr_2-4l` (period → hyphen).
- **`src/lib/yallaMotorHttpScraper.ts`** — Updated slugify: `toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` — replaces any sequence of non-alphanumeric chars with a single hyphen instead of just stripping them
- **Flow 3 URL builder expression** — Added nested `replace('.', '-')` for make, model, and trim segments
- **Flow 2 URL builder expression** — Same fix applied
- **Design doc** — Updated "Hyphen rule" → "Slug rule" to reflect broader character handling

## 2026-07-26

### Power Automate — Flow 4 Design: Customer Email Notification
- **New flow designed** — `MVR - Customer Email Notification` sends an email to the requesting user when their MVR's scrape status changes to `Scraped (4)`
- **Trigger:** Dataverse "When a row is modified" on Missing Vehicle Requests, filtered by `vpi_scrapestatus = 4`
- **Actions:** Get Contact row (resolves `_vpi_contact_value` lookup) → Send Email (Office 365 Outlook)
- **Email template:** Professional notification with vehicle details, platform link, and CTA — no pricing/listings in email body
- **All flows renamed** with consistent `MVR -` prefixing:
  - Flow 1: `MVR - Connectivity Test` (was `MVR - Test YallaMotor Accessibility`)
  - Flow 2: `MVR - Automated Scraper` (was `MVR - Scrape YallaMotor (Automated)`)
  - Flow 3: `MVR - On-Demand Scraper` (was `MVR - Scrape YallaMotor (HTTP)`)
  - Flow 4: `MVR - Customer Email Notification` (new)
- **`docs/power-automate-cloud-only-design.md`** — Updated status summary, renamed all flow headings, added complete Flow 4 design section with data flow diagram, step-by-step instructions, Filter rows approach (instead of separate Condition step), and setup checklist

## 2026-07-26

### Scraper Migration — Moved from User Valuation to Admin
- **Removed live scraping from user-facing flow** — `Step3Result.tsx` no longer calls Flow 3 (`scrapeViaFlow3`) when a vehicle is not found. Users simply submit a "Request This Vehicle" with their contact info, no multi-step dialog, no price suggestion form.
- **Added admin-controlled scraping** — `AdminMissingVehiclesPage.tsx` now has "Scrape Now" buttons in table rows, card view, and the detail modal. Admins can trigger Flow 3 manually for any Pending/Failed/Unreachable MVR.
- **Added "Scrape All Pending" bulk action** — A button in the admin header scrapes all pending/failed/unreachable requests in sequence.
- **New hook `useTriggerScrape`** — `src/hooks/useTriggerScrape.ts` orchestrates the Flow 3 HTTP call, saves results to Dataverse via PATCH, shows toasts, and refreshes the MVR list.
- **New API function `updateMissingVehicleScrapeResult`** — `src/lib/missingVehicleApi.ts` now has a dedicated PATCH function for scrape result fields (scrapedMinPrice, scrapedMaxPrice, scrapedListings, scrapedSources, scrapeStatusValue).
- **Repository + DataSource wired** — Method added to `MissingVehicleRepository`, `IDataSource` interface, and `DataverseDataSource` implementation.
- **Removed `Suggest Price` from valuation** — The `Suggest Price` dialog and all related state/handlers removed from `Step3Result.tsx`.

## 2026-07-24
- **Headers confirmed complete** — User verified Step 3 HTTP headers include full `Sec-Fetch-*`, `Pragma`, `Upgrade-Insecure-Requests` set; Cloudflare 403 issue resolved
- **Dataverse write issue retracted** — Incorrect data was caused by Flow 2 (Dataverse-triggered scraper) overwriting Flow 3's correct output. End-to-end test with Mercedes C 300 confirmed: Scraped Min Price `127,000.00`, Max Price `275,000.00`, well-formed JSON in scraped listings, correct hyphenated URL
- **`docs/power-automate-cloud-only-design.md`** — Updated date to 2026-07-24; changed header warning to ✅ confirmation; fixed "4 OR Conditions" → "3 OR Conditions"; added "Flow 2 Interference Note" section; updated Flow 3 status to "End-to-End Verified"
- **`memory/flow3-cloudflare-headers.md`** — Marked as resolved (headers confirmed complete)
- **`memory/flow3-dataverse-write-issue.md`** — Marked as superseded (was Flow 2 interference); documented corrected test data
- **`memory/recent-work-summary.md`** — Added Flow 3 verification entry; moved Phase 3 to 🟢 Complete

### Memory — Session Start Summary & Greeting
- **memory/recent-work-summary.md** — Created auto-loaded memory file that captures the latest changes (last ~week), current known issues, and design language status. Loaded into every session via MEMORY.md.
- **CLAUDE.md** — Added "Session Start — Always Do This" instruction: greet with Assalamualaikum, present recent work summary from the memory file, ask what to work on next.
- **memory/MEMORY.md** — Added `recent-work-summary` pointer.

### Complete UI Color Revamp — Three-Tone Teal
- Replaced the indigo/amber identity with the selected palette: midnight teal `#092327`, deep teal `#0B5351`, and electric teal `#00A9A5`.
- Rebuilt light and dark theme surfaces, typography, cards, borders, form inputs, focus rings, sidebar colors, shadows, ambient glows, and gradient utilities from teal-derived tokens.
- Recolored the splash screen, public shell, valuation wizard, admin navigation, notifications, filters, badges, dialogs, progress treatments, interactive states, and decorative surfaces through shared semantic tokens.
- Replaced remaining blue, violet, amber, and orange component accents with primary/accent teal treatments while preserving red and green where destructive/success meaning is essential.
- Rebuilt the chart palette entirely from the three brand colors and their shades; aligned PDF headers and report surfaces to the same identity.
- Rewrote `docs/color-scheme.md` and updated design/development guidance with contrast rules for electric teal.

### Brand Identity — Indigo + Amber Fusion
- Promoted the splash-screen palette into a reusable app-wide brand system with canonical fusion, soft-surface, page-canvas, icon-mark, divider, and section-title primitives in `globals.css`.
- Upgraded the splash screen with a fused indigo/amber brand mark, dual ambient glows, branded title treatment, and fused progress indicator.
- Applied the identity to shared primary CTAs and progress components so valuation, landing, and admin workflows inherit the palette consistently.
- Restyled the public header/footer and admin shell with fused brand marks, gradient navigation accents, a deep-indigo sidebar, amber highlights, and subtle dual-color page atmosphere.
- Replaced remaining hardcoded admin/select indigo values with theme tokens, aligned chart fills with the shared palette, and updated PDF report headers to the canonical brand indigo.
- Preserved semantic success, warning, destructive, and informational colors so brand styling does not reduce UI clarity.

### Color Audit — Full app color consistency pass
- **Created `src/utils/colors.ts`** — single source of truth for chart colors (`CHART_COLORS`, `CHART_COLORS_HSL`, `PT_COLORS`, `getBarOpacity`)
- **Charts now reference shared palette** — TopMakesChart, BodyTypeChart, TopModelsChart, ValueTrendChart, PowertrainChart all import from `@utils/colors` instead of hardcoding `#6366f1`
- **Replaced all `violet-*` → `primary-*`** — WizardStepIndicator (step circles, labels, connector gradients), LandingPage badge, MainLayout footer links
- **Replaced `slate-*` with semantic tokens in LandingPage** — `text-slate-900` → `text-foreground`, `border-slate-100` → `border-border`, `bg-white/90` → `bg-card/90`, `bg-[#FCF8F7]` → `bg-muted/40`, and removed redundant `dark:` overrides
- **Sidebar dark mode → brand indigo** — `--sidebar-background` in `.dark` changed from `240 10% 1.5%` (near-black) to `252 60% 4%` (deep indigo)
- **Notification badge** → `bg-accent` instead of hardcoded `bg-amber-500`
- **Split `--warning` from `--accent`** — warning shifted to hue 32 (warm amber-orange) so it can be used independently of the brand accent (hue 38)

- Set body base font to `text-sm` (12px) in `globals.css`
- **Main headings** updated to `text-lg` (18px) — Dashboard, Queries, Vehicles, Missing Vehicles, Price Suggestions, Valuation pages
- **Sub-headings** updated to `text-base` (16px) — section titles in admin + valuation pages
- **Buttons** default size → `text-sm` (12px); sm/lg/xl sizes also standardized to `text-sm`
- **Badges** → `text-capsule` (10px)
- **Base components** updated: CardTitle, Dialog title/description, Input/Select labels & errors, Tabs, NotificationDropdown, EmptyState, ErrorBoundary, LoadingScreen, CustomSelect, Progress, LazyChart
- **Valuation wizard** headings, section titles, form inputs, and spec labels resized
- **Layouts** (AdminLayout, MainLayout) — footer and subtitle text resized
- Landing page hero headings left unchanged (marketing scale)
- Build: ✅ zero errors, 3281 modules transformed

## 2026-07-23

### Admin — Updated `text-xs` to `text-sm` across admin pages
- Changed all `text-xs` class usages to `text-sm` in 12 admin files for table cell data, descriptions, labels, and body-level text to match the new Tailwind font-size scale (`text-xs`=10px, `text-sm`=12px).
- Excluded: badge/capsule elements (`rounded-full`/`rounded-md` status tags), `text-[10px]` equivalents, and `STATUS_CONFIG` capsuled status selectors, which correctly remain at `text-xs`.
- Files: AdminQueriesPage, AdminMissingVehiclesPage, AdminPriceSuggestionsPage, AdminVehiclesPage, AdminSettingsPage, PremiumLeaderboard, ValueTrendChart, VehicleIntelligenceModal.

### Power Pages — Fixed deploy failure: missing index-* webfiles in manifest.yml
- **manifest.yml** — Added 4 missing `adx_webfile` entries (`index-5938Yz8n.js`, `index-TQaPp-Bq.js`, `index-C-KHSPpP.js`, `index-CCnQ0nQq.js`) that existed on disk but were absent from the deployment manifest, causing `PortalFileContentUploadFailed` on upload. Each entry is sorted by RecordId with `IsDeleted: false`.

### Docs — Color Scheme & Design Language Documentation
- **docs/color-scheme.md** — Created comprehensive color scheme reference documenting all 52 CSS variables (35 unique light / 34 unique dark), 37 Tailwind utility classes, semantic roles, dark-mode deltas, and a step-by-step guide for modifying the palette
- **docs/design-language.md** — Created full design language document covering layout, typography, spacing, border radius, shadows, component design (buttons, cards, badges, tabs, dialogs, inputs, progress), motion/animation (18 keyframes + Framer Motion patterns), iconography (all 30+ Lucide icons mapped), states, navigation, data viz, writing style, and accessibility
- **docs/color-scheme.md** — Created comprehensive color scheme reference documenting all 52 CSS variables (35 unique light / 34 unique dark), 37 Tailwind utility classes, semantic roles, dark-mode deltas, and a step-by-step guide for modifying the palette

### Valuation — Suggest Price Dialog Overlay Fix & Field Heading Case
- **dialog.tsx** — Changed overlay backdrop from `absolute` to `fixed` so the dark scrim covers the full viewport without being cropped at the top (Framer Motion's stacking context was shrinking the overlay)
- **Step3Result.tsx (Suggest Price modal)** — Removed `uppercase` CSS class from all field headings (`Vehicle`, `Suggested Price Range`, `Source URL`, `Comment`) so they display in proper Camel Case instead of ALL CAPS

### Admin — Unified Sidebar Notification Badges to Single Colour
- Changed all three notification badges in the Admin sidebar to `bg-amber-500` (previously Queries was `bg-rose-500`, Price Suggestions was `bg-blue-500`, only Missing Vehicles was `bg-amber-500`)
- Extracted repeated badge className into shared `badgeClass` helper to keep colours consistent in the future

### Favicon — Data URI + JS Injection into `<head>` (Power Pages Body Wrapper Fix)
- **Deleted `favicon.ico` web file** from Power Pages (set `IsDeleted: true` in manifest + removed folder) — browser auto-fetches `/favicon.ico` regardless of HTML links
- **Redesigned favicon.svg** from thin stroke-based Lucide car icon to a bold filled car silhouette
- **Final fix: JavaScript injection** into `document.head` — discovered the root cause: Power Pages wraps SPA Shell (web template) content inside its own page template's `<body>`. Browsers **ignore `<link rel="icon">` in `<body>`** entirely. The data URI `<link>` tags were correct, but in the wrong DOM location. A small inline script now creates the `<link>` elements and appends them directly to `document.head`, which the browser respects

## 2026-07-22

### Splash Screen — Smooth rAF Animation & Zero-Flash Snap Transition
- **loading-screen.tsx** — Added a `useRef`-based rAF animation loop that smoothly crawls toward the target progress via exponential decay (10% of remaining gap per frame). This eliminates discrete jumps without changing the original visual at all. Removed CSS `transition-all` class (conflicts with rAF). Progress bar and percentage text both count up smoothly together.
- **App.tsx** — Replaced all fading/opacity logic with a clean snap approach: when `isInitialized` becomes true, the splash stays for 900ms (giving the rAF time to reach exactly 100%), then is removed instantly. No `opacity-0`, `pointer-events-none`, or any intermediate render state — eliminated the 0% flash at root. App content renders in a `hidden` div behind the splash so React Query hooks start fetching data 900ms before the user sees the page.
- **dataverseDataSource.ts** — Added `onProgress(98)` call immediately after `fetchAllVehicles` completes, so the per-page stall at ~86% is followed by a smooth rAF crawl from 86% to 100%.

## 2026-07-21

### Missing Vehicle Request — UI & Data Fixes

- **Step2VehicleSelection** — Added red asterisk required indicators on Make, Model, Specification, Year fields; removed Body Type field entirely; updated `canProceed` to no longer require bodyType; removed unused `bodyTypesForVehicle` helper, `allBodyTypes`/`allBodyTypesFromDB` memos, and auto-populate useEffect
- **VehicleSelect** — Added `required` prop that renders a red asterisk next to the label
- **Step3Result** — Removed Additional Details section (Cylinders, Fuel Type, Transmission, Drive Type) from the missing vehicle request dialog; removed Mileage Range inputs; removed Body Type from both the Vehicle Not Found summary card and dialog prefilled summary; updated `handleConfirmAndCreate` to exclude removed fields
- **Step3Result success messages** — Differentiated completion messages: users who click "Confirm & Submit" (price suggested) see "Request Submitted" with email notification; users who click "Skip" (no price) see "Thank You" message
- **Step3Result dialog button** — Changed "Search YallaMotor & Submit" to "Search YallaMotor" since additional details were removed
- **yallaMotorHttpScraper.ts** — Added `slugify` helper to strip non-standard characters from URL slugs; improved robustness (spaces → hyphens + strip special chars)

### Documentation — Full Audit & Cleanup
- **docs/context.md** — Routes table now includes `/admin/missing-vehicles` and `/admin/price-suggestions`; corrected dashboard chart count from 10→5 (removed Price Distribution, Performance Scatter, Age Distribution, Box Plot); updated chart list to actual (Top Makes, Top Models, Body Type, Powertrain, Value Trend); added admin sections for Missing Vehicles and Price Suggestions pages; updated project structure with `src/lib/`, missing-vehicle/price-suggestion types, and additional hooks/repos
- **memory/project-identity.md** — Added `/admin/missing-vehicles` and `/admin/price-suggestions` routes
- **docs/dataverse-schema.md** — Fixed header date from 2026-06-30 to 2026-07-21
- **docs/PHASE-3-REVISED-PLAN.md** — Added "ARCHIVED" banner before sections 10–14; updated section 11 to reflect actual implementation (yallaMotorHttpScraper.ts instead of scraper microservice); added reality notes contrasting Path B risks with Power Automate outcomes
- **docs/PHASE-3-PLAN.md** — Added deprecation banner pointing to the revised plan

### Fixed — Splash Progress Jumping to 100% While Data Still Loading

- **Root cause:** Power Pages `$count=true` often returns the page size (5000) instead of the real total (~34 000 records). The old formula — `(fetched / 5000) × 50` — hit 50% after one page and **100% after two pages**, even though 5 of 7 API calls hadn't started yet.
- **Fetch phase widened** from `0→50%` to `0→80%` so loading the data is the primary visual indicator
- **$count validation:** If the returned total is ≤ `MAX_PAGE_SIZE` (5000), it's treated as unreliable and replaced with a dynamic estimate (up to 50 000, pulled upward as more pages arrive)
- **Progress is always capped at 79% during fetch** so the user never sees 100% before the in-memory processing phases even begin
- **Per-record processing phases** (pricing extraction 80→86%, vehicle parsing 86→96%) now throttle `setProgress` to whole-percentage changes only — no more 34 000 React state updates per phase
- **Final phases** (pricing index 96→98%, hierarchy 98→100%) complete synchronously

### Premium Leaderboard & Admin Table Cleanup
- **PremiumLeaderboard** — Removed AVG PRICE column; default sort changed to `maxPrice desc`
- **AdminMissingVehiclesPage** — Updated column headings (`Spec / Trim` → `Trim`, `Scrape` → `Scraped`, `Requested By` → `Requester`, `Requested` → `Date`), removed Body Type column entirely (13→12 columns), tightened padding to `px-3 py-3` and reduced header font to `text-xs`

### UI — Brand Favicon & Dynamic Page Titles
- **public/favicon.svg** — Replaced the default Vite logo with the app's own car favicon in brand violet (`#8B5CF6`), matching the loading screen's `Car` icon from Lucide; updated `index.html` `<link rel="icon">` to point to it with `?v=2` cache-buster
- **SPA-Shell.webtemplate.source.html** — Added `<link rel="icon">` referencing `favicon.svg?v=2` so the browser tab shows the car favicon on Power Pages (the shell controls the app's HTML output)
- **Home.webpage.copy.html** — Updated favicon reference to `favicon.svg?v=2` for cache-busting
- **MainLayout.tsx** — Added `useEffect` to set `document.title` based on current route: `Home`, `Valuation`, `Valuation Result` (each suffixed with `· Vehicle Pricing Intelligence Platform`)
- **AdminLayout.tsx** — Added `useEffect` using the existing `pageTitles` mapping so every admin page shows `{Page} · Admin · Vehicle Pricing Intelligence Platform` in the browser tab

## 2026-07-20

### UI — Inline AED Price Suggestion Inputs
- Updated both Step 3 price-suggestion forms to display `AED` inside the minimum and maximum price fields
- Added live thousands separators while users type, while keeping submitted price values numeric
- Removed the duplicate formatted price rows beneath the inputs

### Fixed — Startup Progress and Vehicle Price Alignment
- Reserved the final 15% of splash progress for inquiries, missing vehicle requests, and price suggestions; each completed startup API advances the percentage and 100% appears only after all three settle
- Added React Query prefetching so admin hooks reuse startup responses instead of firing the same requests after the splash disappears
- Kept the completed 100% state visible briefly before rendering the application
- Prevented AED prices from wrapping in the Vehicles table and gave the Price column a consistent minimum width with tabular numerals

### UI — Currency Display Restored to AED
- Removed the Dirham SVG/web-font integration and its `dirham` package dependency
- Restored `AED` across shared currency formatting, price inputs, filter chips, settings, chart tooltips, valuation results, and generated PDFs

### Dashboard — Price by Model Year Make/Model Filters
- Replaced the year-range selector with searchable Make and Model `CustomSelect` filters
- Model options are constrained by the selected Make, and changing Make clears the previous Model selection
- Added a dedicated React Query analytics request so only the Price by Model Year chart recalculates while the other dashboard charts remain unchanged

### UI — Official UAE Dirham Currency Symbol
- Replaced the Arabic abbreviation (`د.إ`) with the official UAE Dirham symbol across shared currency formatting, admin filter chips, price input prefixes, regional settings, and valuation PDFs
- Added the `dirham` package so the Unicode 18.0 `U+20C3` glyph renders consistently before native operating-system font support is widespread
- Embedded the bundled Dirham font in PDF exports and retained comma-separated, zero-decimal price formatting

### UI — Hero Badge Background Darkened
- Changed the landing hero badge to a solid dark violet treatment (`bg-violet-700`, `dark:bg-violet-600`) with white semibold text, a light icon, stronger border, and subtle shadow for clear contrast against the background grid

### UI — Formatted Price Previews on Suggestion Inputs
- Added live formatted preview text below all price suggestion input fields showing comma-separated values with Dirham symbol (e.g., `97,066 د.إ.`)
- Applies to: "Suggest Your Own Price" section (valuation result), "Suggest Market Price" dialog (valuation result), and admin edit dialog (price suggestions page)
- Users now see the properly formatted value as they type, even though `type="number"` inputs display raw digits

### UI — Currency Symbol Change (AED → Dirham Symbol)
- Updated `formatCurrency()` in `formatters.ts`: locale changed from `en-AE` to `ar-AE` with `currencyDisplay: 'symbol'` so AED displays as Dirham symbol (`د.إ`) with comma-separated numbers
- Added RTL/LRM mark stripping (`/[‎‏‍‌﻿]/g`) for clean LTR display
- Replaced 7 hardcoded `AED` strings across 4 files: AdminVehiclesPage.tsx (filter chips + price input prefixes), AdminPriceSuggestionsPage.tsx (edit input prefixes), AdminSettingsPage.tsx (currency select label), pdfExport.ts (price output)

### UI — KPI Card Dynamic Heading Colors
- Added `headingColor` field to `KPICardStyle` interface
- Each dashboard KPI card's uppercase heading text now matches its accent color: Total Vehicles=blue, Total Makes=violet, Total Models=emerald, Body Types=pink, Queries=sky, Missing Vehicles=orange
- Updated heading span from generic `text-muted-foreground/70` to per-card `style.headingColor`

### UI — Landing Page Section Backgrounds
- Changed How It Works and CTA section backgrounds from `bg-card/30` to warm off-white `bg-[#FCF8F7]` with `dark:bg-slate-950` fallback
- Both sections now share the identical warm background for visual uniformity

## 2026-07-17

### UI — Form Required Field Indicators & Validation UX
- Added red asterisk (`*`) indicators on all required field labels (First Name, Last Name, Email, Phone, Country, City)
- Added `required` HTML attribute on all `<input>` and `<select>` elements for browser-level validation
- Added live inline error styling: touched + empty fields show a subtle red border (`border-red-300`) while validated errors show destructive red (`border-destructive`)
- Added `mode: 'onTouched'` to React Hook Form config so fields validate on blur
- Updated `Input` component to render the red asterisk when `required` prop is set, with onBlur touched tracking for inline error display
- Phone and City custom selectors now track touched state with inline "required" error messaging

### UI — Admin Dashboard Inline Status Distribution
- Added inline status distribution toggle for Queries and Missing Vehicles KPI cards
- Clicking Queries card: hides charts, shows inquiry status breakdown (Pending, Reviewed, Contacted, Closed) with color-coded status badges
- Clicking Missing Vehicles card: hides charts, shows request status breakdown (Pending, Approved, In Progress, Reject) with color-coded status badges
- Clicking the same card again (or the X button) returns to default dashboard view
- Active card shows a colored ring indicator; all charts are hidden while a status breakdown is visible
- Empty states handled with messaging when no records exist

### UI — Admin Filter Chip Currency Fix
- Fixed admin Vehicles filter chips using `$` (USD) instead of `AED` for min/max price labels

### UI — Dark Mode Text Contrast Fix (Comprehensive)
- Fixed dark mode text contrast on all LandingPage text elements: headings (`h1`, `h2`s) now use `dark:text-white`, card titles (`h3`s) use `dark:text-slate-100`, subtitle/description paragraphs use `dark:text-slate-300`, card descriptions and stat labels use `dark:text-slate-400`, stat values use `dark:text-white`. Every text-bearing element now has an explicit dark mode color class for guaranteed readability.

### UI — Live Loading Percentage on Splash Screen
- Added `progress` prop (0–100) to `LoadingScreen` component showing a determinate progress bar and live percentage text (e.g. "Loading vehicle data... 45%")
- `fetchAllVehicles()` now includes `$count=true` on the first page to get the total record count, and fires an `onProgress` callback after each page with `(fetched, total)`
- `DataverseDataSource.initialize()` accepts an `onProgress` callback and reports progress across 4 phases: fetching (3–78%), pricing extraction (80–85%), vehicle parsing (85–90%), pricing index (90–95%), hierarchy (95–100%)
- `DataSourceContext` tracks `progress` as React state and wires it through the context value
- `SplashGate` passes `progress` to `LoadingScreen` during init
- Graceful fallback: when no progress prop is provided, the component retains its original indeterminate animation

### UI — Landing Page Polish
- **Hero badge**: Replaced `Badge variant="secondary"` (muddy gray) with a custom premium pill — semi-transparent violet background, subtle border, glowing text (`bg-violet-50/80 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/50`)
- **Cards (Stats, How It Works, Features)**: Added `bg-white/90 dark:bg-slate-900/90`, explicit `border-slate-100 dark:border-slate-800` so cards lift off the background grid
- **Card hover state**: Added violet border transition on hover via `.interactive-card:hover` in `globals.css` (`border-color: hsl(252 87% 70% / 0.5)` light, `hsl(252 87% 50% / 0.4)` dark)
- **Header**: Changed from `bg-background/80 backdrop-blur-xl` to `bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border-slate-100 dark:border-slate-900` for cohesive background flow
- **Footer**: Changed from `bg-card/50` to `bg-white/70 dark:bg-slate-950/70 border-slate-100 dark:border-slate-900` — matches header exactly
- Removed unused `Badge` import from `LandingPage.tsx`

### Feature — Real PDF Export (jsPDF)
- Added `jspdf` + `jspdf-autotable` dependencies
- Created `src/utils/pdfExport.ts` with a `downloadValuationPdf()` function that generates a clean A4 PDF containing:
  - Brand header bar (violet)
  - Vehicle identity (year / make / model / spec)
  - Price summary card (min / average / max in AED)
  - Technical specifications table (11 specs) with alternating row shading
  - Date-generated footer with disclaimer
- Replaced `window.print()` in both `Step3Result.tsx` and `ValuationResultPage.tsx` with the proper PDF download
- File naming: `{year}-{make}-{model}-valuation.pdf`

### UI — VehicleSelect Clearable Dropdown
- **Clear X button in trigger**: When a value is selected, a small `X` icon appears between the value text and chevron. Clicking it calls `onChange('')` with `e.stopPropagation()` so the dropdown does not open
- **Toggle-off on re-click**: Clicking an already-selected item in the dropdown list now calls `onChange('')` (deselects) instead of being a no-op
- **"Clear Selection" row**: When a value is selected and no search query is active, a "Clear Selection" option appears at the top of the dropdown list for an explicit reset path
- All three pathways cleanly reset the field to empty, cascading downstream fields (Model, Spec, Year, Body Type) as per the existing `setVehicleSelection` reset logic

### UI — Valuation Wizard Card Container & Premium Wizard Indicator
- **Page background offset**: Added `bg-slate-50/50 dark:bg-slate-950` to the valuation page section so the form card visually lifts off the background
- **Form card container**: Wrapped the step indicator + form content in a `bg-white border-slate-100 shadow-xl shadow-slate-100/50 rounded-2xl p-8 md:p-10 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none` card — makes the form distinct from the page body
- **WizardStepIndicator upgrade**: Active step now uses `bg-violet-600 text-white shadow-lg shadow-violet-500/30` with bold text; completed steps show a `Check` icon in `bg-violet-100 dark:bg-violet-900/40`; upcoming steps use muted border circles; connector lines use `bg-gradient-to-r from-violet-500 to-violet-400` when completed

### UI — Header & Footer Polish
- **Header nav links**: Replaced background-tint active state with a clean underline indicator that animates from center (`after:absolute after:-bottom-[9px] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all after:duration-300 hover:after:w-4/5`)
- **Footer background**: Changed to `bg-slate-50 dark:bg-slate-900/50` for a slightly darker offset from the page body; added 3-column grid layout (Brand, Quick Links with `hover:text-violet-600` transitions, Legal) with balanced padding

### UI — Fix Filter Dropdown Overflow Clipping in Admin Vehicles
- **Portal-based dropdown panel in CustomSelect** (`custom-select.tsx`): The dropdown panel now renders via `createPortal` at `document.body` with `position: fixed` positioning computed from the trigger button's bounding rect. This completely sidesteps any ancestor `overflow` / `z-index` stacking context, preventing dropdowns from being clipped by parent containers.
- **Scroll/resize-aware repostioning**: The portal position updates on scroll and resize events so the dropdown always tracks the trigger button.
- **Removed `overflow-hidden`** from the advanced filters animated `motion.div` in `AdminVehiclesPage.tsx` — no longer needed since the dropdown escapes via the portal.
- **Dynamic z-index on filter wrappers**: Added `relative` positioning to all filter wrapper divs with conditional `z-50`/`z-0` so the active dropdown's stacking context stays above siblings (defensive measure alongside the portal).
- **Applied consistently** to all 10 CustomSelect filters (Year, Make, Model, Body Type, Transmission, Category, Drive Type, Spec, Powertrain, Vehicle Type).

### UI — Text Styling & Case Consistency Across Admin Tabs
- **All filter labels across Vehicles tab**: Removed `uppercase tracking-wider text-muted-foreground`, replaced with `text-[11px] font-semibold text-slate-800 dark:text-slate-200` — labels now read in Camel Case with high-contrast dark color.
- **All table headers across 4 admin tabs** (Vehicles, Queries, Missing Vehicles, Price Suggestions): Removed `uppercase` class, changed color from `text-muted-foreground` (gray) to `text-slate-800 dark:text-slate-200 font-semibold`.
- **Specific header text fixes**: "Body" → "Body Type", "HP" → "Hp" in the Vehicles table; "Body" → "Body Type" in the Queries table.
- **Modal detail labels** in Vehicles, Queries, Missing Vehicles, and Price Suggestions detail dialogs: same class replacement for all `text-[10px] uppercase tracking-wider text-muted-foreground` patterns → dark Camel Case.
- **Unified table header font size**: Changed all table header font sizes across the 4 admin tabs to `text-base` (16px) — was `text-xs` (12px) in Vehicles tab and `text-[10px]` (10px) in Queries, Missing Vehicles, and Price Suggestions tabs.
### Flow 3 — Count Fix: Double `replace()` + `@{...}` Template Syntax
- **User fixed `Extract Listing Count` expression** — added second `replace()` to strip double quotes: `replace(replace(..., '>', ''), '"', '')`. Both `>` prefix (`>294` → `294`) and `"` wrapping (`"\"7"` → `7`) are now stripped.
- **User fixed Response body syntax** — changed from bare `outputs('Extract_Min_Price')` to `@{outputs('Extract_Min_Price')}` template interpolation syntax. Without `@{...}`, values were not interpolated correctly into the JSON response.
- **Test 3 confirmed ✅** — 2024 Mercedes-Benz C-Class C 200 returns: `Count: 6`, `Min Price: 127000`, `Max Price: 275000`
- Frontend display now shows correctly: *"6 listings · AED 127,000 – 275,000 · 2024–2024"*
- Updated `docs/power-automate-cloud-only-design.md` — Extract Listing Count step, Response body section, and Test Results section all updated with working expressions
- Updated `memory/learned-conventions.md` — added `@{...}` template syntax and double `replace()` patterns

## 2026-07-17

### Flow 3 — Final Architecture: SAS Token Auth + Try/Catch Scope + Direct Flow URL
- **Authentication resolved**: Changed Flow 3 trigger to "When an HTTP request is received" with **"Anyone can trigger"** setting — generates a SAS token (`sig=...`) embedded in the URL, eliminating the 401 OAuth error
- **Direct browser-to-flow approach adopted**: Frontend calls the flow HTTP POST URL directly via `fetch()` — no Power Pages proxy, no server logic middleware
- **Try/Catch Scope pattern added**: All scraping actions (Build Search URL → HTTP GET → Extract Heading → Extract Prices) placed inside a **Try Scope**. A **Catch Scope** (configured to run on failure/skip/timeout) contains only the **Response (PREMIUM)** action — returns Count: -1 to signal YallaMotor was unreachable
- **Response (PREMIUM) returns only 3 values**: `Min Price`, `Max Price`, `Count` — heading and source URL are constructed client-side to keep the response lightweight
- **`_unavailable` graceful error UI**: When Count = -1 (Catch scope fired), the frontend shows an amber "Live Data Unavailable" banner with manual price inputs and "Submit Request" button instead of a red error box — users can still submit their request without scraped data
- **Count parsing fix (scope-wrapping quotes)**: Power Automate `outputs('ActionName')` inside a Scope wraps values in extra quotes (`"\"7"` instead of `7`). Frontend applies `String(result['Count']).replace(/[^0-9-]/g, '')` to strip non-numeric characters. Flow's `int()` wrapper was inconsistent — frontend handles it robustly
- **Current issue**: After user added `int()` to Extract Listing Count expression, it returns 0 instead of the actual count (e.g., 6 for 2024 Mercedes-Benz C-Class). The frontend fix already handles the raw expression output — user needs to **revert the flow's Extract_Listing_Count expression back to the original** (remove `int()` wrapper)

### `yallaMotorHttpScraper.ts` — Final Implementation
- Created `src/lib/yallaMotorHttpScraper.ts` with `scrapeViaFlow3()` function calling the Power Automate HTTP trigger URL directly
- `Flow3ScrapeResult` interface with `success`, `make`, `model`, `trim`, `year`, `count`, `minPrice`, `maxPrice`, `heading`, `sourceUrl`, and optional `_unavailable` flag
- Constructs YallaMotor URL client-side using the hyphenated slug pattern (`replace(/\s+/g, '-')` for multi-word makes/models/trims)
- Builds `heading` string locally: `"6 listings · AED 127,000 – 275,000 · 2024–2024"`
- Uses `satisfies Flow3ScrapeResult` type assertion for type safety

### Step3Result.tsx — Scraped Data Display
- Three-state UI for scrape results:
  - `flow3Result._unavailable === true` → amber "Live Data Unavailable" banner + manual price inputs
  - `scrapeError && !flow3Result` → red error box with "Try Again" button (network errors)
  - `flow3Result` → live price display from YallaMotor + price suggestion fields + "Confirm & Submit"
- Created MVR now includes all scraped fields: `scrapedMinPrice`, `scrapedMaxPrice`, `scrapedListings` (JSON with count/min/max/url/heading), `scrapedSources`, `scrapeStatusValue: 4` (Scraped)

### Documentation Updated
- `docs/power-automate-cloud-only-design.md` — Flow 3 section rewritten to reflect actual Try/Catch scope architecture, SAS token auth, and 3-output Response
- `CLAUDE.md` — Added `yallaMotorHttpScraper.ts` to project structure lib/ section
- `memory/learned-conventions.md` — Added SAS token pattern, scope-wrapping quotes issue, `_unavailable` UI pattern
- `memory/power-automate-flow-design.md` — Updated Flow 3 status to reflect final architecture

## 2026-07-16

### Flow 3 — New HTTP-Triggered Flow Design for Real-Time Scraping
- **New approach**: Instead of Dataverse-triggered scraping (slow, user never sees results), created **FLOW 3** with "When an HTTP request is received" trigger
- Frontend calls Flow 3 → scrapes YallaMotor → returns JSON immediately → user sees results → suggests price (optional) → MVR created with both scraped + suggested prices
- `vpi_scraped_minprice/maxprice` = scraped from YallaMotor, `vpi_minprice/maxprice` = user-suggested (both preserved)
- Full design documented in `docs/power-automate-cloud-only-design.md` (FLOW 3 section)

### Flow 2 — Full Test Results with Mercedes-Benz C-Class C 200
- **First test** — used old URL builder (no hyphen fix, no version/trim segment):
  - Results: `>294` listings, AED 5,000–385,000, years 2000–2027
  - Scraped Sources link returned 404 (space in URL: `mercedes benz`)
- **🔑 Key discovery** — YallaMotor's URL needs the **version/trim segment** (`vr_c-200`) for year-specific results. Without it, the heading shows the entire model range across all years
- **Manual test with correct URL** (`/mercedes-benz/c-class/vr_c-200/yr_2021_2021`):
  - ✅ **7 listings · AED 95,000 – 145,000 · 2021–2021** — accurate, year-specific data!
- Updated URL builder: added `replace(' ', '-')` for multi-word makes/models and `/vr_{trim-slug}` segment
- Documented hyphen rule: database stores "Mercedes Benz" (space), YallaMotor URL needs "mercedes-benz" (hyphen)
- Updated `docs/power-automate-cloud-only-design.md` with corrected test results and URL pattern

## 2026-07-15

### Flow 2 — Field Name Fix & Debug Step
- Fixed all `Update a row` Row ID expressions in Flow 2 design doc: `vpi_missingvehiclerequestid` → `vpi_missingvehiclerequestsid` (Dataverse uses lowercase `sid` suffix, not uppercase `ID`)
- Added debug Compose step (Step 2) after trigger to inspect exact trigger output field names before building expressions
- Documented step numbering shift caused by debug step insertion

### Fixed — YallaMotor Backend Outage Diagnosed
- Discovered YallaMotor was returning `backend_error` (`backend=nextjs`, `Backend fetch failed`) — their Next.js servers were down, NOT Cloudflare blocking the HTTP connector
- Both Flow 1 (Toyota Camry) and Flow 2 (Mercedes-Benz) failed for the same reason: YallaMotor server outage
- The Power Automate Cloud-only approach remains viable. Cloudflare was not the cause of recent failures
- Updated `docs/power-automate-cloud-only-design.md` status header to reflect accurate diagnosis
- Updated `docs/PHASE-3-REVISED-PLAN.md` status with YallaMotor backend outage finding

### Fixed — URL Format for Multi-Word Makes/Models
- Identified that multi-word makes ("Mercedes Benz") and models ("C-Class") need hyphenated URL slugs (`mercedes-benz`) not space-encoded (`mercedes%20benz`) for YallaMotor URLs
- Documented in design doc URL builder expression

### Added — Scrape Result Fields Wired into UI
- Added `scrapeStatus`, `scrapeStatusValue`, `scrapedListings`, `scrapedMinPrice`, `scrapedMaxPrice`, `scrapedSources` to `MissingVehicleRequest` type
- Added scrape field names to `MISSING_VEHICLE_REQUEST_FIELDS` in `dataverseConfig.ts`
- Added `MISSING_VEHICLE_SCRAPE_STATUS` optionset mapping (Pending=1, Testing=2, In Progress=3, Scraped=4, Failed=5, Unreachable=6) in `dataverseOptionSets.ts`
- Added scrape field parsing in `missingVehicleApi.ts` (`parseRawRecord` and `$select`)
- **AdminMissingVehiclesPage** now displays scrape results:
  - **Table view**: New "Scrape" column with status badge + listing count
  - **Card view**: Scrape status badge + scraped min/max prices
  - **Detail modal**: Full "Scrape Results" section with parsed JSON display, source URL link, and descriptive messages for In Progress/Failed/Unreachable states
- All builds clean — TypeScript strict, no errors

## 2026-07-15

### Changed — Layout reorder: Top Makes + Top Models side by side
- Rearranged dashboard layout per user request: Section 1 = Top Makes + Top Models, Section 2 = Body Types + Powertrain, Section 3 = Price by Model Year (full-width), Section 4 = Premium Leaderboard

### Changed — Unified brand-coordinated color palette across all charts
- Replaced disparate rainbow palettes with a single, professionally curated 10-color palette anchored on the app's brand colors (indigo primary `#6366f1` and amber accent `#f59e0b`)
- **Top Makes** / **Top Models** / **Body Types** bar charts now share the same unified color rotation (indigo → teal → amber → violet → cyan → orange → purple → emerald → sky → pink)
- **Powertrain** donut updated: Petrol → brand indigo, Hybrid → teal, Electric → violet (was blue/green/purple)
- **Value Trend** area chart: line/fill/gradient changed from orange `#f97316` to brand amber `#f59e0b`
- Updated gradient accent bars on all ChartCards to match: Top Makes (indigo→violet), Top Models (indigo→cyan), Body Types (teal→emerald), Powertrain (indigo→amber), Value Trend (amber→orange)

### Changed — Top Makes: top 10 + Y-axis fix + matching heights
- **Top Makes** now shows top 10 (was 15) with Y-axis width 150px so all make names display fully; chart height adjusted to 320px to match Body Type
- **Body Type** and **Top Makes** now use matching 320px chart heights for visual alignment

### Fixed — Powertrain donut legend cropping
- Restructured chart layout to flex column — donut SVG takes `flex-1`, legend sits below in `flex-shrink-0` so it's never cropped
- Reduced donut size (outerRadius 120→105, innerRadius 70→60) for better proportions

### Added — Top Models Chart
- New **TopModelsChart** in the blank space next to Powertrain — horizontal bar chart showing the 10 most-represented vehicle models (e.g., "Toyota Camry") with per-bar gradient colors, vehicle count, and avg price tooltip

### Removed
- **PriceDistributionChart**, **BoxPlotChart**, **ScatterChartView** — orphaned chart files deleted from project directory

### Changed — Dashboard Layout Refinements (from earlier session)

- **7 new chart widgets** built with Recharts, organized into 3 sections:
  - **Market Composition** (2-col grid): TopMakesChart (top 15 makes, horizontal bars with per-make gradient colors) + BodyTypeChart (body type breakdown)
  - **Pricing Landscape** (2-col grid): PriceDistributionChart (10-bucket histogram with gradient fill) + ValueTrendChart (avg price by model year, area chart with gradient)
  - **Technical Profiles** (2-col grid): PowertrainChart (Petrol/Diesel/Hybrid/Electric, horizontal bars) + BoxPlotChart (custom SVG box plot — min, Q1, median, Q3, max — for GCC/Non-GCC/Other price ranges)
- **Full-width ScatterChartView** (Horsepower vs Price, 500 pts sampled, color-coded by make with legend)
- **ChartCard** — consistent wrapper component for all chart widgets (gradient accent bar, title, subtitle, empty state, lazy loading)
- **ChartTooltip** — shared premium tooltip component used across all charts
- **compactNumber** formatter utility (`1.5M`, `55k`, `320`) for chart axis labels
- All charts wrapped in `LazyChart` for IntersectionObserver-based deferred rendering
- All charts fully responsive via Recharts `ResponsiveContainer`

### Changed

### Changed — Curated Dashboard: Summary-First Chart Layout
- **Reduced from 10 charts → 4 core summary charts**: Top Makes, Price Distribution, Value Trend, Powertrain Composition + Premium Leaderboard
- **Removed** Performance vs Scatter, Body Type Bar, Age Distribution, Volatility Box, Top Models — these were niche/redundant and added clutter
- **Replaced BODY TYPES KPI** with AVG MARKET PRICE (uses `overview.averageMarketPrice`) for better summary value
- **Tighter spacing**: grid gap reduced from 6 to 5 for a more compact, scannable layout
- **Bundle savings**: ~17 KB removed via tree-shaking of unused chart imports
- Cleaned up unused destructured analytics data and icon imports

### Changed — Fully Cross-Constrained Vehicle Filters

### Changed — Fully Cross-Constrained Vehicle Filters
- **All 10 filter dimensions now cross-constrain each other** — selecting any filter (Year, Make, Model, Body Type, Transmission, Category, Drive Type, Spec, Powertrain, Vehicle Type) narrows the available options in ALL other filters to only compatible values
- **Tuple-based constraint engine** — builds all valid (year, make, model) combinations from the hierarchy and filters them against every selected filter simultaneously, with each dropdown's available options computed by excluding its own filter (so it shows all compatible values, not just the one already picked)
- **Case-insensitive matching** — all filter comparisons are case-insensitive to handle mixed-case hierarchy data
- **Body Type handled specially** — correctly resolves both spec-qualified (`year-make-model-spec`) and unqualified hierarchy keys

### Changed — Unified Premium Loading Screen & Dashboard Loading
- **Enhanced `LoadingScreen` component** — upgraded to a premium glowing gradient (purple→orange) progress bar with stronger glow effects, purple/orange scanning rings, radial inner glow, and ambient orbs for a cohesive brand experience
- **Replaced dashboard skeleton loading** — `AdminDashboardPage` now uses the `LoadingScreen` instead of inline skeleton/pulse animations, ensuring a consistent full-screen loader across Landing, Valuation, and Admin pages
- **Removed unused `KPICardSkeleton`** — cleaned up dead code from the dashboard after the loading screen replacement
- **Persistent lifecycle** — the `LoadingScreen` stays mounted without flickering until all initial API fetches resolve (analytics on landing, data source init on valuation, dashboard analytics on admin)

### Changed — Vehicle Filter Bar: Independent Filters + Custom Styled Dropdowns
- **All filters now independent** — Year/Make/Model no longer chain; users can select any filter in any order without being forced to pick a prerequisite first
- **CustomSelect component** (`src/components/ui/custom-select.tsx`) — replaced native `<select>` with a fully styled dropdown: search input, animated panel, click-outside-close, keyboard navigation, dark-mode aware
- All 10 filter dropdowns (Year, Make, Model, Body Type, Transmission, Category, Drive Type, Spec, Powertrain, Vehicle Type) now use the custom dropdown with matching rounded-xl borders and consistent styling
- Price inputs matched to the new dropdown height (h-10) and rounded-xl style for visual consistency

### Added — Table/Card View Toggle For Missing Vehicles & Price Suggestions
- **AdminMissingVehiclesPage** — added `MissingVehicleCard` component with make/model header, spec grid, price range, requester info, and view toggle (`LayoutList`/`LayoutGrid`) between table and card grid modes
- **AdminPriceSuggestionsPage** — added `PriceSuggestionCard` component with vehicle name, submitter, min/max price cards, source URL, comment preview, and view toggle between table and card grid modes
- **Consistent pattern** — both pages follow the AdminVehiclesPage pattern: local `viewMode` state, segmented toggle, shared filters/pagination across views, identical loading/error/empty states in both modes
- Removed summary metrics KPI cards from both pages (replaced by card view)
- Removed unused imports (`AnimatePresence`, `Fuel`, `Cog`, `Shield`, `statusOptions` prop) to resolve TypeScript strict-mode errors

## 2026-07-14

### Changed — Replaced Header Notification Pills With Unified Bell Icon Dropdown
- **New `NotificationDropdown` component** (`src/components/ui/notification-dropdown.tsx`) — a unified Bell icon dropdown that replaces the three separate notification pills in the admin header
- **Bell icon** with a pulsing red dot when any unread/pending notifications exist across Queries, Missing Vehicles, or Price Suggestions
- **Three-section dropdown** with distinct accent colors: Queries (blue), Missing Vehicles (amber), Price Suggestions (emerald)
- Each section shows its icon, pending count badge, and a preview text
- Click-outside-to-close and Escape key support, with smooth Framer Motion animation
- Clicking a section redirects to the specific admin page (e.g., `/admin/queries`) and closes the popover
- Sidebar badges preserved for persistent awareness

### Changed — `MessageSquare` Icon Removed From AdminLayout Imports
- Replaced with the new `NotificationDropdown` component in the header area

### Fixed — Dashboard Chart Layout & Sizing
- Added `w-full` to `LazyChart` wrapper div so `ResponsiveContainer` inside can properly calculate its parent width and fill the card
- Reduced `TopMakesChart` right margin from 20 → 8 to eliminate wasted whitespace on the right
- Reduced `PriceDistributionChart` right/left/bottom margins and increased X-axis label area (`height: 50 → 60`, `angle: -20 → -25`, `interval={0}`) so all rotated labels render without clipping
- All other charts (6 remaining) untouched — no regressions

## 2026-07-13

### Changed — KPI Cards On Dashboard Now Clickable
- All 6 KPI cards (Total Vehicles, Makes, Models, Highest/Lowest Value, Avg Market Price) on the admin dashboard are now clickable and navigate to `/admin/vehicles`
- Added `useNavigate`, `onClick` handlers, and keyboard accessibility (`tabIndex`, `role="button"`, `onKeyDown`)

### Added — Table/Grid View Toggle On Vehicles Page
- Added view toggle (Table / Grid) in the Vehicles page header using `LayoutList` / `LayoutGrid` icons
- New `VehicleCard` component for the card/grid view showing: year badge, spec badge, make/model, engine, HP, transmission, drive type, body type, category, powertrain, and market price
- Grid view uses responsive layout: `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- All existing functionality (filters, search, sorting, pagination, export CSV, detail dialog) preserved in both views
- Extracted `VehiclesEmptyState` as a reusable component shared between table and grid views
### Flow 1 — Full Test Outcome Confirmed (Modified Flow)

- **`docs/power-automate-cloud-only-design.md`** — Updated test result section with the complete email output from the user's latest test run
- **`docs/CHANGELOG.md`** — Added this entry
- **`docs/power-automate-cloud-flow-design.md`** — Added deprecation banner pointing to `power-automate-cloud-only-design.md` (this was the older Desktop-era design file)
- **`docs/PHASE-3-REVISED-PLAN.md`** — Updated status from "Pivoting to Power Automate Desktop" to "Pivoted to Power Automate Cloud-only (successful)"
- **`memory/power-automate-flow-design.md`** — Updated with Flow 1 modified test outcome
- **`memory/scraper-service-built.md`** — Updated "New approach" from Power Automate Desktop to Cloud-only flows (successful)

### Detailed Test Output Confirmed

The Flow 1 modified version was tested end-to-end with Toyota Camry and returned:

| Field | Value |
|---|---|
| **URL** | `https://uae.yallamotor.com/used-cars/toyota/camry` |
| **Accessible** | ✅ True |
| **Page Title** | `Used Toyota Camry for Sale in UAE — From AED 120` |
| **HTTP Status** | 200 |
| **BDI Price** | 42,900 |
| **Cloudflare** | ✅ No false positives |
| **InvalidTemplate Error** | ✅ Fixed |

**Full listing record extracted:**
- **Car:** Used Toyota Camry 2.5 S 2019
- **Price:** AED 42,900 (Fair Deal)
- **Mileage:** 166,000 KM
- **Fuel type:** Petrol
- **Transmission:** Automatic
- **Regional specs:** GCC Specs
- **Location:** Sharjah
- **Dealer:** Al Aram Used Cars (Ref#967)
- **Installment:** 626 AED/month

## 2026-07-14

### Flow 2 — Complete Redesign (Heading-based extraction)

- **`docs/power-automate-cloud-only-design.md`** — Rewrote entire Flow 2 section based on Flow 1 learnings:
  - **Primary approach changed** from JSON-LD card parsing to heading extraction: parses `<div class="heading-h2-content">` for aggregate data (count, min, max) — simpler, faster, fewer steps
  - **URL now includes year filter** (`yr_{year}_{year}`) — narrowed results for more accurate pricing
  - **Cloudflare check simplified** — removed 3 body-content checks that caused false positives in Flow 1 (kept only title + status code)
  - **Removed heavy Apply-to-Each loops** — no more per-card JSON-LD or HTML article parsing as primary strategy
  - **JSON-LD retained as fallback** — only used when heading is not found
  - **BDI price extraction** as last-resort fallback
  - **Reduced from 72 steps to 79 steps** but with much simpler branching: one main path (heading) + two fallbacks (JSON-LD, BDI)
  - Added planned enhancements section (fuel/transmission URL filters, email notification, Dubizzle)
- **Flow 1 (MVR - Test YallaMotor Accessibility)** — Confirmed heading extraction approach works; the user's test showed the heading contains `15 listings · AED 30,000 – 110,000 · 2022–2022`

### Flow 1 — DOM Extraction Enhancement & Cloudflare Fix

- **`docs/power-automate-cloud-only-design.md`** — Flow 1 improvements:
  - Added `<bdi>` price extraction and full vehicle listing record extraction (article container) via string expressions
  - Fixed Cloudflare false positive: simplified to title + status code only (removed body-content checks like `cdn-cgi/challenge-platform`, `cf_chl_opt`, `Checking your browser`)
  - Fixed `InvalidTemplate: text_3` error: removed Year and MVRRecordID inputs (manual trigger only has `text` and `text_1`)
  - Updated email output to include BDI Price row and full vehicle record HTML
  - Verified: ✅ YallaMotor accessible; full listing record extracted (AED 42,900, 166,000 KM, Petrol, Automatic, Sharjah, Al Aram Used Cars)
  - Heading pattern documented: `15 listings · AED 30,000 – 110,000 · 2022–2022 · updated 14 July 2026`

## 2026-07-13

### Built & Tested — Power Automate Cloud Flow 1 (YallaMotor Accessibility)
- **`docs/power-automate-cloud-only-design.md`** — Updated with confirmed test results, JSON-LD discovery, practical learnings (triggerBody key naming, simplified Cloudflare detection), and schema-correct column names across both flows
- **Flow 1 (MVR - Test YallaMotor Accessibility)** built and tested successfully:
  - ✅ YallaMotor returns HTTP 200 with real content from Microsoft cloud IPs
  - ✅ Page title: "Used Toyota Camry for Sale in UAE — From AED 120"
  - ❌ Cloudflare did NOT block the HTTP request (unlike previous Puppeteer microservice from Railway)
  - ✅ JSON-LD structured data confirmed present in HTML — ideal for Flow 2 parsing
  - Key insight: `triggerBody()['text']` / `triggerBody()['text_1']` must be used instead of display names for manual trigger inputs
- **Flow 2 (MVR - Scrape YallaMotor)** — Design updated with correct MVR column names: `vpi_scrapestatus`, `vpi_scraped_listings`, `vpi_scraped_minprice`, `vpi_scraped_maxprice`, `vpi_scraped_sources`. Not yet built.

### Updated — MVR Table Schema (Power Automate scraping)
- **`docs/dataverse-schema.md`** — Updated Missing Vehicle Request table to reflect newly added columns: Cylinders, Doors, Drive Type, Engine Size, Fuel Type, Horsepower, Seats, Transmission Type, Comments, Source URL, Contact lookup, Missing Vehicle lookup, Scrape Status (choice), Scraped Listings, Scraped Min/Max Price, Scraped Sources
- **`docs/power-automate-cloud-only-design.md`** — Flows updated to use actual MVR column names (vpi_scraped_listings, vpi_scraped_minprice, vpi_scraped_maxprice, vpi_scrapestatus)

### Added — Performance Optimization (Phase 2)
- **`src/utils/debounce.ts`** (new) — `useDebounce` hook for debouncing search inputs with configurable delay
- **React.memo** — Wrapped all 9 chart components in `charts.tsx` with `React.memo` + custom comparator that skips function props, preventing unnecessary re-renders on sidebar toggle / filter changes
- **`useDebounce`** — Applied 300ms debounce to search inputs in `AdminQueriesPage` and `AdminVehiclesPage`, preventing synchronous filtering and server queries on every keystroke
- **Dead code removed** — `@tanstack/react-virtual` (unused dependency) removed from `package.json`

### Changed — Performance Optimization (Phase 2, continued from scraper pivot session)
- **Deferred DataSource Init** — `DataSourceProvider` no longer eagerly fetches vehicles on app mount. Landing page renders instantly (~200ms). Data loads lazily when first visiting `/valuation` or `/admin`
- **React.lazy Route Code Splitting** — All 9 page components changed from static imports to `React.lazy()` dynamic imports with `Suspense` wrappers. Initial JS bundle reduced from ~1.1MB to ~250KB
- **`vite.config.ts`** — Added `manualChunks` function separating React, Recharts, Framer Motion, TanStack Query, and other vendors into cacheable chunks
- **Admin crash fix** — Added DataSource init guard to `AdminLayout` to prevent crash when navigating to `/admin` during initial load

### Added — Path B Scraper Microservice Postmortem
- **`docs/path-b-scraper-microservice-postmortem.md`** (new) — Comprehensive retrospective documenting the scraper microservice

### Removed — Scraper Service (Path B: Puppeteer) — Abandoned due to Cloudflare
- **`scraper-service/`** — Entire directory removed. Puppeteer approach blocked by YallaMotor Cloudflare. Pivoting to Power Automate Desktop.
- **`src/lib/yallaMotorScraper.ts`** — Kept (mock scraper still used by Step3Result.tsx UI, will be repurposed later to read Power Automate data).
- **`.env.example`** — `VITE_SCRAPER_API_URL` entry kept as a harmless placeholder.: what we were trying to achieve, full architecture, the 12 Docker/Chrome deploy cycles, YallaMotor Cloudflare blocker, anti-detection arsenal attempted, why Cloudflare cannot be beaten by automated browsers from datacenter IPs, lessons learned, reusable components, and the pivot to Power Automate Desktop. Serves as both reference and closure on the Puppeteer approach.

## 2026-07-10

### Added — Scraper Microservice (Path B: Dedicated Puppeteer Service)
- **`scraper-service/`** (new) — Full Node.js + Express + Puppeteer microservice for real-time UAE auto marketplace scraping:
  - **`src/index.ts`** — Express server with `POST /api/scrape` and `GET /health` endpoints, Puppeteer browser lifecycle (auto-relaunch on disconnect), stealth plugin, resource blocking, CORS, graceful shutdown
  - **`src/types.ts`** — Shared types: `ScrapeRequest`, `ScrapedListing`, `ScrapeResult`, `IScraperProvider` interface, `ProviderResult`
  - **`src/providers/yallaMotorProvider.ts`** — YallaMotor UAE headless scraper with dual-URL fallback, multi-selector card extraction, smooth scrolling, randomised delays, debug mode
  - **`src/aggregator.ts`** — Combines providers, filters bad prices, sorts by price, limits to 50 listings, computes min/max
  - **`src/utils.ts`** — `parsePrice`, `parseMileage`, `normaliseUrlSegment`, `delay`, `randomInt` helpers
  - **`Dockerfile`** — Single-stage build, Google Chrome Stable from official apt repo, non-root scraper user with home directory, health check
  - **`README.md`** — Full docs: architecture, API contract, Railway deployment guide, anti-detection, fallback strategy
  - **`package.json`** — Express 4, Puppeteer 23, puppeteer-extra + stealth, cheerio, TypeScript 5, tsx for dev
- **`.env.example`** — Added `VITE_SCRAPER_API_URL` (commented out, reserved for future frontend integration)

### Fixed — Scraper Docker/Chrome Deployment (12 commits to production)
- **`Dockerfile`** — Switched from multi-stage build (losing Chrome) to single-stage build with Google Chrome Stable from official apt repo
- **`Dockerfile`** — Fixed Debian 12 package names (removed `t64` suffixed names from Debian 13)
- **`Dockerfile`** — Added `package-lock.json` to COPY instruction for `npm ci` to succeed
- **`Dockerfile`** — Switched from `ghcr.io/puppeteer/puppeteer` image (ENTRYPOINT conflict) to `node:22-slim` with manual Chrome install
- **`Dockerfile`** — Changed port from 3001 to 8080 (Railway default), created home directory for non-root `scraper` user with `useradd -m`
- **`src/index.ts`** — Added `--disable-blink-features=AutomationControlled` launch arg and `evaluateOnNewDocument` webdriver overrides for anti-detection

### Blocked — YallaMotor Cloudflare Protection
- **YallaMotor uses Cloudflare** (JS challenge/bot detection) — Puppeteer with stealth plugin cannot bypass it. The scraper service deploys and runs successfully on Railway, Chrome launches, but YallaMotor returns a "Just a moment... Performing security verification" page.
- Added temporary `/api/debug-html` endpoint to inspect page HTML — confirmed Cloudflare is the blocker (not CSS selectors).
- **Decision:** Puppeteer approach abandoned for YallaMotor. Exploring Power Automate Desktop (RPA) as an alternative — it controls a real Chrome browser on a Windows machine, which can pass Cloudflare challenges naturally.

## 2026-07-09

### Documentation — Phase 3 Revised Plan
- **`docs/PHASE-3-REVISED-PLAN.md`** (new) — Full revised Phase 3 plan documenting the simplified flow: real-time scraping replaces mock, user price suggestions merged into missing vehicle flow, admin review → push-to-master pipeline, and email notification future work. Includes 3 architectural paths evaluated (Power Pages proxy rejected, Hybrid rejected, Dedicated Microservice recommended). All conversation decisions captured so the user can resume from any shutdown point.

## 2026-07-06

### Changed — MVR Scrape + Correction Now Saves Prices to Dataverse
- **`src/features/valuation/Step3Result.tsx`** — Restructured `handleSubmitRequest` to sequential flow: scrape YallaMotor first → use estimated prices in MVR creation with `minPrice`/`maxPrice` → persist MVR ID for corrections. Updated `handleSubmitCorrection` to PATCH correction prices to the MVR record via `updateMissingVehicleRequest()`, so user-entered prices are saved back to Dataverse.
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Added Min Price / Max Price columns to the table (right-aligned, formatted currency), and Price cards to the detail modal, so admins can see both scraped and user-corrected prices.

### Added — Application Splash / Loading Screen
- **`src/app/SplashScreen.tsx`** (new) — Full-screen branded loading splash with animated background grid, gradient orbs, Car logo icon with pulsing ring, shimmer-text title, animated gradient loading bar, and step indicators. Fades out via Framer Motion `AnimatePresence` exit animation (600ms).
- **`src/app/App.tsx`** — Added `SplashGate` component that coordinates three parallel conditions: (1) Dataverse data source initialization, (2) pre-fetching of Missing Vehicle Requests and Price Suggestions into React Query cache, (3) a strict 3-second minimum timer. The app only renders when all three complete, ensuring smooth loading animations.

### Added — YallaMotor Scraper Mock Service
- **`src/lib/yallaMotorScraper.ts`** (new) — Simulated scraper service that generates realistic price estimates based on vehicle parameters. Uses seeded pseudo-random data for deterministic output per vehicle. Returns `ScrapeResult` with `estimatedMinPrice`, `estimatedMaxPrice`, `averagePrice`, and `listings[]` (title, price, mileage, source). Simulates 2–3.5s network delay. Ready for replacement with a real scraping microservice endpoint.

### Changed — Missing Vehicle Request Dialog to Multi-Step Scrape + Correction Flow
- **`src/features/valuation/Step3Result.tsx`** — Replaced the single-step request dialog with a 3-phase wizard:
  1. **Details** — Existing metadata form (Cylinders, Fuel, Transmission, Drive, Mileage) with "Submit Request & Scrape" button
  2. **Scraping** — Loading state with spinner animation showing "Searching YallaMotor, Dubizzle..."
  3. **Results** — Scraped price estimate card (min/max price, listing count, mini listings list) + price correction section where the user can enter their own suggested price range. Skip button dismisses without correction.
- On form submit: fires MVR creation (Dataverse) and YallaMotor scraper in parallel via `Promise.all`. When both resolve, transitions to results.
- On price correction submit: creates a Price Suggestion record (with null vehicle lookup since the vehicle doesn't exist yet) and transitions to success.
- **Success state** — Now shows "Request Submitted! We'll send you a message on {email} once this vehicle is available." with the scraped price summary card when available.
- Dialog close is blocked while scraping is in progress to prevent accidental dismissal.
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — Rewrote `PriceSuggestionDetailModal` with editable min/max price inputs pre-filled from current values, and a "Save Changes" button wired to `useUpdatePriceSuggestion` mutation. Fields reset when the suggestion changes. Footer has Cancel/Save buttons with loading spinner state.
- **`src/hooks/usePriceSuggestions.ts`** — Added `useUpdatePriceSuggestion` mutation hook (was already present from prior session preparation).

### Added — Vehicle Column in Price Suggestions Table + Modal
- **`src/types/priceSuggestion.ts`** — Added `vehicleName?: string` field to store the human-readable vehicle name.
- **`src/lib/priceSuggestionApi.ts`** — Added `$expand=vpi_Vehicle($select=vpi_name,vpi_make,vpi_model,vpi_year)` to fetch price suggestions, and parses the vehicle name from the expanded lookup. Falls back to building `"Year Make Model"` from fields, or shows vehicle GUID if no name is available.
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — Added "Vehicle" column to the table (with blue icon and truncated name with tooltip), vehicle info card in the detail modal, and vehicle name to the search filter.

### Changed — Save Edits Auto-Sets Status to "Edit & Approve"
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — When clicking "Save Changes" in the price suggestion modal, the mutation now chains a status update to "Edit & Approve" (value 3) after the prices are saved, so editing prices automatically marks the suggestion as reviewed.

### Fixed — Price Suggestion Creation (Wrong Entity Name + Missing Status)
- **`src/data/dataverseConfig.ts`** — Changed `PRICE_SUGGESTION` entity from `'vpi_pricesuggestions'` to `'vpi_pricesuggestionses'` to match the actual Dataverse entity collection name. The wrong URL was causing a 500 error (`9004010A`).
- **`src/data/dataverseConfig.ts`** — Added `VEHICLE_LOOKUP_REF: '_vpi_vehicle_value'` to `PRICE_SUGGESTION_FIELDS` for the lookup reference field.
- **`src/lib/priceSuggestionApi.ts`** — `upsertPriceSuggestion` wasn't sending `vpi_status` in the POST body, causing a 400 Bad Request. Added `vpi_status = 4` (Pending). Now matches the working snippet exactly.
- **`src/lib/priceSuggestionApi.ts`** — `fetchPriceSuggestions` now uses explicit `$select` with all fields including `_vpi_vehicle_value`, and parses `vehicleId` from the lookup ref.

### Changed — Price Suggestion Status Now Fetched Dynamically from Dataverse
- **`src/lib/optionSetApi.ts`** (new) — Generic `fetchPicklistOptions()` function that queries the Dataverse `EntityDefinitions` metadata API for picklist options, returning `{value, label}` pairs. Falls back gracefully when the metadata endpoint is unavailable.
- **`src/hooks/usePriceSuggestionStatuses.ts`** (new) — `usePriceSuggestionStatusOptions()` React Query hook that fetches status options from Dataverse with 5-minute cache. Falls back to `PRICE_SUGGESTION_STATUS` from `dataverseOptionSets.ts` if the metadata endpoint is unavailable.
- **`src/data/dataverseOptionSets.ts`** — Added `Pending: 4` to `PRICE_SUGGESTION_STATUS` to match the updated Dataverse optionset. Changed the default fallback label from `'Approve'` to `'Pending'`.
- **`src/lib/priceSuggestionApi.ts`** — `upsertPriceSuggestion` now sets `vpi_status = 4` (Pending) instead of `null`. `fetchPriceSuggestions` now parses the raw `statusValue` alongside the display label. `updatePriceSuggestionStatus` now accepts the numeric optionset value directly instead of converting from a label string.
- **`src/types/priceSuggestion.ts`** — Added `statusValue?: number` field alongside the existing `status?: string` label.
- **`src/types/datasource.ts`** — Updated `IDataSource.updatePriceSuggestionStatus` to accept `statusValue: number` instead of `status: string`.
- **`src/data/dataverseDataSource.ts`** — Updated signature to match the interface change.
- **`src/repositories/priceSuggestionRepository.ts`** — Updated `updateStatus` to accept `statusValue: number`.
- **`src/hooks/usePriceSuggestions.ts`** — Updated mutation payload from `{id, status}` to `{id, statusValue}`.
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** — Major refactor: `StatusSelect` now receives dynamic options from the hook and passes the numeric value directly when updating. `StatusBadge` looks up visual config by `statusValue` (integer) instead of label string. Filter tabs are built dynamically from fetched Dataverse options. Status counts computed by `statusValue`. The static `STATUS_OPTIONS` and `STATUS_CONFIG` (label-keyed) are replaced with value-keyed `STATUS_VISUALS` and the live `PicklistOption[]` from Dataverse.

## 2026-07-03

### Added — Contact Creation on Missing Vehicle Request
- **`src/types/datasource.ts`** — Added `contactName` to upsert payload
- **`src/data/dataverseDataSource.ts`** — Added `contactName` pass-through
- **`src/repositories/missingVehicleRepository.ts`** — Added `contactName` to upsert payload
- **`src/hooks/useMissingVehicleRequests.ts`** — Added `contactName` to mutation payload
- **`src/lib/missingVehicleApi.ts`** — Now creates a contact via `createContact()` when the email isn't found, then links MVR to the new contact; splits `contactName` into first/last for the contact record
- **`src/features/valuation/Step3Result.tsx`** — Passes `personalInfo.firstName + lastName` as `contactName` in the MVR submission

### Added — Price Suggestions System
- **`src/data/dataverseConfig.ts`** — Added `PRICE_SUGGESTION` entity, `STATUS` field to `PRICE_SUGGESTION_FIELDS`, and `PRICE_SUGGESTION_SELECT_FIELDS`
- **`src/data/dataverseOptionSets.ts`** — Added `PRICE_SUGGESTION_STATUS` optionset (Approve=1, Reject=2, Edit & Approve=3) with label/value helpers
- **`src/types/priceSuggestion.ts`** (new) — PriceSuggestion interface (id, comment, minPrice, maxPrice, sourceUrl, submittedBy, vehicleId, status, createdOn)
- **`src/types/datasource.ts`** — Added `upsertPriceSuggestion`, `getPriceSuggestions`, `updatePriceSuggestionStatus` to IDataSource
- **`src/lib/priceSuggestionApi.ts`** (new) — Full CRUD API: POST create with vehicle lookup binding, GET all with status label parsing, PATCH status update
- **`src/repositories/priceSuggestionRepository.ts`** (new) — Thin repository layer
- **`src/hooks/usePriceSuggestions.ts`** (new) — React Query hooks: `usePriceSuggestions`, `useUpsertPriceSuggestion`, `useUpdatePriceSuggestionStatus`
- **`src/data/dataverseDataSource.ts`** — Wired all price suggestion methods into DataverseDataSource
- **`src/features/admin/AdminPriceSuggestionsPage.tsx`** (new) — Full admin management page with table (Submitted By, Min/Max Price, Status, Submitted date), status filter tabs (All/Pending/Rejected/Edit & Approve), search, pagination, detail modal with status dropdown, source URL link, and comment display
- **`src/layouts/AdminLayout.tsx`** — Added "Price Suggestions" sidebar nav item with `DollarSign` icon and pending-count badge
- **`src/app/router.tsx`** — Added `/admin/price-suggestions` route
- **`src/features/valuation/Step3Result.tsx`** — Added "Suggest Price" button in valuation actions and dialog with price range, source URL, and comment fields; submits linked to the vehicle via Dataverse lookup

### Fix — Vehicle Selection Free-Text + Display Fixes
- **`src/features/valuation/Step2VehicleSelection.tsx`** — 3 fixes to support free-text entry for missing vehicles while preserving cascade filtering for existing ones:
  1. **Display fallback** — `VehicleSelect` button now shows the raw stored value even when it doesn't match any dropdown option (previously showed blank for free-text entries)
  2. **Enter key support** — Pressing Enter in the search input now immediately accepts the typed value (same as clicking "Use 'xxx'")
  3. **Cascade preserved** — Year and Body Type still filter by make/model/spec cascade for existing vehicles; free-text "Use 'xxx'" button + Enter key allow custom values for missing vehicles

### Added — Drive Type Field on Missing Vehicle Requests
- **`src/data/dataverseOptionSets.ts`** — Added `MISSING_VEHICLE_DRIVE_TYPE` mapping (4X4=1, AWD=2, FWD=3, RWD=4, Unknown=5) with `missingVehicleDriveTypeValue`/`missingVehicleDriveTypeLabel` helpers
- **`src/data/dataverseConfig.ts`** — Added `DRIVE_TYPE` field to `MISSING_VEHICLE_REQUEST_FIELDS` (`vpi_drivetype`)
- **`src/types/missingVehicleRequest.ts`** — Added `driveType?: string` field
- **`src/types/datasource.ts`** — Added `driveType?: string` to upsert payload
- **`src/data/dataverseDataSource.ts`** — Added `driveType` pass-through in upsert method
- **`src/repositories/missingVehicleRepository.ts`** — Added `driveType` to upsert payload
- **`src/hooks/useMissingVehicleRequests.ts`** — Added `driveType` to mutation payload
- **`src/lib/missingVehicleApi.ts`** — Added `driveType` to POST body (with optionset conversion) and GET response parsing
- **`src/features/valuation/Step3Result.tsx`** — Added Drive Type dropdown (4X4/AWD/FWD/RWD/Unknown) to the request dialog
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Added Drive Type field to the detail modal grid

### Added — Contact Lookup on Missing Vehicle Requests
- **`src/data/dataverseConfig.ts`** — Added `CONTACT_LOOKUP: 'vpi_Contact'` field
- **`src/types/missingVehicleRequest.ts`** — Added `contactName` and `contactEmail` display fields
- **`src/types/datasource.ts`** — Added `contactEmail` to upsert payload
- **`src/lib/missingVehicleApi.ts`** — Added `findContactIdByEmail()` helper to resolve email → GUID; sets `vpi_Contact@odata.bind` on POST; `$expand=vpi_Contact($select=firstname,lastname,emailaddress1)` on GET with contact field parsing
- **`src/data/dataverseDataSource.ts`** — Added `contactEmail` pass-through
- **`src/repositories/missingVehicleRepository.ts`** — Added `contactEmail` to upsert payload
- **`src/hooks/useMissingVehicleRequests.ts`** — Added `contactEmail` to mutation payload
- **`src/features/valuation/Step3Result.tsx`** — Passes `personalInfo.email` as `contactEmail` when submitting a missing vehicle request
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Added "Requested By" column (name + email) to the table and Contact fields to the detail modal

## 2026-07-02

### Added — Missing Vehicle Status Management (Final API)
- **`src/data/dataverseConfig.ts`** — Updated `MISSING_VEHICLE_REQUEST_FIELDS` with new API fields: `CYLINDERS`, `FUEL_TYPE`, `TRANSMISSION_TYPE`, `STATUS`. Removed `NAME`, `MIN_PRICE`, `MAX_PRICE`.
- **`src/data/dataverseOptionSets.ts`** — Added 4 dedicated optionsets: `MISSING_VEHICLE_CYLINDERS`, `MISSING_VEHICLE_FUEL_TYPE`, `MISSING_VEHICLE_TRANSMISSION_TYPE`, `MISSING_VEHICLE_STATUS` — each with `*Value()` and `*Label()` helpers.
- **`src/types/missingVehicleRequest.ts`** — Updated type: added `cylinders?`, `fuelType?`, `transmissionType?`, `status?`. Removed `name?`, `minPrice?`, `maxPrice?`.
- **`src/types/datasource.ts`** — Updated `upsertMissingVehicleRequest` payload with optional `bodyType?`, `cylinders?`, `fuelType?`, `transmissionType?`, `minMileage?`, `maxMileage?`. Re-added `updateMissingVehicleRequestStatus` to `IDataSource`.
- **`src/lib/missingVehicleApi.ts`** — Full rewrite with POST (all fields via optionset value helpers), GET (with `odata.include-annotations=*` for label parsing), and PATCH (status updates with `If-Match: *`).
- **`src/data/dataverseDataSource.ts`** — Re-added `updateMissingVehicleRequestStatus` delegation.
- **`src/repositories/missingVehicleRepository.ts`** — Re-added `updateStatus` method.
- **`src/hooks/useMissingVehicleRequests.ts`** — Re-added `useUpdateMissingVehicleRequestStatus` mutation with toast feedback.
- **`src/features/valuation/Step3Result.tsx`** — Rebuilt request dialog with 3 dropdowns (Cylinders, Fuel Type, Transmission) and Mileage Range inputs.
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Rebuilt with status management: `StatusBadge` component, `StatusSelect` dropdown, status filter tabs (All/Pending/Approved/In Progress/Reject with counts), Status column in table, and updated detail modal with status dropdown + new fields grid.
- **`src/lib/safeAjax.ts`** — Improved error handling: parses `xhr.responseText` for Dataverse error details instead of generic `errorThrown`.
- **`vite.config.ts`** — Disabled source maps (`sourcemap: false`) to fix Power Pages portal upload.

## 2026-06-30

### Changed — Missing Vehicle Request API (Simplified Schema)
- **`src/types/missingVehicleRequest.ts`** — Simplified type: removed `MissingVehicleRequestStatus` type, `status`, `requestedCount`, `firstRequestedOn`, `lastRequestedOn`, and `comment` fields. Table uses its own dedicated body type optionset.
- **`src/types/datasource.ts`** — Removed `updateMissingVehicleRequestStatus` from `IDataSource`. Removed `comment` from upsert payload.
- **`src/data/dataverseConfig.ts`** — Updated entity set to `vpi_missingvehiclerequestses`. Removed tracking field mappings (`vpi_requestedcount`, `vpi_firstrequestedon`, `vpi_lastrequestedon`, `vpi_status`, `vpi_comment`). Fixed mileage field spelling (`vpi_minmilage`/`vpi_maxmilage`).
- **`src/data/dataverseOptionSets.ts`** — Added `MISSING_VEHICLE_BODY_TYPE` with the table's dedicated 62-value body type mapping (separate from master BODY_TYPE). Removed `MISSING_VEHICLE_REQUEST_STATUS` and helpers since the table has no status field.
- **`src/lib/missingVehicleApi.ts`** — Rewrote: simple POST create (no upsert/lookup/increment logic). Uses the dedicated body type mapping. Field names and entity URL match the exact Dataverse schema.
- **`src/data/dataverseDataSource.ts`** — Removed `updateMissingVehicleRequestStatus` method and import. Simplified upsert signature.
- **`src/repositories/missingVehicleRepository.ts`** — Removed `updateStatus` method.
- **`src/hooks/useMissingVehicleRequests.ts`** — Removed `useUpdateMissingVehicleRequestStatus` hook. Simplified `useUpsertMissingVehicleRequest` payload.
- **`src/features/valuation/Step3Result.tsx`** — Removed comment textarea from request dialog. API no longer accepts comments.
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** — Simplified table: removed status filter tabs, status badges, count column, and status change dropdown. Table now shows Make/Model/Year/Spec/Body Type/Requested Date with detail modal.

### Fix — Portal SPA-Shell Asset References
- **`vehicle-pricing-intelligence-platform/.powerpages-site/web-templates/spa-shell/SPA-Shell.webtemplate.source.html`** — Fixed hardcoded hashed filenames that went stale after `upload-code-site --compiledPath` replaced portal web files. Changed `/assets/index-CN2ljK-N.css` → `/assets/style.css` and `/assets/index-X2k2XeaT.js` → `/assets/index.js` to match the unhashed file naming in `vite.config.ts`.

### Build — Hashed Asset Filenames + Auto-Template Sync
- **`vite.config.ts`** — Switched to hashed filenames (`[name]-[hash]`) for production builds, preventing asset conflicts on portal uploads
- **`scripts/update-portal-template.mjs`** (new) — Post-build script that automatically reads the hashed output filenames from `dist/assets/` and updates the SPA-Shell web template with the correct references
- **`package.json`** — Build command now chains `tsc -b && vite build && node scripts/update-portal-template.mjs`

### Feature — Missing Vehicle Request (Phase 3 Backend)
- **`src/types/missingVehicleRequest.ts`** (new) — Added `MissingVehicleRequest`, `MissingVehicleRequestStatus`, and `MissingVehicleRequestUpsertPayload` types
- **`src/types/datasource.ts`** — Added `upsertMissingVehicleRequest`, `getMissingVehicleRequests`, `updateMissingVehicleRequestStatus` to `IDataSource` interface
- **`src/data/dataverseConfig.ts`** — Added entity name, field maps, and select fields for `vpi_missingvehiclerequests`
- **`src/data/dataverseOptionSets.ts`** — Added `MISSING_VEHICLE_REQUEST_STATUS` optionset with label/value helpers (pending=1, approved=2, rejected=3, in-progress=4, imported=5)
- **`src/lib/missingVehicleApi.ts`** (new) — Implemented upsert/fetch/update-status API functions using Dataverse Web API
- **`src/data/dataverseDataSource.ts`** — Wired API functions into `DataverseDataSource` methods
- **`src/repositories/missingVehicleRepository.ts`** (new) — Thin repository layer
- **`src/hooks/useMissingVehicleRequests.ts`** (new) — React Query hooks (`useMissingVehicleRequests`, `useUpsertMissingVehicleRequest`, `useUpdateMissingVehicleRequestStatus`)

### Feature — Vehicle Not Found Flow (Valuation Step 3)
- **`src/features/valuation/Step3Result.tsx`** — Added Vehicle Not Found state with amber icon, explanatory text, and vehicle summary card. Users can click "Request This Vehicle" → prefilled dialog (Make, Model, Year, Spec, Body Type) with optional comment field. On submit, triggers upsert mutation to Dataverse. Success state confirms the vehicle is in the review queue.

### Feature — Admin Missing Vehicle Requests Page
- **`src/features/admin/AdminMissingVehiclesPage.tsx`** (new) — Full admin management page with table (Make, Model, Year, Spec, Body, Status, Count, Last Requested), status filter tabs (All/Pending/Approved/Rejected/In Progress/Imported), search by make/model/year, pagination, and per-row status dropdown. Includes detail modal with vehicle info, request stats, and user comment.
- **`src/features/admin/index.ts`** — Added `AdminMissingVehiclesPage` export
- **`src/app/router.tsx`** — Added `/admin/missing-vehicles` route
- **`src/layouts/AdminLayout.tsx`** — Added "Missing Vehicles" sidebar nav item with `SearchX` icon

### Documentation — Phase 3 Dataverse Tables
- **`docs/dataverse-schema.md`** — Added documentation for two new Dataverse tables:
  - **Missing Vehicle Request** (`vpi_missingvehiclerequests`) — Records vehicles users searched for that don't exist in master data (Make, Model, Body Type, Trim, Model Year, Min/Max Price, Min/Max Mileage)
  - **Price Suggestion** (`vpi_pricesuggestions`) — Accumulates user-submitted pricing suggestions linked to existing vehicles (Comment, Min/Max Price, Source URL, Submitted By, Vehicle Lookup)
  - Updated ER diagram, overview table, business flow (vehicle-exists decision branch), and design principles section

## 2026-06-29

### Documentation — Stale Memory Files Fixed
- **`README.md`** — Removed stale env vars (`VITE_API_BASE_URL`, `VITE_DATA_SOURCE`, `VITE_ENABLE_MOCK_DATA`) from table that no longer exist in `.env.example`
- **`docs/SETUP.md`** — Synced env var snippet to match actual `.env.example` (removed same 3 vars)
- **Claude system memory** (`C:\Users\PC\.claude\projects\C--vehicle-pricing-app\memory\`) — Fixed all 4 memory files:
  - `project-identity.md` — replaced ExcelDataSource/DatasheetJS references with Dataverse
  - `learned-conventions.md` — updated "Excel is current" → "Dataverse is current"
  - `cleanup-history.md` — added note that Phase-2 superseded the intermediate revert
  - `dataverse-phase2-infrastructure.md` — Rewritten to describe final architecture (not the discarded `src/data/dataverse/` approach)
  - Created `MEMORY.md` index for the system memory directory
- `memory/project-identity.md` and `memory/learned-conventions.md` (repo) were already up to date

## 2026-06-24

### Valuation Pricing — Accurate Per-Vehicle Min/Max
- **Root cause:** `buildPricingIndex()` computed `minimumPrice` and `maximumPrice` from the **entire make segment** (all vehicles of the same make), not the specific vehicle variant's own values. A Toyota Camry LE would show min/max spanning the cheapest Corolla to the priciest Land Cruiser.
- **Fix:** Added `rawMinPrices` and `rawMaxPrices` maps populated from `vpi_minprice`/`vpi_maxprice` during `initialize()`
- **Fix:** `getValuation()` now overrides `minimumPrice`/`maximumPrice` with the per-vehicle raw values from Dataverse (cloned to avoid mutating the shared cache)

### Admin Inquiry Modal — Pricing Data Now Visible
- **Root cause:** `parseInquiry()` never constructed `valuationResult` — the modal always showed "No valuation data available"
- **Fix:** Added `vpi_vehicledataid` to the `$expand` vehicle `$select` in `getInquiries()` and `getInquiryById()` so the vehicle GUID is available for cache lookup
- **Fix:** `parseInquiry()` now looks up the cached `Vehicle` + `VehiclePricing` by the expanded vehicle GUID and constructs a full `ValuationResult` (with confidence indicator)
- **Fix:** When cache lookup misses, falls back to a minimal `ValuationResult` from the raw pricing fields in the expanded vehicle data

### Documentation — Inquiry System Data Flow
- **`docs/context.md`** — Updated Lifecycle section with `$expand` detail explaining that customer/vehicle data is fetched through Dataverse lookups at query time (not snapshot fields); added note about future data source compatibility
- **`docs/DEVELOPMENT.md`** — Split Inquiry Data Flow into write path and read path; added `$expand=vpi_Contact(...),vpi_Vehicle(...)` to the read diagram; added note explaining the lookup-based reading pattern and option-set helper usage
- **`docs/PHASE-2-PERFORMANCE-OPTIMIZATION.md`** — Created comprehensive performance optimization roadmap with 8 prioritized items, effort estimates, and verification checklist

## 2026-06-23

### Bug Fix — Admin Queries Page Shows Blank Rows (Inquiry Snapshot Data)
- **Root cause:** The `vpi_vehicleinquiry` entity has no snapshot fields (`vpi_firstname`, `vpi_email`, etc.) — the original `parseInquiry()` read them via `(record as any)` which always returned empty strings
- **Fix:** Removed the non-existent snapshot fields — the POST payload now only sends the 4 valid fields (`vpi_name`, `vpi_Contact@odata.bind`, `vpi_Vehicle@odata.bind`, `vpi_status`)
- **Fix:** `getInquiries()` now uses **`$expand=vpi_Contact(...),vpi_Vehicle(...)`** to fetch customer and vehicle data through the Dataverse lookups — returns real names, emails, vehicle details
- **Fix:** `getInquiryById()` also uses `$expand` for consistency
- **Fix:** `parseInquiry()` reads contact fields from the expanded `vpi_Contact` object and vehicle fields from `vpi_Vehicle` — uses `bodyTypeLabel()`/`cityLabel()` option-set helpers
- **Chore:** Removed `RawInquiryRecord` interface (no longer needed) — only `RawContactRecord` remains
- **Chore:** Removed 11 debug `console.log` calls from `dataverseDataSource.ts` and 6 from `Step3Result.tsx`

### Documentation Sweep — Full Audit
- **All docs updated** to reflect Phase 2 completion
- **All docs updated** to reflect Phase 2 completion — see individual files for details
- Fixed stale Excel references across `README.md`, `memory/project-identity.md`, `memory/learned-conventions.md`
- Fixed pagination description (`@odata.nextLink` → keyset pagination) in `DEVELOPMENT.md` and `MIGRATION.md`
- Added missing API module docs (`contactApi.ts`, `inquiryApi.ts`) to `context.md`, `DEVELOPMENT.md`, `MIGRATION.md`
- Updated `CLAUDE.md` lib description from `webapi.ts` to `safeAjax.ts`

## 2026-06-22

### Phase-2 — API Layer Refactored
- **Created `src/lib/contactApi.ts`** — dedicated contact creation module with dual-path strategy:
  - Primary: `webapi.safeAjax` (reads `entityid` response header)
  - Fallback: `safeFetchWithMeta` native `fetch()` (supports `entityid` and `OData-EntityId` headers)
- **Created `src/lib/inquiryApi.ts`** — dedicated inquiry creation module with same dual-path strategy
  - Enhanced error reporting includes full XHR response body for debugging failures
- **Refactored `dataverseDataSource.ts`** — `saveInquiry()` and `upsertContact()` now delegate to the dedicated API modules instead of inline calls
- **Added debug logging** (`[saveInquiry]`, `[upsertContact #N]`) for troubleshooting the inquiry save pipeline (temporary — to be cleaned up)
- **Cleaned up stale Power Pages build artifacts** — removed 16 old `.js.map` and `.webfile.yml` entries from the `.powerpages-site/` export directory
- **`vite.config.ts`** — re-enabled `manualChunks: undefined` for simpler build output

## 2026-06-19

### Simplified — Removed Proxy Complexity
- **Actual vehicle count is 14,631** (not 33K+ from old Excel data). The year-by-year portal API approach already fetches all records correctly.
- **Removed `Ajax/Vehicles-Proxy` web template** — server-side fetchxml endpoint no longer needed
- **Removed `fetchAllVehiclesFromProxy()`** — proxy endpoint fetch with safeFetch and raw-fetch fallback
- **Removed `fetchAllVehiclesDirect()` and `callDataverseWithToken()`** — OAuth token approach no longer needed
- **Removed `DATAVERSE_ORG` / `DATAVERSE_API` constants** and `scripts/update-vehicles-proxy-template.ps1`
- **Simplified `fetchAllVehicles()`** — single year-by-year strategy, clean and straightforward
- **Reverted `shell.getTokenDeferred` type** in `webapi.ts` — resource parameter no longer needed

## 2026-06-17

### Phase-2 Complete — Pure Dataverse
- **Removed `ExcelDataSource`** — deleted `src/data/excelDataSource.ts` and `UAE_Vehicle_Data.xlsx`
- **Removed `xlsx` (SheetJS) dependency** — eliminated ~500 KB from bundle, replaced with native CSV/TSV exports
- **Made Dataverse the hard-coded default** — `DataSourceContext.tsx` initializes `DataverseDataSource` directly (no type switching, no env var)
- Updated `AdminSettingsPage.tsx` — shows "Dataverse (Power Pages Web API)" as the active source
- Updated all exports (PremiumLeaderboard TSV, AdminQueriesPage CSV, inquiries CSV) — no remaining xlsx references
- Cleaned up stale Excel comments in `dataverseDataSource.ts` and `datasource.ts`

### Documentation Sweep
- `CLAUDE.md` — updated tech stack, architecture diagram, project structure, env vars section
- `docs/context.md` — removed all Excel references, updated data flow, tech stack, architecture, inquiry lifecycle
- `docs/MIGRATION.md` — rewritten as Dataverse Architecture Guide (no more migration options)
- `docs/DEVELOPMENT.md` — updated data layer diagram, added DataverseDataSource section, removed ExcelDataSource section
- `docs/SETUP.md` — replaced Excel setup instructions with Dataverse context
- `memory/` — updated project-identity.md and cleanup-history.md

### Phase-2 — Dataverse Integration
- Created `src/data/dataverseConfig.ts` — API base URL, entity logical names, field constants, `$select` strings
- Created `src/data/dataverseOptionSets.ts` — bidirectional option-set mappings for all 9 choice fields (body type, category, transmission, doors, seats, drive type, powertrain, vehicle type, inquiry status, city) with typed helper functions
- Created `src/data/dataverseDataSource.ts` — full `IDataSource` implementation backed by the Power Pages Web API
  - Paginated vehicle fetch on init (follows `@odata.nextLink`)
  - Option-set conversion (int → label) during parsing
  - In-memory cache for analytics/hierarchy (same pattern as ExcelDataSource)
  - Inquiry CRUD via Web API (contact upsert → inquiry create, status PATCH)
  - Uses `safeFetch` from `@lib/webapi` for CSRF-authenticated requests
- Updated `src/data/DataSourceContext.tsx` — supports runtime switching via `type` prop or `VITE_DATA_SOURCE=dataverse` env var
- Extended `src/lib/webapi.ts` — added `body` to `SafeFetchOptions` for POST/PATCH support

### Lib & Path Aliases
- Simplified `src/lib/webapi.ts` — removed jQuery dependency, replaced `$.Deferred()` / `$.ajax()` with native `fetch()` + `Promise`, modernised IIFE global pattern to ES module export
- Added `@lib` path alias to `tsconfig.json` and `vite.config.ts` pointing to `src/lib/`

### Project Cleanup
- Removed all API-related work (`src/webapi/`, `src/data/dataverseDataSource.ts`, `src/data/vehicleComputations.ts`)
- Consolidated documentation: moved `Documentation/` → `docs/` (all 5 files), added `dataverse-schema.md`
- Cleaned up project root: removed stale `vehicle-pricing-intelligence-platform/` (73 MB duplicate Power Pages export), screenshots, test artifacts, and empty directories (`public/`, `src/services/`)
- Removed unused `@types/jquery` dependency
- Updated `.gitignore` — added `.vite/`
- Reverted env files and `tsconfig.json` — removed dataverse-specific entries, restored `VITE_DATA_SOURCE`
- Updated `README.md` — documentation section now points to `docs/` paths
- Removed `.env` and `.env.production` — unused (env vars are not consumed by the app); kept `.env.example` as documentation only
- Created `CLAUDE.md`, `MEMORY.md`, and `memory/` files for project rules and persistent memory

### UI Changes
- Updated admin sidebar title to **"Admin Center"** and subtitle to **"Vehicle Intelligence Platform"**

## 2026-06-10

### Documentation
- Updated `context.md` — fixed Step3Result description, removed stale "Analytics" from removed routes, documented `/result` and `/admin/dashboard` routes, updated env var section to clarify they're reserved for future use
- Updated `SETUP.md` — synced `.env` example variables with actual `.env.example`, removed mock data reference (feature not implemented)
- Updated `README.md` — corrected tech stack table (added TanStack React Query), synced env vars table with actual `.env.example`, noted env vars are not consumed yet
- Updated `CHANGELOG.md` — added today's entry

### Landing Page
- Removed stale "Confidence Scores" and "Comparable Search" feature cards — replaced with "Price Range" and "Detailed Specs" matching current valuation output
- Fixed import to include `Tag` and `Gauge` icons
- Updated "Price Predictions" description to "Market Valuations" with accurate wording
- Downgraded "Market Insights" description from "actionable insights" to "contextual observations"
- Corrected "Export Ready" description to reflect actual capabilities (PDF + XLSX)

### Admin Dashboard
- Fixed sidebar hover restoration — switched from CSS-only back to React state-based (`hovered` state with `onMouseEnter`/`onMouseLeave`)
- Fixed KPI card grid from `xl:grid-cols-7` to `xl:grid-cols-6` — eliminated empty column with 6 cards
- Enhanced KPI cards with color-coded gradient accents, themed icon backgrounds, decorative elements, and subtitles
- Fixed vehicle count discrepancy (32,790 → 33,370) — changed `totalVehicles` from `prices.length` (priced vehicles only) to `vehicles.length`
- Removed "Pricing" and "Reports" sidebar items

### Admin Queries Page (new)
- Created `src/features/admin/AdminQueriesPage.tsx` with full inquiry management table
- Filter tabs (All, Pending, Reviewed, Contacted, Closed) with count badges
- Search by name, email, phone, or vehicle
- Pagination with page controls
- StatusSelect dropdown for inline status changes with optimistic UI
- InquiryDetailModal with user info, contact details, vehicle specs, and valuation pricing
- Modal layout iterated: fixed sizing issues, two-column layout, compact spacing, submission date in header, removed price range and market trend sections

### Dialog Component
- Added `hideCloseButton` prop to `Dialog` component for custom header layouts

### Inquiry System
- Updated `InquiryStatus` type: `'pending' | 'reviewed' | 'contacted' | 'closed'`
- Wired up inquiry saving in `Step3Result.tsx` — auto-saves inquiry when valuation loads (guarded by `useRef` to prevent duplicates)
- Added `useSaveInquiry` and `useUpdateInquiryStatus` mutation hooks with toast notifications
- Added auto-refetch interval (30s) on `useInquiries` for real-time updates

### Admin Layout
- Added Queries sidebar item with pending-count badge
- Added `/admin/queries` route to router
- Added `'/admin/queries': 'Queries'` to page titles

### Export
- Added `useExportInquiries` hook — exports all inquiries as XLSX via the `xlsx` library
- Export button in Queries page header (next to search bar)

### Router
- Route: `<Route path="queries" element={<AdminQueriesPage />} />` under admin layout

### Data Source
- `IDataSource` interface unchanged (inquiry methods already defined)
- `ExcelDataSource` — inquiry methods use in-memory array
