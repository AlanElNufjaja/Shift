# Field Shift 3.9 — Optional dynamic USDA crop-map lookup

This release extends 3.8.2 **without changing the three-step farmer journey**, NASA POWER, USDA soil mapping, archived 2015–2024 pilot datasets, P1/P2 imports, or scenario calculations.

## What is new

- `POST /api/fields/crops` retrieves **one USDA NASS Cropland Data Layer raster pixel** for the selected latitude, longitude and year.
- Its source is the USDA-hosted [CDL_WM ImageServer](https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer). The service uses an ArcGIS `identify` request with an **explicit Year filter** and requires the returned catalog item to confirm that year; otherwise the pixel is **rejected**.
- Map class labels are taken from the same USDA ImageServer's raster attribute table. If the label service fails, an independently year-verified numeric class code can still be shown; no name is fabricated.
- A strict bound for this particular endpoint: **2020–2024**. USDA has issued the 2025 CDL, but this service's exposed year metadata was not verified for that edition, so 2025 is not offered here.
- Available through a collapsed **Check USDA crop map** section in *Field Conditions* and *Data & details → Field & layers*.
- A record of the lookup and its limited scope appears in *Which data are current?* and the PDF report.
- No classified pixel replaces an actual field crop record, and nothing is fed into crop recommendations or P2 model scores.

**Important:** USDA's Cropland Data Layer is an **annual classification of land cover/crop at raster-pixel scale**, not farmer-reported planting records or a parcel polygon. Errors at borders or in mixed crops are possible. Its ordinary national coverage is the contiguous United States. A check outside that region receives an `outside_coverage` status; the bounding rectangle is only a first filter, and the USDA response ultimately determines actual availability.

## Installation (Windows CMD)

In the unzipped `field-shift` directory, open two terminals:

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

```cmd
npm install
npm run dev
```

Visit `http://localhost:5173`. In the farmer journey choose Fresno → **Field Conditions** → **Check USDA crop map**, select **2024**, and click **Check this point**.

If it says “temporarily unavailable,” do not infer a crop from the team's archives. Diagnose the image service with:

```cmd
py backend\diagnose_cdl.py
```

This prints the upstream HTTP status, raw class value, and the year(s) returned by USDA, helping distinguish connection problems from a year-filter mismatch. It does not edit project files. Send the console output if a live lookup fails.

A positive response identifies just **one map pixel**, not the whole farm. Try another point in the contiguous U.S.; outside the U.S., the page should explicitly say the product lacks coverage.

## Data contract

Request:

```json
{"lat":36.7468,"lon":-119.7726,"year":2024}
```

Successful response shape (illustrative only; `code`/`label` are **not** actual Fresno observations):

```json
{
  "status":"ready",
  "location":{"lat":36.7468,"lon":-119.7726},
  "year":2024,
  "classification":{"code":54,"label":"Tomatoes","year_verified":true,"raster_item_years":[2024],"is_field_crop":false},
  "provenance":{"provider":"USDA NASS Cropland Data Layer (CDL)","source_url":"https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer","retrieved_at":"...","audited":false},
  "cache":"miss"
}
```

Other states: `unavailable`, `outside_coverage`, `unverified`. If upstream fails: HTTP 503 with a controlled `detail.message`; no fake crop is substituted. Coordinate errors are HTTP 422. Success and definitive lack-of-coverage responses are cached in memory for 24 h; errors and unverified years are not cached. All requests happen **on explicit user action**.

## Verification

```cmd
npm test
py -m unittest discover -s backend/tests -v
npm run build
```

Tests with mocked responses verify correct year, class legend, location, no-data, provider failure, and non-U.S. coverage. Actual availability must be checked from a networked machine. The development setup proxies `/api` to `http://127.0.0.1:8000`.

## Official sources

- USDA NASS [2025 CDL release and metadata](https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php)
- [USDA CDL_WM ArcGIS ImageServer metadata](https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer?f=pjson)
- [USDA CDL raster attribute table](https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer/rasterAttributeTable?f=pjson)

This release does **not** connect a live SMAP feed, worldwide crop history, a verified market-price feed, or executable P2 fuzzy-model logic.
