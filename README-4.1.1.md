# Field Shift 4.1.1 — Numerical SMAP availability correction

## What went wrong

The 4.1 release requested `SFMC_PRCNTL` through the NASA POWER daily API with HY community. The real request returned an unsupported/unavailable response. NASA documents SMAP Level-4 variables, but this does **not** mean that this particular API route supports that exact request alias in production. The previous tests used mock NASA responses; there was no verified live numeric response.

Field Shift 4.1.1 does **not** pretend that NASA returned values. The numeric POWER query remains available in an **Experimental** section only, and the main pathway now supports point-sample CSV exported from NASA AppEEARS.

## How to obtain real numerical observations

1. Visit [NASA AppEEARS](https://appeears.earthdatacloud.nasa.gov/) and sign in with a free NASA Earthdata account.
2. Choose **Extract → Point Sample**, enter the current field coordinates and the observation year (2023, 2024 or 2025).
3. Choose product **SPL4SMGP**, surface moisture `sm_surface` (m³/m³), or **SPL3SMP_E**, `soil_moisture_am` or `soil_moisture_pm` (m³/m³). Keep related quality information for later scientific review.
4. Download the point-sample **results CSV**, not the maps or overview screenshots.
5. In Field Shift, open **Data & details → NASA SMAP**. Select the same year and product, upload the CSV, select the measurement column if necessary, and click **Show imported measurements**.

The importer understands the AppEEARS wide-table layout: `Date, Latitude, Longitude, <product_layer>`. Example headers: `SPL4SMGP_007_sm_surface`, `SPL3SMP_E_006_soil_moisture_am`. A data *template* without numbers is provided at `public/smap-point-sample-TEMPLATE.csv`.

## Validation and limitations

- Requires matching year and coordinate within 0.15 degrees of the selected field.
- Accepts only supported surface-moisture layers and physical 0–0.8 m³/m³ values; missing or fill values remain absent.
- Does not infer values from satellite colors, fall back to unrelated NASA POWER `GWETTOP`, or treat percentile rank as volumetric water content.
- Monthly points average available records. The source is **user-uploaded and not independently authenticated**, and quality flags remain for agronomic review.
- Does not change the demo agronomic risk scores or three proposed rotations.
- Historical NASA POWER maximum temperature can appear on a separate axis if queried for the *same year and field*.
- It is fine to keep using the SMAP image overlay when no numeric sample is available.

## Run and test

Backend:

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

Frontend:

```cmd
npm install
npm run dev
```

Tests:

```cmd
npm test
py -m pytest backend\tests -q
```

The backend experiment can still be checked with `py backend\diagnose_smap_numeric.py` but an unavailable response is not a broken frontend.
