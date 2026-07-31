# Flow 3 Deep-Scrape — Debugging Retrospective (2026-07-31)

> **Date:** 2026-07-31
> **Author:** Project Documentation
> **Status:** ✅ Resolved — Flow 3 deep-scrape fully verified end-to-end
> **Scope:** The complete journey of the Flow 3 "Option B" deep-scrape feature — from design, through every test, to the final full clean sweep
> **Related docs:** `docs/power-automate-cloud-only-design.md` (§9b Option B, Test 5/6/7), `memory/learned-conventions.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background — What the Deep-Scrape Does](#2-background--what-the-deep-scrape-does)
3. [Where It Started — The Unverified Foundations](#3-where-it-started--the-unverified-foundations)
4. [The Complete Test Timeline](#4-the-complete-test-timeline)
5. [The Three Runs of 2026-07-31](#5-the-three-runs-of-2026-07-31)
6. [Root-Cause Analysis](#6-root-cause-analysis)
7. [Where We Were Lacking → How We Overcame It](#7-where-we-were-lacking--how-we-overcame-it)
8. [The Final Verified Extraction Expressions](#8-the-final-verified-extraction-expressions)
9. [How the Last Run Got Every Field](#9-how-the-last-run-got-every-field)
10. [Lessons Learned](#10-lessons-learned)
11. [Remaining Step — Credibility Re-Test](#11-remaining-step--credibility-retest)

---

## 1. Executive Summary

Every bug in this saga had a single root cause: **extraction patterns were written from *guessed* page structures, never grounded in real page data.** The killer was an assumption that the YallaMotor "Vehicle Highlights" section is an HTML `<table>` with `<th>`/`<td>` rows. It is actually a grid of `<div>` cards with `title=` attributes — there are **zero `<td>` tags anywhere on the page**. That single wrong assumption caused two live test failures and was only exposed by looking at real view-source.

The journey ended on 2026-07-31 with a **full clean sweep**: all 9 spec fields extracted correctly in one live run (Mitsubishi Pajero GLS V6 2020).

| Date | Event |
|---|---|
| 2026-07-28 | Deep-scrape designed from assumed JSON-LD/HTML shapes |
| 2026-07-29 | Partial test — only 4/10 fields from search page → "Option B" (detail page) designed |
| 2026-07-30 | Manual detail-page verification → 3 mismatches found & fixed |
| 2026-07-31 | Test 6 (real JSON-LD) + 3 live runs → clean sweep (Test 7) |

---

## 2. Background — What the Deep-Scrape Does

Flow 3 is the HTTP-triggered (SAS token) Power Automate Cloud flow that scrapes YallaMotor **on demand** for a user-submitted Missing Vehicle Request. It makes **two** HTTP requests:

1. **Search results page** → pricing data (count, min/max price, heading) + the first listing URL
2. **Detail page (Option B)** → the vehicle spec fields that only exist on an individual listing

The deep-scrape extracts **9 fields** from the detail page:

| Field | JSON-LD path / HTML marker | Final source |
|---|---|---|
| Body Type | `"vehicleBodyType":{"name":"` | JSON-LD |
| Fuel Type | `"fuelType":"` | JSON-LD |
| Transmission | `"vehicleTransmission":"` | JSON-LD |
| Drive Type | `"driveWheelConfiguration":"` | JSON-LD (schema.org URL) |
| Cylinders | `title="Number of Cylinders"` | **HTML tile** |
| Engine Size | `"engineDisplacement":{"@type":"QuantitativeValue","value":"` | JSON-LD (nested) |
| Doors | `"numberOfDoors"` (nested + plain fallback) | JSON-LD |
| Mileage | `"mileageFromOdometer"` (string + numeric fallback) | JSON-LD |
| Regional Specs | `title="Regional Specs"` primary, `"description":"` fallback | **HTML tile** + JSON-LD |

*(Seats was removed — not reliably present in YallaMotor listing JSON-LD.)*

---

## 3. Where It Started — The Unverified Foundations

The deep-scrape was **designed on 2026-07-28** with extraction patterns written from *assumed* page structures. Nobody had inspected a real listing page at design time. Three specific assumptions seeded the bugs:

1. **Assumed JSON-LD shapes** — flat field paths that didn't match the real nested structure (e.g. `"engineDisplacement":"` flat vs the real nested `vehicleEngine.engineDisplacement.value`).
2. **Assumed the Vehicle Highlights section was a `<th>/<td>` HTML table** — this became the killer. The design doc recorded `contains('Number of Cylinders')` → "FOUND" and treated that as proof of a table row.
3. **Assumed a `contains()` check could prove structure** — it only proves a string exists somewhere, not *how* it is marked up.

Everything downstream — the expressions, the frontend integration, the tests — was built on those unverified foundations. The bugs therefore didn't *start* with a failing test; they started with the design itself.

---

## 4. The Complete Test Timeline

### 4.1 Pre-deep-scrape era (Flow 1 / Flow 2 / Flow 3 basic)

| # | Date | Test | Finding | Fix |
|---|---|---|---|---|
| — | 2026-07-13 | Flow 1 (original) | YallaMotor reachable with full Chrome header set | Full header set documented |
| — | 2026-07-15 | Flow 1 (modified) | Same result after header tweaks | — |
| — | 2026-07-16 | Flow 2 (Dataverse trigger) | Heading-based extraction works | Built |
| 1 | 2026-07-17 | Flow 3 Test 1 | Count returned `"\"7"` (extra wrapping quotes from Scope) | — |
| 2 | 2026-07-17 | Flow 3 Test 2 | `int()` wrapper fails silently inside a Scope → count = 0 | Double `replace()` + `@{...}` interpolation |
| 3 | 2026-07-20 | Flow 3 Test 3 ✅ | Count = 6, Min = 127,000, Max = 275,000 — all correct | Resolved |
| — | 2026-07-24 | Flow 3 e2e (Mercedes C 300) ✅ | Correct data returned to Dataverse | — |

### 4.2 The deep-scrape era

| # | Date | Test | Finding | Fix |
|---|---|---|---|---|
| 4 | 2026-07-29 | Test 4 — search page only ⚠️ | Only **4/10** fields (Body, Fuel, Transmission, Mileage). Drive, Cylinders, Engine, Doors, Seats **not in search page JSON-LD**. Regional matched wrong element. Heading had `">` prefix | → **Option B** designed: second HTTP request to the detail page. Heading delimiter fixed |
| 5 | 2026-07-30 | Test 5 — manual detail-page verification (Mercedes C-Class) | **3 mismatches:** Cylinders **not in JSON-LD** (needs HTML DOM); Engine Size **nested** path; Seats **not available** | Cylinders → HTML extraction; Engine → nested path; Seats **removed** |
| — | 2026-07-30 | Listing URL test | First `"url":"` in the body was the page's **canonical URL**, not the listing URL | Two-step `<article>` + `href` extraction |
| — | 2026-07-30/31 | Cylinders `contains()` diagnostic | **FOUND** — but split on `Number of Cylinders</th>` crashed (assumed whitespace mismatch; real cause was the missing `<td>`) | Diagnostic saved in flow; blocked by Cloudflare cooldown |
| 6 | 2026-07-31 | Test 6 — real Pajero JSON-LD pasted ✅ | All hardened expressions simulated correctly → Doors=`4`, Mileage=`130161`, Regional=`GCC Specs`. **Key finds:** mileage is an **unquoted number** (`"value":130161`), doors has `unitCode`, Regional Specs is HTML-only with a `description` fallback that contains `GCC Specs` | Doc recorded; expressions confirmed |
| — | 2026-07-31 | **Run 1 (Pajero)** ⚠️ | Listing URL, Body, Fuel, Transmission, Drive, Engine ✅. **Doors failed:** `trim must have only one parameter` | Fixed stray `, ''`; **added the expression validator**; hardened Doors/Mileage/Regional |
| — | 2026-07-31 | **Run 2 (Pajero)** ❌ | **Cylinders crashed:** `split` got a Null first param | View-source revealed `<div title="LABEL">` tiles → rewrote Cylinders + Regional |
| 7 | 2026-07-31 | **Run 3 (Pajero)** ✅ | **FULL CLEAN SWEEP — all 9 fields correct** | — |

**Total live Flow 3 deep-scrape runs: 3** (all on 2026-07-31, all against the same Mitsubishi Pajero GLS V6 2020 listing). Plus the two non-live verifications (Test 5 manual, Test 6 simulation).

---

## 5. The Three Runs of 2026-07-31

### Run 1 — The Doors `trim()` arity error

**What happened:** After the Cloudflare cooldown, the Pajero test mostly succeeded — Listing URL, Body Type, Fuel, Transmission, Drive Type, Engine Size all correct. But `Extract Doors` threw:

> `InvalidTemplate: The template language function 'trim' must have only one parameter.`

**Root cause:** a stray `, ''` had landed *inside* `trim(first(...), '')` instead of *after* it. It came from copy-pasting a similar expression where the paren nesting differed. Classic hand-authored-expression typo.

**Rectification (3 things):**
1. Fixed the Doors expression (the `if()`'s closing `, '')` now comes after `trim()`'s close paren).
2. **Built `npm run validate:flows`** (`scripts/validate-flow-expressions.mjs`) — paren-checks + single-arg-function arity-checks all 43 expressions in the design doc, so this class of typo can never reach a live test again. We had been validating *after* errors instead of *before*.
3. **Pre-emptively hardened** Doors, Mileage, and Regional Specs so the next live run tested robust patterns, not naive ones (details in §8).

### Run 2 — The Cylinders Null-split crash ("What the hell?")

**What happened:** The user pasted the three hardened expressions, the validator passed (43/43 — arity was fine), and the flow was re-run. It died at `Extract Cylinders`:

> `InvalidTemplate: The template language function 'split' expects its first parameter to be of type string. The provided value is of type 'Null'.`

**Root cause:** the expression split on `'Number of Cylinders'` → `<td>` → `</td>`. The Null means: *after the first "Number of Cylinders" in the page, there is no `<td>` tag at all.* The `contains()` diagnostic had only proved the label string exists — **not** that it sits in a `<td>` table row. The `<th>/<td>` table assumption was wrong.

**The truth (view-source, 2026-07-31):** the Vehicle Highlights section is a grid of `<div>` cards, **zero `<td>` tags anywhere**:

```html
<div class="mb-1 text-sm text-gray-600 capitalize" title="Number of Cylinders">Number of Cylinders</div>
<div class="text-base font-semibold text-gray-900 lg:text-base" title="6">6</div>
```

The label is `<div ... title="LABEL">LABEL</div>` and the value is the **next** `<div ... title="VALUE">VALUE</div>`.

**Rectification:**
1. Rewrote **Cylinders** (§9b iv-e) to split on `title="Number of Cylinders"` → the next `title="` → `"`.
2. Rewrote **Regional Specs** (§9b iv-j) the same way — it used the identical broken `<td>` pattern and would have crashed identically if reached. (Flagged as HIGH RISK before testing; fixed pre-emptively.)
3. Built a faithful Node simulation of the real page (JSON-LD + Organization block + summary bar + tiles) and verified **all 10 extractions** against it — Cylinders=`6`, Regional=`GCC Specs` (with *and* without the tile present), Doors=`4`, Mileage=`130161`, Engine=`2972`, Body/Fuel/Transmission/Drive correct.
4. Confirmed via more view-source that the `title="Regional Specs"` tile **exists** (last tile in the highlights grid), and that a separate spec-summary list earlier in the page has **no `title=`** attribute — so it cannot interfere with the marker.

### Run 3 — The FULL CLEAN SWEEP

**One live run, every field correct:**

| Field | Live Result | ✅ |
|---|---|---|
| Is Listing URL Found | `true` | ✅ |
| Listing URL | `https://uae.yallamotor.com/used-cars/mitsubishi/pajero/2020/used-mitsubishi-pajero-2020-dubai-2121456` | ✅ |
| Body Type | `SUV / Crossover` | ✅ |
| Fuel Type | `Petrol` | ✅ |
| Transmission | `Automatic` | ✅ |
| Drive Type | `https://schema.org/AllWheelDriveConfiguration` | ✅ |
| **Cylinders** | **`6`** | ✅ (title-tile fix) |
| Engine Size | `2972` | ✅ |
| **Doors** | **`4`** | ✅ (hardened) |
| **Mileage** | **`130161`** | ✅ (hardened) |
| **Regional Specs** | **`GCC Specs`** | ✅ (title-tile fix) |
| Count / Min / Max / Heading / SourceUrl | `5` / `54999` / `75500` / heading / sourceUrl | ✅ |

**Full Response JSON:**
```json
{"success": true, "make": "Mitsubishi", "model": "PAJERO", "trim": "GLS V6", "year": 2020, "count": 5, "minPrice": 54999, "maxPrice": 75500, "bodyType": "SUV / Crossover", "fuelType": "Petrol", "transmission": "Automatic", "driveType": "https://schema.org/AllWheelDriveConfiguration", "cylinders": "6", "engineSize": "2972", "doors": "4", "mileage": "130161", "regionalSpecs": "GCC Specs", "heading": "5 listings · AED 54,999 – 75,500 · 2020–2020 · updated 31 July 2026", "sourceUrl": "https://uae.yallamotor.com/used-cars/mitsubishi/pajero/vr_gls-v6/yr_2020_2020"}
```

No Catch Scope triggered. **Flow 3 DONE.**

---

## 6. Root-Cause Analysis

### 6.1 The `<td>` table assumption (the killer bug)

The Cylinders expression assumed `<th>Number of Cylinders</th><td>6</td>`. This was recorded in the design doc on 2026-07-30 as the HTML DOM strategy — **without ever verifying the actual markup**. The `contains('Number of Cylinders')` diagnostic passing was treated as confirmation. It was not: `contains()` only proves the label string exists somewhere in the page body, and says nothing about the tags around it.

At runtime, `first(skip(split(after, '<td>'), 1))` returned Null because there is no `<td>` after the first `Number of Cylinders` occurrence. The correct markup is `<div title="Number of Cylinders">` ... `<div title="6">`.

### 6.2 The `contains()` diagnostic limitation

A `contains()` check is **necessary but nowhere near sufficient** for HTML extraction. It cannot distinguish a table row, a div tile, a summary bar span, or a comment. The correct pattern for YallaMotor is the `title="LABEL"` → next `title="` → `"` tile extraction.

### 6.3 The Doors `trim()` arity error

Not a data problem at all — a pure expression-authoring typo: `trim(first(...), '')` passes two args to a single-arg function. The absence of any programmatic validation let it through to a Cloudflare-expensive live test.

### 6.4 Quoted-string vs unquoted-number JSON-LD values

Real Pajero JSON-LD proved that two fields using the *same* `QuantitativeValue` structure differ: engine size is a **quoted string** (`"value":"2972"`), mileage is an **unquoted number** (`"value":130161`). Splitting on `"` breaks on unquoted numbers; splitting on `}`/`,` breaks on quoted strings. Single-path extraction can never be robust — the dual-path nested `if()` is required.

### 6.5 Listing URL ambiguity

The first `"url":"` in the search page response is the page's own canonical URL, not a listing URL. The listing URL had to be extracted from the `<article>` element via a two-step process.

---

## 7. Where We Were Lacking → How We Overcame It

| Where we were lacking | How we overcame it |
|---|---|
| **Patterns written from guessed structures** at design time (2026-07-28) | Grounded everything in real data: user pasted the real JSON-LD (Test 6) and real view-source snippets (2026-07-31) |
| **No proactive validation** — validated *after* errors, not before | Built `npm run validate:flows`; now run before **every** live Flow test |
| **The `<td>` table assumption** (the killer) | View-source revealed `<div title="LABEL">` tiles → rewrote with the `title="` pattern |
| **Trusting `contains()` as structure proof** | Lesson recorded: `contains()` is necessary but insufficient — get the actual markup (~300 chars around the label) before writing HTML extraction |
| **Single-path extraction** (Doors assumed a comma, Mileage assumed one value type) | Nested-`if` hardening: `}`-then-`,` split for end-of-object numbers; string→numeric dual paths |
| **Hand-counting parens in long expressions** | Programmatic validator (paren balance + arity) + a faithful Node simulation harness before each live test |
| **Not knowing if a field lives in JSON-LD or HTML** | Real JSON-LD + view-source cross-reference (Test 5, Test 6) — e.g. Cylinders and Regional Specs are HTML-only |

---

## 8. The Final Verified Extraction Expressions

All use `variables('DetailResponseBody')` and are **live-verified** (2026-07-31, Pajero). Full step-by-step placement is in `docs/power-automate-cloud-only-design.md` §9b.

### 8.1 JSON-LD flat string extractions (verified stable)

**Body Type:**
```
if(contains(variables('DetailResponseBody'), '"bodyType":"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"bodyType":"'), 1)), '"'))), '')
```

**Fuel Type:**
```
if(contains(variables('DetailResponseBody'), '"fuelType":"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"fuelType":"'), 1)), '"'))), '')
```

**Transmission:**
```
if(contains(variables('DetailResponseBody'), '"vehicleTransmission":"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"vehicleTransmission":"'), 1)), '"'))), '')
```

**Drive Type:**
```
if(contains(variables('DetailResponseBody'), '"driveWheelConfiguration":"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"driveWheelConfiguration":"'), 1)), '"'))), '')
```

### 8.2 Nested JSON-LD (verified 2026-07-31)

**Engine Size** (value is a quoted string):
```
if(contains(variables('DetailResponseBody'), '"engineDisplacement"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"engineDisplacement":{"@type":"QuantitativeValue","value":"'), 1)), '"'))), '')
```

**Doors** (nested `QuantitativeValue` first, plain integer fallback; `}`-then-`,` split so a trailing comma **or** closing brace works):
```
if(contains(variables('DetailResponseBody'), '"numberOfDoors":{"@type":"QuantitativeValue","value":'), trim(first(split(first(split(first(skip(split(variables('DetailResponseBody'), '"numberOfDoors":{"@type":"QuantitativeValue","value":'), 1)), '}')), ','))), if(contains(variables('DetailResponseBody'), '"numberOfDoors"'), trim(first(split(first(split(first(skip(split(variables('DetailResponseBody'), '"numberOfDoors":'), 1)), '}')), ','))), ''))
```

**Mileage** (quoted-string pattern first, unquoted-number pattern fallback — *required* because the real value is unquoted `130161`):
```
if(contains(variables('DetailResponseBody'), '"mileageFromOdometer":{"@type":"QuantitativeValue","value":"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"mileageFromOdometer":{"@type":"QuantitativeValue","value":"'), 1)), '"'))), if(contains(variables('DetailResponseBody'), '"mileageFromOdometer":{"@type":"QuantitativeValue","value":'), trim(first(split(first(split(first(skip(split(variables('DetailResponseBody'), '"mileageFromOdometer":{"@type":"QuantitativeValue","value":'), 1)), '}')), ','))), ''))
```

### 8.3 HTML title-tile extractions (the final fix)

**Cylinders** (`title="LABEL"` → next `title="` → `"`):
```
if(contains(variables('DetailResponseBody'), 'title="Number of Cylinders"'), trim(first(split(first(skip(split(first(skip(split(variables('DetailResponseBody'), 'title="Number of Cylinders"'), 1)), 'title="'), 1)), '"'))), '')
```

**Regional Specs** (title-tile primary, JSON-LD `description` fallback):
```
if(contains(variables('DetailResponseBody'), 'title="Regional Specs"'), trim(first(split(first(skip(split(first(skip(split(variables('DetailResponseBody'), 'title="Regional Specs"'), 1)), 'title="'), 1)), '"'))), if(contains(variables('DetailResponseBody'), '"description":"'), trim(first(split(first(skip(split(variables('DetailResponseBody'), '"description":"'), 1)), '"'))), ''))
```

---

## 9. How the Last Run Got Every Field

The winning formula was **real-data grounding + proactive validation + the right extraction patterns**:

1. **4 flat JSON-LD string extractions** (Body, Fuel, Transmission, Drive) — stable from day one.
2. **1 nested JSON-LD extraction** (Engine Size) — fixed on 2026-07-30 after Test 5 showed the nested path.
3. **2 hardened JSON-LD extractions** (Doors, Mileage) — dual-path + `}`-then-`,` split, verified against the real Pajero JSON-LD (Test 6).
4. **2 HTML title-tile extractions** (Cylinders, Regional Specs) — the final fix from Run 2, verified against exact view-source.
5. **`npm run validate:flows` (43/43)** before the run, and **simulations against real data** instead of guesses.

No hardcoded values were used — every field came from live page data (see the honesty audit note in §11).

---

## 10. Lessons Learned

1. **Before writing any HTML extraction, look at the real page.** Get ~300 characters of actual view-source around the label and build the split markers from the *actual* tags/attributes. Guessed markup is the #1 source of scraping bugs.
2. **A `contains()` diagnostic does NOT prove HTML structure.** It proves a string exists — nothing more. The Cylinders bug was seeded by treating "FOUND" as proof of a `<td>` table.
3. **Same JSON-LD field type can be a quoted STRING or an unquoted NUMBER — never assume.** Engine size (`"2972"`) vs mileage (`130161`) are both `QuantitativeValue` and differ. Always dual-path.
4. **Numbers at the end of a JSON object need a `}`-then-`,` split.** `"value":130161,"unitCode":"KMT"}` splits on `,` fine, but `"value":4}` (last property, no unitCode) needs the `}`-split first. Handle both.
5. **Validate expressions programmatically before every live test.** Live Flow tests are expensive (~30 min Cloudflare cooldown). `npm run validate:flows` catches paren-balance and single-arg-arity typos like the Doors `trim(first(...), '')` bug in seconds.
6. **Validate after errors is too late — build the tooling upfront.** The validator was created only *after* the Doors bug cost a test cycle.
7. **Power Automate's `if()` is lazy** — only the taken branch is evaluated. When simulating expressions in Node/JS, use `if/else`, not a ternary (ternaries eagerly evaluate both branches as call arguments).

---

## 11. Remaining Step — Credibility Re-Test

Flow 3 is fully verified on **one** vehicle (Mitsubishi Pajero GLS V6 2020 — a 6-cylinder, GCC-spec SUV). To prove beyond doubt that no value is hardcoded or masked by a fallback, the plan is to re-test with a **structurally different vehicle** after the next Cloudflare cooldown — e.g. a 4-cylinder sedan like the Mercedes C-Class 2021 — and confirm the extracted values **vary** (Cylinders ≠ 6, Engine Size ≠ 2972, and ideally a non-GCC regional value).

**Honesty note (from the audit at the time of the clean sweep):** three independent pieces of evidence indicate live extraction, not hardcoding —
1. The **primary branches fired**, not the fallback shapes (e.g. Regional Specs returned the clean `GCC Specs` tile value, not the long `description` fallback text).
2. Prior **live crashes** (the Doors and Cylinders errors) prove the flow genuinely processes live page data — hardcoded outputs would never have hit those runtime errors.
3. The extracted values **match independently-confirmed real listing data** (Pajero GLS V6 = 2972cc V6, 6 cylinders, 4 doors, GCC specs, 130,161 km).

The second-vehicle test is the definitive proof.

---

## Related Documentation

- `docs/power-automate-cloud-only-design.md` — Flow 3 full design, §9b Option B extraction steps, Test 5/6/7 results
- `memory/learned-conventions.md` — the recurring patterns & lessons (URL slugs, JSON-LD/HTML extraction, Cloudflare handling)
- `docs/path-b-scraper-microservice-postmortem.md` — the earlier Path B (Puppeteer) postmortem that led to the Power Automate approach
- `docs/CHANGELOG.md` — dated entries for each milestone of this journey
