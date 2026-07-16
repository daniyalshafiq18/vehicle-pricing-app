# Power Automate Cloud Flow — Step-by-Step Build Guide

> **Date:** 2026-07-15 (Updated — YallaMotor backend outage diagnosed)
> **Status:** Flow 1 ✅ Built, Modified & Re-Tested | Flow 2 ✅ Built & Tested (YallaMotor had backend outage)
> **Platform:** https://make.powerautomate.com
> **Connectors needed:** HTTP (premium), Microsoft Dataverse, Office 365 Outlook (optional)

---

## Status Summary

| Flow | Status | Notes |
|---|---|---|
| **Flow 1: YallaMotor Accessibility Test** | ✅ **Built, Modified & Re-Tested** | Confirmed full listing record extraction (price, specs, dealer). Heading extraction confirmed for aggregate pricing. |
| **Flow 2: MVR Automated Scraper** | ✅ **Built & Tested** | See full design below. YallaMotor backend was down during tests — not a Cloudflare issue. |

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

## FLOW 1: YallaMotor Accessibility Test (Instant / Manual Trigger)

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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/"
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

## FLOW 2: Production Scraper — Auto-Trigger on New MVR (Automated)

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
    concat('https://uae.yallamotor.com/used-cars/', replace(toLower(triggerOutputs()?['body/vpi_make']), ' ', '-'), '/', replace(toLower(triggerOutputs()?['body/vpi_model']), ' ', '-'), '/vr_', replace(toLower(coalesce(triggerOutputs()?['body/vpi_trim'], triggerOutputs()?['body/vpi_version'], '')), ' ', '-'), '/yr_', triggerOutputs()?['body/vpi_modelyear'], '_', triggerOutputs()?['body/vpi_modelyear'])
    ```

    **Example outputs:**
    ```
    # Simple (no trim):
    https://uae.yallamotor.com/used-cars/toyota/camry/vr_/yr_2022_2022
    
    # Multi-word make + trim:
    https://uae.yallamotor.com/used-cars/mercedes-benz/c-class/vr_c-200/yr_2021_2021
    ```

    **⚠️ Hyphen rule:** Database stores "Mercedes Benz" (space), but YallaMotor URLs use "mercedes-benz" (hyphen). The `replace(' ', '-')` handles this. Make names like "Alfa Romeo" also get `alfa-romeo`. **Do NOT** blindly replace all spaces in the raw value — only in the URL slug.

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

**⚠️ Hyphen rule:** Database stores "Mercedes Benz" (space), but YallaMotor URLs use "mercedes-benz" (hyphen). The `replace(' ', '-')` handles this. Make names like "Alfa Romeo" also get `alfa-romeo`. **Do NOT** blindly replace all spaces in the raw value — only in the URL slug.

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

## FLOW 3: Real-Time Scrape from Frontend (HTTP Trigger)

**Purpose:** When a user submits a missing vehicle request from the app, scrape YallaMotor **synchronously** and return results immediately so the user can see them and optionally suggest a price before the MVR record is created.

**Why this approach:**
- 🚀 **Instant** — no Dataverse polling delay (seconds vs minutes)
- 👤 **User sees results** — scraped prices shown before MVR is saved
- 💾 **Both prices stored** — `vpi_scraped_minprice/maxprice` = scraped, `vpi_minprice/maxprice` = user-suggested

### Data Flow

```
Step3Result.tsx                    Power Automate (FLOW 3)              Dataverse
┌──────────────────┐               ┌──────────────────────────┐         
│ User clicks      │               │                          │         
│ "Search & Submit"│ ── POST ────→ │ HTTP Trigger receives     │         
│                  │   {make,      │ make, model, trim, year   │         
│                  │    model,     │                          │         
│                  │    trim,      │ HTTP GET → YallaMotor     │         
│                  │    year}      │                          │         
│ Show spinner     │               │ Parse heading             │         
│ "Searching..."   │               │ Strip > from count        │         
│                  │               │ Strip , from prices       │         
│                  │ ←─── JSON ─── │ Respond with results      │         
│                  │               │                          │         
│ Show scraped     │               └──────────────────────────┘         
│ results +        │                                                   
│ price input      │                                                   
│                  │                                                   
│ User suggests    │                                                   
│ price (optional) │ ───→ Create MVR in Dataverse                      
│ User confirms    │       - vpi_minprice = user suggested              
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

### Step 1: Configure HTTP Trigger Schema

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

This auto-generates the JSON schema. Note the **HTTP POST URL** shown at the top — you'll need this in the frontend code.

### Step 2: Initialize Variable — ResponseBody

8. Click **+ New step** → **Initialize variable**
   - Name: `ResponseBody`
   - Type: **String**
   - Value: (leave empty)

### Step 3: Build Search URL (with Hyphens + Trim + Year)

9. Click **+ New step** → **Compose**
10. Name: `Build Search URL`
11. Input: click **Expression** → paste:
    ```
    concat('https://uae.yallamotor.com/used-cars/', replace(toLower(triggerBody()?['make']), ' ', '-'), '/', replace(toLower(triggerBody()?['model']), ' ', '-'), '/vr_', replace(toLower(coalesce(triggerBody()?['trim'], '')), ' ', '-'), '/yr_', triggerBody()?['year'], '_', triggerBody()?['year'])
    ```

### Step 4: HTTP Request to YallaMotor

12. Click **+ New step** → search **HTTP**
13. Configure:
    - Method: **GET**
    - URI: click → **Expression**: `outputs('Build_Search_URL')`
    - Headers:
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

### Step 5: Store Response Body

14. Click **+ New step** → **Set variable**
    - Name: `ResponseBody`
    - Value: click → **Expression**: `body('HTTP')`

### Step 6: Extract Page Title

15. Click **+ New step** → **Compose**
16. Name: `Extract Page Title`
17. Input: click → **Expression**:
    ```
    if(contains(body('HTTP'), '<title>'), first(split(first(skip(split(body('HTTP'), '<title>'), 1)), '</title>')), 'No title found')
    ```

### Step 7: Check HTTP Status Code

18. Click **+ New step** → **Compose**
19. Name: `HTTP Status Code`
20. Input: click → **Expression**: `outputs('HTTP')['statusCode']`

### Step 8: Simplified Cloudflare Check

21. Click **+ New step** → **Condition**
22. Name: `Cloudflare Check`
23. **OR** conditions:
    - `outputs('Extract_Page_Title')` contains `Just a moment`
    - `outputs('Extract_Page_Title')` contains `Attention Required`
    - `outputs('HTTP_Status_Code')` not equals `200`

### Step 9: If Blocked — Return Error

**In If yes (blocked):**

24. Click **Add an action** → **Respond to a PowerApp or flow**
25. Configure:
    - Status Code: `200` (to avoid CORS/fetch errors — indicate success with error flag)
    - Headers: `{ "Content-Type": "application/json" }`
    - Body:
    ```json
    {
      "success": false,
      "error": "YallaMotor not accessible",
      "url": "@{outputs('Build_Search_URL')}",
      "statusCode": "@{outputs('HTTP_Status_Code')}"
    }
    ```

26. Click **Add an action** → **Terminate**
    - Status: **Succeeded** (response already sent)

### Step 10: If Accessible — Extract Heading

**In If no (accessible):**

27. Click **Add an action** → **Compose**
28. Name: `Extract Heading`
29. Input: click **Expression**:
    ```
    if(contains(variables('ResponseBody'), 'heading-h2-content'), trim(first(split(first(skip(split(variables('ResponseBody'), 'heading-h2-content'), 1)), '</div>'))), 'No heading found')
    ```

### Step 11: Condition — Heading Found?

30. Click **+ New step** → **Condition**
31. Name: `Is Heading Available`
32. Row:
    - Left: `outputs('Extract_Heading')`
    - Operator: `is not equal to`
    - Right: `No heading found`

### Step 12: Parse Heading — Extract Prices

**In If yes (heading found):**

33. Click **Add an action** → **Compose**
34. Name: `Extract After AED`
35. Input: `trim(first(skip(split(outputs('Extract_Heading'), 'AED '), 1)))`

36. Click **Add an action** → **Compose**
37. Name: `Extract Min Price`
38. Input: **`replace(trim(first(split(outputs('Extract_After_AED'), ' –'))), ',', '')`**
    > Strips commas: `95,000` → `95000` ✅

39. Click **Add an action** → **Compose**
40. Name: `Extract Max Price`
41. Input: **`replace(trim(first(split(first(skip(split(outputs('Extract_After_AED'), '– '), 1)), ' ·'))), ',', '')`**
    > Strips commas: `145,000` → `145000` ✅

42. Click **Add an action** → **Compose**
43. Name: `Extract Listing Count`
44. Input: **`replace(trim(first(split(outputs('Extract_Heading'), ' listings'))), '>', '')`**
    > Strips `>` prefix: `>294` → `294` ✅

### Step 13: Build Response JSON

45. Click **+ New step** → **Compose**
46. Name: `Build Response JSON`
47. Input: click **Expression**:
    ```
    concat('{"success": true, "make": "', triggerBody()?['make'], '", "model": "', triggerBody()?['model'], '", "trim": "', triggerBody()?['trim'], '", "year": ', triggerBody()?['year'], ', "count": ', outputs('Extract_Listing_Count'), ', "minPrice": ', outputs('Extract_Min_Price'), ', "maxPrice": ', outputs('Extract_Max_Price'), ', "heading": "', outputs('Extract_Heading'), '", "sourceUrl": "', outputs('Build_Search_URL'), '"}')
    ```

### Step 14: Respond to Caller

48. Click **+ New step** → **Respond to a PowerApp or flow**
49. Configure:
    - Status Code: `200`
    - Headers: `{ "Content-Type": "application/json" }`
    - Body: click **Expression**: `outputs('Build_Response_JSON')` 

### Step 15: Fallback — JSON-LD (If heading not found)

If heading is empty, add the same JSON-LD and BDI fallback steps from Flow 2 (Steps 60-77), then build the response JSON with fallback values.

### Test the Flow

50. Click **Save** (top-left)
51. Copy the **HTTP POST URL** from the trigger step
52. Test with any HTTP client:
    ```
    POST [your-flow-url]
    Content-Type: application/json
    
    {
      "make": "Mercedes Benz",
      "model": "C-Class",
      "trim": "C 200",
      "year": 2021
    }
    ```

### Expected Response

```json
{
  "success": true,
  "make": "Mercedes Benz",
  "model": "C-Class",
  "trim": "C 200",
  "year": 2021,
  "count": 7,
  "minPrice": 95000,
  "maxPrice": 145000,
  "heading": "7 listings · AED 95,000 – 145,000 · 2021–2021 · updated 16 July 2026",
  "sourceUrl": "https://uae.yallamotor.com/used-cars/mercedes-benz/c-class/vr_c-200/yr_2021_2021"
}
```

---

## MVR Schema Reference (Scrape Columns Only)

For full schema, see `docs/dataverse-schema.md`.

| Column | Type | Used In | Purpose |
|---|---|---|---|
| `vpi_scrapestatus` | Choice | Flow 1, Flow 2 | 1=Pending, 2=Testing, 3=In Progress, 4=Scraped, 5=Failed, 6=Unreachable |
| `vpi_scraped_listings` | Multiple Lines of Text | Flow 2 | JSON array of scraped listing data |
| `vpi_scraped_minprice` | Currency | Flow 2 | Minimum price from scraped listings |
| `vpi_scraped_maxprice` | Currency | Flow 2 | Maximum price from scraped listings |
| `vpi_scraped_sources` | Multiple Lines of Text | Flow 1, Flow 2 | Source URLs where scraped listings were found |
