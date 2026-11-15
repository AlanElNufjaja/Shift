# Field Shift 4.1 — SMAP L4 Numerical Evidence (Experimental)

The project preserves the existing three-step Farmer Assistant, NASA POWER climate, USDA SSURGO/CDL lookups, SMAP L3 imagery, historical California pilots and P2 scenario review.

## What is new?

In **Data & details → NASA SMAP** the user can click **Query numerical SMAP** and select 2023, 2024 or 2025. The FastAPI backend then requests `SFMC_PRCNTL` from NASA POWER's **daily** service using the `HY` community and `UTC` time standard. The backend normalizes valid daily values into 12 monthly **mean percentiles**, preserving missing months and recording valid-day counts. The browser displays the response independently of the colorized GIBS map.

**IMPORTANT: A moisture percentile of 20 is NOT 20% soil water by volume.** It is a *rank relative to historical moisture distribution*. It cannot establish field-scale drought or crop stress. NASA POWER documents the SMAP-constrained L4 product, at a nominal ~9 km resolution, but access to the `SFMC_PRCNTL` parameter can vary by upstream availability. The application DOES NOT fall back to MERRA-2 `SFMC`, `GWETTOP`, fictional P1 values or colors from GIBS if the parameter is unavailable. Check actual availability on your computer.

When the separate **NASA POWER** tab has already loaded climate data for the same year and selected coordinates, the new chart overlays **maximum temperature (°C)** on a second axis. Different years are never silently combined. Neither this chart nor the original demo chart or strategy engine is modified by an SMAP lookup.

The source inventory and optional browser-generated PDF identify a completed SMAP percentile query separately from the GIBS image.

## Local installation (two terminals, in `field-shift`)

Terminal 1:

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

Terminal 2:

```cmd
npm install
npm run dev
```

Open `http://localhost:5173`, choose a field, and go to **Data & details → NASA SMAP**. Select **2024** → **Query numerical SMAP**. To check upstream availability without the UI:

```cmd
py backend\diagnose_smap_numeric.py
```

For a two-variable chart, query **2024** climate in the NASA POWER tab, then return to NASA SMAP. If the server returns an unavailable message, it means the SMAP-only numeric parameter was not served; satellite imagery still works independently. No API key is required for the NASA POWER endpoint.

## Regression verification

```cmd
npm test
py -m pytest backend\tests -q
npm run build
```

`npm run build` needs Vite packages installed. Verify the actual NASA POWER response in your own network; tests mock NASA responses and must not be interpreted as proof of upstream availability.

## Scientific provenance

- Numerical: [NASA POWER Hydrology methodology](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/) — SMAP L4, SFMC_PRCNTL, percentile rank, approximate 9 km.
- Imagery: NASA GIBS SMAP L3, independently sampled by date. It is **not** the source of the percentile graph.
- Percentiles are descriptive evidence and are **not** automatically fed into crop scenarios, NASA POWER weather alerts or the historical model.
