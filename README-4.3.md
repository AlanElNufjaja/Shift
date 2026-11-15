# Field Shift 4.3 — Cross-source Evidence Review

This release starts connecting *already available* NASA/USDA observations into one transparent screening view, without claiming that the original P2 fuzzy model is executable.

## What's new

- **Field Conditions:** a small "Official evidence review" shortcut appears after at least one eligible observation has been queried. The farmer's three-step journey stays simple.
- **Data & details → Assessment:** a descriptive, month-aligned NASA POWER + NASA SMAP view, where each source must refer to the **same coordinates and year**.
- **Source cards:** separately label a completed NASA POWER query, numerical AppEEARS data (downloaded by the local API or imported CSV), a USDA SSURGO point-map lookup, and a USDA CDL *single-pixel* crop classification.
- **PDF:** indicates whether cross-source screening was possible, its observation year and matched months, plus a statement that no P2 model or scenario was recomputed.
- **Isolation:** existing NASA queries, the AppEEARS bridge, USDA lookups and demo recommendations remain independent. The SSURGO context resets on field change.

## Important limits

- A NASA POWER **monthly maximum air-temperature estimate** and an AppEEARS **monthly mean surface-moisture estimate** have different temporal aggregates. A shared month is not proof that heat and low moisture occurred at the same time.
- AppEEARS point observations are surface **volumetric moisture** in **m³/m³**, not SMAP percentiles or percentages of water content.
- The screen requires >=8 valid month pairs for the same selected location and year (a *coverage rule*, not a crop-risk threshold).
- The displayed "warmer-and-drier" count uses **within-year medians of paired monthly values**: a month must have a temperature **above** the corresponding median and moisture **below** its corresponding median. This is descriptive screening, **not a validated crop-stress or irrigation alert**.
- Uploaded CSVs are not independently audited, even if their fields and range passed the import validator. No field-scale QA flags have been reviewed.
- SSURGO describes mapped units and components, not an actual field soil test. CDL describes a single pixel, not a verified crop planting history.
- No imported record changes current demo alerts, the three P2 scenarios, economic estimates, or model scores. The original P2 algorithm is still needed for new recommendations.

## Running and testing on Windows

Start in the `field-shift` folder, with two terminals:

```cmd
py -m pip install -r backend\requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

```cmd
npm install
npm run dev
```

Navigate to http://localhost:5173, select **Fresno**, then:

1. Open **Data & details → NASA SMAP**, choose **2024** and import a valid AppEEARS numeric CSV for exactly the selected coordinates, or use the existing local Earthdata task integration.
2. Open **NASA POWER**, choose **2024** and press the explicit query button.
3. Open **Assessment**. The new **Do warmer and drier months overlap?** panel shows paired-month coverage, relative monthly overlaps, a dual-axis graph (if >=8 pairs), and limitations.
4. Switch to **Bakersfield** or use arbitrary global coordinates. The previous sample must not appear as matching that field. New requests are required.
5. In **My Options**, download the report PDF to see the cross-source screening status. Verify that the crop scenarios remain explicitly demo/P2 supplied.

Other checks:

```cmd
npm test
python -m unittest discover -s backend/tests
npm run build
```

`npm run build` requires installed dependencies. It has not been executed in the packaging environment. Automated tests use fabricated observation fixtures to verify validation and screening logic. **They do not verify actual external NASA/USDA responses.**

## Files added

- `src/lib/observedEvidence.js` — pure location/year/units/coverage gate and descriptive calculation.
- `src/components/data/ObservedEvidencePanel.jsx` — data screen and optional farmer shortcut.
- `tests/observed-evidence-4.3.test.mjs` — tests for location contamination, mismatched years, missing records, sources and limits.

This is an **incremental, auditable first step** toward a P2 model backed by validated input data. It is not a production-ready global crop model.
