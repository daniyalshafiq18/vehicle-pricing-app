# Power Automate Cloud Flow — Step-by-Step Build Guide

> **Date:** 2026-07-27 (Updated — All flows renamed; Flow 4 added: customer email notification on scrape completion)
> **Status:** Flow 1 ✅ Built, Modified & Re-Tested | Flow 2 ✅ Built & Tested | Flow 3 ✅ Built, Tested & End-to-End Verified | Flow 4 ✅ Built, Tested & Verified
> **Platform:** https://make.powerautomate.com
> **Connectors needed:** HTTP (premium), Microsoft Dataverse, Office 365 Outlook (optional)

---

## Status Summary

| Flow | Name | Status | Notes |
|---|---|---|---|
| **Flow 1** | `MVR - Connectivity Test` | ✅ **Built, Modified & Re-Tested** | Confirmed full listing record extraction (price, specs, dealer). Heading extraction confirmed for aggregate pricing. |
| **Flow 2** | `MVR - Automated Scraper` | ✅ **Built & Tested** | See full design below. YallaMotor backend was down during initial tests — not a Cloudflare issue. |
| **Flow 3** | `MVR - On-Demand Scraper` | ✅ **Built, Tested & Verified** | Headers confirmed complete (Cloudflare 403 resolved). End-to-end test with Mercedes Benz C-Class C 300 verified correct data in Dataverse. **Deep scrape added** (Jul 28): extracts Body Type, Fuel Type, Transmission, Drive Type, Cylinders, Engine Size, Doors, Seats, Mileage from listing detail page via JSON-LD. Returns all specs in response alongside pricing. |
| **Flow 4** | `MVR - Customer Email Notification` | ✅ **Built, Tested & Verified** | Sends email to the requesting user when scrape completes successfully. Dynamic content resolved, HTML link clickable. |

### Key Findings from Flow 1 Test (Original + Modified)

| Finding | Detail |
|---|---|
| **YallaMotor accessible?** | ⚠️ **Yes when healthy — but backend outage on 2026-07-15** | 
| **Cloudflare blocking?** | ❌ No — Cloudflare did NOT block the Power Automate HTTP request. The 2026-07-15 test failures were caused by YallaMotor's own Next.js backend being down (`Backend fetch failed`), not Cloudflare |
| **Cloudflare false positives?** | ✅ Fixed — removed 3 body-content checks that incorrectly flagged normal content |
| **InvalidTemplate error?** | ✅ Fixed — removed non-existent text_2/text_3 trigger inputs |
| **Page title** | `Used Toyota Camry for Sale in UAE — From AED 120` |
| **BDI Price extracted** | ✅ **42,900 AED** — via `<bdi class="tabular-nums" dir="ltr">` extraction |
| **Full listing record extracted** | ✅ Complete article card: 166,000 KM, Petrol, Automatic, GCC Specs, Sharjah, **Al Aram Used Cars** |
| **Heading pattern confirmed** | `15 listings · AED 30,000 – 110,000 · 2022–2022` from `<div class="heading-h2-content">` |
| **JSON-LD available?** | ✅ Yes — `<script type="application/ld+json">` blocks present in HTML |
| **YallaMotor architecture** | Next.js (server-side rendered) — HTML contains full listing data |
| **Why it works (vs Puppeteer failure)** | Power Automate HTTP requests come from Microsoft datacenter IPs which are not blocked. Previous Puppeteer scraper on Railway/Render used datacenter IPs that YallaMotor's Cloudflare flagged. |
| **⚠️ 2026-07-15 finding** | During retesting, YallaMotor returned `Backend fetch failed` (Next.js outage). Both Flow 1 and 2 failed because YallaMotor's own servers were down. Once YallaMotor recovers, both flows should work. |

### ⚠️ Practical Learnings

1. **Manual trigger input names** — Power Automate uses generic keys (`text`, `text_1`) instead of the display names you set. Access values as `triggerBody()['text']` and `triggerBody()['text_1']`, NOT `triggerBody()['Make']` or `triggerBody()['Model']`.
2. **Simplified Cloudflare detection** — Only 2 checks are sufficient: (a) title contains "Just a moment" OR (b) status code != 200. The other Cloudflare signatures are redundant.
3. **JSON-LD is the parsing target** — YallaMotor embeds structured listing data in `<script type="application/ld+json">` blocks within the HTML. Use Power Automate's `json()` function to parse these directly rather than HTML DOM parsing.
4. **MVR column schema** — Only these scrape-related columns exist: `vpi_scrapestatus`, `vpi_scraped_listings`, `vpi_scraped_minprice`, `vpi_scraped_maxprice`, `vpi_scraped_sources`.

---

## FLOW 1: MVR - Connectivity Test (Instant / Manual Trigger)

**Purpose:** Test if YallaMotor responds to HTTP requests from the Microsoft cloud.

### Create the Flow

1. Go to https://make.powerautomate.com
2. Click **Create** → **Instant cloud flow**
3. Flow name: `MVR - Test YallaMotor Accessibility`
4. Trigger: **Manually trigger a flow**
5. Click **Create**

### Add Input Fields

6. Click **Manually trigger a flow** → **Add an input** → **Text**
   - Input name: `Make`
   - ⚠️ Power Automate stores this as `text` in the trigger body. Reference it as `triggerBody()['text']`.
7. Click **Add an input** → **Text**
   - Input name: `Model`
   - ⚠️ Power Automate stores this as `text_1`. Reference it as `triggerBody()['text_1']`.

### Step 2: Initialize Variable — TestedURL

8. Click **+ New step** → search "Initialize variable"
9. Name: `Initialize TestedURL`
10. Configure:
    - Name: `TestedURL`
    - Type: **String**
    - Value: click inside → **Expression** tab → paste:
      ```
      concat('https://uae.yallamotor.com/used-cars/', toLower(triggerBody()['text']), '/', toLower(triggerBody()['text_1']))
      ```

### Step 3: Initialize Variable — IsAccessible

11. Click **+ New step** → **Initialize variable**
12. Configure:
    - Name: `IsAccessible`
    - Type: **Boolean**
    - Value: `false`

### Step 4: Initialize Variable — ErrorMessage

13. Click **+ New step** → **Initialize variable**
14. Configure:
    - Name: `ErrorMessage`
    - Type: **String**
    - Value: (leave empty)

### Step 5: HTTP Request to YallaMotor

15. Click **+ New step** → search "HTTP" → select **HTTP** (premium connector, icon has a globe)
16. Configure:
    - Method: **GET**
    - URI: click inside → **Expression** tab → `variables('TestedURL')`
    - Headers: click inside → paste this exact JSON:
      ```json
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Google Chrome\";v=\"128\", \"Not;A=Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\""
      }
      ```
17. Click **...** (settings) on the HTTP step → **Retry Policy** → **Default**

### Step 6: Compose — Extract Page Title

18. Click **+ New step** → search "Compose"
19. Name: `Extract Page Title`
20. Input: click inside → **Expression** tab → paste:
    ```
    if(contains(body('HTTP'), '<title>'), first(split(first(skip(split(body('HTTP'), '<title>'), 1)), '</title>')), 'No title found')
    ```

### Step 7: Compose — Check HTTP Status Code

21. Click **+ New step** → **Compose**
22. Name: `HTTP Status Code`
23. Input: click inside → **Expression** → `outputs('HTTP')['statusCode']`

### Step 8: Compose — Extract Price from `<bdi>` DOM Element

24. Click **+ New step** → **Compose**
25. Name: `Extract BDI Price`
26. Input: click inside → **Expression** tab → paste:
    ```
    if(contains(body('HTTP'), '<bdi class="tabular-nums" dir="ltr">'), trim(first(split(first(skip(split(body('HTTP'), '<bdi class="tabular-nums" dir="ltr">'), 1)), '</bdi>'))), 'No bdi price found')
    ```

    **How this works:**
    - `split(body('HTTP'), '<bdi class="tabular-nums" dir="ltr">')` — splits the HTML at the opening tag
    - `skip(..., 1)` — takes everything after the first split (i.e. the part that contains the price)
    - `first(...)` — gets the first match
    - `split(..., '</bdi>')` — splits at the closing tag
    - `first(...)` — takes what's before `</bdi>` → that's `42,900`
    - `trim(...)` — removes whitespace
    - `if(contains(...), ..., 'No bdi price found')` — handles the case where the tag doesn't exist

### Step 9: Find the Listing Card Container (4-step pipeline)

27. Click **+ New step** → **Compose**
28. Name: `Find BDI Position`
29. Input: click **Expression** → paste:
    ```
    indexOf(body('HTTP'), '<bdi class="tabular-nums" dir="ltr">')
    ```

30. Click **+ New step** → **Compose**
31. Name: `Find Article Start`
32. Input: click **Expression** → paste:
    ```
    lastIndexOf(substring(body('HTTP'), 0, outputs('Find_BDI_Position')), '<article')
    ```

33. Click **+ New step** → **Compose**
34. Name: `Find Article End`
35. Input: click **Expression** → paste:
    ```
    indexOf(body('HTTP'), '</article>')
    ```

36. Click **+ New step** → **Compose**
37. Name: `Extract Full Listing Record`
38. Input: click **Expression** → paste:
    ```
    if(and(and(greater(outputs('Find_BDI_Position'), 0), greater(outputs('Find_Article_Start'), 0)), greater(outputs('Find_Article_End'), 0)),
      substring(body('HTTP'), outputs('Find_Article_Start'), sub(add(outputs('Find_Article_End'), 10), outputs('Find_Article_Start'))),
      'Could not find <article> container around the price')
    ```

    **How this works (4-step pipeline):**
    1. `Find BDI Position` — finds where `42,900` sits in the HTML
    2. `Find Article Start` — looks backwards from that position for the nearest `<article` tag (the start of the listing card)
    3. `Find Article End` — looks forward for the closing `</article>` tag
    4. `Extract Full Listing Record` — extracts the raw HTML between them — the **entire vehicle record** with title, price, mileage, year, specs, and link

### Step 10: Condition — Check if Cloudflare Blocked

39. Click **+ New step** → **Condition**
40. Name: `Check if YallaMotor is Accessible`
41. Configure the condition:

    **OR** — add multiple rows:
    
    Row 1:
    - Left: click inside → **Expression**: `outputs('Extract_Page_Title')`
    - Operator: `contains`
    - Right: `Just a moment`
    
    Click **Add** → **Add row**:
    - Left: `outputs('Extract_Page_Title')`
    - Operator: `contains`
    - Right: `Attention Required`
    
    Click **Add** → **Add row**:
    - Left: click → **Expression**: `body('HTTP')`
    - Operator: `contains`
    - Right: `cdn-cgi/challenge-platform`
    
    Click **Add** → **Add row**:
    - Left: `body('HTTP')`
    - Operator: `contains`
    - Right: `cf_chl_opt`
    
    Click **Add** → **Add row**:
    - Left: `body('HTTP')`
    - Operator: `contains`
    - Right: `Checking your browser`
    
    Click **Add** → **Add row**:
    - Left: `outputs('HTTP_Status_Code')`
    - Operator: `not equals`
    - Right: `200`

### Step 11: If Blocked (True branch)

42. In the **If yes** branch, click **Add an action**:
    - Search **Set variable**
    - Name: `Set IsAccessible to false`
    - Name: `IsAccessible`
    - Value: `false`

43. Click **Add an action** (still in True branch):
    - Search **Set variable**
    - Name: `Set ErrorMessage`
    - Name: `ErrorMessage`
    - Value: click **Expression**:
      ```
      concat('Blocked. Status: ', outputs('HTTP_Status_Code'), '. Page title: ', outputs('Extract_Page_Title'))
      ```

### Step 12: If Not Blocked (False branch)

44. In the **If no** branch, click **Add an action**:
    - Search **Set variable**
    - Name: `Set IsAccessible to true`
    - Name: `IsAccessible`
    - Value: `true`

### Step 13: Send Email Notification (Optional)

45. After the Cloudflare condition ends, click **+ New step** → **Send an email (V2)** (Office 365 Outlook)
46. Configure:
    - To: `[your email address]`
    - Subject: click **Expression**:
      ```
      concat('YallaMotor Test: ', if(variables('IsAccessible'), '✅ Accessible', '❌ Blocked'), ' — ', triggerBody()['text'], ' ', triggerBody()['text_1'])
      ```
    - Body: switch to **HTML** mode → paste:
      ```html
      <h2>YallaMotor Accessibility Test</h2>
      <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><td><b>Make/Model</b></td><td>@{triggerBody()['text']} @{triggerBody()['text_1']}</td></tr>
      <tr><td><b>URL Tested</b></td><td>@{variables('TestedURL')}</td></tr>
      <tr><td><b>Accessible</b></td><td>@{variables('IsAccessible')}</td></tr>
      <tr><td><b>Page Title</b></td><td>@{outputs('Extract_Page_Title')}</td></tr>
      <tr><td><b>HTTP Status</b></td><td>@{outputs('HTTP_Status_Code')}</td></tr>
      <tr><td><b>💰 BDI Price</b></td><td>@{outputs('Extract_BDI_Price')}</td></tr>
      <tr><td><b>Error</b></td><td>@{variables('ErrorMessage')}</td></tr>
      </table>
      <hr/>
      <h3>🚗 Full Vehicle Record (from DOM)</h3>
      <pre style="background:#f5f5f5;padding:10px;word-wrap:break-word;white-space:pre-wrap;font-size:12px;">@{outputs('Extract_Full_Listing_Record')}</pre>
      <hr/>
      <p><b>First 2000 chars of response:</b></p>
      <pre style="background:#f5f5f5;padding:10px;word-wrap:break-word;white-space:pre-wrap">@{substring(body('HTTP'), 0, min(2000, length(body('HTTP'))))}</pre>
      ```

### Save and Test

47. Click **Save** (top-left)
48. Click **Test** → **Manually** → **Run**
49. Enter: Make = `Toyota`, Model = `Camry`, Year = `2025`

### ✅ Actual Test Result — Original (2026-07-13)

```
HTTP 200 — ✅ Accessible = True
Page Title: "Used Toyota Camry for Sale in UAE — From AED 120"
JSON-LD: Present in HTML
```

### ✅ Actual Test Result — Modified Flow (2026-07-15)

After the DOM extraction enhancements and Cloudflare fix, the flow was re-tested with **Toyota Camry** and returned the following email output:

```
YallaMotor Test: ✅ Accessible — Toyota Camry

YallaMotor Accessibility Test
┌──────────────────────────┬──────────────────────────────────────────────────┐
│ Make/Model               │ Toyota Camry                                     │
│ URL Tested               │ https://uae.yallamotor.com/used-cars/toyota/camry│
│ Accessible               │ True                                             │
│ Page Title               │ Used Toyota Camry for Sale in UAE — From AED 120 │
│ HTTP Status              │ 200                                              │
│ 💰 BDI Price             │ 42,900                                           │
│ Error                    │ (empty — no errors)                              │
└──────────────────────────┴──────────────────────────────────────────────────┘

🚗 Full Vehicle Record (from DOM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[/used-cars/toyota/camry/2019/used-toyota-camry-2019-sharjah-2083869]
Used Toyota Camry 2.5 S 2019
💰 Price: 42,900 AED — "Fair Deal" badge
💳 Installment: 626 AED/month

📋 Specifications:
  • Year: 2019
  • Mileage: 166,000 KM
  • Fuel type: Petrol
  • Transmission: Automatic
  • Regional specs: GCC Specs
  • Location: Sharjah

🏪 Dealer: Al Aram Used Cars (Ref#967)
  • Address: Sharjah - Souq Al Haraj
  • Showroom: Main Branch 34, Branch 2: 357, Branch 3: 332
  • Hours: Sat-Thu 9:00 AM - 9:00 PM, Friday 4:00 PM - 9:00 PM
  • Website: www.alaramcars.com
  • Instagram: alaramcars | Facebook: alaramusedcars | TikTok: alaramcars
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Status Summary:
  • Cloudflare detection: No false positives (correctly identified as accessible)
  • InvalidTemplate error: Fixed (no more text_2/text_3 references)
  • BDI price extraction: Working (42,900 AED)
  • Full listing extraction: Working (complete article card with specs + dealer)
  • Heading pattern confirmed: "15 listings · AED 30,000 – 110,000 · 2022–2022"
```

---

## FLOW 2: MVR - Automated Scraper (Dataverse Trigger)

**Purpose:** When a user submits a Missing Vehicle Request, automatically scrape YallaMotor and save aggregate price results (min, max, listing count) back to the MVR record.

**Key Design Decisions (from Flow 1 learnings):**

| Decision | Why |
|---|---|
| Extract **heading** (`<div class="heading-h2-content">`) for aggregate data | The heading gives count + min + max in one line — no need to parse individual cards |
| URL includes **year filter** (`yr_{year}_{year}`) | Narrows results to the user's vehicle year — more accurate pricing |
| Simplified **Cloudflare check** (title + status only) | Body-content checks caused false positives in Flow 1 |
| JSON-LD retained as **fallback** only | Already confirmed present in HTML, but heading is simpler |
| Fuel/transmission URL filters **optional** | Choice field mapping in Dataverse triggers needs special handling |

### Create the Flow

1. Go to https://make.powerautomate.com
2. Click **Create** → **Automated cloud flow**
3. Flow name: `MVR - Scrape YallaMotor (Automated)`
4. Search and select trigger: **When a row is added, modified or deleted** (Dataverse)
5. Click **Create**

### Configure Trigger

6. Click the trigger step → configure:
    - Change type: **Added**
    - Table name: search → **Missing Vehicle Requests**
    - Scope: **Organization**

### Step 2: 🔍 Debug — Inspect Trigger Output (First Run Only)

> ⚠️ **Important:** On the first run, the `triggerOutputs()?['body/xxx']` field names need to match Dataverse. Add this debug step, run the flow, then **remove it**.

7. Click **+ New step** → **Compose**
8. Name: `Debug — Trigger Outputs`
9. Input: click → **Expression**: `triggerOutputs()`

**After first run:** Open the run history → expand this step → copy the JSON. Find the record ID field (e.g., `vpi_missingvehiclerequestsid`). Update all `triggerOutputs()?['body/xxx']` expressions to match the **exact casing**. Delete this debug step before production.

### Step 3: Initialize Variable — ResponseBody

10. Click **+ New step** → **Initialize variable**
11. Configure:
    - Name: `ResponseBody`
    - Type: **String**
    - Value: (leave empty)

### Step 4: Initialize Variable — IsAccessible

12. Click **+ New step** → **Initialize variable**
13. Configure:
    - Name: `IsAccessible`
    - Type: **Boolean**
    - Value: `false`

### Step 5: Initialize Variable — ErrorMessage

11. Click **+ New step** → **Initialize variable**
12. Configure:
    - Name: `ErrorMessage`
    - Type: **String**
    - Value: (leave empty)

### Step 6: Initialize Variable — HeadingText

13. Click **+ New step** → **Initialize variable**
14. Configure:
    - Name: `HeadingText`
    - Type: **String**
    - Value: (leave empty)

### Step 7: Build Search URL (with Year Filter + Trim/Version + Hyphen Fix)

15. Click **+ New step** → **Compose**
16. Name: `Build Search URL`
17. Input: click **Expression** → paste:
    ```
    concat('https://uae.yallamotor.com/used-cars/', replace(replace(toLower(triggerOutputs()?['body/vpi_make']), ' ', '-'), '.', '-'), '/', replace(replace(toLower(triggerOutputs()?['body/vpi_model']), ' ', '-'), '.', '-'), '/vr_', replace(replace(replace(toLower(coalesce(triggerOutputs()?['body/vpi_trim'], triggerOutputs()?['body/vpi_version'], '')), ' ', '-'), '.', '-'), '/', '-'), '/yr_', triggerOutputs()?['body/vpi_modelyear'], '_', triggerOutputs()?['body/vpi_modelyear'])
    ```

    **Example outputs:**
    ```
    # Simple (no trim):
    https://uae.yallamotor.com/used-cars/toyota/camry/vr_/yr_2022_2022
    
    # Multi-word make + trim:
    https://uae.yallamotor.com/used-cars/mercedes-benz/c-class/vr_c-200/yr_2021_2021
    ```

    **⚠️ Slug rule:** Database stores "Mercedes Benz" (space), but YallaMotor URLs use "mercedes-benz" (hyphen). The `replace(' ', '-')` handles spaces. Periods also become hyphens — `2.4L` → `2-4l` — handled by the additional `replace('.', '-')`. **Do NOT** blindly replace all spaces in the raw value — only in the URL slug.

### Step 8: Update MVR → In Progress

18. Click **+ New step** → **Update a row** (Dataverse)
19. Configure:
    - Table name: **Missing Vehicle Requests**
    - Row ID: click → **Expression**: `triggerOutputs()?['body/vpi_missingvehiclerequestsid']`
    - Click **Add all columns** → set:
      - `vpi_scrapestatus`: enter `3` (In Progress)

### Step 9: HTTP Request to YallaMotor

20. Click **+ New step** → search **HTTP**
21. Configure:
    - Method: **GET**
    - URI: click → **Expression**: `outputs('Build_Search_URL')`
    - Headers: paste the same JSON headers from Flow 1 Step 5:
      ```json
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,...",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Referer": "https://www.google.com/"
      }
      ```

### Step 10: Store Response Body

22. Click **+ New step** → **Set variable**
23. Configure:
    - Name: `ResponseBody`
    - Value: click → **Expression**: `body('HTTP')`

### Step 11: Extract Page Title

24. Click **+ New step** → **Compose**
25. Name: `Extract Page Title`
26. Input: click → **Expression**:
    ```
    if(contains(body('HTTP'), '<title>'), first(split(first(skip(split(body('HTTP'), '<title>'), 1)), '</title>')), 'No title found')
    ```

### Step 12: Check HTTP Status Code

27. Click **+ New step** → **Compose**
28. Name: `HTTP Status Code`
29. Input: click → **Expression**: `outputs('HTTP')['statusCode']`

### Step 13: Simplified Cloudflare Check

30. Click **+ New step** → **Condition**
31. Name: `Cloudflare Check`
32. Add rows (**OR** — only 3 checks, no body-content checks):

| Left | Operator | Right |
|---|---|---|
| `outputs('Extract_Page_Title')` | contains | `Just a moment` |
| `outputs('Extract_Page_Title')` | contains | `Attention Required` |
| `outputs('HTTP_Status_Code')` | not equals | `200` |

### Step 14: If Blocked — Mark Unreachable and Stop

**In If yes (blocked):**

33. Click **Add an action** → **Set variable**
    - Name: `IsAccessible`
    - Value: `false`

34. Click **Add an action** → **Set variable**
    - Name: `ErrorMessage`
    - Value: click **Expression**:
      ```
      concat('Cloudflare blocked. Status: ', outputs('HTTP_Status_Code'), '. Title: ', outputs('Extract_Page_Title'))
      ```

35. Click **Add an action** → **Update a row** (Dataverse)
    - Table: **Missing Vehicle Requests**
    - Row ID: `triggerOutputs()?['body/vpi_missingvehiclerequestsid']`
    - Columns:
      - `vpi_scrapestatus`: `6` (Unreachable)
      - `vpi_scraped_listings`: `variables('ErrorMessage')`

36. Click **Add an action** → **Terminate**
    - Status: **Failed**
    - Reason: `YallaMotor not accessible`

### Step 15: If Accessible — Set Variable

**In If no (accessible):**

37. Click **Add an action** → **Set variable**
    - Name: `IsAccessible`
    - Value: `true`

### Step 16: Extract Heading — Aggregate Data (PRIMARY approach)

Place this **after** the Cloudflare condition ends. This is the primary extraction method. Only runs if accessible.

38. Click **+ New step** → **Compose**
39. Name: `Extract Heading`
40. Input: click **Expression** → paste:
    ```
    if(contains(variables('ResponseBody'), 'heading-h2-content'), trim(first(split(first(skip(split(variables('ResponseBody'), 'heading-h2-content'), 1)), '</div>'))), 'No heading found')
    ```

    **Example output:**
    ```
    15 listings · AED 30,000 – 110,000 · 2022–2022 · updated 14 July 2026
    ```

41. Click **+ New step** → **Set variable**
    - Name: `HeadingText`
    - Value: click → **Expression**: `outputs('Extract_Heading')`

### Step 17: Condition — Heading Found?

42. Click **+ New step** → **Condition**
43. Name: `Is Heading Available`
44. Row:
    - Left: `outputs('Extract_Heading')`
    - Operator: `is not equal to`
    - Right: `No heading found`

### Step 18: Parse Heading — Extract Prices (If yes — primary path)

**In If yes (heading found):**

45. Click **Add an action** → **Compose**
46. Name: `Extract After AED`
47. Input: click **Expression**:
    ```
    trim(first(skip(split(outputs('Extract_Heading'), 'AED '), 1)))
    ```
    → Captures: `30,000 – 110,000 · 2022–2022 · updated 14 July 2026`

48. Click **Add an action** → **Compose**
49. Name: `Extract Min Price`
50. Input: click **Expression**:
    ```
    trim(first(split(outputs('Extract_After_AED'), ' –')))
    ```
    → Captures: `30,000`

51. Click **Add an action** → **Compose**
52. Name: `Extract Max Price`
53. Input: click **Expression**:
    ```
    trim(first(split(first(skip(split(outputs('Extract_After_AED'), '– '), 1)), ' ·')))
    ```
    → Captures: `110,000`

54. Click **Add an action** → **Compose**
55. Name: `Extract Listing Count`
56. Input: click **Expression**:
    ```
    trim(first(split(outputs('Extract_Heading'), ' listings')))
    ```
    → Captures: `15`

57. Click **Add an action** → **Compose**
58. Name: `Build Scraped Listings JSON`
59. Input: click **Expression**:
    ```
    concat('{"count": ', outputs('Extract_Listing_Count'), ', "minPrice": ', outputs('Extract_Min_Price'), ', "maxPrice": ', outputs('Extract_Max_Price'), ', "source": "YallaMotor", "url": "', outputs('Build_Search_URL'), '", "heading": "', outputs('Extract_Heading'), '"}')
    ```
    → Produces: `{"count": 15, "minPrice": 30000, "maxPrice": 110000, "source": "YallaMotor", ...}`

### Step 19: Fallback — JSON-LD Parsing (If heading not found)

**In If no (no heading):**

60. Click **Add an action** → **Compose**
61. Name: `Fallback Check JSON LD`
62. Input: click **Expression**:
    ```
    if(contains(variables('ResponseBody'), '<script type="application/ld+json">'), 'jsonld-found', 'no-jsonld')
    ```

63. Click **Add an action** → **Condition**
64. Name: `JSON LD Fallback Available`
65. Row:
    - Left: `outputs('Fallback_Check_JSON_LD')`
    - Operator: `is equal to`
    - Right: `jsonld-found`

**In If yes (JSON-LD exists):**

66. Click **Add an action** → **Compose**
67. Name: `Fallback Parse First JSON-LD Block`
68. Input: click **Expression**:
    ```
    json(first(split(first(skip(split(variables('ResponseBody'), '<script type="application/ld+json">'), 1)), '</script>')))
    ```

69. Click **Add an action** → **Compose**
70. Name: `Fallback Extract Min Price from LD`
71. Input: click **Expression**:
    ```
    if(contains(outputs('Fallback_Parse_First_JSON_LD_Block'), 'offers'), if(contains(outputs('Fallback_Parse_First_JSON_LD_Block')['offers'], 'lowPrice'), outputs('Fallback_Parse_First_JSON_LD_Block')['offers']['lowPrice'], 0), 0)
    ```

72. Click **Add an action** → **Compose**
73. Name: `Fallback Extract Max Price from LD`
74. Input: click **Expression**:
    ```
    if(contains(outputs('Fallback_Parse_First_JSON_LD_Block'), 'offers'), if(contains(outputs('Fallback_Parse_First_JSON_LD_Block')['offers'], 'highPrice'), outputs('Fallback_Parse_First_JSON_LD_Block')['offers']['highPrice'], 0), 0)
    ```

**In If no (no JSON-LD either — last resort):**

75. Click **Add an action** → **Compose**
76. Name: `Fallback Extract First BDI Price`
77. Input: click **Expression**:
    ```
    if(contains(variables('ResponseBody'), '<bdi class="tabular-nums" dir="ltr">'), trim(first(split(first(skip(split(variables('ResponseBody'), '<bdi class="tabular-nums" dir="ltr">'), 1)), '</bdi>'))), '0')
    ```

### Step 20: Update MVR with Results

After both branches of the "Heading Available?" condition merge back:

78. Click **+ New step** → **Update a row** (Dataverse)
79. Configure:
    - Table: **Missing Vehicle Requests**
    - Row ID: `triggerOutputs()?['body/vpi_missingvehiclerequestsid']`
    - Columns:

| Field | Value (Expression) |
|---|---|
| `vpi_scrapestatus` | `4` (Scraped) |
| `vpi_scraped_listings` | (see below — use the multi-branch expression) |
| `vpi_scraped_minprice` | (see below — use the conditional expression) |
| `vpi_scraped_maxprice` | (see below — use the conditional expression) |
| `vpi_scraped_sources` | `outputs('Build_Search_URL')` |

    **For `vpi_scraped_listings`**, use the expression:
    ```
    if(equals(outputs('Extract_Heading'), 'No heading found'), 
      if(equals(outputs('Fallback_Check_JSON_LD'), 'jsonld-found'), 
        string(outputs('Fallback_Parse_First_JSON_LD_Block')), 
        concat('{"fallbackPrice": ', outputs('Fallback_Extract_First_BDI_Price'), '}')), 
      outputs('Build_Scraped_Listings_JSON'))
    ```

    **For `vpi_scraped_minprice`**, use:
    ```
    if(equals(outputs('Extract_Heading'), 'No heading found'), 
      outputs('Fallback_Extract_Min_Price_from_LD'), 
      outputs('Extract_Min_Price'))
    ```

    **For `vpi_scraped_maxprice`**, use:
    ```
    if(equals(outputs('Extract_Heading'), 'No heading found'), 
      outputs('Fallback_Extract_Max_Price_from_LD'), 
      outputs('Extract_Max_Price'))
    ```

### Save and Test

80. Click **Save** (top-left)
81. Go to Dataverse → create a new Missing Vehicle Request with:
    - Make: `Toyota`
    - Model: `Camry`
    - Model Year: `2022`
82. The flow triggers automatically within a few minutes
83. Check the MVR record → `vpi_scrapestatus` should show **Scraped** (4)

### ✅ Flow 2 Actual Test Result (2026-07-16)

**Test Input (via Missing Vehicle Request):**
| Field | Value |
|---|---|
| Make | Mercedes Benz |
| Model | C-Class |
| Trim | C 200 |
| Model Year | 2021 |
| Body Type | Regular Cab Chassis (Maybe) |
| Cylinders | 4 |
| Fuel Type | Hybrid (Maybe) |
| Transmission | Automatic |
| Drive Type | RWD |

**Scraped Results (saved to Dataverse MVR record) — with flawed URL:**

The first test used the **old URL builder** (no hyphen fix, no trim/version segment):

| Field | Value |
|---|---|
| **Scrape Status** | ✅ Scraped (4) |
| **Scraped Listings** | `{"count": ">294", "minPrice": "5,000", "maxPrice": "385,000", "source": "YallaMotor", "url": "https://uae.yallamotor.com/used-cars/mercedes benz/c-class/yr_2021_2021", "heading": ">294 listings · AED 5,000 – 385,000 · 2000–2027 · updated 15 July 2026"}` |
| **Scraped Min Price** | 5,000.00 |
| **Scraped Max Price** | 385,000.00 |
| **Scraped Sources** | `https://uae.yallamotor.com/used-cars/mercedes benz/c-class/yr_2021_2021` |

**Issues Found (1st test):**

| # | Issue | Detail | Fix |
|---|---|---|---|
| 1 | **Space in URL** | `mercedes benz` should be `mercedes-benz` → caused 404 when clicking Scraped Sources link | Add `replace(' ', '-')` to URL builder |
| 2 | **`>` prefix in count** | Heading `>294 listings` → count parsed as `>294` | Strip non-numeric prefix |
| 3 | **Year filter not narrowing** | Heading showed `2000–2027` — because the URL was **missing the trim/version segment** | Add `/vr_{trim-slug}` to URL |
| 4 | **Commas in prices** | `5,000` and `385,000` break numeric conversion | Add `replace(',', '')` |

### 🔑 Key Discovery — Version/Trim URL Segment

The user manually tested the **correct URL** on YallaMotor:

```
https://uae.yallamotor.com/used-cars/mercedes-benz/c-class/vr_c-200/yr_2021_2021
```

**Result with correct URL:**

| Field | Value |
|---|---|
| **Heading** | `7 listings · AED 95,000 – 145,000 · 2021–2021 · updated 16 July 2026` |
| **Page Title** | `Used Mercedes-Benz C-Class From Year 2021 - 2021 for Sale in UAE` |
| **Listings** | 7 |
| **Min Price** | 95,000 AED |
| **Max Price** | 145,000 AED |
| **Year Range** | ✅ Correct — 2021–2021 |

🎯 **The version/trim segment (`vr_c-200`) is essential** — without it, YallaMotor shows the aggregate for the entire model across all years. With it, the heading narrows precisely to the user's vehicle configuration.

### Corrected URL Pattern

```
https://uae.yallamotor.com/used-cars/{make-slug}/{model-slug}/vr_{version-slug}/yr_{year}_{year}
```

Where slugs are:
- **make-slug**: `replace(toLower(vpi_make), ' ', '-')` — "mercedes benz" → `mercedes-benz`
- **model-slug**: `replace(toLower(vpi_model), ' ', '-')` — "c class" → `c-class`
- **version-slug**: `replace(toLower(vpi_trim), ' ', '-')` — "c 200" → `c-200`
- **year-slug**: `yr_{year}_{year}` — "2021" → `yr_2021_2021`

**⚠️ Slug rule:** Database stores "Mercedes Benz" (space), but YallaMotor URLs use "mercedes-benz" (hyphen). The `replace(' ', '-')` handles spaces. Periods also become hyphens — `2.4L` → `2-4l` — handled by the additional `replace('.', '-')`. **Do NOT** blindly replace all spaces in the raw value — only in the URL slug.

### Visual Flow Summary

```
[User submits MVR]
    │
    ▼
[Dataverse trigger: MVR Added]
    │
    ▼
[vpi_scrapestatus → 3 (In Progress)]
    │
    ▼
[HTTP GET → uae.yallamotor.com/used-cars/toyota/camry/yr_2022_2022]
    │
    ├── Blocked? → Mark 6 (Unreachable) → Stop
    │
    └── Success →
           │
           ▼
         Extract heading:
         "15 listings · AED 30,000 – 110,000 · 2022–2022"
              │
         ┌────┴────┐
         ▼         ▼
    Heading    No heading
    found?     found?
      │           │
      ▼           ▼
  Parse      Fallback to
  min/max    JSON-LD or
  from       BDI price
  heading    extraction
      │           │
      └─────┬─────┘
            ▼
    Update MVR → vpi_scrapestatus=4 (Scraped)
                  vpi_scraped_minprice=30000
                  vpi_scraped_maxprice=110000
                  vpi_scraped_listings={...}
                  vpi_scraped_sources=URL

    ✅ Results in Dataverse → visible in app
```

### Planned Enhancements

| Enhancement | When |
|---|---|
| Add fuel type + transmission to URL | After verifying choice field label extraction in Dataverse triggers |
| Email notification to user | After admin approval flow is built |
| Dubizzle support | After YallaMotor flow is stable |

---

## FLOW 3: MVR - On-Demand Scraper (HTTP Trigger + SAS Token)

**Purpose:** When a user submits a missing vehicle request from the app, scrape YallaMotor **synchronously** and return results immediately so the user can see them and optionally suggest a price before the MVR record is created.

> ⚠️ **BUILD STATUS:** Flow 3 is fully built and tested. See "✅ Actual Test Results" below.

**Why this approach:**
- 🚀 **Instant** — no Dataverse polling delay (seconds vs minutes)
- 👤 **User sees results** — scraped prices shown before MVR is saved
- 💾 **Both prices stored** — `vpi_scraped_minprice/maxprice` = scraped, `vpi_minprice/maxprice` = user-suggested

### Key Design Decisions

| Decision | Why |
|---|---|
| **"Anyone can trigger" (SAS token)** | Avoids Azure AD OAuth — browser can't provide it. Setting generates a `sig=` token in the URL |
| **Try/Catch Scope pattern** | When YallaMotor is down or Cloudflare blocks, the Catch scope fires and returns Count: -1 instead of crashing |
| **Response in Catch Scope has hardcoded 0/0/-1** | Can't reference Try's action outputs when Catch fires — those actions failed/skipped. Hardcoded -1 is the sentinel for frontend |
| **Response at end of Try scope (not inside Catch)** | The main Response is inside Try scope, configured to run on success only. Catch has its own Response with hardcoded -1 |
| **Nested "Is Heading Available" condition** | Guards against missing heading-h2-content div. Extraction steps only run when heading is found |
| **Terminate (Succeeded) + Response in Cloudflare block branch** | When Cloudflare blocks, Terminate stops the flow engine but a subsequent Response action still sends the -1 payload |
| **Only 3 values in response** | `Min Price`, `Max Price`, `Count` — heading and URL are constructed client-side to keep response lightweight |
| **Count = -1 means unreachable** | Frontend checks `count < 0` → shows amber "Live Data Unavailable" message instead of error |
| **Frontend strips non-numeric chars from Count** | Power Automate Scope wrapping causes extra quotes (`"\"7"`) — frontend handles this robustly with regex |

### Data Flow

```
┌──────────────────┐     POST (fetch)       ┌──────────────────────────────────────────────┐
│  Step3Result.tsx │  ──────────────────→   │  Power Automate FLOW 3                       │
│                  │  {make, model,         │                                              │
│                  │   trim, year}          │  [Initialize Variable]                       │
│                  │                        │         │                                    │
│                  │                        │  ┌─── Try Scope ──────────────────────────┐  │
│                  │                        │  │  Build Search URL                      │  │
│                  │                        │  │  HTTP GET → YallaMotor                 │  │
│  [Show spinner]  │                        │  │  Extract Page Title                    │  │
│                  │                        │  │  HTTP Status Code                      │  │
│                  │                        │  │                                         │  │
│                  │                        │  │  ┌─ Cloudflare Check (OR) ──────────┐  │  │
│                  │                        │  │  │  Title="Just a moment"?          │  │  │
│                  │                        │  │  │  Title="Attention Required"?     │  │  │
│                  │                        │  │  │  outputs('HTTP')['statusCode']   │  │  │
│                  │                        │  │  │           = 403?                   │  │  │
│                  │                        │  │  └──────────────┬───────────────────┘  │  │
│                  │                        │  │          Yes   │   No                  │  │
│                  │                        │  │     ┌──────────▼──────────┐            │  │
│                  │                        │  │     │ Terminate (Succ.)  │            │  │
│                  │                        │  │     │ Response: -1       │            │  │
│                  │                        │  │     └───────────────────┘            │  │
│                  │                        │  │                          │            │  │
│                  │                        │  │                 Extract Heading      │  │
│                  │                        │  │                          │            │  │
│                  │                        │  │           ┌─ Is Heading Avail? ─┐    │  │
│                  │                        │  │           │ heading ≠ "No found"│    │  │
│                  │                        │  │           └──────────┬──────────┘    │  │
│                  │                        │  │                Yes   │   No            │  │
│                  │                        │  │           ┌──────────▼───────────────────┐│  │
│                  │                        │  │           │ Extract After AED / Min/Max ││  │
│                  │                        │  │           │ Extract Count                ││  │
│                  │                        │  │           │ Build JSON                   ││  │
│                  │                        │  │           │                              ││  │
│                  │                        │  │           │ ── Deep Scrape ──            ││  │
│                  │                        │  │           │ Extract First Listing URL    ││  │
│                  │                        │  │           │ HTTP GET → Detail Page       ││  │
│                  │                        │  │           │ Parse JSON-LD:               ││  │
│                  │                        │  │           │  Body / Fuel / Trans / Drive ││  │
│                  │                        │  │           │  Cylinders / Engine / Doors  ││  │
│                  │                        │  │           │  Seats / Mileage / Regional   ││  │
│                  │                        │  │           │ Build JSON with Specs         ││  │
│                  │                        │  │           └──────────────────────────────┘│  │
│                  │                        │  │                                    │  │
│                  │                        │  │  Response (@{...} interpolation)   │  │
│                  │                        │  └────────────────────────────────────┘  │
│                  │                        │                                           │
│                  │                        │  ┌── Catch Scope ─────────────────────┐  │
│                  │                        │  │  Run after: failure/skip/timeout   │  │
│                  │                        │  │  Response: Min:0, Max:0, Count:-1  │  │
│                  │                        │  └────────────────────────────────────┘  │
│                  │  ←──── JSON ──────────  └──────────────────────────────────────────┘
│                  │
│  [Show results]  │
│  + price input   │
│                  │
│  User confirms   │ ───→ Create MVR in Dataverse
│                  │       - vpi_minprice = user suggested
│                  │       - vpi_maxprice = user suggested
│                  │       - vpi_scraped_minprice = scraped
│                  │       - vpi_scraped_maxprice = scraped
│                  │       - vpi_scraped_listings = {...}
│                  │       - vpi_scraped_sources = URL
│                  │       - vpi_scrapestatus = 4 (Scraped)
└──────────────────┘
```

### Create the Flow

1. Go to https://make.powerautomate.com
2. Click **Create** → **Instant cloud flow**
3. Flow name: `MVR - Scrape YallaMotor (HTTP)`
4. Trigger: **When an HTTP request is received**
5. Click **Create**

### Step 1: Configure HTTP Trigger — "Anyone can trigger"

6. Click **When an HTTP request is received** → **Use sample payload to generate schema**
7. Paste this sample JSON:

```json
{
  "make": "Mercedes Benz",
  "model": "C-Class",
  "trim": "C 200",
  "year": 2021
}
```

8. ⚠️ **CRITICAL:** Click **"Anyone can trigger"** in the trigger settings. This generates a **SAS token** (`sig=...`) embedded in the POST URL. Without this, the browser `fetch()` call will get a **401 OAuth error** because the browser cannot provide Azure AD credentials.

9. Copy the **HTTP POST URL** shown at the top — it will look like:
   ```
   https://[env].environment.api.powerplatform.com:443/powerautomate/...&sig=[SAS-TOKEN]
   ```
   This URL goes into `src/lib/yallaMotorHttpScraper.ts` as `FLOW_3_URL`.

### Step 2: Initialize Variable — ResponseBody

10. Click **+ New step** → **Initialize variable**
    - Name: `ResponseBody`
    - Type: **String**
    - Value: (leave empty)

### ⚠️ Step 3-9: All Actions Inside Try Scope

11. Click **+ New step** → search **Scope**
12. Rename the Scope to **`Try`** (double-click the title bar)
13. Drag all remaining action steps (3-9 below) **inside** this Try scope.

### Step 3 (inside Try): Build Search URL

14. Click **Add an action** (inside Try) → **Compose**
15. Name: `Build Search URL`
16. Input: click **Expression** → paste:
    ```
    concat('https://uae.yallamotor.com/used-cars/', replace(replace(toLower(triggerBody()?['make']), ' ', '-'), '.', '-'), '/', replace(replace(toLower(triggerBody()?['model']), ' ', '-'), '.', '-'), '/vr_', replace(replace(replace(toLower(coalesce(triggerBody()?['trim'], '')), ' ', '-'), '.', '-'), '/', '-'), '/yr_', triggerBody()?['year'], '_', triggerBody()?['year'])
    ```

### Step 4 (inside Try): HTTP Request to YallaMotor

17. Click **Add an action** (inside Try) → search **HTTP**
18. Configure:
    - Method: **GET**
    - URI: click → **Expression**: `outputs('Build_Search_URL')`
    - Headers:
      > ⚠️ **Updated:** Added `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform` — these Client Hint headers are required by Cloudflare's managed challenge (`cType: 'managed'`). Without them, Cloudflare identifies the request as non-browser and returns a JS challenge page ("Just a moment..."). Chrome version bumped to 128.
      > ✅ **Confirmed:** These headers are complete and working.
      ```json
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Google Chrome\";v=\"128\", \"Not;A=Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\""
      }
      ```
      These match the same headers that Flow 1 uses successfully.

### Step 5 (inside Try): Store Response Body

19. Click **Add an action** (inside Try) → **Set variable**
    - Name: `ResponseBody`
    - Value: click → **Expression**: `body('HTTP')`

### Step 6 (inside Try): Extract Page Title

20. Click **Add an action** (inside Try) → **Compose**
21. Name: `Extract Page Title`
22. Input: click → **Expression**:
    ```
    if(contains(body('HTTP'), '<title>'), first(split(first(skip(split(body('HTTP'), '<title>'), 1)), '</title>')), 'No title found')
    ```

### Step 7 (inside Try): Check HTTP Status Code

23. Click **Add an action** (inside Try) → **Compose**
24. Name: `HTTP Status Code`
25. Input: click → **Expression**: `outputs('HTTP')['statusCode']`

### Step 8 (inside Try): Cloudflare Check — 3 OR Conditions

26. Click **Add an action** (inside Try) → **Condition**
27. Name: `Cloudflare Check`
28. **OR** conditions (any one true = blocked):
    - `outputs('Extract_Page_Title')` contains `Just a moment`
    - `outputs('Extract_Page_Title')` contains `Attention Required`
    - `outputs('HTTP')['statusCode']` **is equal to** `403`
    > Checking specifically for HTTP 403 (Forbidden) — Cloudflare returns 403 when it blocks a request. This is more precise than checking for any non-200 status.

### Step 8a (inside Try, If yes — blocked): Terminate (Succeeded) + Response (-1)

29. In the **If yes** branch (blocked), add these two actions:

    **8a(i) — Terminate:**
    - Action: **Terminate**
    - Status: **Succeeded** (not Failed)
    - Reason: `YallaMotor not accessible`

    **8a(ii) — Response with -1 sentinel:**
    - Action: **Response** (placed after Terminate)
    - Status Code: `200`
    - Headers:
      ```json
      {
        "Content-Type": "application/json"
      }
      ```
    - Body:
      ```json
      {
        "Min Price": "0",
        "Max Price": "0",
        "Count": "-1"
      }
      ```
    > The Terminate stops the flow, but the Response action still sends the -1 payload back to the caller. The frontend detects `Count < 0` and shows the amber "Live Data Unavailable" UI.

### Step 9 (inside Try, If no — accessible): Extract Heading

**In If no (accessible):**

30. Click **Add an action** → **Compose**
31. Name: `Extract Heading`
32. Input: click **Expression**:
    ```
    if(contains(variables('ResponseBody'), 'heading-h2-content'), trim(first(split(first(skip(split(variables('ResponseBody'), 'heading-h2-content'), 1)), '</div>'))), 'No heading found')
    ```

### Step 9a (inside Try, If no — accessible): Is Heading Available (Nested Condition)

33. Click **Add an action** → **Condition**
34. Name: `Is Heading Available`
35. Condition:
    - `outputs('Extract_Heading')` **is not equal to** `No heading found`

    **9a(i) — If yes (heading found): Extract & Parse Prices**

    Add these actions inside the **If yes** branch:

    36. **Compose** — Name: `Extract After AED`
        Input: `trim(first(skip(split(outputs('Extract_Heading'), 'AED '), 1)))`

    37. **Compose** — Name: `Extract Min Price`
        Input: `replace(trim(first(split(outputs('Extract_After_AED'), ' –'))), ',', '')`

    38. **Compose** — Name: `Extract Max Price`
        Input: `replace(trim(first(split(first(skip(split(outputs('Extract_After_AED'), '– '), 1)), ' ·'))), ',', '')`

    39. **Compose** — Name: `Extract Listing Count`
        Input: **`replace(replace(trim(first(split(outputs('Extract_Heading'), ' listings'))), '>', ''), '"', '')`**
        > Strips `>` prefix: `>294` → `294`, then strips `"` wrapping: `"\"7"` → `7` ✅
        >
        > ⚠️ **Do NOT wrap with `int()`** — it fails silently inside a Scope and returns 0. The frontend handles numeric conversion robustly.

    40. **Compose** — Name: `Build Response JSON`
        Input: use the **Expression** tab and wrap with `@{...}`:
        ```
        @{concat('{"success": true, "make": "', triggerBody()?['make'], '", "model": "', triggerBody()?['model'], '", "trim": "', triggerBody()?['trim'], '", "year": ', triggerBody()?['year'], ', "count": ', outputs('Extract_Listing_Count'), ', "minPrice": ', outputs('Extract_Min_Price'), ', "maxPrice": ', outputs('Extract_Max_Price'), ', "heading": "', outputs('Extract_Heading'), '", "sourceUrl": "', outputs('Build_Search_URL'), '"}')}
        ```
        > This builds a complete JSON payload with all fields: success flag, make/model/trim/year from the trigger input, and count/minPrice/maxPrice/heading/sourceUrl from the extraction steps.

    **9b — Deep Scrape: Extract Vehicle Specs from First Listing**

    > The search results page at the correctly-constructed URL (e.g. `/used-cars/mercedes-benz/c-class/vr_c-200/yr_2021_2021`) contains JSON-LD structured data with vehicle specs. We extract all spec fields from the **existing** search response (`variables('ResponseBody')`) — no second HTTP request needed.
>
> ⚠️ **Why no second request:** Power Automate doesn't preserve cookies between HTTP actions. The first search request (step 7) succeeds, but a second request to the same YallaMotor URL gets blocked by Cloudflare's JS challenge. Since the response body from step 7 already contains all the HTML/JSON-LD we need, we avoid the Cloudflare issue entirely by extracting specs from the cached response.

    **9b(i) — [REMOVED] — No second HTTP request needed**

    > The spec extraction steps below reference `variables('ResponseBody')` — the same response body already fetched and stored by step 7 (HTTP Search). No additional HTTP action is created.

    **9b(ii) — Extract Body Type:**

    44. Click **Add an action** → **Compose**
    45. Name: `Extract Body Type`
    46. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"bodyType":"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"bodyType":"'), 1)), '"'))), '')
        ```
        > Extracts from JSON-LD: `"bodyType":"Sedan"` → `Sedan`

    **9b(iii) — Extract Fuel Type:**

    50. Click **Add an action** → **Compose**
    51. Name: `Extract Fuel Type`
    52. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"fuelType":"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"fuelType":"'), 1)), '"'))), '')
        ```
        > Extracts from JSON-LD: `"fuelType":"Petrol"` → `Petrol`

    **9b(iv) — Extract Transmission:**

    53. Click **Add an action** → **Compose**
    54. Name: `Extract Transmission`
    55. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"vehicleTransmission":"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"vehicleTransmission":"'), 1)), '"'))), '')
        ```
        > Extracts from JSON-LD: `"vehicleTransmission":"Automatic"` → `Automatic`

    **9b(v) — Extract Drive Type:**

    56. Click **Add an action** → **Compose**
    57. Name: `Extract Drive Type`
    58. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"driveWheelConfiguration":"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"driveWheelConfiguration":"'), 1)), '"'))), '')
        ```
        > Extracts: `"driveWheelConfiguration":"https://schema.org/RearWheelDriveConfiguration"` → `https://schema.org/RearWheelDriveConfiguration`
        >
        > **Mapping** (done in frontend): `RearWheelDriveConfiguration` → RWD, `FrontWheelDriveConfiguration` → FWD, `AllWheelDriveConfiguration` → AWD, `AllWheelDrive` → 4X4

    **9b(vi) — Extract Cylinders:**

    59. Click **Add an action** → **Compose**
    60. Name: `Extract Cylinders`
    61. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"cylinders":"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"cylinders":"'), 1)), '"'))), '')
        ```
        > Extracts from carData: `"cylinders":"4"` → `4`. Values: `3`, `4`, `5`, `6`, `8`, `10`, `12`
        >
        > ⚠️ The first cylinder value found in the page may not be for our specific listing (could be from related cars section). Test with a real detail page to confirm the first match is correct.

    **9b(vii) — Extract Engine Size (CC):**

    62. Click **Add an action** → **Compose**
    63. Name: `Extract Engine Size`
    64. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"engine_cc":"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"engine_cc":"'), 1)), '"'))), '')
        ```
        > Extracts from carData: `"engine_cc":"2000"` → `2000` (meaning 2.0L). Stored as decimal in Dataverse `vpi_enginesize`.

    **9b(viii) — Extract Doors:**

    65. Click **Add an action** → **Compose**
    66. Name: `Extract Doors`
    67. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"numberOfDoors"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"numberOfDoors":{"@type":"QuantitativeValue","value":'), 1)), ',')), ''), '')
        ```
        > Extracts from JSON-LD: `"numberOfDoors":{"@type":"QuantitativeValue","value":4,"unitCode":"C62"}` → `4`
        >
        > Dataverse values: `2`=2, `3`=3, `4`=4, `5`=5 (see Doors option set)

    **9b(ix) — Extract Seats:**

    68. Click **Add an action** → **Compose**
    69. Name: `Extract Seats`
    70. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"vehicleSeatingCapacity"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"vehicleSeatingCapacity":{"@type":"QuantitativeValue","value":'), 1)), ',')), ''), '')
        ```
        > Extracts from JSON-LD: `"vehicleSeatingCapacity":{"@type":"QuantitativeValue","value":5,"unitCode":"C62"}` → `5`
        >
        > Dataverse values: `5`=4, `7`=6, etc. (see Seats option set — frontend maps this)

    **9b(x) — Extract Mileage:**

    71. Click **Add an action** → **Compose**
    72. Name: `Extract Mileage`
    73. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"mileageFromOdometer"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"mileageFromOdometer":{"@type":"QuantitativeValue","value":'), 1)), ',')), ''), '')
        ```
        > Extracts from JSON-LD: `"mileageFromOdometer":{"@type":"QuantitativeValue","value":1250,"unitCode":"KMT"}` → `1250`
        >
        > This is the odometer reading of this specific listing (not the vehicle model's typical mileage). Useful reference data but may vary between listings.

    **9b(xi) — Extract Regional Specs / Category:**

    74. Click **Add an action** → **Compose**
    75. Name: `Extract Regional Specs`
    76. Input: click **Expression** → paste:
        ```
        if(contains(variables('ResponseBody'), '"description"'), trim(first(split(first(skip(split(variables('ResponseBody'), '"description":"'), 1)), '"'))), '')
        ```
        > Extracts the listing description from JSON-LD. The description contains spec info like `"Used Mercedes-Benz C-Class 2024 for sale in Sharjah: AED 150,000, 1,250 km, Automatic, Japanese Specs"`.
        >
        > The frontend will parse this description for regional spec keywords and map to `vpi_category` values:

        | Keyword in description | vpi_category value |
        |---|---|
        | `GCC Specs` | GCC (1) |
        | `Not Sure` or `Other Specs` | Other/Standard (3) |
        | Anything else (Saudi, European, Japanese, American, Canadian, Australian, Korean, Chinese Specs) | Non-GCC (2) |

    **9b(xii) — Update Build Response JSON with Specs:**

    74. Click **Add an action** → **Compose**
    75. Name: `Build Response JSON with Specs`
    76. Input — use `@{...}` **Expression** tab (NOT bare text):
        ```
        @{concat('{"success": true, "make": "', triggerBody()?['make'], '", "model": "', triggerBody()?['model'], '", "trim": "', triggerBody()?['trim'], '", "year": ', triggerBody()?['year'], ', "count": ', outputs('Extract_Listing_Count'), ', "minPrice": ', outputs('Extract_Min_Price'), ', "maxPrice": ', outputs('Extract_Max_Price'), ', "bodyType": "', outputs('Extract_Body_Type'), '", "fuelType": "', outputs('Extract_Fuel_Type'), '", "transmission": "', outputs('Extract_Transmission'), '", "driveType": "', outputs('Extract_Drive_Type'), '", "cylinders": "', outputs('Extract_Cylinders'), '", "engineSize": "', outputs('Extract_Engine_Size'), '", "doors": "', outputs('Extract_Doors'), '", "seats": "', outputs('Extract_Seats'), '", "mileage": "', outputs('Extract_Mileage'), '", "regionalSpecs": "', outputs('Extract_Regional_Specs'), '", "heading": "', outputs('Extract_Heading'), '", "sourceUrl": "', outputs('Build_Search_URL'), '"}')}
        ```
        > This builds a complete JSON payload with ALL vehicle specs alongside the pricing data. When listing URL isn't found, the spec fields are empty but the pricing data (count, minPrice, maxPrice) is still returned. Frontend parses these and writes them to the MVR's Dataverse fields.

    **9a(ii) — If no (heading not found):** (leave empty)

    > When heading is not found, the extraction Compose steps are skipped entirely. The Try scope's Response action (Step 10) will receive empty `outputs()` references, which Power Automate resolves as null. If this causes the Try scope to fail, the Catch scope's Response fires instead with the -1 sentinel.

### Step 10 (inside Try): Response — Success Path

The Try scope ends with a Response action that sends the extracted values back to the caller.

41. Click **Add an action** (inside Try, after the Cloudflare Check condition block ends) → **Response**
42. Name: `Response` (optional)
43. Configure:
    - Status Code: `200`
    - Headers:
      ```json
      {
        "Content-Type": "application/json"
      }
      ```
    - Body — use `@{...}` string interpolation syntax:
      ```json
      {
        "Min Price": "@{outputs('Extract_Min_Price')}",
        "Max Price": "@{outputs('Extract_Max_Price')}",
        "Count": "@{outputs('Extract_Listing_Count')}",
        "bodyType": "@{outputs('Extract_Body_Type')}",
        "fuelType": "@{outputs('Extract_Fuel_Type')}",
        "transmission": "@{outputs('Extract_Transmission')}",
        "driveType": "@{outputs('Extract_Drive_Type')}",
        "cylinders": "@{outputs('Extract_Cylinders')}",
        "engineSize": "@{outputs('Extract_Engine_Size')}",
        "doors": "@{outputs('Extract_Doors')}",
        "seats": "@{outputs('Extract_Seats')}",
        "mileage": "@{outputs('Extract_Mileage')}",
        "regionalSpecs": "@{outputs('Extract_Regional_Specs')}"
      }
      ```
    - **Configure run after:** Only **is successful** checked (default)
    > ⚠️ **Must use `@{...}` template syntax**, not bare `outputs('...')`. Without the `@{...}` wrapping, the values are not interpolated correctly into the JSON response.
    >
    > This Response only fires when YallaMotor is accessible and the heading was found and parsed. If any preceding step fails, this Response is skipped and the Catch scope handles it.

### Step 11: Catch Scope — Response with -1 Sentinel

44. After the Try scope ends, click **+ New step** → search **Scope**
45. Rename to **`Catch`**
46. Click **...** on the Catch scope → **Configure run after**
47. Check ONLY: **has failed**, **is skipped**, **has timed out** — leave **is successful** UNCHECKED
48. Click **Done**

49. Inside Catch, click **Add an action** → **Response**
50. Configure:
    - Status Code: `200`
    - Headers:
      ```json
      {
        "Content-Type": "application/json"
      }
      ```
    - Body (hardcoded — not dynamic):
      ```json
      {
        "Min Price": "0",
        "Max Price": "0",
        "Count": "-1"
      }
      ```
    > ⚠️ **Configure run after cannot be modified** on the first action inside a Scope — the Catch scope itself controls when it runs (step 47). The Response inside always executes when the Catch scope fires.
    >
    > The frontend detects `Count < 0` and shows the amber "Live Data Unavailable" UI with manual price inputs.

### ⚠️ Why Only 3 Values?

Only 3 values (`Min Price`, `Max Price`, `Count`) are returned from the flow. The frontend handles the rest:

1. **Constructs the heading** from count, minPrice, maxPrice, make, model, year
2. **Builds the source URL** using the hyphenated slug pattern
3. **Detects unreachable** by checking `count < 0` (either the Cloudflare block branch returned -1, the Catch scope fired with -1, or heading wasn't found and extraction outputs were empty)

> **Why not more values in the Catch Response?** The Catch scope Response has hardcoded `0/0/-1` — it cannot reference Try's action outputs because those actions failed or were skipped. The hardcoded -1 sentinel is all the frontend needs to show the "Live Data Unavailable" UI.

See `src/lib/yallaMotorHttpScraper.ts` for the full client-side implementation.

### Frontend Implementation (`src/lib/yallaMotorHttpScraper.ts`)

```typescript
const FLOW_3_URL = 'https://[env]...&sig=[token]';

export interface Flow3ScrapeResult {
  success: true;
  make: string;
  model: string;
  trim: string;
  year: number;
  count: number;
  minPrice: number;
  maxPrice: number;
  heading: string;
  sourceUrl: string;
  _unavailable?: boolean;
}

export async function scrapeViaFlow3(params: { make, model, trim, year }) {
  const response = await fetch(FLOW_3_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const result = await response.json();
  
  // Strip non-numeric chars — handles Scope-wrapping quotes
  const count = Number(String(result['Count'] ?? result['count'] ?? '')
    .replace(/[^0-9-]/g, '')) || 0;
  const minPrice = Number(result['Min Price'] ?? result['Min price'] ?? 0);
  const maxPrice = Number(result['Max Price'] ?? result['Max price'] ?? 0);
  
  // count < 0 = Catch scope fired = YallaMotor unreachable
  if (count < 0) {
    return { success: true, ..., _unavailable: true };
  }
  
  // Build heading + URL client-side
  const sourceUrl = `https://uae.yallamotor.com/used-cars/${makeSlug}/...`;
  return { success: true, count, minPrice, maxPrice, heading, sourceUrl };
}
```

### Step3Result.tsx — Three-State UI

The valuation page handles three possible outcomes:

| State | Condition | UI |
|---|---|---|
| **Unavailable** | `flow3Result._unavailable === true` | Amber "Live Data Unavailable" banner with manual price inputs + "Submit Request" |
| **Error** | `scrapeError && !flow3Result` | Red error box with "Try Again" button (network/fetch errors) |
| **Success** | `flow3Result` (normal) | Green price estimate card with count, min/max, source link + price suggestion + "Confirm & Submit" |

### Test the Flow

51. Click **Save** (top-left)
52. Copy the **HTTP POST URL** from the trigger step
53. Test with any HTTP client:
    ```
    POST [your-flow-url]
    Content-Type: application/json
    
    {
      "make": "Mercedes Benz",
      "model": "C-Class",
      "trim": "C 200",
      "year": 2024
    }
    ```

### ✅ Actual Test Results

**Test 1 (2026-07-17) — Before fixes:**

Request:
```json
{"make": "Mercedes Benz", "model": "C-Class", "trim": "C 200", "year": 2021}
```
Response:
```json
{
  "Min Price": "95000",
  "Max Price": "145000",
  "Count": "\"7"
}
```
**Issue:** Count had extra wrapping quotes (`"\"7"`) from Scope wrapping.

**Test 2 (2026-07-17) — After adding `int()` wrapper:**

Frontend showed count = 0 instead of 6. Root cause: `int()` fails silently inside a Scope.

**Test 3 (2026-07-20) ✅ — After final fixes (double `replace()` + `@{...}` syntax):**

Request:
```json
{"make": "Mercedes Benz", "model": "C-Class", "trim": "C 200", "year": 2024}
```
Response:
```json
{
  "Min Price": "127000",
  "Max Price": "275000",
  "Count": "6"
}
```
Status: `200 OK`

**Result:** ✅ **All values correct.** Count = 6, Min Price = 127,000, Max Price = 275,000.

**Frontend Display:**
```
Live Market Data — YallaMotor
AED 127,000 — AED 275,000
6 listings found · 2024 Mercedes Benz C-Class
6 listings · AED 127,000 – 275,000 · 2024–2024
```

### ✅ Resolved Issue: Count Shows 0

The count issue is now **resolved** with two Power Automate fixes:

| Fix | What It Does |
|---|---|
| **Double `replace()`** on Extract Listing Count: `replace(replace(..., '>', ''), '"', '')` | Strips both `>` prefix (`>294` → `294`) and `"` wrapping (`"\"7"` → `7`) |
| **`@{outputs('...')}` template syntax** in Response body | Ensures values are interpolated correctly as JSON strings instead of raw expressions |

> ⚠️ **Do NOT wrap `Extract_Listing_Count` with `int()`** — it fails silently inside a Scope and returns 0. The frontend's `.replace(/[^0-9-]/g, '')` handles the numeric conversion.

### ⚠️ Flow 2 Interference Note

> Flow 3 itself does **not** write to Dataverse — the MVR record is created by the frontend (`upsertMissingVehicleRequest`) after the user confirms. If you also have **Flow 2** (Dataverse-triggered scraper) running, it will fire on the new MVR record and **overwrite** `vpi_scraped_minprice`, `vpi_scraped_maxprice`, `vpi_scraped_listings`, and `vpi_scraped_sources` with its own scraped values (which may be incomplete or use an older URL format).
>
> **Before testing Flow 3, turn Flow 2 OFF** to prevent it from stomping on the data. If you need Flow 2 for batch processing, either:
> - Disable it while testing Flow 3, or
> - Make Flow 2 check `vpi_scrapestatus` — skip the MVR if it's already set to `Scraped` (4), or
> - Give Flow 3 its own dedicated status value that Flow 2 leaves alone.

## MVR Schema Reference (Scrape Columns Only)

For full schema, see `docs/dataverse-schema.md`.

| Column | Type | Used In | Purpose |
|---|---|---|---|
| `vpi_scrapestatus` | Choice | Flow 1, Flow 2 | 1=Pending, 2=Testing, 3=In Progress, 4=Scraped, 5=Failed, 6=Unreachable |
| `vpi_scraped_listings` | Multiple Lines of Text | Flow 2 | JSON array of scraped listing data |
| `vpi_scraped_minprice` | Currency | Flow 2 | Minimum price from scraped listings |
| `vpi_scraped_maxprice` | Currency | Flow 2 | Maximum price from scraped listings |
| `vpi_scraped_sources` | Multiple Lines of Text | Flow 1, Flow 2 | Source URLs where scraped listings were found |

---

## ⚡ Frontend Changes Required (for Deep Scrape Specs)

When updating Flow 3 with deep scrape, the following frontend files need changes:

### 1. `src/lib/yallaMotorHttpScraper.ts`
Add new fields to `Flow3ScrapeResult` interface and parse them from the response:

| Field | Type | Parse from response key |
|---|---|---|
| `bodyType` | `string` | `result['bodyType']` |
| `fuelType` | `string` | `result['fuelType']` |
| `transmission` | `string` | `result['transmission']` |
| `driveType` | `string` | `result['driveType']` |
| `cylinders` | `string` | `result['cylinders']` |
| `engineSize` | `string` | `result['engineSize']` |
| `doors` | `string` | `result['doors']` |
| `seats` | `string` | `result['seats']` |
| `regionalSpecs` | `string` | `result['regionalSpecs']` — full JSON-LD description containing spec type (e.g. "Japanese Specs", "GCC Specs") |

### 2. `src/hooks/useTriggerScrape.ts`
After saving scraped prices, also write the spec fields to the MVR using existing repository methods. Map YallaMotor text values to Dataverse option set values using helpers from `@data/dataverseOptionSets`:

| Flow 3 output | Dataverse column | Mapping |
|---|---|---|
| `bodyType` = `"Sedan"` | `vpi_bodytype` = 46 | Direct: `missingVehicleBodyTypeValue(bodyType)` |
| `fuelType` = `"Petrol"` | `vpi_fueltype` = 3 | Map "Petrol"/"Diesel" → `Petrol\Diesel` (3), "Hybrid" → 2, "Electric" → 1 |
| `transmission` = `"Automatic"` | `vpi_transmissiontype` = 1 | Direct: `missingVehicleTransmissionTypeValue(transmission)` |
| `driveType` = `"RearWheelDriveConfiguration"` | `vpi_drivetype` = 4 | Parse suffix: `RearWheelDrive` → RWD (4), `FrontWheelDrive` → FWD (3), `AllWheelDrive` → AWD (2) |
| `cylinders` = `"4"` | `vpi_cylinders` = 2 | Direct: `missingVehicleCylindersValue(cylinders)` |
| `engineSize` = `"2000"` | `vpi_enginesize` = 2000 | Parse as number (decimal field) |
| `doors` = `"4"` | `vpi_doors` = 4 | Use DOORS option set or pass numeric value 4 |
| `seats` = `"5"` | `vpi_seats` = 4 | Use SEATS option set: 5 → 4 |
| `regionalSpecs` = description text | `vpi_category` | Parse description for keywords → GCC (1), Non-GCC (2), Other/Standard (3) |

### 3. `src/repositories/missingVehicleRepository.ts`
Extend `updateScrapeResult()` or add a new method `updateMissingVehicleSpecs()` that accepts the spec fields and calls the Dataverse PATCH endpoint.

### Dataverse Option Set Values Reference

| Field | Values → Dataverse |
|---|---|
| **Body Type** | `Sedan`=46, `SUV`=55, `Coupe`=7, `Hatchback`=15, `Convertible`=6, `Pickup`=34/42, `Wagon`=66 (see full list in `docs/dataverse-schema.md`) |
| **Fuel Type** | `Electric`=1, `Hybrid`=2, `Petrol\Diesel`=3 (covers Petrol, Diesel, Petrol/Diesel) |
| **Transmission** | `Automatic`=1, `Manual`=2, `CVT`=3 |
| **Drive Type** | `4X4`=1, `AWD`=2, `FWD`=3, `RWD`=4, `Unknown`=5 |
| **Cylinders** | `3`=1, `4`=2, `5`=3, `6`=4, `8`=5, `10`=6, `12`=7 |
| **Doors** | `2`=2, `3`=3, `4`=4, `5`=5 |
| **Seats** | `2`=1, `4`=3, `5`=4, `7`=6, `8`=7 |
| **Category (vpi_category)** | `GCC Specs`→ GCC (1) — `Not Sure` / `Other Specs`→ OTHER/STANDARD (3) — everything else → Non-GCC (2) |

See `src/data/dataverseOptionSets.ts` and `docs/dataverse-schema.md` for full option set definitions.

---

## FLOW 4: MVR - Customer Email Notification (Dataverse Trigger)

**Purpose:** When an MVR's scrape status changes to `Scraped (4)`, send an email to the requesting user notifying them that their vehicle data is available.

**Why Power Automate (not frontend):**
- Server-side execution — guaranteed to fire regardless of who has the admin page open
- Built-in email connector (Office 365 Outlook) — no external email service needed
- Automatic retry if sending fails

### Data Flow

```
[Flow 3 completes / Admin triggers scrape → vpi_scrapestatus = 4 (Scraped)]
    │
    ▼
[Dataverse Trigger: MVR row modified with filter vpi_scrapestatus eq 4]
    │
    ▼
[Get Contact: Resolve _vpi_contact_value lookup → contact email + name]
    │
    ▼
[Send Email: Office 365 Outlook]
    → To: Contact's email address
    → Subject: "Requested Vehicle and its data now available"
    → Body: HTML template
```

> **Recommended approach:** Use the **Filter rows** setting on the trigger instead of a separate Condition step. This keeps the flow clean at just 3 steps (Trigger → Get Contact → Send Email) and the trigger only fires when the status is exactly 4 (Scraped).

### Create the Flow

1. Go to https://make.powerautomate.com
2. Click **Create** → **Automated cloud flow**
3. Flow name: `MVR - Customer Email Notification`
4. Search and select trigger: **When a row is added, modified or deleted** (Dataverse)
5. Click **Create**

### Step 1: Configure Trigger — When a Row is Modified (with Filter)

6. Click the trigger step → configure:
   - Change type: **Modified**
   - Table name: search → **Missing Vehicle Requests**
   - Scope: **Organization**
   - **Filter rows:** paste the following OData filter:
     ```
     vpi_scrapestatus eq 4
     ```
   - **Select columns:** click → add these columns:
     - `vpi_missingvehiclerequestsid`
     - `vpi_make`
     - `vpi_model`
     - `vpi_modelyear`
     - `vpi_trim`
     - `vpi_contact`

> **Why Filter rows instead of a Condition step?** The filter runs at the Dataverse level — the flow only triggers when `vpi_scrapestatus` is `4 (Scraped)`. No wasted runs, no extra step. The "Select columns" ensures we only fetch the fields we need, making the trigger lightweight.

### Step 2: Get the Linked Contact Record

7. Click **+ New step** → search **Get a row by ID** (Dataverse)
8. Configure:
   - Table name: **Contacts**
   - Row ID: click → **Expression**:
     ```
     triggerOutputs()?['body/_vpi_contact_value']
     ```

> ⚠️ The `_vpi_contact_value` field contains the GUID of the linked contact record. Use `vpi_contact` in the Select columns (schema name) and `_vpi_contact_value` in the expression (internal field name). The lookup resolves from Dataverse's trigger output to get the user's email address and first name for the email.

### Step 3: Send Email Notification

9. Click **+ New step** → search **Send an email (V2)** (Office 365 Outlook)
10. Configure:

   - **To:** click inside → Dynamic content → select **Email** from the Get a row by ID step

   - **Subject:**
     ```
     Requested Vehicle and its data now available
     ```

   - **Body:** Switch to **HTML** mode → paste the HTML structure, then use the **Dynamic content** picker to insert fields (don't type expressions manually):
     ```html
     <p>Hi [Insert First Name from step 2 — use Dynamic content picker],</p>
     <p>Thank you for reaching out to us regarding the vehicle you were looking for.</p>
     <p>Your request has been processed and the following vehicle data is now available on our platform:</p>
     <p><b>[Insert vpi_make] [Insert vpi_model] [Insert vpi_modelyear] [Insert vpi_trim] — use Dynamic content picker for each</b></p>
     <p>Head over to the platform to explore the complete details, including pricing insights, specifications, and more.</p>
     <p><a href="[YOUR-POWER-PAGES-URL]">Click here to visit the site</a></p>
     <p>If you ever need help with another vehicle, feel free to submit a new request.</p>
     <p>Best regards,<br/><b>Vehicle Pricing Intelligence Platform</b></p>
     ```

     > Replace `[YOUR-POWER-PAGES-URL]` with the actual Power Pages site URL before saving.

### Save and Test

11. Click **Save** (top-left)
12. To test:
    - Trigger a scrape on any MVR via the admin panel
    - Or manually update an MVR's `vpi_scrapestatus` to `4` in Dataverse
    - The flow should fire and send the email to the linked contact

### Initial Setup Checklist

- [x] Flow created with name `MVR - Customer Email Notification`
- [x] Trigger configured: Modified, Missing Vehicle Requests, Organization
- [x] **Filter rows:** `vpi_scrapestatus eq 4`
- [x] **Select columns:** Added `vpi_missingvehiclerequestsid`, `vpi_make`, `vpi_model`, `vpi_modelyear`, `vpi_trim`, `vpi_contact` (schema name)
- [x] Get Contact step: uses `_vpi_contact_value` expression (internal field name)
- [x] Email step: To = Contact's Email, Subject = "Requested Vehicle and its data now available"
- [x] Email body: Uses approved template with vehicle details + platform link
- [x] Dynamic content inserted via **Dynamic content picker** (NOT typed as literal expressions)
- [x] `[YOUR-POWER-PAGES-URL]` replaced with actual site URL
- [x] Flow saved and tested — ✅ Verified: First Name resolved, vehicle details resolved, link clickable
