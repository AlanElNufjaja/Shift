# Field Shift 4.5 — Market Price History (research-only)

The advanced **Data & Details → Market News** panel now displays an optional historical chart of transcribed USDA quotations.

## What works

- Read-only MyMarketNews report preview through a local backend and personal API key (if configured). **Raw report rows are not normalized to prices automatically.**
- CSV import supports an extended 10-column template: `commodity,quote_date,price,unit,market,grade,package,trade_basis,source_url,report_slug`.
- The old 7-column format remains readable but will **not** draw a connected trend: grade, package, and trade basis are unspecified.
- For one commodity, unit, market, grade, package and trade basis combination, with at least two distinct dates and one quote per date, the panel shows the latest quotation and a price history. Changes are descriptive arithmetic, not forecasts.
- Multiple quotations with the same date prevent the chart: do not silently average or select one quote.
- A source link accompanies every quote. The upload is user-supplied and is **not audited automatically**; official-looking URLs are not proof of authenticity.

## How to try it

1. Start the existing React and FastAPI servers.
2. Open `http://localhost:5173/#detalle-market` or **My Options → Explore USDA market prices**.
3. Download the CSV template. Transcribe at least two quotations with matching commodity, unit, market, grade, package and trade basis, and **different** dates.
4. Include their official USDA report URL and report slug for cross-checking. Import CSV into the browser.
5. Choose a comparison group; view the price line, latest quote, and historical difference.

The price import does not persist after refresh. No authentication or USDA key is needed for CSV import. An MMN API key is only needed for the optional official report preview and stays in the local backend.

## Scientific and economic boundaries

A quote may be wholesale or terminal-market rather than farm-gate. Product quality, transport, seasonality, regional market, crop yield and farm costs materially affect gross margin. **No imported price updates the simulator or P2 recommendations**. Pricing data and crop yield must be standardized and independently reviewed before scenario integration.

## Validation

Run `npm test`, `npm run build` after `npm install`, and `py -m pytest backend/tests -q`. The build requires installed npm dependencies.
