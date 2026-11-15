# Field Shift 3.8 — 90-second judge walkthrough (English)

**Goal:** Prove that a farmer can navigate the application easily and distinguish verified, historic, and fictional information.

| Time | Action on screen | Suggested narration |
|---|---|---|
| 0–12 s | Open Field Shift; press **Judge demo** | “Farmers need practical choices from complex earth observation data. Field Shift turns that information into a guided decision.” |
| 12–28 s | Press **Load Fresno pilot**, pick the field, then **Assess this field** | “We can use a California pilot or enter coordinates anywhere in the world.” |
| 28–43 s | Review the three **Field Conditions** signals | “Important conditions appear first in plain English. The signal thresholds here are clearly identified as demo rules.” |
| 43–58 s | Expand **Check USDA soil mapping** and optionally run the lookup | “We can ask USDA for mapped soil information at this coordinate. The result is a point-based estimate, not a soil test; absence and outages are shown transparently.” |
| 58–75 s | Click **See my options**, select **Save water** | “Field Shift exposes the trade-off between modeled water use and gross revenue, without claiming these demonstration numbers are validated forecasts.” |
| 75–90 s | Download PDF; return to **Data & details → Which data are current?** | “Every result can be traced to its origin. We distinguish live API queries, historical records, and scenarios that still require agronomist validation.” |

**Optional second example:** Choose `-34.6037, -58.3816` (Buenos Aires) and use **Field Conditions** to show NASA POWER global climate. USDA soil coverage and California crop options should not be fabricated for this location.

## Failure-safe demo

- Start both FastAPI (port 8000) and Vite (port 5173) before presenting.
- Check `http://127.0.0.1:8000/api/health`; do not claim USDA is guaranteed to respond during the demo.
- If NASA/USDA is slow, do **not** wait on-screen: use the pilot history and clearly labeled demo scenarios, and explain that live services are independent.
- Never describe the downloaded report as a certified field diagnosis or a verified economic forecast.
- Prefer a recording of the same interaction as a fallback for intermittent network access.
