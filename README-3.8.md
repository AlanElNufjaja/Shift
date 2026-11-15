# Field Shift 3.8 · Guided Demo + Dynamic USDA Soil Lookup

This is a small, testable extension of Field Shift 3.7. It **does not** introduce a globally executable crop recommendation engine.

## What changed

1. **Judge demo (optional):** `JudgeTour.jsx` now gives three concrete on-screen demo steps and an explicit **Load Fresno pilot** action. It never changes data automatically; the pilot button is user-initiated.
2. **Dynamic USDA soil:** A new `POST /api/fields/soil` endpoint makes an on-demand request to the official USDA NRCS Soil Data Access service for the **selected coordinates** (not the closest California pilot). It uses a documented WGS84 point-intersection query, selects a *major map-unit component and its upper horizon*, and reports limited attributes with provenance.
3. **Farmer experience:** A closed-by-default **Check USDA soil mapping** detail in *Field Conditions*. Clicking it does **not** trigger a lookup until the user presses **Check this location**. The same information is available in advanced *Field & layers*.
4. **Year selector:** The worldwide climate overview can select 2023, 2024 or 2025. NASA POWER remains historical monthly climate, not instant weather.
5. **Source status and PDF:** `Which data are current?` and the assessment PDF distinguish official point lookups from imported or fictional datasets.

## Running on Windows

From the uncompressed `field-shift/` directory, open two terminal windows.

Terminal 1 (backend):

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

Terminal 2 (frontend):

```cmd
npm install
npm run dev
```

Open `http://localhost:5173`. Test backend health at `http://127.0.0.1:8000/api/health`. **No API key is required** for the current OpenStreetMap base tiles, NASA POWER, or this USDA endpoint. These public services have availability and usage limits.

### Two important checks

- **California pilot:** Select Fresno, click *Assess this field*, expand *Check USDA soil mapping*, and press *Check this location*. If USDA returns a result, the app displays the map-unit name and mapped upper-horizon properties. If there is no response or no mapped unit, it says so and retains demo results separately.
- **International point:** Use latitude `-34.6037`, longitude `-58.3816`. NASA POWER should be queried for the selected year when the service is reachable. USDA typically has no SSURGO coverage here: the app must **not** use Fresno soil, crops, prices or recommendations as fallback.

## Data integrity / limitations

| Source | Status | Caveat |
|---|---|---|
| NASA POWER | Official API on request | Historical monthly regional estimates, not actual sensor measurements |
| USDA NRCS Soil Data Access | Official API on request | **U.S.-focused** point query; mapped major component and top horizon, not a soil sample |
| SMAP | No automatic verified live feed | Pilot/mock or locally imported files only |
| CropScape/CDL | No automatic verified live feed | Historic/team records and imports; U.S. only |
| USDA Market News | No live price feed | Sample reference prices cannot be treated as current local prices |
| P2 fuzzy model | Historic scores and contract validation only | Original rule base/functions not executable; scenario comparisons remain demo or declared P2 |

The on-demand soil lookup **does not alter** the four example risk signals, three strategy metrics, global recommendations, or model scores. We deliberately do not conflate SSURGO `kffact` with quantified erosion risk, nor SSURGO `awc_r` with measured water availability in the field. No soil value is substituted on request failure.

### Backend contract

`POST /api/fields/soil`

```json
{"lat":36.6,"lon":-120.1}
```

- `status=ready`: `soil` includes `mapunit_key`, `mapunit_name`, `component_name`, `component_fraction_percent`, `horizon_top_cm`, `horizon_bottom_cm`, `organic_matter_percent`, `available_water_capacity_fraction`, `soil_erodibility_k_factor` (some may be `null`).
- `status=unavailable`: the USDA service returned no mapped unit; `soil=null`.
- HTTP 422: invalid geographic coordinates.
- HTTP 502: USDA unavailable or returned unexpected content; no fabricated data.
- Responses contain the provider, lookup timestamp, and `cache` (12-hour memory cache, **not a guarantee of source update frequency**).

### Tests

```cmd
npm test
py -m unittest discover -s backend\tests -v
npm run build
```

The first two test suites were executed in the authoring environment with mocked NASA and USDA responses. `npm run build` must be run locally if dependencies cannot be installed in the authoring environment. Run at least one real USDA request from your network: upstream connectivity and data coverage are not guaranteed by mocked tests.

## Official references

- USDA NRCS Soil Data Access: https://sdmdataaccess.nrcs.usda.gov/webservicehelp.aspx
- USDA SDA point-intersection example: https://nasis.sc.egov.usda.gov/NasisReportsWebSite/limsreport.aspx?report_name=SDA-PointIntersect
- NASA POWER monthly API: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- OpenStreetMap tile use policy: https://operations.osmfoundation.org/policies/tiles/

See `DEMO-90-SECONDS.md` for a short judge walkthrough.
