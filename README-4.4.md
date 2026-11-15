# Field Shift 4.4 — USDA Market News Evidence (SMAP awaiting AppEEARS)

This release is based on Field Shift 4.3. It preserves the farmer's 3-step wizard, NASA POWER, USDA layers, USDA soil and CDL, SMAP imagery/CSV/AppEEARS tools, P1/P2 historical results, PDF and CSV scenario exports.

## What changed

- **Data & details → Market News:** optional, read-only, local-only USDA AMS MyMarketNews report preview.
- **Private key:** the key is provided via `FIELD_SHIFT_MMN_API_KEY` in the backend's own terminal. React and the ZIP do not contain credentials.
- **CSV evidence:** upload manually reviewed quote references using the downloadable blank template with columns `commodity,quote_date,price,unit,market,source_url,report_slug`. Prices remain user-declared, not independently audited. Quotes are grouped only when commodity, unit and market all agree.
- **No automatic price conversion:** the quoted price, farm-gate price, producer yield and expenses are different things. This module **does not recalculate gross revenue or crop rankings** in the demo/P2 model.
- A standalone **Market News** tab keeps advanced source review away from the farmer's simple screens.
- Fixed one leftover Spanish title in StrategyComparison.

## Install and run on Windows

Use two terminals, opened in `field-shift/`:

**Backend (without Market News key — all other functions work):**

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

**Backend (OPTIONAL personal free USDA MyMarketNews API key):**

Set these in the same terminal **before** starting uvicorn:

```cmd
set FIELD_SHIFT_MARKET_LOCAL_MODE=1
set FIELD_SHIFT_MMN_API_KEY=YOUR_PERSONAL_KEY_HERE
py -m uvicorn backend.app:app --reload --port 8000
```

**Do not commit or share the key.** If you use a public/shared backend, do not set `FIELD_SHIFT_MARKET_LOCAL_MODE=1`: this proof-of-concept bridge is local-only and is not multiuser authentication. The default backend has no market credentials and returns a disabled/unconfigured status; it never fabricates market values.

Register or obtain your free key from [USDA MyMarketNews](https://mymarketnews.ams.usda.gov/). The USDA help pages show where to find the personal API key. Find a particular report's slug ID on [USDA market report search](https://mymarketnews.ams.usda.gov/public_data).

**Frontend:**

```cmd
npm install
npm run dev
```

Open `http://localhost:5173` and go to **Data & details → Market News**. Enter a report slug, e.g. a slug chosen from the USDA website, then click **Load USDA report**. The retrieved records are displayed as **raw values**, not interpreted as a particular commodity price unless checked against the source report.

If you are not ready to register for the key, you can still download the CSV template and add manually reviewed quotes. The CSV importer requires an explicit unit, quotation date, market and official USDA source URL; it rejects price-like values without units.

## Other outstanding items

1. **SMAP numerical data from AppEEARS:** pending the actual NASA file/task. Nothing needs to be re-entered or faked. Return to the 4.3 combined observations once available.
2. **P2 executable agronomic model:** still missing the formula, membership functions, versioned code and calibration. Historical 2024 scores and demo strategies remain explicitly separate.
3. **Economics:** USDA quotes are market evidence, not necessarily farm-gate prices. Reliable revenue projections need matching commodity/grade/unit/region and crop yield assumptions; net income also needs production costs. This release lays the data/provenance groundwork without implying these inputs have been validated.
4. **Production deployment:** migrate local key access to per-user auth or an account-backed server. Do not enable a shared secret proxy on a public instance.

## Scientific provenance and coverage

USDA MyMarketNews is U.S.-oriented. It is not a global spot price feed for every country. Its report data requires an authenticated API and the source report's own date, place, grade, packaging and price units. Distinct commodities, units or markets are not comparable without a documented normalization.

Official references:
- https://mymarketnews.ams.usda.gov/mymarketnews-api/authentication
- https://mymarketnews.ams.usda.gov/mymarketnews-api/reports
- https://mymarketnews.ams.usda.gov/mymarketnews-api/examples

## Regression checks

```cmd
npm test
py -m pytest backend\tests -q
npm run build
```

`npm run build` requires dependencies installed locally; it was not possible to run in the authoring environment. Live requests using a personal USDA key have not been verified by the authoring environment. All backend market tests use an official-host mock.
