# Field Shift 4.5.2 Stable — TEAM HANDOFF

**Start here for this delivery:** [Team install, status and deployment](docs/TEAM_HANDOFF.md) · [Next developer/AI handoff and pending work](docs/AI_HANDOFF.md) · [SMAP Fresno 2024 provenance](docs/SMAP_FRESNO_2024.md) · [Release verification](docs/RELEASE_QA.md).

This package preserves the **three-step English farmer assistant**. The requested redesign and optional fourth `Data & Evidence` step are intentionally **NOT implemented**; both are specified as future work. A user-supplied **NASA AppEEARS SMAP L4 numerical CSV (Fresno, 2024)** can now be opened with one click under Data & Details → NASA SMAP. It is not applied to simulated rotations.

---

> **Field Shift v4.5:** USDA Market Prices now shows selected comparable quote groups, latest price and historical line charts from manually reviewed CSV (extended commercial fields required). This does **not** feed the simulator. See [README-4.5.md](README-4.5.md).

> **v4.4.1 navigation update:** USDA Market News can now be opened directly from **My Options → Explore USDA market prices**, the advanced header **Market prices** shortcut, or `#detalle-market`. Details: `README-4.4.1.md`.

> **Field Shift 4.4:** For USDA Market News read-only report lookup and quotation CSV review, see [README-4.4.md](README-4.4.md). SMAP AppEEARS numerical task remains pending.

# Field Shift 4.3 — Cross-source Evidence Review

**New in 4.3:** [See README-4.3.md](README-4.3.md) for the observation screening, limitations, installation and QA walkthrough.

# Field Shift 4.2 — AppEEARS automated SMAP (local-only)

See [README-4.2.md](README-4.2.md) for the setup and security notes.

> **Field Shift 4.1.1:** Numerical SMAP requests to NASA POWER may be unavailable. See [README-4.1.1.md](README-4.1.1.md) for the supported Earthdata AppEEARS CSV point-sample workflow. No numerical measurements are inferred from imagery.

# Field Shift 4.1 — Numeric SMAP (experimental)

See [README-4.1.md](README-4.1.md) for installing and testing the new, independently queried NASA SMAP L4 surface-moisture percentiles. These are percentile ranks, not volumetric water percentages. All prior capabilities are preserved.

---

> Latest update: **Field Shift 4.0 — NASA SMAP imagery via NASA GIBS**. See [README-4.0.md](./README-4.0.md).

# Field Shift 3.9 — Dynamic USDA crop-map point lookup

**New:** [README-3.9.md](README-3.9.md) — USDA CDL crop classification by location/year, setup, limitations, and test steps.

# Field Shift 3.8.1 — USDA soil lookup stability patch

See **[README-SOIL-500-FIX.md](README-SOIL-500-FIX.md)** for the two-stage SQL fix, Windows instructions, error handling and verification status.

> **Field Shift 3.8:** See [README-3.8.md](README-3.8.md) for the optional judge tour, dynamic USDA point lookup, and safe-source limitations. See [DEMO-90-SECONDS.md](DEMO-90-SECONDS.md) for a prepared demo.

> **Field Shift 3.7:** See [README-3.7.md](README-3.7.md) for the optional judge tour, PDF export, source-status panel, and acceptance checks.

# Field Shift 3.6 — P2 Model Handoff & Integrity Review

**Farmer UI remains English and unchanged:** My Field → Field Conditions → My Options.
California team-model snapshots remain read-only. Field Shift does **not** have P2's fuzzy membership functions, rules, source code or independent agronomic validation, so no new suitability score is calculated or used to replace the three demo/P2 scenarios.

## What is new in 3.6

1. **Data & details → P2 engine → Review a model run:** load a JSON file produced by P2, with the specific year, field identity, coordinates, score, category, candidate crops and four declared inputs.
2. **Local integrity checks:** reject unknown schema, invalid coordinates, duplicated pilot IDs, wrong year, missing inputs, malformed score and inconsistent metadata. Valid results are compared *field by field* against the supplied **2024 team archive**. Mismatches are displayed, not silently corrected.
3. **Explicit scientific boundaries:** matching the original score only shows agreement with the archive. It is not proof that P2 actually ran the algorithm, that the formula is reproducible, or that NASA/USDA inputs were verified. The uploader NEVER modifies the farmer assistant or the scenario simulator.
4. **P2 handoff files:** download `model-run-CONTRACT.json` (fillable structure) and `model-run-SAMPLE-NOT-COMPUTED.json` (FICTIONAL demonstration, deliberately copied from the historical archive; not a new model run).
5. **Backend capability endpoint:** `GET http://127.0.0.1:8000/api/models/capabilities` returns `model_execution_available: false` and lists what P2 must deliver before real calculation is possible. The global NASA POWER endpoint remains unchanged.

## Acceptance walkthrough

1. Start both terminals as described below. Visit **Data & details → P2 engine**, scroll to **Review a model run**.
2. Download the **Sample (not computed)** and select it via the file picker. It should report **3/3 pilot fields; 3 archive matches**, with explicit notices about its fictional and non-executable nature.
3. To see a difference, edit the sample JSON's `results[0].score` to another finite number and reimport. Fresno will show a change relative to the team archive, not a new scientifically validated recommendation.
4. Try changing Fresno's coordinates to Buenos Aires or the year to 2025. Import must be **blocked** rather than assigning California output to a different place or time.
5. Return to the farmer assistant, compare strategies, query NASA POWER and select a global point. None of those outputs should change because of this *local review*.
6. Run `npm test`, `python -m unittest discover -s backend/tests -v`, `npm run model:check -- public/model-run-SAMPLE-NOT-COMPUTED.json` and (after dependency installation) `npm run build`.

## Contract for P2

```json
{
  "schema_version": "field-shift.model-run.v1",
  "kind": "model-run",
  "fictional": false,
  "metadata": {
    "model_id": "replace-with-name",
    "version": "replace-with-version",
    "method": "replace-with-method-and-rule-base-description",
    "executed_at": "2026-11-14T00:00:00Z",
    "code_reference": "git-commit-or-source-url",
    "input_sources": [{ "source": "NASA POWER or actual dataset name", "period": "2024" }]
  },
  "results": [
    {
      "field_id": "fresno-01",
      "year": 2024,
      "coordinates": { "lat": 36.6, "lon": -120.1 },
      "score": 32.3,
      "category": "No_Recomendado",
      "recorded_crop": "Tomato",
      "candidate_crops": ["Safflower", "Wheat"],
      "inputs": {
        "Disponibilidad_Hidrica": 0.62,
        "Estres_Termico": 0.99,
        "Salud_suelo": 0.45,
        "Historial_Monocultivo": 3.0
      }
    }
  ]
}
```

The numerical values above are **examples copied from the delivered archive**, not an independently recomputed model output. P2 should replace values and metadata with a real, versioned run. One to three pilot results may be supplied; 2024 is the only supported year in this comparison. Until the actual rules are available, `kind: "snapshot-replay"` is the more accurate classification for copied historical values.

**Files P2 still needs to hand over:** executable rule base and membership functions, input normalization/units, code version, run-level evidence/provenance, model calibration method, validation results and (separately) a mapping from fuzzy output to the three comparable crop-rotation scenarios. The reported suitability score is not a probability, water saving, yield forecast or economic outcome. No geographic generalization is justified from the three pilots.

---

# Previous release: Field Shift 3.5 — Team Model Evidence Bridge

**UI: English · 3-step farmer assistant · Pilot snapshots remain separate from global climate and P2 strategy scenarios.**

## What changed from 3.4

- **My Options → optional Team model · 2024 snapshot:** Shows the supplied model category, raw suitability score, recorded crop and crop candidates for the *currently selected California pilot*. The model evidence is a separate card **below**, not a replacement for the existing three strategies. Global coordinates never inherit pilot results.
- **Read the four inputs on demand:** Water availability, heat stress, soil health and repeated-crop history are displayed as the **literal values** reported in the team's dataset. They are *not* percentages or directly comparable measurement units. In particular, the repeated-crop index can be `3.0`.
- **Data & details → P1 data:** The historical panel now contains the same evidence breakdown and three checks (crop ↔ 2024 archive, score ↔ 2024 archive, presence of reported inputs). Passing these checks means **internal consistency only**, not verification of the model formula, NASA/USDA provenance or agronomic validity.
- **Shared archive loader:** The archive is fetched only when a user reaches the options step or advanced history. Both views reuse the same verified local archive rather than copying model values into a second JSON.
- **Source-order candidate crops:** The order shown matches the team's supplied text. Crop candidates are not marketed as proven best crops, and there is **no recalculation** of water, nitrogen or economic outputs.
- **Offline audit:** `npm run data:model-audit` verifies internal data consistency, reports the three pilot score categories, and reiterates the scientific limitations.

**Scope limitation:** The provided files contain model *outputs and input variables* but no reproducible fuzzy rule base, membership functions, calibration, weighting or field-validation study. This release does not claim to rerun the model or justify its score causally. It deliberately does not merge the historical 2024 scores with simulated P2 scenarios or apply them outside the three named pilots.

## Quick acceptance walkthrough

1. Start frontend and backend as below. Visit **My Field**, select Fresno, proceed to **My Options**.
2. Under the separate **Team model · 2024 snapshot**, verify: recorded crop Tomato, category *Not favored by team model*, raw score `32.3`, candidate crops Safflower / Wheat. Expand the four inputs if wanted.
3. Open **10-year team history**. Review the same model result in **Data & details → P1 data**. Change the historical year; the model snapshot remains explicitly a *2024* result.
4. Switch to Bakersfield and Davis. Confirm their scores are `18.65` and `50` respectively and the crop candidates differ for Davis.
5. Select a global point via latitude/longitude. There must be **no** California team-model card, historical crop data or fabricated global rotation scenarios.
6. Confirm the NASA POWER query, the P1/P2 import flows and simulated strategy comparison still work.

**Run tests:** `npm test`, `npm run data:model-audit`, `python -m unittest discover -s backend/tests -v`, and (after `npm install`) `npm run build`.

---

# Field Shift 3.4 — Team History & Transparent Model Evidence

**Frontend: English · Farming assistant: still three simple steps · Global coordinates: unchanged.**

## What changed from 3.3

- **Field Conditions → 10 years of team crop history:** a *single, optional* link appears for Fresno, Bakersfield, and Davis. The main assessment continues to use its labeled fictional sample signals. The link opens the advanced **P1 data** tab without breaking the 3-step journey.
- **Data & details → P1 data → Team history:** an interactive historical-year selector (2015–2024), a single dual-axis plot with monthly temperature and team-supplied wetness, four concise annual indicators, and a collapsible 10-year crop timeline.
- **Team model interpretation:** 2024 fuzzy-model score, its source category and crop candidates appear **separately** from the three P2 crop-rotation strategies. Scores are **not percentages, probabilities, yields or validated suitability claims**; the model scale has not been independently audited.
- **Image provenance:** nine team PNGs are available behind an optional expander. They are *illustrative*, not verified georeferenced satellite tiles; they are never overlaid onto the real map.
- **Strict validation:** rejects missing, swapped, duplicated or out-of-order months in the team archive. Changing pilot fields resets the selected historical year to 2024; custom global points get no California historical scores or crop recommendations.
- **English UI** and **OpenStreetMap without an API key** remain intact.

**Important distinction:** data files in `entregables_data_react_REAL.zip` are *team-supplied*, not independently audited. NASA POWER real-time consultations remain independent. Historical wetness in the team file must **not** be described as validated SMAP data. The historical 2015–2024 series is **not merged** with the illustrative California demo diagnosis, team/legacy coordinates differ, and the fuzzy score is **not fed into the P2 scenario or global recommendation engine**.

## How to run on Windows

Unzip to a **new** directory, then open two terminals inside `field-shift`.

**Backend (Python 3.10+):**

```cmd
py -m pip install -r backend/requirements.txt
py -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

**Frontend (Node.js 20.19+):**

```cmd
npm install
npm run dev
```

Visit `http://localhost:5173`. The backend health check is `http://127.0.0.1:8000/api/health`.

## Acceptance test for 3.4

1. My Field → Fresno → Field Conditions → **Explore history**. This opens **Data & details → P1 data**.
2. Select **2019** and verify the chart and annual crop both change; return to **2024**. Expand the **10-year crop history** only if needed.
3. Expand **Understand the team's fuzzy-model output**; confirm that the score is **not** presented as one of the three strategies, and the candidate crop names are in English.
4. Switch to Bakersfield and Davis; their history changes and the selected year resets to 2024.
5. Choose a global coordinate (for example, `-34.6037, -58.3816`). The team-history tab should state *no historical dataset for this location*. The global climate flow stays functional if the Python backend and NASA POWER are available.
6. Verify NASA POWER queries, P1/P2 imports, simulated strategy comparison and CSV exports are unchanged.

## Archive and schema notes

`public/data/team-pilot-2015-2024.json` is the normalized **team-owned** archive from the REAL package; the original `reference/json_maestro_campo_original.json` is retained separately. `src/lib/teamPilotAdapter.js` validates the source and produces `fullMonths` (120 monthly entries) and `annual` (10 years). The tiny `src/data/team-pilot-summary.json` is only a static, **team-supplied** label for the farmer-facing link. If team records change, regenerate that summary from the updated archive; do not hand-edit it as a new observation.

## Tests

```cmd
npm test
npm run build
python -m unittest discover -s backend/tests -v
```

The Node tests validate data adapters, file paths and legacy behavior; they do not replace interactive browser testing or external scientific validation. The Vite build requires installed dependencies. No live NASA query was required to run the offline tests.

---

# Field Shift 3.3 — Global Coordinate Explorer (integration slice)

**Front-end language: English.** This package extends Field Shift 3.2.1. Existing California demo pages, P1/P2 import, OSM map, NASA POWER live monthly chart, scenario simulator and guided 3-step UI remain available.

## Changes in this release

- **My Field:** choose one of three pilot locations, enter decimal-degree latitude/longitude worldwide, use the optional browser geolocation permission, or select a point by clicking the map in **Pick on map** mode.
- **Field conditions (global):** the new Python API calls NASA POWER's official monthly point service and returns 2024 temperature (°C) and precipitation (mm/day) with 12-month availability counts. Global data is **climate-only**, not recommendations; absent observations remain missing.
- **My Options (global):** no California demo strategies are attributed to an arbitrary global site. Local soil, crop history, market data, and recommendations are shown as unavailable.
- **Data & details → P1 data:** additional **Team dataset · 2015–2024** read-only panel from `entregables_data_react_REAL.zip` (three pilots). The team's normalized values and unverified fuzzy score are **not** automatically merged into the original demo indicators or P2 strategy model. Team site coordinates differ from original demo pin coordinates.
- **NASA POWER** advanced direct query still works without the Python API; the climate-only summary on step 2 uses the Python API.

## Windows installation (two terminals)

Unzip the archive and enter the `field-shift` folder.

**Terminal 1 — API** (Python 3.10+):

```powershell
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Test http://127.0.0.1:8000/api/health — should report status `ok`.

**Terminal 2 — React** (Node.js 20.19+):

```powershell
npm install
npm run dev
```

Visit http://localhost:5173. Vite forwards `/api` to the local Python server and `/nasa-power` to the existing NASA POWER proxy. **No paid map/API key needed.**

### Quick test

1. Try Fresno → Field conditions → My Options. Existing demo results should remain.
2. In My Field, use **Coordinates**, enter latitude `-34.6037`, longitude `-58.3816` and press **Use these coordinates**. On the map, the selected pin should move to that location.
3. Go to **Field conditions**. If the API is running and NASA POWER is reachable, a 2024 monthly climate summary appears. No soil or crop recommendation is shown. If API/NASA fails, the panel gives a retry option and never fills in fictional values.
4. Go to **My Options**: it should say that local evidence is needed.
5. Return to **My Field**, select a California pilot and go to **Data & details → P1 data** to inspect 2015–2024 team history and its coordinates.
6. Open **Data & details → NASA POWER** for the existing live NASA chart. Check that switching locations clears previous values.

## Frontend/backend API contract

`POST /api/fields/analyze` with `Content-Type: application/json`:

```json
{"lat": -34.6037, "lon": -58.3816, "year": 2024}
```

Returns status `climate-only`, the same coordinates/year, 12 monthly records (`date`, `temperature_max_c`, `precipitation_mm_per_day`), counts and NASA source/provenance; `soil`, `cropping_history`, and `recommendations` explicitly return `unavailable`. Coordinates outside lat [-90,90] or lon [-180,180] return HTTP 422. Failed NASA calls return HTTP 502 (no invented fallback). Remote observations are only requested after the user selects custom coordinates.

NASA POWER monthly precipitation is a **mean rate (mm/day)**, not a monthly total. A monthly `T2M_MAX` value is not proof of a measured on-field temperature or crop stress. The API deliberately does **not** return `GWETTOP` as "SMAP moisture".

### Hosting

Local development uses `vite.config.js`'s `/api` proxy. In production, host `backend/app.py` on a Python platform and set `VITE_GLOBAL_API_BASE=https://your-python-backend.example/api` in your frontend build. Add the precise HTTPS frontend origin to the backend environment variable `FIELD_SHIFT_ALLOWED_ORIGINS` (comma-separated list). OSM's public tiles are subject to its usage policy; this demo is not a production tile hosting solution. A static-only Vercel deploy cannot run Python FastAPI merely by bundling this folder; deploy the backend separately.

## Data quality / what was deliberately excluded

- The `REAL` package contains three team snapshot sites and **not** a global source. Data were copied **as delivered** and shown as **team-supplied/unverified**. The 2024 wetness series is not independently verified as SMAP volumetric moisture. Fuzzy suitability scores are not substitutes for the three P2 rotation scenarios.
- The original `moa.py` hardcodes Fresno as a fallback for arbitrary locations and replaces NASA missing values with invented values. For safety it is copied to `reference/moa_original.py` only; **do not run it as the global service**. `backend/app.py` is a separate, validation-first adapter.
- `json_maestro_campo.json` and the REAL package have overlapping historical samples. The original file is retained in `reference/` for traceability but is not used in the live UI.
- SSURGO and CropScape are geographically limited to U.S. coverage. Their California attributes are not extrapolated globally. Prices in the team file lack auditable market timestamps; no global price predictions or income estimates are made.
- Three legacy California markers retain their demo coordinates. Team snapshots use different team coordinates; **not auto-merged**.
- Python API currently asks for **2024** full-year climate, rather than claiming up-to-the-minute conditions or predicting future weather.

## Verification commands

```powershell
npm test
npm run build
python -m unittest discover -s backend/tests -v
```

These source tests do not substitute for checking NASA connectivity and appearance in a real browser. Do not upload sensitive field coordinates to a third-party API without the farmer's permission.

---

## Previous release documentation

# Field Shift 3.2.1 — English UI stability patch

This patch fixes the translated NASA POWER view and leftover Spanish labels. It retains all data contracts, geographic layers, agricultural scenarios, and the 3-step farmer assistant.

**Fixed:** missing `displayMonth` imports in `PowerDiagnosticSummary` and NASA chart tooltip; a misspelled variable in the sidebar focus trap; untranslated labels in evidence, decision brief, source status and P1 import; demo-example download URLs (original `FICTICIO` filenames retained); fictional sample descriptions. Added React error boundaries so an unexpected advanced-panel crash shows a retry message rather than a blank page.

**Data contract remains unchanged:** month identifiers (`Enero`...`Diciembre`), status enums, P1/P2 JSON keys, and stored coverage labels remain in their original technical format. They are translated only for presentation. Free text in newly imported external JSON is displayed as supplied.

**Quick regression check:** navigate My Field → Field Conditions → My Options → Data & details → NASA POWER. Query 2025 and hover a chart point to test the English month tooltip. Return to the detailed assessment and open the NASA POWER climate summary. Open P1/P2 and download both fictional samples.

**Commands:** `npm install`, `npm run dev`, `npm test`, `npm run build`. The source tests were run in this environment, but the Vite build requires installed npm dependencies and was not verified here.

---

# Field Shift 3.2 — English interface

Field Shift is a React/Vite prototype for exploring agricultural conditions and crop-rotation alternatives in California's Central Valley. Version 3.2 translates the farmer-facing journey and the advanced science/data workspace into **English (United States)** while retaining the behavior and data contracts of Field Shift 3.1.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`). To validate locally:

```bash
npm test
npm run build
```

This code uses **OpenStreetMap tiles** via React-Leaflet and does **not** require a map API key. The public tile service is subject to its usage policy. NASA POWER can be queried without an API key using the existing development proxy. A network connection is needed for map tiles and live NASA POWER requests.

## Farmer journey

1. **My field** — choose Fresno, Bakersfield or Davis on the map.
2. **Field conditions** — review up to three simple signals, with explanations and clearly marked limitations.
3. **My options** — set your priority and compare the highlighted crop-rotation option with the baseline.

The **Data & details** area retains the full map layers, charts, NASA POWER query, P1 imports, P2 recommendation intake, scientific transparency panels, sensitivity controls, and CSV export.

## Translation and backward compatibility

All navigation labels, buttons, legends, help text, errors, alerts, scientific explanations, sample scenario descriptions, and exported user-facing messages have been localized to English. Numeric formatting uses `en-US`, and `index.html` uses `lang="en"`.

**Do not translate the internal JSON schema keys.** The original team data contract uses keys such as `nombre`, `clima_mensual`, `suelo_ssurgo`, `historial_cropscape`, `humedad_smap_pct`, and `meses_suelo_desnudo`. The priority IDs (`agua`, `suelo`, `rentabilidad`, `erosion`), month keys (`Enero` through `Diciembre`), and scenario cover values (`Cubierto`, `Desnudo`, `Desconocido`) remain unchanged for compatibility with existing algorithms, P1/P2 payloads and tests. English equivalents are rendered in the interface using `src/lib/displayEnglish.js`.

## Data provenance and safety

- The included field and rotation values are **fictional demonstration data**, not verified observations.
- The NASA POWER monthly query returns regional meteorological information; it does not measure conditions inside an individual field.
- Imported SMAP, SSURGO and CropScape records are user-provided and are not automatically considered audited.
- Different observations are compared only when the documented date/location criteria are met. Demo alerts and recommendations remain separate from imported records.
- Revenue indicators are **gross revenue**, not net farm profit. Potential nitrogen contribution does not equal fertilizer savings, and months with cover do not quantify erosion prevented.
- Results are exploratory and require agronomic field validation before real farm decisions.

## Project structure

- `src/components/overview/` — farmer journey UI.
- `src/components/map/`, `src/components/MapView.jsx` — interactive field map.
- `src/components/data/` — scientific/data workspace and imports.
- `src/components/strategy/` — comparison, explanation, and scenario controls.
- `src/context/` — shared field, NASA POWER and navigation state.
- `src/lib/` — validation, exploratory calculations, formatting and English display localization.
- `src/data/` — fictional sample field and scenario JSON.
- `public/` — P1/P2 sample payloads and templates.
- `tests/` — Node tests for the original rules and UI structure.

## Connecting real team data

P1: import a compatible JSON through the advanced **P1 data** panel. Source, period, units and geographic identifiers must be validated; imported records are not automatically merged into scenario recommendations.

P2: connect the existing `/recomendar` endpoint through the configured Vite environment settings, or load the provided **fictional** P2 example to test the interaction. Keep the response contract's internal property names unchanged.

## Environment notes

Use `.env.example` as a reference for optional API/proxy configuration. Do not commit secrets. This project does not require any map API key.


---

## Live demo and source code

- **Live web app:** [Field Shift — NASA Space Apps 2026](https://field-shift-judge-demo.onrender.com/#etapa-3)
- **GitHub repository:** [AlanElNufjaja/Shift](https://github.com/AlanElNufjaja/Shift)
