# DriveArabia Automation Decision: Power Automate Cloud vs Desktop

> **Decision date:** 2026-08-24  
> **Status:** Accepted for Phase 7  
> **Scope:** DriveArabia capture, orchestration and evidence processing  
> **Decision:** Use Power Automate Cloud as the secure orchestrator and Power Automate Desktop (PAD) as the browser execution layer. Keep the attended PAD path as rollback until background completion is proven.

## 1. Executive summary

DriveArabia cannot currently be scraped completely and reliably by Power Automate Cloud alone because the required information is not all available through a simple HTTP response. The proven workflow needs a real browser to execute JavaScript, follow redirects, expand dynamically mounted specification accordions and serialize the rendered trim groups before uploading the page.

Power Automate Cloud is therefore not being added as a second scraper. Its role is to connect the authenticated administrator action in Power Pages to the Windows machine that runs PAD:

```text
Power Pages admin action
  → Power Automate Cloud: authorization, dispatch, queueing and result handoff
  → Power Automate Desktop: real-browser rendering and capture
  → Azure inbox: transient captured HTML
  → application parser: exact trim matching and normalization
  → Dataverse: separate Run and Source Result evidence
```

The responsibilities remain deliberately separate:

- **Power Automate Cloud coordinates the job.**
- **PAD operates the real browser.**
- **Azure temporarily relays the capture.**
- **The application parses and persists evidence.**
- **Dataverse stores normalized source evidence and the administrator decision.**

## 2. The question this decision answers

Two reasonable questions led to this record:

1. Why not use PAD alone?
2. Why not use Power Automate Cloud alone?

Both are technically possible in limited forms. Neither, by itself, provides the complete one-click, full-detail, secure and recoverable workflow required by the project.

## 3. What DriveArabia requires today

The DriveArabia model-year page contains two different kinds of useful information:

1. **Commercial trim prices** under the final **Original Trim Prices** or **Trim Prices** section.
2. **Vehicle specifications** distributed across the selected/default page data and dynamically rendered specification accordion groups.

The important complication is that specification groups are not all permanently present in the static page DOM. DriveArabia mounts and unmounts accordion content dynamically. A raw HTTP response can therefore contain prices or one default configuration while still omitting the specification evidence needed for another trim.

The proven PAD capture performs these operations:

1. Launches Chrome at the correlated model-year URL.
2. Lets DriveArabia redirect to its canonical route.
3. Executes the page's JavaScript in a real browser session.
4. Opens every specification accordion.
5. Reads each rendered configuration and text group.
6. Serializes those groups into the `vpi-pad-spec-groups` JSON marker.
7. Captures the final `document.documentElement.outerHTML`.
8. Uploads the capture to Azure `ingest_html`.
9. Returns `StatusCode=202` and the generated `InboxId`.

The application then uses fixture-tested parsers to match one requested commercial trim to one unique specification group. It does not guess when the page contains no unique mechanical match.

## 4. Why PAD alone is not sufficient for one-click automation

PAD is fully capable of the browser work. The existing attended workflow proves that. The limitation is how a Power Pages button reaches a local Windows process.

Power Pages runs in a browser and PAD runs on a registered Windows machine. Without an orchestration bridge, the portal cannot reliably:

- start a particular desktop flow on the intended machine;
- pass the correlated `DriveArabiaUrl` input;
- queue work while the machine is busy;
- choose attended or unattended run mode;
- receive the desktop flow's output variables;
- associate the returned `InboxId` with the prepared Scrape Run;
- enforce the Power Pages administrator web role at the trigger boundary;
- distinguish a completed run from a local application launch that never executed.

### 4.1 Current PAD-only workflow

```text
Admin clicks Scrape
  → app prepares Run and shows correlated URL
  → admin copies URL
  → admin opens/runs PAD
  → PAD uploads capture
  → admin returns to the MVR
  → admin clicks Process PAD Capture
```

This is a safe rollback path, but it is not the intended final experience.

### 4.2 PAD run URL or desktop shortcut

Microsoft supports PAD run URLs and desktop shortcuts. They can be invoked from a browser or Windows, and optional parameters can be supplied. However, Power Automate prompts for confirmation by default, input variables can still require interaction, PAD must already be installed locally, and the mechanism does not provide the authenticated server-side job/result boundary required here.

This option can shorten the attended workflow but does not provide reliable unattended orchestration or a structured `InboxId` response to the portal.

Reference: <https://learn.microsoft.com/power-automate/desktop-flows/run-desktop-flows-url-shortcuts>

### 4.3 Always-running PAD polling worker

PAD could continuously poll Azure or Dataverse for queued jobs. This avoids a cloud-flow trigger, but creates a custom worker system:

- PAD must remain running indefinitely.
- The Windows machine must remain online and healthy.
- Polling introduces delay and unnecessary traffic.
- Credentials and queue access must be managed on the machine.
- Locking, duplicate claims and abandoned jobs become application responsibilities.
- Restart recovery, concurrency and backoff need custom implementation.
- Monitoring is weaker than Power Automate's native run history.

This is possible, but it is more operationally complex than using the supported cloud-to-desktop connector.

## 5. Why Power Automate Cloud alone is not sufficient

Power Automate Cloud can make HTTP requests and coordinate connectors, but it is not itself a general-purpose Chrome session.

A cloud HTTP action does not reproduce the proven PAD behavior:

- it does not launch the same interactive Chrome session;
- it does not render the page as a browser user;
- it does not automatically execute the full client-side application lifecycle;
- it does not click or expand DriveArabia accordion controls;
- it does not preserve all temporarily mounted DOM groups;
- it does not run the existing `vpi-pad-spec-groups` capture script in the page;
- it uses cloud egress and a different browser/network fingerprint rather than the tested machine session.

For DriveArabia, an HTTP-only response may still provide some prices or the selected/default trim's structured data. That is not enough for the project requirement to capture the relevant prices and supported specifications for the requested trim.

This is the key distinction:

```text
HTTP success does not guarantee evidence completeness.
```

Returning status `200` with incomplete trim data would be more dangerous than returning a visible failure because the record could look successfully scraped while carrying the wrong or partial specifications.

PAD officially supports launching supported browsers, interacting with web elements and running JavaScript functions on pages. Those are the capabilities the current DriveArabia capture relies on.

References:

- <https://learn.microsoft.com/power-automate/desktop-flows/automation-web>
- <https://learn.microsoft.com/power-automate/desktop-flows/actions-reference/webautomation>

## 6. Why YallaMotor can use cloud transport while DriveArabia still needs PAD

The sources do not expose information in the same way.

### YallaMotor

- The required listing prices and supported details are available through retrievable HTML/JSON-LD.
- The Azure `cloudscraper` transport has been proven against real pages.
- The application parser can normalize that response without rendering interactive accordion groups.
- Power Automate Cloud remains an automatic fallback.

### DriveArabia

- The price table and specification evidence have different rendering behavior.
- One default configuration can appear in structured data while other specification groups are dynamically mounted.
- Complete multi-trim evidence requires executing browser JavaScript and preserving those groups.
- The PAD capture and marker are already fixture-tested and live-proven.

The architecture is source-aware because forcing every source through one transport would reduce accuracy.

## 7. Why Cloud + PAD is the selected architecture

Power Automate provides an official action named **Run a flow built with Power Automate for desktop**. A cloud flow can pass input variables into PAD and receive output variables afterward. It requires a registered machine or machine group and a desktop-flow connection.

Reference: <https://learn.microsoft.com/power-automate/desktop-flows/trigger-desktop-flows>

The selected Phase 7A flow is:

```text
1. Administrator clicks Scrape in Power Pages.
2. Application creates the shared Run and queued Source Results.
3. YallaMotor starts through its existing cloud path.
4. Adding the DriveArabia/Queued Source Result triggers a solution-aware Dataverse cloud flow.
5. The flow marks that exact row Running and passes its correlated Source URL to PAD.
6. Trigger concurrency one serializes work for the attended desktop session.
7. PAD launches Chrome, expands specs, captures HTML and uploads to Azure.
8. PAD outputs InboxId and StatusCode.
9. Cloud flow writes those values back to the same Source Result.
10. Application polls that exact row and retrieves that exact InboxId.
11. Existing parser and evidence writers complete the prepared DriveArabia result.
12. Shared Run aggregation calculates the terminal outcome.
```

The cloud flow is an orchestration boundary, not an extraction boundary. DriveArabia parsing remains in the tested TypeScript parser rather than being duplicated in PAD or cloud-flow expressions.

## 8. Why Dataverse now invokes the cloud flow

A public Power Automate HTTP trigger contains a signed URL. Placing that URL in a `VITE_*` variable would ship it inside the public JavaScript bundle. Authentication by URL secrecy is therefore unsuitable for an administrator operation. The role-protected Power Pages site-associated endpoint was also live-proven to fail with HTTP 500 before creating a flow run.

The selected replacement uses the durable Dataverse job row already created by the application:

```text
Vehicle Scrape Source Result added
  where vpi_source = 2 and vpi_processingstatus = 1
  → automated cloud flow
```

The SPA holds no callback secret and performs no second dispatch call. The flow's Dataverse and Desktop flows connections remain solution-managed server-side resources. The Source Result provides durable job identity, URL, attempt, status, timing, Inbox ID and diagnostics.

For this project:

- restrict the administrator UI and Source Result creation permissions through normal Power Pages/Dataverse security;
- use solution connection references and a least-privilege Dataverse connection for the automated flow;
- serialize the attended Desktop flows connector at concurrency one;
- keep the Azure `ingest_html` function key inside PAD only;
- keep source HTML transient and out of Dataverse.

The earlier Power Pages-associated flow remains under the documented Authenticated Users development exception only as a rollback artifact. It is no longer called by unified scraping and should be removed from the site after Dataverse-triggered live acceptance. The temporary HTTP-trigger diagnostic must likewise be disabled or deleted after evidence capture.

References:

- <https://learn.microsoft.com/power-automate/dataverse/create-update-delete-trigger>
- <https://learn.microsoft.com/power-automate/desktop-flows/trigger-desktop-flows>

## 9. Responsibilities by component

| Component | Owns | Must not own |
|---|---|---|
| Power Pages application | Admin selection, Run preparation, durable job creation, exact receipt polling/Inbox processing, UI feedback | Desktop credentials, ingest function key, browser scraping |
| Power Automate Cloud | Authorization boundary, machine dispatch, input/output handoff, run history | DriveArabia parsing, trim guessing, master-data decisions |
| Power Automate Desktop | Chrome navigation, rendered DOM preparation, capture, Azure upload | Dataverse price decisions, cross-source aggregation |
| Azure inbox | Temporary HTML and capture metadata | Permanent business evidence or administrator decisions |
| Application parser | Price extraction, exact/conservative trim matching, normalization | Browser navigation or machine orchestration |
| Dataverse | Runs, Source Results, decisions, promoted master vehicle | Raw transient HTML |

## 10. Failure and rollback behavior

Automation is additive. It does not remove the proven attended path.

| Failure | Expected behavior |
|---|---|
| Cloud flow ID not configured | Show correlated PAD URL and use attended workflow |
| User lacks assigned web role | Power Pages invocation returns Forbidden; Run remains recoverable |
| Machine unavailable or busy | Cloud flow records failure/queue state; attended URL remains available |
| PAD fails before upload | No Inbox ID is returned; DriveArabia source remains incomplete and diagnosable |
| Azure upload is not `202` | Flow response is rejected; no arbitrary inbox item is processed |
| Inbox ID missing | Application refuses automatic processing |
| Exact capture cannot match MVR/Run | Capture remains Pending for safe retry where correlation rules require it |
| Evidence write fails | Existing warning/retry behavior remains; unrelated captures are not consumed |

The application processes the exact `InboxId` returned by PAD. It does not use the oldest shared queue item for the automatic handoff.

## 11. Attended and unattended operation

Cloud-triggered PAD can run in attended or unattended mode.

### Attended cloud-triggered run

- The machine is registered and available.
- The user session is active.
- The cloud flow starts PAD without manual URL copying or pressing Run.
- Appropriate Power Automate Premium licensing is required for the connection owner.

This is sufficient for the first one-click acceptance test.

### Unattended run

- Power Automate can create/use the required Windows session without human supervision.
- The target machine needs the appropriate unattended entitlement, such as allocated Process capacity under current licensing.
- Machine credentials, environment assignment and desktop-flow connection must be configured correctly.

Licensing changes over time, so current Microsoft documentation and the tenant's license page must be checked before purchase or rollout.

References:

- <https://learn.microsoft.com/power-automate/desktop-flows/trigger-desktop-flows>
- <https://learn.microsoft.com/troubleshoot/power-platform/power-automate/desktop-flows/desktop-flow-run-time-license-check>
- <https://learn.microsoft.com/power-platform/admin/power-automate-licensing/add-ons>

## 12. Alternatives considered

| Option | Completeness | One-click | Security/operations | Decision |
|---|---:|---:|---|---|
| Manual PAD | High | No | Simple but labor-intensive | Retain as rollback |
| PAD run URL/shortcut | High | Partly | Local prompt/session limitations; weak result handoff | Not the production trigger |
| Always-running PAD polling worker | High | Yes | Custom queue locking, credentials, recovery and monitoring | Deferred/not preferred |
| Power Automate Cloud HTTP only | Potentially incomplete | Yes | Simple, but cannot reproduce rendered multi-trim capture | Rejected for current page shape |
| Power Automate Cloud + PAD | High | Yes | Supported machine dispatch and structured outputs | Selected |
| Cloud-hosted browser/Playwright | Potentially high | Yes | New browser service, anti-bot/IP risk, hosting cost and maintenance | Reconsider only with a proven transport |
| Stable first-party DriveArabia API | High if complete | Yes | Best future option if legitimate and reliable | Investigate if discovered |

## 13. When PAD can be removed

PAD should be reconsidered only if at least one of these becomes true:

1. DriveArabia exposes a stable, permitted API containing every required trim price and specification.
2. The server-delivered HTML consistently includes all required specification groups without browser interaction.
3. A cloud-hosted browser transport passes live anti-bot tests, preserves complete evidence and proves reliable over time.
4. Product requirements are reduced to data that an HTTP-only response can safely supply.

Any replacement must pass the same acceptance gate as PAD:

- exact make/model/year/trim identity;
- correct price row;
- correct trim-specific specifications;
- no cross-trim contamination;
- source provenance retained;
- normalized Source Result stored in the prepared shared Run;
- repeatable live success, not a single probe.

Until then, removing PAD would trade a visible operational step for silent evidence incompleteness.

## 14. Current implementation position

Phase 7A Dataverse dispatch and exact-correlation completion are deployed and live-accepted:

- `multiSourceOrchestrator.ts` writes the correlated PAD URL onto the queued DriveArabia Source Result before creation.
- `multiSourceScrapeExecution.ts` no longer invokes the Power Pages endpoint or waits for a cache-sensitive Dataverse receipt; it polls Azure by exact Run correlation plus attempt, validates the returned capture identity, and processes only its Inbox ID.
- `multiSourceScraper.ts` can retrieve and process one exact inbox item.
- The admin dialog reports automatic completion or presents the attended fallback.
- Focused tests cover trigger security shape, response validation, exact capture selection and orchestration.

Live configuration and acceptance status:

1. PAD exposes `InboxId` and `StatusCode`; manual cloud-flow execution returned Inbox `087ae330a1ef` and status `202`.
2. The solution-aware cloud flow, registered machine, authorized Desktop flows connection and Power Pages site registration are configured.
3. Production resolves the registration from the `VPI/DriveArabiaCloudFlowId` site setting; the Vite value is only a development fallback.
4. Exact manual recovery is deployed and live-proven: the MG 5 capture updated its intended MVR, completed Run and succeeded Source Result without consuming an older Captiva item.
5. A minimal response-only flow and the production flow both fail at the Power Pages endpoint with HTTP `500` before any cloud-flow run exists. That path is retained only as diagnostic history; unified scraping no longer depends on it.
6. The old site-associated Power Pages flow registration and its temporary Authenticated Users development exception are no longer part of the active scrape path. They must not be redeployed as production prerequisites; administrator access is enforced at the portal operation and Dataverse permission boundaries.
7. On 2026-08-31, a temporary HTTP-triggered copy proved the downstream boundary independently: an application-prepared correlation launched attended PAD, uploaded Inbox `e9fa983b3483` with status `202`, and completed the exact prepared Source Result and parent Run.
8. The direct HTTP test used asynchronous response because a synchronous Postman Cloud Agent request disconnected after 30 seconds even though PAD completed. Durable completion must not depend on keeping one browser request open.
9. The HTTP callback URL is a signed credential and the test trigger was temporarily accessible to **Anyone**. This is diagnostic evidence, not an approved replacement for the role-protected production boundary, and the URL must never be embedded in the SPA.
10. The automated Dataverse flow is configured for added DriveArabia/Queued rows, concurrency one, Running state, attended PAD, durable Inbox/status receipt, and a parallel Failed-state handler. Focused application verification and deployment are complete.
11. The 2026-09-01 live MVR test proved automatic Dataverse dispatch and durable receipt persistence: PAD returned Inbox `03df3cede18b`/HTTP `202`, and the exact Source Result stored those values. Manual exact-Inbox processing completed that result successfully.
12. Automatic browser completion is accepted. Audi RS 7 and Volkswagen PASSAT CC tests proved that browser cache controls, Dataverse change tracking and a Power Pages cache reset cannot make workflow-written receipts reliably immediate, so the implementation polls the Azure Inbox by exact Run correlation plus attempt and treats Dataverse receipt fields as audit only. The Azure Function and portal were deployed, and fresh Nissan Patrol `SE Titanium` and `LE Titanium+` runs completed automatically with prices and specifications.

Background completion after the portal closes remains a separate Phase 7B responsibility. An interrupted interactive handoff leaves the Azure capture recoverable through the existing record-scoped action. With the portal open, the accepted Phase 7A path is one authenticated administrator click with no manual URL copy, Postman request, Inbox ID entry, or **Process PAD Capture** step.
