# DriveArabia Scrape — End-to-End History, Architecture, Operations, and Troubleshooting

## Purpose

This document is the canonical record of the DriveArabia scraping work from the original problem through the successful automated workflow. It explains:

- why a normal cloud HTTP scrape was not sufficient;
- why Power Automate Desktop (PAD) and Azure Functions were introduced;
- why the Power Pages-to-cloud-flow approach failed;
- why the first Dataverse-triggered version remained stuck in `Preparing` or `In Progress`;
- why PAD repeatedly failed with `JsonAsCustomObject.inboxId`;
- how exact Run/attempt correlation, parsing, persistence, and cleanup work;
- how to deploy, operate, verify, recover, and troubleshoot the workflow;
- which repository files own each part of the implementation.

It complements, rather than replaces:

- `power-automate-desktop-scraper-guide.md` for the detailed PAD build;
- `PHASE-4-UNIFIED-SCRAPE-ORCHESTRATION.md` for the shared Run/Source Result contract;
- `PHASE-7-AUTOMATION-HARDENING.md` for automation and security decisions;
- `DRIVEARABIA-CLOUD-VS-PAD-DECISION.md` for the transport decision.

## 1. The original requirement

An administrator needed to start a DriveArabia scrape from a Missing Vehicle Request (MVR) and obtain:

- the exact make, model, year, and commercial trim;
- original-reference minimum and maximum prices;
- supported technical specifications such as engine size, cylinders, fuel, transmission, drivetrain, horsepower, torque, body type, and doors;
- traceable source evidence;
- a normalized Dataverse Source Result;
- a completed parent Scrape Run;
- an MVR status that accurately reflects the whole operation.

Accuracy was more important than returning partial data. A successful HTTP response containing the wrong trim or a default trim's specifications was not acceptable.

## 2. Why an ordinary cloud scrape was not enough

DriveArabia does not expose all required multi-trim specification evidence as one simple static response.

- Price rows are available in the rendered model-year page.
- A default vehicle configuration may appear in JSON-LD.
- Other engine/specification groups are controlled by interactive accordions.
- Closed accordion content can be unmounted or unavailable until browser JavaScript opens it.
- Multiple commercial grades can share one mechanical configuration.

A cloud HTTP request cannot reproduce the proven user-browser behavior reliably. It does not launch the same interactive Chrome session, click every accordion, wait for React rendering, and preserve every rendered group. Returning only the default structured vehicle could silently attach one trim's specifications to another trim.

The selected transport therefore became:

```text
Power Automate Cloud for orchestration
  + Power Automate Desktop for real Chrome rendering/capture
  + Azure Functions for temporary asynchronous HTML relay
  + the TypeScript parser for exact matching and normalization
  + Dataverse for durable business evidence and lifecycle state
```

PAD is intentionally a thin capture agent. It does not decide which price or specifications belong to the MVR and does not write final evidence to Dataverse.

## 3. Why Azure Functions was introduced

PAD needed a safe, asynchronous place to deliver a large captured HTML document. Directly making PAD responsible for Dataverse parsing and writes would have duplicated business rules in a low-code flow and made exact trim matching difficult to test.

The existing Azure Function app was extended into a temporary Inbox relay:

1. PAD sends the final URL and full page HTML to `POST /api/ingest_html`.
2. Azure stores the large HTML in Blob Storage.
3. Azure stores small searchable metadata in Table Storage.
4. Azure returns a short `inboxId` with HTTP `202`.
5. The portal locates the exact item by Run correlation and attempt.
6. The portal retrieves the HTML by exact Inbox ID.
7. The TypeScript parser extracts and validates the evidence.
8. After successful Dataverse persistence, the portal marks the Inbox item `Complete`.
9. Azure deletes the HTML blob but retains lightweight completed metadata.

This design keeps:

- raw HTML out of Dataverse;
- the Azure ingest function key inside PAD only;
- parsing rules in testable TypeScript;
- browser capture independent of business persistence;
- failed HTML available for diagnosis when the Inbox item is marked `Error`.

## 4. First proven attended workflow

The first working design was attended and manual:

```text
Administrator prepares a scrape in the portal
  -> copies the correlated DriveArabia URL
  -> manually starts PAD
  -> PAD captures and uploads the page
  -> administrator enters the returned Inbox ID
  -> Process PAD Capture parses and persists that exact item
```

This proved the major downstream components independently:

- DriveArabia could be opened and captured in a real browser;
- Azure could accept, retain, and return the capture;
- the app could extract price rows;
- an exact MVR could be matched;
- prices and supported specifications could be written to Dataverse;
- Run and Source Result evidence could be completed;
- successful Inbox items could be acknowledged and purged.

The attended path remains the controlled recovery mechanism, but it did not satisfy the final one-click requirement.

## 5. Unified Run and Source Result foundation

The project introduced a normalized three-level data model:

```text
Missing Vehicle Request
  -> Vehicle Scrape Run
      -> Vehicle Scrape Source Result (one per source and attempt)
```

When Start Scrape is selected, the portal creates all requested work before transport begins:

- one shared Run with a generated UUID correlation ID;
- one queued Source Result for YallaMotor, DriveArabia, or each selected source;
- attempt number `1` for the initial attempt;
- a deterministic Source Result key:

```text
<run-correlation-id>:<normalized-source>:<attempt-number>
```

For DriveArabia, the queued Source Result also receives a URL such as:

```text
https://www.drivearabia.com/carprices/uae/<make>/<model>/<year>/
  #vpiRun=<run-correlation-id>&vpiAttempt=1
```

The fragment is not sent to DriveArabia's server. It travels with the browser URL, PAD capture, and Azure metadata. It is removed from the clean source URL stored as final evidence.

This made the queued Dataverse row both:

- a durable record of requested work; and
- a self-contained dispatch message for Power Automate Cloud.

## 6. Attempt 1 — Power Pages directly triggers a cloud flow

The first one-click design tried to call a site-associated Power Automate flow through the Power Pages cloud-flow endpoint.

Several real issues were corrected during that investigation:

- The Power Pages API uses an outer `eventData` transport envelope.
- The properties inside `eventData` map directly to typed trigger inputs.
- A redundant Parse JSON action was removed.
- The portal transport was changed from the Dataverse JSON wrapper to the Power Pages `shell.ajaxSafePost` form envelope.
- The CSRF token path was corrected.
- A new solution-native cloud flow and Desktop flows connection were created.
- The flow was re-registered with the site.
- Its registration GUID was moved to the `VPI/DriveArabiaCloudFlowId` site setting.
- Authenticated Contact and web-role behavior were checked.
- A minimal response-only smoke flow was tested.

Despite those corrections, the live Power Pages endpoint continued returning HTTP `500` before Power Automate created any flow run. The same PAD flow worked when started manually, proving that the machine, PAD, Azure Inbox, parser, and Dataverse writers were not the cause.

The exact internal Microsoft platform exception was not available. The evidence isolated the failure to this boundary:

```text
Power Pages site-associated cloud-flow endpoint
  -> failed before a Power Automate run existed
```

The project therefore stopped using that endpoint for production dispatch.

## 7. Direct HTTP diagnostic proof

A temporary HTTP-triggered copy of the cloud flow was created to test everything after the failed Power Pages boundary.

It proved that an application-prepared correlation could successfully pass through:

```text
HTTP-triggered cloud flow
  -> attended PAD
  -> Azure Inbox
  -> exact Inbox processing
  -> Dataverse Source Result and Run completion
```

Two lessons were established:

1. Attended PAD can outlast a synchronous caller. A Postman Cloud Agent disconnected after about 30 seconds even though PAD completed. The diagnostic flow therefore used an asynchronous response.
2. A signed HTTP-trigger URL is a credential. It must never be embedded in public Power Pages JavaScript, a `VITE_*` variable, a web template, or runtime configuration.

The HTTP flow was proof, not the approved frontend authorization boundary.

## 8. Final dispatch design — Dataverse triggers the cloud flow

The secure replacement removed the browser-to-flow call completely.

The active solution-aware cloud flow is configured as follows:

1. Trigger: Microsoft Dataverse, **When a row is added, modified or deleted**.
2. Change type: `Added`.
3. Table: `Vehicle Scrape Source Results`.
4. Scope: `Organization`.
5. Filter rows:

   ```text
   vpi_source eq 2 and vpi_processingstatus eq 1
   ```

   where DriveArabia is `2` and Queued is `1`.

6. Trigger concurrency is enabled with degree of parallelism `1`, protecting the attended desktop session from overlapping jobs.
7. The triggering Source Result is updated to:
   - Processing Status: `Running`;
   - Started On: `utcNow()`.
8. **Run a flow built with Power Automate for desktop** invokes the published `PAD - DriveArabia` flow in attended mode.
9. `vpi_sourceurl` from the triggering row is passed to PAD input `DriveArabiaUrl`.
10. On PAD success, **Record PAD Receipt** updates that same Source Result with:
    - Processing Status: `Running`;
    - Captured On: `utcNow()`;
    - Started On: `utcNow()`;
    - HTTP Status Code: `outputs('Run_DriveArabia_PAD')?['body/StatusCodeOutput']`;
    - Inbox ID: `outputs('Run_DriveArabia_PAD')?['body/InboxIdOutput']`.
11. A failure/timeout/skipped branch marks the same Source Result `Failed`, records `PAD_DISPATCH_FAILED`, a bounded diagnostic, and Completed On.

Creating the queued Source Result is now the dispatch event. The SPA contains no signed cloud-flow URL and performs no separate trigger request.

## 9. PAD flow — final accepted construction

The published PAD flow owns only navigation, rendered-page preparation, capture, and upload.

### 9.1 Inputs and outputs

Required input:

```text
DriveArabiaUrl : Text
```

Required outputs:

```text
InboxIdOutput   : Text
StatusCodeOutput: Number
```

### 9.2 Logical action sequence

1. **Launch new Chrome** using `DriveArabiaUrl` and a normal user profile.
2. **Run JavaScript function on web page** to find the Specs section, open every accordion, and collect rendered groups.
3. **Wait 5 seconds** so asynchronous DriveArabia/React rendering can finish.
4. **Run JavaScript function on web page** to validate that every expected group was captured. This result is only a small `READY:<count>` validation signal.
5. **Get details of web page** with `Get = Web page source`, storing the full HTML text in `WebPageProperty`.
6. **Set variable** `UploadPayload` as a native PAD Custom Object:

   ```text
   source = drivearabia
   url    = DriveArabiaUrl
   kind   = prices
   html   = WebPageProperty
   ```

7. **Convert custom object to JSON**, producing text variable `CustomObjectAsJson`.
8. **Invoke web service**:
   - Method: `POST`;
   - URL: `https://vpi-probe-py-20260805.azurewebsites.net/api/ingest_html?code=<FUNCTION_KEY>`;
   - Accept: `application/json`;
   - Content type: `application/json`;
   - Request body: insert `CustomObjectAsJson` through PAD's variable picker.
9. **Convert JSON to custom object** using `WebServiceResponse`.
10. Set `InboxIdOutput` from the response object's `inboxId`.
11. Set `StatusCodeOutput` from the Invoke action's `StatusCode`.
12. Save the draft and then **Publish** the desktop flow.

With desktop-flow version control enabled, Save draft alone does not change what cloud-triggered runs execute. The next cloud run's Flow Version timestamp must show the newly published version.

## 10. Repeated PAD failure — actual root cause

The cloud flow repeatedly reported:

```text
Action 'Run_DriveArabia_PAD' failed:
Variable 'JsonAsCustomObject' doesn't have a property 'inboxId'.
```

That message described the final symptom, not the original cause.

The real chain was:

```text
PAD sent an invalid request body
  -> Azure ingest_html returned HTTP 400 with an error object
  -> the error object did not contain inboxId
  -> PAD tried JsonAsCustomObject['inboxId']
  -> PAD raised the missing-property error
  -> the cloud flow reported the PAD failure
```

### 10.1 First invalid body: `[object Object]`

The JavaScript browser action appeared to return JSON, but PAD's Chrome bridge exposed the value as:

```text
[object Object]
```

Azure consequently received an invalid 19-byte body and returned HTTP `400`.

Resolution: do not send the JavaScript action's large result. Use native **Web page source**, build a PAD Custom Object, and convert it with PAD's JSON action.

### 10.2 Second invalid body: literal `%CustomObjectAsJson%`

The variable expression was manually typed into Invoke web service. PAD transmitted the literal characters:

```text
%CustomObjectAsJson%
```

Azure received a 24-byte invalid body and again returned HTTP `400`.

Resolution: delete the manually typed text and insert `CustomObjectAsJson` from PAD's variable picker.

### 10.3 Old published PAD version continued running

After the actions were corrected, cloud runs still showed an older Flow Version timestamp. Only the PAD draft had been saved.

Resolution: publish the desktop flow and verify the Flow Version timestamp in the next Desktop flow run.

### 10.4 Azure-side compatibility hardening

PAD can percent-encode the entire request body even while declaring JSON content. Azure's `_try_parse_json()` therefore accepts either raw JSON or a carefully detected encoded body.

Encoded payloads must use `unquote_plus`, not `unquote`:

- spaces arrive as `+`;
- genuine plus signs arrive as `%2B`;
- `unquote` previously left spaces as literal plus characters and corrupted HTML;
- `unquote_plus` restores both correctly.

This server-side fallback is compatibility protection. PAD must still construct valid JSON through native actions.

## 11. Dataverse receipt delay — a different problem

After Dataverse dispatch worked, the cloud flow and PAD completed in tens of seconds and **Record PAD Receipt** correctly wrote:

- `vpi_processingstatus = Running`;
- `vpi_inboxkey = <returned inbox ID>`;
- `vpi_httpstatuscode = 202`;
- capture/start timestamps.

However, the portal sometimes remained in `Preparing` for about ten minutes or showed `In Progress` long after the cloud flow succeeded.

Network traces showed repeated successful Power Pages Web API reads returning the original queued row. The receipt existed in Dataverse, but Power Pages' server-side data cache did not expose the workflow update promptly.

The following mitigations were tested:

- jQuery `cache: false`;
- native Fetch `cache: 'no-store'`;
- Dataverse Track changes enabled and published;
- portal Preview/cache refresh;
- repeated exact Source Result reads.

They improved client-side hygiene but could not force Power Pages' server-side cache to refresh immediately. This established that a cloud-flow-updated Dataverse row could remain durable audit evidence, but could not be the real-time receipt signal for this workflow.

## 12. Final receipt design — poll Azure by exact correlation

The portal now polls Azure directly every few seconds using:

```text
GET /api/next_pending
  ?runCorrelationId=<prepared-run-correlation-id>
  &attemptNumber=<prepared-attempt-number>
```

Before PAD uploads the page, the correct response is:

```text
404 {"error":"not_found"}
```

That is an expected “not ready yet” signal, not a failed scrape.

When PAD uploads the page, Azure:

1. reads `vpiRun` and `vpiAttempt` from each Pending DriveArabia item's URL fragment;
2. returns only the item matching both requested values;
3. rejects multiple matches as ambiguous;
4. does not fall back to the oldest Pending item.

The portal independently validates that the returned item's URL contains the expected Run and attempt. It then retrieves the full HTML using:

```text
GET /api/next_pending?inboxId=<exact-inbox-id>
```

The Dataverse Inbox ID and HTTP status written by the cloud flow remain valuable audit fields, but they are no longer on the interactive completion path.

## 13. Exact price and specification matching

### 13.1 Vehicle identity

The processor derives make/model from the final DriveArabia URL and considers only the MVR supplied to that exact operation. It does not scan for and attach an arbitrary request.

### 13.2 Price rows

Price extraction is scoped to the model-year page's final **Original Trim Prices** or **Trim Prices** section. This avoids accidentally reading ranges from similar-car content elsewhere on the page.

Matching rules are conservative:

1. exact normalized trim text wins;
2. otherwise one unique cross-source equivalent may match when capacity and grade identity agree and stated mechanical tokens do not conflict;
3. ambiguous or conflicting matches are rejected.

### 13.3 Specification groups

The parser prefers an explicit `vpi-pad-spec-groups` marker when present. Native PAD **Web page source** may omit JavaScript-injected markers, so a marker-free fallback reads the fully rendered accordion bodies beneath `#specs`.

The fallback is accepted only when the captured page structure demonstrates complete rendered specification controls. It then:

- parses mechanical groups;
- de-duplicates repeated identical engines;
- retains every commercial grade alias associated with that engine;
- matches one exact commercial trim where possible;
- uses a unique engine signature when safe;
- returns only unanimous values for a generic exact trim;
- returns no specs rather than borrowing an arbitrary group's details.

### 13.4 Nissan Patrol edge cases

The Nissan Patrol 2026 tests exposed two separate label problems.

First, `LE Titanium+` could be treated like `LE Titanium` because generic normalization removed the semantic plus sign. The trim normalizer now converts `+` to `plus`, keeping those grades distinct.

Second, DriveArabia could render a grade across nested elements, for example:

```text
LE | Titanium | +
```

Reading only the first text node lost part of the label. Marker-free accordion alias extraction now reads the complete rendered button text before repeated mechanical groups are consolidated.

The automatic transport, price capture, correlation, persistence, and cleanup are live-proven. Post-publication live tests confirmed that both `SE Titanium` and `LE Titanium+` now receive their specifications. The accepted `LE Titanium+` path resolves the exact price row and the 3.5L/V6/Petrol/4WD/Automatic/425 HP/700 Nm specification group without borrowing data from the plain `LE Titanium` grade.

## 14. Successful final workflow

The accepted end-to-end workflow is:

1. Administrator clicks **Start Scrape**.
2. Portal creates a correlated Run and queued Source Result.
3. Dataverse-triggered cloud flow detects the DriveArabia/Queued job.
4. Cloud flow starts the published PAD flow.
5. PAD opens DriveArabia in real Chrome.
6. PAD expands and captures the page.
7. PAD builds valid JSON using native PAD actions.
8. PAD uploads the HTML to Azure Inbox.
9. Azure returns an Inbox ID and HTTP `202`.
10. Portal polls Azure using the exact Run correlation and attempt.
11. Portal retrieves only the correct capture by exact Inbox ID.
12. Parser matches the exact vehicle, year, and trim.
13. Prices and supported specifications are written to the MVR and normalized evidence.
14. DriveArabia Source Result becomes `Succeeded`.
15. The shared Scrape Run is re-aggregated and becomes `Completed` when all selected sources are terminal and successful.
16. MVR Scrape Status becomes `Scraped` when the terminal shared outcome contains a success.
17. Portal marks the Azure Inbox item `Complete`; Azure purges its HTML blob.

In compact form:

```text
Admin UI
  -> Power Pages Web API creates Run + DriveArabia/Queued Source Result
  -> Dataverse event starts cloud flow
  -> cloud flow starts published PAD
  -> PAD captures real Chrome and POSTs JSON/HTML
  -> Azure stores Pending Inbox item and returns inboxId
  -> portal discovers exact Run/attempt
  -> portal retrieves exact HTML
  -> parser matches exact vehicle/trim and normalizes fields
  -> portal PATCHes MVR + prepared Source Result
  -> common aggregator finalizes Run
  -> portal acknowledges Complete
  -> Azure purges HTML blob
```

## 15. Status ownership

Different layers own different statuses. A successful cloud flow does not by itself mean that parsing and persistence finished.

| Record/system | Status transition | Owner |
|---|---|---|
| MVR | `Pending -> In Progress` | Portal after successful preparation |
| Source Result | `Queued` | Portal during preparation |
| Source Result | `Queued -> Running` | Cloud flow before PAD |
| Azure Inbox | created as `Pending` | Azure `ingest_html` |
| Source Result | `Running -> Succeeded` | Portal after exact parse and evidence write |
| Scrape Run | `Running -> Completed/Partial Success/Failed` | Common Run aggregator |
| MVR | `In Progress -> Scraped/Failed` | Portal after shared outcome reconciliation |
| Azure Inbox | `Pending -> Complete/Error` | Portal acknowledgement |
| Azure HTML blob | retained or purged | Azure; purge only on `Complete` |

When both sources are selected, DriveArabia success alone does not necessarily complete the Run. The latest attempt for every selected source must be terminal. A mixture of success and terminal failure produces `Partial Success`; all failures produce `Failed`.

## 16. Component responsibilities

| Component | Owns | Must not own |
|---|---|---|
| Power Pages application | Admin selection, Run preparation, MVR lifecycle, Azure correlation polling, parsing, Dataverse evidence writes, UI feedback | PAD credentials, Azure ingest key, browser automation |
| Dataverse | Durable job, Run, Source Result, MVR, audit fields, decisions | Raw captured HTML |
| Power Automate Cloud | Dataverse event, serialization, machine dispatch, PAD input/output handoff, failure diagnostics | Trim parsing or evidence interpretation |
| Power Automate Desktop | Real Chrome navigation, accordion expansion, validation, source capture, JSON upload | Exact MVR matching, Dataverse price decisions, parent Run aggregation |
| Azure Inbox | Temporary HTML, searchable metadata, exact correlation/ID retrieval, acknowledgement cleanup | Permanent pricing decisions |
| TypeScript parser | Price extraction, safe trim equivalence, spec-group matching, normalization | Machine dispatch or site authentication |

## 17. Repository implementation map

### Portal entry and orchestration

| File | Responsibility |
|---|---|
| `src/features/admin/AdminMissingVehiclesPage.tsx` | Source-selection dialog, Start Scrape mutation, Preparing state, controlled Copy PAD URL and Process PAD Capture recovery UI |
| `src/hooks/useTriggerMultiSourceScrape.ts` | React Query mutation, notifications, request-list invalidation |
| `src/lib/multiSourceScrapeExecution.ts` | End-to-end browser-side coordinator: prepare, set MVR In Progress, wait for Azure correlation, process exact Inbox item, reconcile final MVR status |
| `src/lib/multiSourceOrchestrator.ts` | Create shared Run and queued source targets, generate correlation, resolve prepared DriveArabia target, refresh parent Run |
| `src/lib/driveArabiaUrl.ts` | Build model-year URL, add/parse/remove `vpiRun` and `vpiAttempt` fragment values |
| `src/lib/vehicleScrapeRunState.ts` | Pure source-attempt selection, counts, terminal-state and parent Run aggregation rules |

### Azure Inbox and processing

| File | Responsibility |
|---|---|
| `scraper-service/function_app.py` | `ingest_html`, `next_pending`, `inbox_status`, correlation lookup, Blob/Table storage, encoded-body compatibility, successful blob purge |
| `src/lib/multiSourceScraper.ts` | Poll/find exact capture, validate correlation, retrieve HTML, match requests, call parsers, update MVR, persist prepared evidence, acknowledge Inbox |

### Parsing and persistence

| File | Responsibility |
|---|---|
| `src/parsers/driveArabia.ts` | Price-table extraction, exact/cross-source trim resolution, JSON-LD specs, explicit marker and rendered-accordion spec-group extraction, commercial-grade matching |
| `src/parsers/normalize.ts` | Single label-to-Dataverse-integer normalization boundary |
| `src/lib/driveArabiaDualWrite.ts` | Advance exact prepared Source Result through Running to Succeeded/Failed, store normalized/raw provenance, refresh parent Run |
| `src/lib/vehicleScrapeApi.ts` | Typed Power Pages Web API create/read/update operations for Runs and Source Results |
| `src/lib/missingVehicleApi.ts` | MVR scrape status and price/specification PATCH operations |
| `src/repositories/vehicleScrapeRepository.ts` | Repository boundary for Run and Source Result operations |
| `src/repositories/missingVehicleRepository.ts` | Repository boundary for MVR status and result operations |
| `src/data/dataverseOptionSets.ts` | Exact Dataverse choice values for MVR, Run, Source Result, source, transport, and price type |

### Regression protection

| File | Protects |
|---|---|
| `src/lib/driveArabiaUrl.test.ts` | Correlated URL construction, parsing, and cleaning |
| `src/lib/multiSourceOrchestrator.test.ts` | Run/target preparation and prepared-target resolution |
| `src/lib/multiSourceScrapeExecution.test.ts` | Exact Azure receipt handoff and lifecycle behavior |
| `src/lib/multiSourceScraper.test.ts` | Exact Inbox selection, request matching, persistence, waiting/error/acknowledgement behavior |
| `src/lib/driveArabiaDualWrite.test.ts` | Prepared Source Result persistence and Run refresh |
| `src/lib/vehicleScrapeRunState.test.ts` | Run aggregation and retry semantics |
| `src/parsers/driveArabia.test.ts` | Real-fixture price/spec extraction, trim aliases, `+` semantics, nested split-grade labels, ambiguity rejection |

## 18. Deployment runbook

### 18.1 Publish the Power Pages SPA

From the project root:

```powershell
npm run publish
```

`publish.ps1` performs the live-verified sequence:

```powershell
pac pages download-code-site --path ./ --websiteid 0abd4358-eca4-4753-97d3-391d5a1cb38c --overwrite
npm run build
pac pages upload-code-site --rootPath ".\vehicle-pricing-intelligence-platform" --compiledPath ".\dist" --siteName "Vehicle Pricing Intelligence Platform"
```

Do not substitute classic `pac pages upload --modelVersion Enhanced` for a normal SPA code publish. The prior mixed configuration/code upload produced missing `powerpagecomponent` IDs and exceeded the component content-size limit. Do not continue if PAC says it will create a new website because the expected code-site identity is missing.

### 18.2 Publish Azure Functions

From `scraper-service/`, use the established Azure Functions remote-build deployment for `vpi-probe-py-20260805`. After deployment, verify:

```text
GET /api/next_pending?runCorrelationId=<nonexistent-uuid>&attemptNumber=1
-> 404 {"error":"not_found"}
```

This confirms the correlation-aware endpoint is active and does not guess another Pending item.

### 18.3 Publish PAD

After any desktop-flow edit:

1. Save draft.
2. Publish.
3. Start a fresh MVR attempt; existing Added rows do not retrigger the Dataverse flow.
4. Open the Desktop flow run details.
5. Verify the Flow Version timestamp matches the publication.

### 18.4 Cloud flow/environment checks

- Correct Power Platform environment and solution.
- Dataverse trigger is turned on.
- Trigger filter uses DriveArabia `2` and Queued `1`.
- Concurrency is one.
- Desktop flows connection is authorized.
- The intended machine is available.
- PAD input/output variable names match exactly.
- The required contributor/connection permissions are active.

## 19. Live acceptance procedure

Use a fresh MVR and attempt. Reusing an old queued row does not test an Added-only trigger.

1. Open Developer Tools -> Network and enable **Preserve log**.
2. Filter for `next_pending` and `vpi_vehiclescrapesourceresults`.
3. Select DriveArabia and click Start Scrape.
4. Record the exact local time and MVR details.
5. Confirm a new Run and DriveArabia/Queued Source Result exist.
6. Confirm the cloud flow starts automatically.
7. Confirm the Desktop flow run uses the expected published version.
8. Confirm Invoke web service returns HTTP `202` and a non-empty Inbox ID.
9. Treat correlation-based `404 not_found` responses before upload as expected.
10. Confirm correlation lookup changes to `200` for the exact Run and attempt.
11. Confirm exact-Inbox retrieval returns the intended URL and HTML.
12. Confirm `POST /api/inbox_status` returns `200` with `Complete`.
13. Confirm the Source Result contains:
    - DriveArabia;
    - PAD transport;
    - Original Reference price type;
    - exact attempt;
    - correct trim/year;
    - correct min/max;
    - supported specifications;
    - clean source URL;
    - Inbox ID;
    - terminal timestamps;
    - `Succeeded`.
14. Confirm the parent Run counts and terminal status.
15. Confirm the MVR displays `Scraped` and the correct evidence.
16. For known label edge cases, explicitly compare `LE Titanium` with `LE Titanium+` and inspect `SE Titanium` specifications.

## 20. Troubleshooting by symptom

### Portal shows continuous `next_pending` 404 responses

If the URL includes the expected `runCorrelationId` and `attemptNumber`, this is normal until PAD uploads the correlated item.

Investigate only when it persists beyond the expected PAD runtime:

- Did the Dataverse cloud flow start?
- Did the PAD flow start on the correct machine?
- Did PAD use the current published version?
- Did Invoke web service return `202`?
- Does the uploaded URL still contain `#vpiRun=...&vpiAttempt=...`?
- Was the Azure Function correlation-aware version deployed?

### Cloud flow did not start

Inspect the newly created Source Result:

- Source must be DriveArabia (`2`).
- Processing Status must initially be Queued (`1`).
- The row must be newly added after the flow was enabled.
- The flow must be in the same environment and solution.
- Trigger filter and connection references must be correct.

Do not debug PAD first if no cloud-flow run exists.

### Cloud flow succeeded but portal remains In Progress

Check whether Azure exact-correlation polling is present in the deployed portal bundle. The final design does not wait for the cloud-flow-written Dataverse Inbox ID. A stale Queued/Running Dataverse response can be Power Pages cache and is not the real-time receipt boundary.

### `JsonAsCustomObject` has no property `inboxId`

Inspect the preceding Invoke web service output first.

- If status is `400`, read the response error.
- If preview shows `[object Object]`, PAD is sending the JavaScript object incorrectly.
- If preview shows `%CustomObjectAsJson%`, the request field contains literal text.
- Use Web page source -> native PAD Custom Object -> Convert custom object to JSON -> insert the output through the variable picker.
- Publish PAD and confirm the next run's Flow Version.

### PAD cannot assume control of Chrome

This is a desktop browser-control issue, separate from JSON and correlation.

- Close conflicting automated Chrome instances.
- Confirm the Power Automate browser extension is enabled.
- Reopen Chrome through PAD rather than attaching to an incompatible session.
- Confirm the machine session is unlocked and available for attended mode.
- Retest the Launch new Chrome action before changing downstream actions.

### Prices succeed but specifications are blank

This normally means vehicle/price matching succeeded but no unique safe specification group matched.

Check:

- whether all Specs accordions rendered before capture;
- Action 4's `READY:<count>` result;
- whether native Web page source contains complete rendered controls;
- the exact requested trim and exact source price-row trim;
- whether the label includes a meaningful `+`;
- whether the grade is split across nested nodes;
- parser fixture coverage for that exact HTML.

Do not force a generic or fuzzy spec match. Price-only evidence is safer than cross-trim contamination.

### Wrong trim price selected

Capture the exact HTML and add a parser regression. Verify:

- exact year filtering;
- final Trim Prices section boundary;
- semantic `+` preservation;
- capacity, grade, drivetrain, cylinder-layout, induction, and hybrid conflicts;
- that only one cross-source equivalent remains.

### Exact capture is available but cannot persist

Use the MVR modal's record-scoped **Process PAD Capture** with the exact 12-character Inbox ID. A correlated item remains Pending when its prepared target cannot safely resolve or persist, allowing recovery after the underlying permission/schema/cache problem is fixed.

### Inbox item is marked Error

The HTML blob is intentionally retained. Inspect the processor error, repair the parser or Dataverse write problem, and use a controlled retry/reprocessing path. Do not purge failed evidence before diagnosis.

## 21. Recovery path

The manual recovery path remains deliberately available:

1. Open the affected MVR.
2. Copy its correlated PAD URL if a new capture is required.
3. Run the published PAD flow with that URL.
4. Obtain the 12-character Inbox ID.
5. Enter that exact ID in the MVR modal.
6. Select **Process PAD Capture**.

The action receives only the open MVR and the explicit Inbox ID. It does not consume the oldest shared Pending item, so stale captures cannot be attached by guesswork.

## 22. Security and data-handling rules

- Never place the Azure `ingest_html` function key in portal code, documentation examples, Dataverse evidence, or screenshots shared externally.
- Never place a signed Power Automate HTTP-trigger URL in the SPA or a `VITE_*` variable.
- Keep the ingest key inside PAD's secured action configuration.
- Keep raw HTML in temporary Azure Blob storage, not Dataverse.
- Store only normalized evidence, bounded diagnostics, provenance, timing, and identifiers in Dataverse.
- Restrict Source Result creation and admin UI access through Power Pages/Dataverse security.
- Keep cloud-flow connection references solution-managed and least-privileged.
- Keep attended PAD trigger concurrency at one unless the machine architecture is deliberately changed.
- Remove or disable diagnostic Power Pages/HTTP trigger artifacts after they are no longer needed.
- Do not use unrelated FIFO Inbox captures for automatic correlation.

## 23. Proven outcomes and remaining boundary

Live evidence established the following:

- Automatic Dataverse dispatch starts the cloud flow and PAD.
- PAD can upload valid JSON and receive Inbox ID/HTTP `202`.
- Azure exact correlation returns only the intended Run/attempt.
- Exact Inbox retrieval, parsing, MVR update, prepared Source Result persistence, Run aggregation, acknowledgement, and blob purge complete without manual Inbox entry.
- Price capture works across the tested Nissan Patrol 2026 grades.
- The parser safely avoids specification guessing.
- Marker-free accordion parsing, semantic plus preservation, grade-alias consolidation, and complete nested-button text are implemented and regression-tested.
- Final live tests proved specification capture for both `SE Titanium` and `LE Titanium+`, including the correct distinct `LE Titanium+` engine group.

The current architectural boundary is that the open portal session performs final HTML parsing and Dataverse evidence persistence. If the page is closed after PAD upload but before processing completes, the Azure item remains recoverable through exact-Inbox processing. Moving final processing to an authorized background worker is a separate Phase 7B concern.

The Nissan Patrol split-grade specification gate is accepted: `SE Titanium` and `LE Titanium+` both complete with specifications in the published workflow. The conservative ambiguity rules remain in place for future unknown trims.

## 24. Final lessons

1. A green cloud-flow run proves dispatch, not end-to-end scrape completion.
2. Diagnose the first failing action; the final `inboxId` error was caused by an earlier HTTP `400`.
3. Power Pages client cache headers cannot guarantee immediate visibility of externally updated Dataverse rows.
4. Use a purpose-built real-time receipt channel for time-sensitive orchestration; retain Dataverse as durable audit state.
5. Correlate by Run plus attempt and validate the returned URL. Never guess from a shared FIFO queue.
6. Keep PAD thin and use native PAD JSON actions for payload construction.
7. Save draft and Publish are different operations when PAD version control is enabled.
8. Preserve semantic trim characters such as `+`; normalization must not erase product identity.
9. Read complete rendered labels, including nested nodes.
10. When specification evidence is ambiguous, store price-only evidence instead of contaminating the record with another trim's mechanics.
11. Keep extraction and normalization in fixture-tested source code, not duplicated across PAD and cloud-flow expressions.
12. Keep manual exact-ID recovery available until completion is fully background-owned.
