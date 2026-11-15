# Field Shift 4.4.1 — Visible Market Prices access

This release fixes the discoverability of **Market News** introduced in 4.4. It does **not** modify market-source calculations or any farmer scenario figures.

## How to find it

- **My Options** (step 3): under the highlighted scenario, click **Explore USDA market prices**.
- **Data & details** (advanced): click **Market prices** in the header, or the **Market News** tab (bottom row of navigation).
- Direct route: `http://localhost:5173/#detalle-market` (also accepts `#market-prices`).

The browser tab now reads **Field Shift 4.4.1**, and advanced tools display **Field Shift v4.4.1** so that outdated installs can be detected quickly.

The *official report lookup* requires a free, personal MyMarketNews key on your **local backend** (see `README-4.4.md`); this is separate from simply seeing the market section. The CSV template and importer can be used **without** that key. Raw quotes are for investigation only; they are not applied to agronomic recommendations or estimated revenues.

## Windows upgrade

1. Extract this ZIP to a **new folder** and open CMD inside `field-shift`.
2. Backend: `py -m pip install -r backend\requirements.txt`, then `py -m uvicorn backend.app:app --reload --port 8000`.
3. Frontend in another terminal: `npm install`, then `npm run dev`.
4. Open `http://localhost:5173/#detalle-market` and verify the title is **Field Shift 4.4.1**. If the old title persists, stop old servers, run in the new folder, and refresh with `Ctrl + F5`.

Run regressions with `npm test` and `py -m pytest backend/tests -q`. `npm run build` requires Vite dependencies installed.
