# Field Shift 4.2 — Automatic NASA AppEEARS SMAP point requests

The existing React assistant, NASA POWER, USDA soil/CDL, SMAP GIBS imagery, manual CSV imports, and P1/P2 comparisons remain unchanged. **This release adds OPTIONAL local-only AppEEARS task automation.**

## Set up in Windows CMD (two terminals)

1. Get a free NASA Earthdata account: https://urs.earthdata.nasa.gov/users/new . You can also use https://appeears.earthdatacloud.nasa.gov/ to check supported products and view task history.
2. In the extracted `field-shift` folder, install Python dependencies: `py -m pip install -r backend\requirements.txt`.
3. Run **`py backend\earthdata_login.py`**. Enter Earthdata username and password **only at the terminal**. The script submits these to NASA's HTTPS login endpoint and saves only the short-lived AppEEARS bearer token in `backend/.private/appeears_token.json` (excluded from Git and ZIP). **Do not share that file.** A normal Earthdata bearer token is not interchangeable with an AppEEARS API token.
4. Start the backend using **`backend\start-local.cmd`**. This binds to `127.0.0.1:8000` and enables AppEEARS operations for a local-only session. Do **not** expose this server to the public internet.
5. In another CMD window: `npm install`, `npm run dev`, open `http://localhost:5173`.
6. Choose Fresno → Data & Details → NASA SMAP → Soil moisture by month. Choose 2024 → **Request point sample**. Once NASA returns `done`, press **Load into chart**. No browser credentials, no automatic mixing with demo crop strategies.

NASA AppEEARS can queue requests; the server checks task status on request. No time estimates or guaranteed response time. A task identifier is tracked only in the current backend process; **restarting loses the local association** (the task remains accessible on the NASA site). The existing manual CSV import remains available.

## API contract

| Endpoint | Purpose |
|---|---|
| `GET /api/earthdata/config` | Check token presence, without revealing it |
| `GET /api/earthdata/options` | Discover current official SPL4SMGP version + `sm_surface` layer |
| `POST /api/earthdata/tasks` | Submit `{lat,lon,year}` once |
| `GET /api/earthdata/tasks/{task_id}` | Get queued / processing / done / error |
| `GET /api/earthdata/tasks/{task_id}/csv` | After `done`, return the authenticated AppEEARS CSV for local parsing |

All endpoints require **local-only mode** and a loopback caller. Actions require a backend AppEEARS token. Only an exact SMAP `sm_surface` layer is accepted. Every response is validated before being displayed. Maximum CSV size: 8 MB. No interpolation or fake data. Never send Earthdata passwords or tokens through React, Vite `VITE_` environment variables, screen captures, chat, or a public repository.

This is **not suitable for a public multi-user deployment** without per-user NASA auth, access control, quotas, persistence, and security review. The local bridge is disabled by default unless launched with `backend/start-local.cmd`.

## Evidence caveats

The model-derived SMAP L4 surface-moisture value is in **m³/m³**, not a percentile and not a field sensor. It is a regional (roughly 9 km) product. Authenticated AppEEARS download confirms the service source, **not** independent per-observation quality-flag evaluation, crop stress, or a validated agronomic prescription. The same-year comparison with NASA POWER is illustrative, not a field diagnosis.

## Testing

`py -m pytest -q backend/tests` and `npm test`. The new backend tests mock NASA: external AppEEARS authentication and a completed point sample must still be confirmed on your computer.

Official NASA instructions: https://github.com/nasa/AppEEARS-Data-Resources and https://appeears.earthdatacloud.nasa.gov/api/
