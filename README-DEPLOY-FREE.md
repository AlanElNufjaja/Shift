# Field Shift 4.5.2 Stable — Public evaluation deployment (no payment required)

## Recommended: Render Free, one public URL

The project is already configured with `Dockerfile` and `render.yaml`.
They build the React SPA, start the Python FastAPI backend, and serve both
from the **same HTTPS domain**. No CORS changes or API keys required for the
core map, NASA POWER monthly climate, USDA soil and crop pixel lookups.

### Steps

1. Unzip the archive. Open the `field-shift` directory.
2. Create a GitHub repository (for example `field-shift-demo`). Add the **contents
   of the `field-shift` directory at the repository root**, so `render.yaml`,
   `Dockerfile`, `backend/`, `src/`, `package.json` are at the top level.
   Do **not** upload `.env`, Earthdata tokens or `backend/.private/`.
3. Sign in to [Render](https://dashboard.render.com/).
4. In Render click **New → Blueprint**, connect your GitHub repository and
   select the branch containing `render.yaml`.
5. Review the deployment plan. Confirm the web service says **Free / $0**
   before accepting. Render will build the Docker image automatically.
6. In Render, open your new service, select its public HTTPS link. Example:
   `https://<your-service-name>.onrender.com` (this is illustrative, not a live link).
7. Test `https://<your-service-name>.onrender.com/api/health`, then the home page,
   Fresno, NASA POWER (2024), USDA Soil Mapping, USDA Crop Map and the judge demo.
8. Share the exact HTTPS link with judges. Pushes to your connected GitHub
   branch automatically redeploy the project.

**Free-tier caveat:** Render spins free web services down after 15 minutes of
inactivity; the first new visitor may wait roughly one minute while it wakes.
Free services have quotas and no guaranteed uptime or lifetime. Open the
service before the presentation, keep an offline local backup, and **never
promise an always-on server on a free plan**.

### What works publicly

- Three-step farmer wizard and a guided judge demo, with demo values labeled.
- Global coordinates, OpenStreetMap, NASA POWER monthly climate, public USDA
  SSURGO soil and CDL crop-classification point requests when upstream works.
- Existing team historical archive, P2 sample comparison, PDF report,
  public NASA GIBS imagery, and **manual** CSV imports of SMAP and quotations.

### What is intentionally disabled on the public website

- Authenticated Earthdata/AppEEARS automation with personal user tokens.
- Personal USDA MyMarketNews API-key report lookup.
- Running the P2 fuzzy model (code/rules not yet delivered).
- Live numeric SMAP time series without a supplied official CSV.

These must not be advertised to judges as connected real-time services.
The Market News **manual CSV importer** still works without a key.
All user-supplied CSVs/JSONs are processed in the browser as implemented; do
not assume data survives reloads. The free service filesystem is temporary.

### Test without Docker after installing dependencies

```bash
npm install
npm test
npm run build
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -p 'test_*.py'
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

After building, the app is also served at `http://127.0.0.1:8000` on the
backend. For normal development, keep using Vite at `http://localhost:5173`
and its local proxy.

### Note about Streamlit and other free hosts

Streamlit Community Cloud hosts **Streamlit Python apps**, not React/Vite +
FastAPI applications as-is. Rebuilding this project in Streamlit is unnecessary.
Cloudflare Pages or Netlify can host just the static frontend without cold
starts, but the API must be hosted separately and its public URL and CORS
configured; a single Render deployment minimizes judge setup complexity.
