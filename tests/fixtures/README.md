# Test Fixtures — Scraper Parser Captures

Real HTML and JSON-LD captures from the Azure Functions and Power Automate
Desktop transports. These drive the in-repo parser tests in `src/parsers/` —
no network needed.

## Files

| File | Page type | Source URL |
|---|---|---|
| `yallamotor-pajero-detail.jsonld.json` | Detail page | `https://uae.yallamotor.com/used-cars/mitsubishi/pajero/2020/used-mitsubishi-pajero-2020-dubai-2121456` |
| `yallamotor-camry-search.jsonld.json` | Search page | `https://uae.yallamotor.com/used-cars/toyota/camry` |
| `drivearabia-camry-prices.html` | Model landing page | DriveArabia Toyota Camry price page |
| `drivearabia-camry-prices-pad.html` | PAD model landing capture | DriveArabia Toyota Camry price page |
| `drivearabia-camry-2024-pad.html` | PAD per-model-year capture | DriveArabia Toyota Camry 2024 price page |
| `drivearabia-camry-trim.html` | Trim detail page | DriveArabia Toyota Camry trim page |

YallaMotor `.json` files are arrays of JSON-LD blocks returned by the probe's
`jsonld` field. DriveArabia `.html` files are raw page captures used verbatim.

## Verified values (asserted by the tests)

**Pajero detail** (`Product`/`Car` block):
price `52999` · mileage `130161` · doors `4` · engine `2972` ·
body `SUV / Crossover` · fuel `Petrol` · transmission `Automatic` ·
drive `https://schema.org/AllWheelDriveConfiguration` ·
`GCC Specs` present in `description`.

**Camry search** (`CollectionPage` + `ItemList`):
count `503` · min `120` · max `350000` · heading includes `1996–2026` ·
first listing = Camry 3.5L SE+ 2019, AED `52000`, `147000` km.

## The fixture rule (guide §13)

Any live run that reveals **new markup or structure** → save the real
HTML/JSON-LD here and add a test case in `src/parsers/`. Do not guess at
structure — capture it, then assert the exact live-verified values.
