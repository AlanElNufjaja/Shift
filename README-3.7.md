# Field Shift 3.7 — Presentation & Honest Data Summary

**Start from Field Shift 3.6.** No data source was silently changed. NASA POWER still runs only when requested, team archives remain static, and P2's original fuzzy model still cannot execute without its code and rule base.

## What's new

1. **Optional judge walkthrough:** In the farmer assistant, select **Judge demo**. A concise three-step panel helps explain location, evidence, and decisions. It can be closed at any time. It does not alter the field data or model.
2. **English PDF assessment:** In **My Options**, choose **Download PDF**. The browser generates a real PDF directly without additional npm packages. It summarizes the current field coordinates, priority, available data-source status, scenario differences when possible, scientific limitations and field validation steps. Global points receive no fabricated California crop options.
3. **Source status inside Data & details:** Open **Which data are current?** to see whether a NASA monthly query was made, which imported P1/P2 files are in session and what is still synthetic or an unaudited historical archive.
4. **Keep things simple for farmers:** The main flow is still **My Field → Field Conditions → My Options**. Advanced charts and source controls remain optional.

## Local run (Windows)

Backend terminal:

```cmd
py -m pip install -r backend/requirements.txt
py -m uvicorn backend.app:app --reload --port 8000
```

Frontend terminal:

```cmd
npm install
npm run dev
```

Open `http://localhost:5173`. The map still uses OpenStreetMap tiles without an API key.

## Acceptance checklist

1. Open **Judge demo** and complete all three screens; close it and confirm the ordinary assistant is unchanged.
2. Select Fresno and download its PDF. Open it, and ensure the report labels scenarios as fictional and team records as static/unaudited. Try a global coordinate: it should not contain California crop recommendations.
3. In **Data & details**, expand **Which data are current?** before and after querying NASA POWER. The label must change only for the actual query.
4. Import P1/P2 local examples. Source status must identify local imports without describing them as automatically updated.
5. Run `npm test`, `python -m unittest discover -s backend/tests -v`, and `npm run build` after installing dependencies.

**Scientific boundary:** This is a research/demo decision-support interface, not a validated farm forecast. The year-specific NASA monthly query is official but not a real-time field sensor. The supplied team's 2015–2024 records are static and not independently audited. Crop scenarios are fictional or P2-declared and must not be interpreted as independently verified predictions.
