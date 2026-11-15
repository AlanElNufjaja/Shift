# AI / Developer Handoff — Field Shift 4.5.2 Stable

> **Read first.** This is a handoff for the NEXT development session. **Do not implement the optional Step 4 or redesign the UI now**. The user expressly requested a frozen, stable package and a written plan for later. Ask the user for approval before changing the UX.

## Goal and present architecture

NASA Space Apps 2026 — Field Shift, a simple agricultural decision-support prototype with traceable evidence. Current farmer journey is **3 screens in English**:

1. `My Field` — global latitude/longitude, California pilot sites, Leaflet map.
2. `Field Conditions` — short nontechnical signals and optional USDA/NASA evidence.
3. `My Options` — 4 farmer priorities and demo/declared P2 strategy comparison.

`Data & Details` is an existing **advanced workbench** with 8 tabs (field, assessment, strategies, NASA POWER, NASA SMAP, P1 data, P2 engine, Market News). This workbench is dense; reviewer feedback asks for **UI simplification and relocation of extra data to a fourth OPTIONAL step**. **Not done in this release.**

React 19 / Vite 7 / Tailwind 4 / React-Leaflet 5 / Recharts 3 / FastAPI. `App.jsx` composes contexts by selected field. `FieldContext` stores parcel/priorities and imported P1/P2 records. `GuidedFlowContext` manages journey and advanced tabs. External lookups are optional; analyses must not be advertised as automatic global prescriptions.

## What changed specifically in 4.5.2

The user uploaded a completed AppEEARS point-sample ZIP (task `26454539-0d77-4a58-9996-fdd3d8b9abaf`) containing `SPL4SMGP.008` / `Geophysical_Data_sm_surface` for **36.7468, -119.7726**, **2024**. The supplied CSV contains **2,928 observations** for **12 months** (3-hourly values) in **m³/m³**. No value failed the basic 0–0.8 numeric bound. This is a modeled regional 9-km estimate, not direct irrigation or soil-probe data. See `docs/SMAP_FRESNO_2024.md`.

- Exact input CSV is retained at `public/data/smap-fresno-2024.csv`.
- Sanitized manifest without Earthdata account email at `public/data/smap-fresno-2024-provenance.json`.
- In `src/components/data/SmapNumericPanel.jsx` the button **Load supplied Fresno sample** appears only when selected coordinates are precisely Fresno pilot (36.7468, -119.7726), year 2024. It calls existing `inspectSmapCsv` / `parseSmapCsv`; nothing auto-loads on new fields or automatically changes P2.
- `src/lib/observedEvidence.js` and the summary/PDF views recognize source type `bundled-appeears` separately from manual upload and local authenticated task.
- Tests: `tests/stable-bundled-smap.test.mjs` validates the actual CSV, matched dates, units and provenance.

Source export's request JSON contained an email in `user_id`. **The original raw request JSON was intentionally NOT bundled**, only sanitized provenance metadata; do not reintroduce any personal account details or auth material.

## Known capabilities and non-claims

| Feature | Claim permitted | What NOT to claim |
|---|---|---|
| NASA POWER | Official monthly climate, queried by coordinates | Live field sensor or real-time instantaneous climate |
| USDA SSURGO | Soil mapping in covered U.S. area (API; user verified locally) | Field lab result or global coverage |
| USDA CDL | Crop class for queried pixel/year (API; user verified locally) | Proven crop history for an entire farm |
| GIBS SMAP L3 | Image overlay for selected date | Numerical moisture inferred from pixel color |
| AppEEARS SMAP L4 | Bundled Fresno 2024 volumetric sample; manual CSV and local task bridge | Numeric series for any coordinate automatically; observation QA complete |
| P1 team archive | 2015–2024 historical supplied data, separately labeled | Independently audited evidence |
| P2 | Imported historical model scores and demo comparisons | Executable fuzzy inference or validated new field recommendations |
| Market News | Read-only report explorer with local key; vetted CSV comparisons | Automatically normalized US prices, net margin, or live economic outputs |

The user confirmed many components work in their local environment, but **this specific release's UI and build have not yet been browser/deployment tested here**. Automated unit tests and file audit are recorded in `docs/RELEASE_QA.md`.

## Priority backlog (DO NOT START UNTIL USER RETURNS)

1. **UX redesign / simplify further:** reviewer asked for a *fourth optional step* for extra data/evidence; keep 3 mandatory steps extremely clear. Move advanced navigation and technical data into optional **Step 4 — Data & Evidence** rather than more tabs on farmer pages. Draft wireframes and user flow **first**, get approval, then implement. Avoid duplicate headers, tiny text, long paragraphs and crowded charts. Maintain accessibility and English UI. Keep the existing advanced tools accessible, not removed.
2. **Production deploy & smoke tests:** user needs a publicly accessible judge URL. `Dockerfile` + `render.yaml` configured for one Render Free service, but account authorization and actual deployment still pending. Confirm Render plan is $0, deploy, test `/api/health`, homepage, worldwide coords and NASA/USDA APIs; no promise of permanent uptime; cold start warning. Verify API proxy routes on public domain. Keep local offline backup.
3. **SMAP sample quality, other points:** audit observation-level SMAP QA and provenance; user only supplied Fresno 2024. Obtain separate point samples for Bakersfield, Davis or global fields (matching exact coords and years) before any combined score. Do NOT reuse Fresno samples elsewhere. AppEEARS automation may take time and is disabled on public hosting.
4. **USDA Market News:** obtain personal API key for local-only read; verify real report response, dates, grades, market and units. Avoid feeding prices into revenue scenarios until crop yield, costs, units and equivalences are verified.
5. **P2 executable fuzzy engine:** request model source, rule base, membership functions, model version and verification cases from P2. Existing import bridge only compares outputs; scores are not probabilities. Do not infer crop recommendations from archived scores.
6. **Agronomic review:** confirm thermal and moisture thresholds, geospatial resolution, time alignment, missing data, local soils outside US. Avoid universal crop stress labels.
7. **Reproducible build / CI:** run `npm install`, `npm test`, `npm run build` in connected environment; run Python tests. CI example is `.github/workflows/ci.yml`. Refresh dependencies intentionally; lock file can be generated from a connected build environment and committed only after testing.
8. **Coordinate consistency:** multiple historical team pilot coordinates are distinct from frontend demonstration markers. Current bundled SMAP sample is for **36.7468, -119.7726**, not team Fresno backup **36.6000, -120.1000**. Never silently combine those sites. Track data by exact location and period.

## State and contract invariants

- Preserve the P1 schema and P2 keys. Write **versioned adapters**, not blind renames.
- Preserve state reset on location change (`App.jsx` providers keyed by ID and coordinates).
- Source status: `bundled-appeears`, `uploaded-csv`, `appeears-api` are distinct. Display factual provenance in PDF and Data Freshness panel.
- Missing observations are `null`; not `0`, not inferred from imagery colors or demo arrays.
- Monthly `sm_surface` is an arithmetic mean of available 3-hourly source values; do not call it percentile or direct irrigation demand.
- ISO dates, years, sources and units must match before descriptive POWER-SMAP overlap checks.
- USDA soil and crop live queries are U.S.-focused; do not use California baselines for other countries.
- Demo scenarios should stay labeled *Demo*; economic forecasts do not automatically incorporate imported market data.
- Earthdata/MyMarketNews credentials must never appear in React, public API responses, static files, ZIPs or repository commits.
- Sample payload is publicly readable by design; contains point coordinates, not the user's Earthdata account identifier.

## Files and how to test

```
field-shift/
  src/App.jsx
  src/context/{FieldContext,GuidedFlowContext,SmapNumericContext}.jsx
  src/components/overview/{FarmerLand,FarmerSituation,FarmerChoices}.jsx
  src/components/data/{DataWorkbench,SmapNumericPanel}.jsx
  src/lib/{smapCsvImport,observedEvidence,fieldReport}.js
  backend/{app,soil,crops,market,earthdata}.py
  public/data/smap-fresno-2024.csv
  public/data/smap-fresno-2024-provenance.json
  docs/{TEAM_HANDOFF,SMAP_FRESNO_2024,RELEASE_QA}.md
  render.yaml, Dockerfile
```

```
# from field-shift/
npm test
npm run build
python -m unittest discover -s backend/tests -p 'test_*.py'
```

**Next message to the AI, suggested:**

> We are resuming Field Shift 4.5.2 Stable. Read `docs/AI_HANDOFF.md` and `docs/TEAM_HANDOFF.md` from the ZIP first. Do not discard existing features. First propose a cleaner UX with three required farmer steps and one optional fourth `Data & Evidence` step; wait for approval before changing code. Keep sample SMAP Fresno 2024 isolated and preserve NASA/USDA provenance and security.
