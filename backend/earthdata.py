"""Local-only AppEEARS bridge for Field Shift. Never exposes credentials to React.

NASA API workflow: /product -> /product/{version} -> POST /task ->
GET /task/{id} -> GET /bundle/{id} -> GET /bundle/{id}/{file_id}.
All requests go to a fixed NASA host; no user-provided upstream URLs.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import httpx

BASE = "https://appeears.earthdatacloud.nasa.gov/api"
PRIVATE = Path(__file__).resolve().parent / ".private"
TOKEN_FILE = PRIVATE / "appeears_token.json"
PRODUCT_PREFIX = "SPL4SMGP."
MAX_CSV_BYTES = 8_000_000

class EarthdataError(Exception):
    def __init__(self, message: str, status: int = 503):
        super().__init__(message)
        self.status = status


def local_token():
    """Read a short-lived AppEEARS-specific token, never a username/password."""
    raw = os.getenv("FIELD_SHIFT_APPEEARS_TOKEN", "").strip()
    if raw:
        return raw
    try:
        data = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
        expiry = data.get("expiration", "")
        if expiry and datetime.fromisoformat(expiry.replace("Z", "+00:00")) <= datetime.now(timezone.utc):
            return None
        return data.get("token") or None
    except (OSError, ValueError, TypeError):
        return None


def auth_headers():
    token = local_token()
    if not token:
        raise EarthdataError("No valid AppEEARS token found. Run: py backend\\earthdata_login.py", 401)
    return {"Authorization": f"Bearer {token}"}


def is_local_bridge_enabled():
    return os.getenv("FIELD_SHIFT_APPEEARS_LOCAL_MODE", "0") == "1"


def ensure_local_request(request):
    """Never enable shared-token actions on a public deployment."""
    if not is_local_bridge_enabled() or not request.client or request.client.host not in ("127.0.0.1", "::1"):
        raise EarthdataError("Earthdata automation is disabled. Use the local-only backend launcher.", 403)


def safe_task_id(task_id):
    try:
        return str(UUID(task_id))
    except (ValueError, TypeError, AttributeError):
        raise EarthdataError("Invalid AppEEARS task identifier.", 400) from None


async def nasa_call(method, path, *, json_body=None, headers=None, timeout=25):
    """Fixed-origin calls; upstream exceptions are deliberately sanitized."""
    try:
        async with httpx.AsyncClient(follow_redirects=False, timeout=httpx.Timeout(timeout)) as client:
            response = await client.request(method, f"{BASE}/{path.lstrip('/')}", json=json_body, headers=headers or {})
        if response.status_code in (401, 403):
            raise EarthdataError("AppEEARS authentication was rejected or expired. Run the local login again.", 401)
        if response.status_code >= 400 or 300 <= response.status_code < 400:
            raise EarthdataError(f"NASA AppEEARS returned HTTP {response.status_code}; retry or check your task in AppEEARS.")
        return response
    except (httpx.TimeoutException, httpx.NetworkError, httpx.ProtocolError) as exc:
        raise EarthdataError("NASA AppEEARS could not be reached. Check internet connectivity.") from exc


def find_product(catalog):
    if isinstance(catalog, dict):
        names = catalog.keys()
    elif isinstance(catalog, list):
        names = [p.get("ProductAndVersion") or p.get("product") or p.get("name") for p in catalog if isinstance(p, dict)]
    else:
        raise EarthdataError("Unexpected AppEEARS product catalog.")
    options = []
    for name in names:
        if isinstance(name, str) and name.startswith(PRODUCT_PREFIX) and re.fullmatch(r"SPL4SMGP\.\d{3}", name):
            options.append(name)
    if not options:
        raise EarthdataError("SMAP SPL4SMGP is not listed by AppEEARS; use manual CSV import.")
    return sorted(options)[-1]


def find_layer(layers):
    names = list(layers.keys()) if isinstance(layers, dict) else [p.get("layer") or p.get("name") for p in layers if isinstance(p, dict)] if isinstance(layers, list) else []
    # Explicitly refuse wetness, percentiles, root-zone and other products.
    matches = [name for name in names if isinstance(name, str) and (name == "sm_surface" or name.endswith("_sm_surface"))]
    if len(matches) != 1:
        raise EarthdataError("The official sm_surface layer was not uniquely listed by AppEEARS; use manual import.")
    return matches[0]


async def discover_smap():
    catalog = (await nasa_call("GET", "product")).json()
    product = find_product(catalog)
    layers = (await nasa_call("GET", f"product/{product}")).json()
    layer = find_layer(layers)
    return {"product": product, "layer": layer, "unit": "m³/m³", "product_family": "SPL4SMGP"}


def point_task(lat, lon, year, product, layer):
    return {
        "task_type": "point", "task_name": f"Field Shift SMAP {year}",
        "params": {
            "dates": [{"startDate": f"01-01-{year}", "endDate": f"12-31-{year}"}],
            "layers": [{"product": product, "layer": layer}],
            "coordinates": [{"id": "field-shift-point", "latitude": lat, "longitude": lon}],
        },
    }


async def submit_point(lat, lon, year, product, layer):
    result = (await nasa_call("POST", "task", json_body=point_task(lat, lon, year, product, layer), headers=auth_headers())).json()
    if not isinstance(result, dict) or not isinstance(result.get("task_id"), str):
        raise EarthdataError("NASA did not return a task identifier.")
    return safe_task_id(result["task_id"])


async def task_state(task_id):
    result = (await nasa_call("GET", f"task/{safe_task_id(task_id)}", headers=auth_headers())).json()
    if not isinstance(result, dict) or not isinstance(result.get("status"), str):
        raise EarthdataError("Unexpected AppEEARS task status.")
    status = result["status"].lower()
    if status not in ("pending", "queued", "processing", "done", "error", "failed", "cancelled"):
        raise EarthdataError("NASA returned an unknown task status.")
    return {"status": status, "task_id": safe_task_id(task_id)}


async def task_csv(task_id):
    task_id = safe_task_id(task_id)
    bundle = (await nasa_call("GET", f"bundle/{task_id}", headers=auth_headers())).json()
    if not isinstance(bundle, dict) or not isinstance(bundle.get("files"), list):
        raise EarthdataError("NASA did not return a task bundle.")
    files = [f for f in bundle["files"] if isinstance(f, dict) and f.get("file_type", "").lower() == "csv" and isinstance(f.get("file_id"), str)]
    if len(files) != 1:
        raise EarthdataError("Expected one CSV of SMAP point samples. Download and inspect the bundle manually.")
    f = files[0]
    if isinstance(f.get("file_size"), int) and f["file_size"] > MAX_CSV_BYTES:
        raise EarthdataError("The NASA CSV exceeds the 8 MB import limit; download it manually.")
    try:
        file_id = str(UUID(f["file_id"]))
    except (ValueError, TypeError):
        raise EarthdataError("NASA returned an invalid CSV file identifier.") from None
    response = await nasa_call("GET", f"bundle/{task_id}/{file_id}", headers=auth_headers(), timeout=40)
    if len(response.content) > MAX_CSV_BYTES:
        raise EarthdataError("The NASA CSV exceeds the 8 MB import limit.")
    try:
        csv_text = response.content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise EarthdataError("NASA returned a CSV with unsupported encoding.") from exc
    if "\n" not in csv_text or "," not in csv_text:
        raise EarthdataError("NASA did not return a valid-looking CSV.")
    return {"task_id": task_id, "file_name": f.get("file_name", "NASA-AppEEARS-results.csv"), "csv": csv_text}
