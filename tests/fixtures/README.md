# Test Fixtures — YallaMotor JSON-LD

Real, live-scraped JSON-LD blocks captured from the Azure Functions probe
(`?client=cloudscraper&jsonld=1`, egress IP `52.149.247.118`) on **2026-08-06**.
These drive the in-repo parser tests in `src/parsers/` — no network needed.

## Files

| File | Page type | Source URL |
|---|---|---|
| `yallamotor-pajero-detail.jsonld.json` | Detail page | `https://uae.yallamotor.com/used-cars/mitsubishi/pajero/2020/used-mitsubishi-pajero-2020-dubai-2121456` |
| `yallamotor-camry-search.jsonld.json` | Search page | `https://uae.yallamotor.com/used-cars/toyota/camry` |

Each file is an array of JSON-LD blocks as returned by the probe's `jsonld`
field (i.e. schema.org objects, one per `@type`).

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