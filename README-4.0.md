# Field Shift 4.0 — NASA SMAP Satellite Imagery

This incremental release builds on **Field Shift 3.9**. Existing OpenStreetMap, NASA POWER, USDA SSURGO, CDL, team archive, P1/P2 review, and assessment tools remain unchanged.

## What's new

**NASA SMAP** is a new tab under **Data & details**. The optional **View NASA image** action in **Field Conditions** opens that tab. It uses the public **NASA GIBS WMS** imagery service, without an API key, to show the `SMAP_L3_Passive_Enhanced_Day_Soil_Moisture` and `SMAP_L3_Passive_Enhanced_Night_Soil_Moisture` layers for a user-selected day.

Users can select a date (from 2015-03-31), a pass (day/night), show/hide the overlay and adjust opacity. The map centers on the selected field coordinates (including global coordinates when available). Satellite imagery is requested **on demand** by Leaflet. Map imagery loading failures are signaled without affecting any other assessment data.

**Important scientific limits:**

- SMAP L3 satellite imagery (roughly 9 km) is **not** a point-value measurement, a root-zone moisture observation, or a field sensor reading. A displayed color is not a number.
- This adds real NASA **imagery** by date, **not** an independent numerical time-series extraction service. The original demonstration JSON's `humedad_smap_pct` values are still synthetic.
- Blank patches may indicate masking or lack of overpass coverage. They are not evidence of zero soil moisture.
- No SMAP image values are fed into the crop-risk thresholds, USDA soil properties, P2 scenarios, PDF numerical indicators or economic recommendations.
- NASA's WMS may be unavailable or not return imagery for a selected date. Date-specific coverage needs checking in the browser.

### Sources

- NASA GIBS official WMS guide: https://nasa-gibs.github.io/gibs-api-docs/gis-usage/
- NASA NSIDC SMAP visualization: https://nsidc.org/data/user-resources/help-center/visualize-and-download-nsidc-daac-data-nasa-worldview
- NASA Worldview: https://worldview.earthdata.nasa.gov/

## Run on Windows

Backend terminal:

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

Frontend terminal:

```cmd
npm install
npm run dev
```

Open `http://localhost:5173` and select a field → **Field Conditions** → **View NASA image**. In **Data & details** choose **NASA SMAP**. For a reproducible first example, use **2024-07-15**, **Daytime pass**, with the **Show overlay** checkbox enabled.

If image tiles fail, check network connectivity or try another date and run:

```cmd
py backend\diagnose_smap.py
```

This script checks GetCapabilities and one GetMap response against the public NASA GIBS endpoint. It requires no secrets or key. A successful image HTTP response still does not guarantee visible SMAP coverage at your chosen point.

## Verification

`npm test` and `python -m unittest discover -s backend/tests -q` run existing and new regression tests. The NASA network service and Vite production bundle must be tested in your own environment when their network dependencies are available.
