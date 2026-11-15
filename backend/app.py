"""Field Shift 4.5.2 — NASA climate, optional USDA, SMAP L4 & CosoNASA Fuzzy Engine."""
from __future__ import annotations

import os
import time
import logging
from datetime import datetime, timezone
from math import isfinite
from typing import Annotated, Optional

try:
    from .crops import fetch_cdl, CDLUnavailable, CDL_YEARS
    from .soil import fetch_soil, USDAUnavailable
    from .smap_numeric import fetch_smap_numeric, SmapNumericUnavailable
    from .cosonasa_engine import ejecutar_modelo_predictivo_coordenadas
except ImportError:
    from crops import fetch_cdl, CDLUnavailable, CDL_YEARS
    from soil import fetch_soil, USDAUnavailable
    from smap_numeric import fetch_smap_numeric, SmapNumericUnavailable
    from cosonasa_engine import ejecutar_modelo_predictivo_coordenadas

import httpx
from fastapi import FastAPI, HTTPException, Request, Query as _Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse as _FileResponse, JSONResponse as _JSONResponse
from pydantic import BaseModel, Field, field_validator
from pathlib import Path as _Path
from uuid import UUID

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
PARAMETERS = ("T2M_MAX", "PRECTOTCORR")
MISSING = -990

app = FastAPI(title="Field Shift Global Climate & CosoNASA API", version="4.5.2")
LOG = logging.getLogger(__name__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("FIELD_SHIFT_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class FieldPoint(BaseModel):
    lat: Annotated[float, Field(ge=-90, le=90)]
    lon: Annotated[float, Field(ge=-180, le=180)]

    @field_validator("lat", "lon")
    @classmethod
    def finite(cls, value: float) -> float:
        if not isfinite(value):
            raise ValueError("Coordinates must be finite")
        return value


class FieldQuery(FieldPoint):
    year: Annotated[int, Field(ge=1981, le=2025)] = 2024


class PredictRequest(FieldPoint):
    prioridad: Optional[str] = "balanced"
    materia_organica_local: Optional[float] = Field(default=None, ge=0, le=15)
    cultivo_actual: Optional[str] = None


def clean(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value) or value <= MISSING:
        return None
    return float(value)


def normalize_power(payload: dict, lat: float, lon: float, year: int) -> dict:
    try:
        parameters = payload["properties"]["parameter"]
        if not all(isinstance(parameters[key], dict) for key in PARAMETERS):
            raise KeyError('missing parameters')
    except (KeyError, TypeError) as exc:
        raise ValueError('Unexpected NASA POWER response shape') from exc
    months = []
    for m in range(1, 13):
        stamp = f"{year}{m:02d}"
        months.append({
            "date": f"{year}-{m:02d}",
            "temperature_max_c": clean(parameters["T2M_MAX"].get(stamp)),
            "precipitation_mm_per_day": clean(parameters["PRECTOTCORR"].get(stamp)),
        })
    count_t = sum(x["temperature_max_c"] is not None for x in months)
    count_p = sum(x["precipitation_mm_per_day"] is not None for x in months)
    return {
        "status": "climate-only", "location": {"lat": lat, "lon": lon},
        "period": {"year": year}, "climate": {"months": months, "available_temperature_months": count_t,
            "available_precipitation_months": count_p, "source": "NASA POWER monthly point",
            "parameters": list(PARAMETERS), "units": {"temperature_max_c": "°C", "precipitation_mm_per_day": "mm/day"}},
        "soil": {"status": "unavailable", "reason": "No verified global soil source is connected."},
        "cropping_history": {"status": "unavailable", "reason": "USDA CropScape is not global."},
        "recommendations": {"status": "unavailable", "reason": "The California pilot model is not validated for arbitrary coordinates."},
        "provenance": {"retrieved_at": datetime.now(timezone.utc).isoformat(),
            "source_url": POWER_URL, "coverage": "Regional climate estimate; not in-field measurements", "audited": False},
    }


@app.get('/api/health')
def health():
    return {"status": "ok", "service": "field-shift-global", "version": "4.5.2", "cosonasa_engine": "active"}


@app.get('/api/models/capabilities')
def model_capabilities():
    return {
        "status": "executable",
        "model_execution_available": True,
        "engine_version": "CosoNASA-Mamdani-v1.0",
        "supported_archive_year": 2024,
        "pilot_fields": ["fresno-01", "bakersfield-02", "davis-03"],
        "model_run_contract": "field-shift.model-run.v1",
        "endpoint": "/api/predict-rotation",
        "message": "CosoNASA Mamdani fuzzy inference engine active for live coordinate evaluation.",
    }


@app.post('/api/predict-rotation')
def predict_rotation(req: PredictRequest):
    try:
        return ejecutar_modelo_predictivo_coordenadas(
            lat=req.lat,
            lon=req.lon,
            prioridad=req.prioridad or "balanced",
            materia_organica_local=req.materia_organica_local,
            cultivo_actual=req.cultivo_actual
        )
    except Exception as exc:
        LOG.exception("CosoNASA predictive engine failed")
        raise HTTPException(status_code=502, detail=f"Error ejecutando motor CosoNASA: {str(exc)}") from exc


@app.post('/api/fields/analyze')
async def analyze(query: FieldQuery):
    params = {"parameters": ','.join(PARAMETERS), "community": "AG", "longitude": query.lon,
              "latitude": query.lat, "start": query.year, "end": query.year, "format": "JSON"}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(18.0), follow_redirects=False) as client:
            response = await client.get(POWER_URL, params=params)
            response.raise_for_status()
            payload = response.json()
        return normalize_power(payload, query.lat, query.lon, query.year)
    except (httpx.TimeoutException, httpx.HTTPError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=502, detail="NASA POWER is unavailable or returned unexpected data.") from exc


_SOIL_CACHE = {}
_SOIL_CACHE_SECONDS = 12 * 60 * 60


@app.post('/api/fields/soil')
async def soil_by_point(query: FieldPoint):
    key = (round(query.lat, 5), round(query.lon, 5))
    cached = _SOIL_CACHE.get(key)
    if cached is not None and time.monotonic() - cached[0] < _SOIL_CACHE_SECONDS:
        return {**cached[1], "cache": "hit"}
    try:
        answer = await fetch_soil(query.lat, query.lon)
    except Exception as exc:
        LOG.exception("USDA soil lookup failed")
        raise HTTPException(status_code=503, detail={"code": "USDA_TEMPORARILY_UNAVAILABLE", "message": "USDA soil mapping is temporarily unavailable.", "retryable": True}) from exc
    if len(_SOIL_CACHE) >= 128:
        _SOIL_CACHE.pop(next(iter(_SOIL_CACHE)))
    if answer.get("status") in ("ready", "unavailable"):
        _SOIL_CACHE[key] = (time.monotonic(), answer)
    return {**answer, "cache": "miss"}


class CropPointQuery(FieldPoint):
    year: Annotated[int, Field(ge=2020, le=2024)] = 2024


_CDL_CACHE = {}
_CDL_CACHE_SECONDS = 24 * 60 * 60


@app.post('/api/fields/crops')
async def crops_by_point(query: CropPointQuery):
    key = (round(query.lat, 5), round(query.lon, 5), query.year)
    cached = _CDL_CACHE.get(key)
    if cached is not None and time.monotonic() - cached[0] < _CDL_CACHE_SECONDS:
        return {**cached[1], "cache": "hit"}
    try:
        result = await fetch_cdl(query.lat, query.lon, query.year)
    except Exception as exc:
        LOG.warning("USDA CDL lookup failed for year=%s: %s", query.year, exc)
        raise HTTPException(status_code=503, detail={"code": "CDL_TEMPORARILY_UNAVAILABLE", "message": "The USDA crop-classification service did not answer.", "retryable": True}) from exc
    if result.get("status") in ("ready", "unavailable", "outside_coverage"):
        if len(_CDL_CACHE) >= 128:
            _CDL_CACHE.pop(next(iter(_CDL_CACHE)))
        _CDL_CACHE[key] = (time.monotonic(), result)
    return {**result, "cache": "miss"}


class SmapQuery(FieldPoint):
    year: Annotated[int, Field(ge=2015, le=2026)] = 2024


_SMAP_CACHE = {}
_SMAP_CACHE_SECONDS = 12 * 60 * 60


@app.post('/api/fields/smap/monthly')
async def smap_by_point(query: SmapQuery):
    key = (round(query.lat, 5), round(query.lon, 5), query.year)
    cached = _SMAP_CACHE.get(key)
    if cached is not None and time.monotonic() - cached[0] < _SMAP_CACHE_SECONDS:
        return {**cached[1], 'cache': 'hit'}
    try:
        result = await fetch_smap_numeric(query.lat, query.lon, query.year)
    except SmapNumericUnavailable as exc:
        LOG.warning('SMAP L4 numeric request failed: %s', exc)
        raise HTTPException(status_code=503, detail={'code': 'SMAP_NUMERIC_SERVICE_UNAVAILABLE', 'message': str(exc), 'retryable': True}) from exc
    if result.get('status') == 'ready':
        if len(_SMAP_CACHE) >= 128:
            _SMAP_CACHE.pop(next(iter(_SMAP_CACHE)))
        _SMAP_CACHE[key] = (time.monotonic(), result)
    return {**result, 'cache': 'miss'}


try:
    from .earthdata import EarthdataError, ensure_local_request, local_token, discover_smap, submit_point, task_state, task_csv
except ImportError:
    from earthdata import EarthdataError, ensure_local_request, local_token, discover_smap, submit_point, task_state, task_csv

_EARTHDATA_TASKS = {}
_EARTHDATA_OPTIONS = None
_EARTHDATA_OPTIONS_TIME = 0.0


def _earthdata_guard(request: Request):
    try:
        ensure_local_request(request)
    except EarthdataError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


def _earthdata_error(exc: EarthdataError):
    raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@app.get('/api/earthdata/config')
async def earthdata_config(request: Request):
    _earthdata_guard(request)
    return {"mode": "local-only", "authenticated": bool(local_token()), "supported_product": "SPL4SMGP sm_surface", "stores_password": False, "message": "AppEEARS runs asynchronously. Sign in locally to request point samples."}


@app.get('/api/earthdata/options')
async def earthdata_options(request: Request):
    _earthdata_guard(request)
    global _EARTHDATA_OPTIONS, _EARTHDATA_OPTIONS_TIME
    try:
        if _EARTHDATA_OPTIONS and time.monotonic() - _EARTHDATA_OPTIONS_TIME < 3600:
            return _EARTHDATA_OPTIONS
        options = await discover_smap()
        _EARTHDATA_OPTIONS, _EARTHDATA_OPTIONS_TIME = options, time.monotonic()
        return options
    except EarthdataError as exc:
        _earthdata_error(exc)


class EarthdataPointRequest(FieldPoint):
    year: Annotated[int, Field(ge=2015, le=2025)]


@app.post('/api/earthdata/tasks')
async def earthdata_submit(query: EarthdataPointRequest, request: Request):
    _earthdata_guard(request)
    if not local_token():
        raise HTTPException(status_code=401, detail='AppEEARS login required. Run py backend\\earthdata_login.py')
    key = (round(query.lat, 5), round(query.lon, 5), query.year)
    for task_id, info in _EARTHDATA_TASKS.items():
        if info['key'] == key:
            return {'task_id': task_id, 'status': 'submitted', 'reused': True}
    if len(_EARTHDATA_TASKS) >= 10:
        raise HTTPException(status_code=429, detail='Local limit of 10 AppEEARS tasks reached.')
    try:
        options = await earthdata_options(request)
        task_id = await submit_point(query.lat, query.lon, query.year, options['product'], options['layer'])
        _EARTHDATA_TASKS[task_id] = {'key': key, 'product': options['product'], 'layer': options['layer']}
        return {'task_id': task_id, 'status': 'submitted', 'reused': False}
    except EarthdataError as exc:
        _earthdata_error(exc)


def _known_task(task_id: str):
    try:
        normalized = str(UUID(task_id))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail='Invalid task ID.') from None
    if normalized not in _EARTHDATA_TASKS:
        raise HTTPException(status_code=404, detail='Task not found in this local session.')
    return normalized


@app.get('/api/earthdata/tasks/{task_id}')
async def earthdata_task_status(task_id: str, request: Request):
    _earthdata_guard(request)
    task_id = _known_task(task_id)
    try:
        state = await task_state(task_id)
        if state['status'] in ('failed', 'error', 'cancelled'):
            _EARTHDATA_TASKS.pop(task_id, None)
        return state
    except EarthdataError as exc:
        _earthdata_error(exc)


@app.get('/api/earthdata/tasks/{task_id}/csv')
async def earthdata_task_csv(task_id: str, request: Request):
    _earthdata_guard(request)
    task_id = _known_task(task_id)
    try:
        state = await task_state(task_id)
        if state['status'] != 'done':
            raise EarthdataError('AppEEARS has not finished this task.', 409)
        result = await task_csv(task_id)
        return {**result, 'product': _EARTHDATA_TASKS[task_id]['product'], 'layer': _EARTHDATA_TASKS[task_id]['layer'], 'source': 'NASA AppEEARS authenticated task'}
    except EarthdataError as exc:
        _earthdata_error(exc)


try:
    from .market import MarketUnavailable, require_local as require_market_local, fetch_report, enabled as market_enabled, credentials_available as market_credentials_available
except ImportError:
    from market import MarketUnavailable, require_local as require_market_local, fetch_report, enabled as market_enabled, credentials_available as market_credentials_available


@app.get('/api/market/status')
def market_status():
    return {
        'source': 'USDA AMS MyMarketNews', 'local_mode': market_enabled(),
        'configured': market_enabled() and market_credentials_available(),
        'report_lookup_only': True,
        'scenario_prices_updated': False,
        'message': 'A personal API key is required. The report explorer is local-only and never changes crop scenarios.',
    }


@app.get('/api/market/reports/{report_slug}')
async def market_report(report_slug: str, request: Request):
    try:
        require_market_local(request)
        return await fetch_report(report_slug)
    except MarketUnavailable as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


_POWER_PROXY_CACHE: dict[tuple, tuple[float, dict]] = {}
_POWER_PROXY_CACHE_SECONDS = 60 * 60


@app.get('/nasa-power/api/temporal/monthly/point', include_in_schema=False)
async def public_power_monthly(
    latitude: Annotated[float, _Query(ge=-90, le=90)],
    longitude: Annotated[float, _Query(ge=-180, le=180)],
    start: Annotated[int, _Query(ge=1981, le=2025)],
    end: Annotated[int, _Query(ge=1981, le=2025)],
    parameters: str = 'T2M_MAX,PRECTOTCORR',
    community: str = 'AG',
    format_type: str = _Query(default='JSON', alias='format'),
):
    if not isfinite(latitude) or not isfinite(longitude):
        raise HTTPException(status_code=422, detail='Coordinates must be finite.')
    if start != end or parameters != 'T2M_MAX,PRECTOTCORR' or community != 'AG' or format_type.upper() != 'JSON':
        raise HTTPException(status_code=400, detail='Only Field Shift monthly point parameters are supported.')
    key = (round(latitude, 5), round(longitude, 5), start)
    hit = _POWER_PROXY_CACHE.get(key)
    if hit and time.monotonic() - hit[0] < _POWER_PROXY_CACHE_SECONDS:
        return _JSONResponse(hit[1])
    params = {'parameters': parameters, 'community': community, 'longitude': longitude,
              'latitude': latitude, 'start': start, 'end': end, 'format': 'JSON'}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(22.0), follow_redirects=False) as client:
            response = await client.get(POWER_URL, params=params)
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get('properties', {}).get('parameter'), dict):
            raise ValueError('Unexpected upstream data')
    except (httpx.TimeoutException, httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        LOG.warning('NASA POWER public proxy unavailable: %s', type(exc).__name__)
        raise HTTPException(status_code=502, detail='NASA POWER is currently unavailable. Please retry later.') from exc
    if len(_POWER_PROXY_CACHE) >= 128:
        _POWER_PROXY_CACHE.pop(next(iter(_POWER_PROXY_CACHE)))
    _POWER_PROXY_CACHE[key] = (time.monotonic(), payload)
    return _JSONResponse(payload)


_FRONTEND_DIR = _Path(__file__).resolve().parents[1] / 'dist'


@app.get('/{client_path:path}', include_in_schema=False)
def production_frontend(client_path: str):
    if client_path.startswith(('api/', 'nasa-power/')) or '..' in client_path.split('/'):
        raise HTTPException(status_code=404, detail='Not found')
    root = _FRONTEND_DIR.resolve()
    if not root.is_dir():
        raise HTTPException(status_code=404, detail='Frontend is not built. Run npm run build.')
    file = (root / client_path).resolve()
    if file.is_relative_to(root) and file.is_file():
        return _FileResponse(file)
    if client_path and '.' in client_path.rsplit('/', 1)[-1]:
        raise HTTPException(status_code=404, detail='Static asset not found')
    return _FileResponse(root / 'index.html')