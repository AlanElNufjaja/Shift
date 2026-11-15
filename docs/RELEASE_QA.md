# Field Shift 4.5.2 Stable — QA and limitations

## Runbook

Run all from `field-shift/`:

```bash
npm install
npm test
npm run build
python -m pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -p 'test_*.py'
```

The backend health endpoint should show `4.5.2` after restarting the API. The released ZIP can be deployed from the repo root using `render.yaml` / `Dockerfile`; do not publish private Earthdata or USDA Market News credentials.

## Verified in generation environment

- Automated frontend suite: **249 tests passed** (includes 5 new real-sample, isolation and provenance tests).
- Backend suite: **33 tests passed** (using test doubles for upstream APIs).
- Raw NASA AppEEARS CSV has exactly 2,928 rows, one location, year 2024, 12 populated months, no out-of-range values on basic 0–0.8 m³/m³ screening.
- Data sample and manifest are bundled with source SHA-256, no source request JSON account email.
- Archive integrity, release instructions and text/JSON validity are checked before delivery.

**Limitations:** frontend dependencies (`vite`, etc.) were not available offline in the generation environment, so an actual production build and browser smoke test are **not certified here**. The team must run `npm run build` on a connected machine, and verify the public deployment manually. No live authenticated AppEEARS/MyMarketNews request was performed in the release QA. User reports prior versions working locally, but those reports are not a substitute for new release smoke tests.

## Manual smoke checks (team)

- [ ] Browser title and `/api/health` both show `4.5.2`.
- [ ] Farmer 3-step journey works on desktop and mobile.
- [ ] Select Fresno → SMAP 2024 → **Load supplied Fresno sample** → 12 months visible, unit `m³/m³`.
- [ ] Switch to Bakersfield / Davis / custom global point → sample loader unavailable and Fresno sample does not remain active.
- [ ] Choose SMAP 2025 → Fresno sample loader not offered; missing data not converted to zero.
- [ ] NASA POWER (same year) responds or displays controlled errors; no regression to blank screen.
- [ ] USDA soil and crop request either return an official point result or an honest unavailable message.
- [ ] Market News CSV import and chart still work; no impact on demo strategy outcomes.
- [ ] PDF identifies sample provenance if loaded; no reference to it when different parcel is selected.
- [ ] `Judge demo` guide and global coordinates work without additional API keys.
- [ ] On deployed URL verify all `/api/*` paths and Refresh from a nested hash route.

## Third-party service risk

NASA POWER, USDA Soil Data Access, USDA CDL, Earthdata/AppEEARS and GIBS availability can change. Render Free may pause on inactivity and is not a permanent uptime guarantee. Do not describe historical monthly products as real-time in-field measurements. See `docs/AI_HANDOFF.md` for pending work and exact data boundaries.
