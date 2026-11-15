"""USDA NRCS Soil Data Access (SDA) point lookup.

Spatial lookup and tabular attribute lookup are intentionally separate. The
returned estimates describe a mapped soil unit, not a sample of the field.
No geographic fallback is used if USDA does not respond or has no coverage.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from math import isfinite

import httpx

SOIL_URL = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"
LOG = logging.getLogger(__name__)


class USDAUnavailable(ValueError):
    """Upstream failed, returned unexpected data or did not answer in time."""


def soil_point_query(lat: float, lon: float) -> str:
    """Lightweight MUKEY lookup using SDA's documented WGS84 point helper."""
    if not (isfinite(lat) and isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Invalid soil query coordinates")
    wkt = f"point({lon:.7f} {lat:.7f})"
    return ("SELECT TOP 1 m.mukey, m.muname FROM mapunit AS m "
            "WHERE m.mukey IN (SELECT * FROM "
            f"SDA_Get_Mukey_from_intersection_with_WktWgs84('{wkt}')) "
            "ORDER BY m.mukey")


def soil_attributes_query(mukey: str) -> str:
    """The map unit key is returned by SDA, and constrained to digits."""
    if not re.fullmatch(r"[0-9]{1,20}", str(mukey)):
        raise ValueError("Invalid map unit key")
    return ("SELECT TOP 1 c.compname, c.comppct_r, h.hzdept_r, "
            "h.hzdepb_r, h.om_r, h.awc_r, h.kffact "
            "FROM component AS c "
            "LEFT JOIN chorizon AS h ON h.cokey = c.cokey "
            f"WHERE c.mukey = '{mukey}' AND c.majcompflag = 'Yes' "
            "ORDER BY c.comppct_r DESC, h.hzdept_r ASC")


def optional_float(value):
    if value is None or isinstance(value, bool) or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if isfinite(number) else None


def optional_text(value):
    return str(value).strip() if value is not None and str(value).strip() else None


def _table_rows(payload):
    """SDA JSON tabular format has a 'Table' array of positional rows."""
    if not isinstance(payload, dict) or not isinstance(payload.get("Table"), list):
        raise USDAUnavailable("Unexpected USDA response format")
    return payload["Table"]


def _common(lat, lon):
    return {
        "location": {"lat": lat, "lon": lon},
        "provenance": {
            "provider": "USDA NRCS Soil Data Access (SSURGO)",
            "source_url": SOIL_URL,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "coverage": "Primarily U.S. mapping; point lookup, not a surveyed field boundary",
            "audited": False,
        },
    }


def _empty_attributes(mukey, muname):
    return {
        "mapunit_key": mukey,
        "mapunit_name": muname,
        "component_name": None,
        "component_fraction_percent": None,
        "horizon_top_cm": None,
        "horizon_bottom_cm": None,
        "organic_matter_percent": None,
        "available_water_capacity_fraction": None,
        "soil_erodibility_k_factor": None,
    }


LIMITATIONS = [
    "Map-unit estimates are not a soil sample of the selected field.",
    "Values describe a mapped major component and an upper soil horizon only.",
    "K factor is soil erodibility, not a field-scale erosion-risk classification.",
    "These properties are not used to recompute crop recommendations.",
]


def normalize_soil(payload: dict, lat: float, lon: float) -> dict:
    """Normalize a legacy one-query result (kept for existing integrations)."""
    rows = _table_rows(payload)
    base = _common(lat, lon)
    if not rows:
        return {**base, "status": "unavailable", "reason": "No USDA SSURGO map unit was returned for this location.", "soil": None}
    row = rows[0]
    if not isinstance(row, (list, tuple)) or len(row) < 9:
        raise USDAUnavailable("USDA row is incomplete")
    soil = _empty_attributes(optional_text(row[0]), optional_text(row[1]))
    soil.update({
        "component_name": optional_text(row[2]),
        "component_fraction_percent": optional_float(row[3]),
        "horizon_top_cm": optional_float(row[4]),
        "horizon_bottom_cm": optional_float(row[5]),
        "organic_matter_percent": optional_float(row[6]),
        "available_water_capacity_fraction": optional_float(row[7]),
        "soil_erodibility_k_factor": optional_float(row[8]),
    })
    return {**base, "status": "ready", "soil": soil, "limitations": list(LIMITATIONS)}


def normalize_point_mapunit(payload, lat, lon):
    rows = _table_rows(payload)
    base = _common(lat, lon)
    if not rows:
        return {**base, "status": "unavailable", "reason": "No USDA SSURGO map unit was returned for this location.", "soil": None}
    row = rows[0]
    if not isinstance(row, (list, tuple)) or len(row) < 2:
        raise USDAUnavailable("USDA map unit row is incomplete")
    key = optional_text(row[0])
    if key is None or not re.fullmatch(r"[0-9]{1,20}", key):
        raise USDAUnavailable("USDA returned an invalid map unit key")
    return {**base, "status": "partial", "soil": _empty_attributes(key, optional_text(row[1])),
            "reason": "The map unit is available; detailed horizon attributes have not been retrieved.",
            "limitations": list(LIMITATIONS)}


def merge_soil_attributes(partial: dict, payload: dict) -> dict:
    rows = _table_rows(payload)
    if not rows:
        return {**partial, "reason": "USDA returned a map unit but no mapped major-component horizons."}
    row = rows[0]
    if not isinstance(row, (list, tuple)) or len(row) < 7:
        raise USDAUnavailable("USDA soil attribute row is incomplete")
    soil = {**partial["soil"],
            "component_name": optional_text(row[0]),
            "component_fraction_percent": optional_float(row[1]),
            "horizon_top_cm": optional_float(row[2]),
            "horizon_bottom_cm": optional_float(row[3]),
            "organic_matter_percent": optional_float(row[4]),
            "available_water_capacity_fraction": optional_float(row[5]),
            "soil_erodibility_k_factor": optional_float(row[6])}
    return {**partial, "status": "ready", "soil": soil, "reason": None}


async def _query(client, sql, *, retry=False):
    """SDA query with form-encoded parameters, as used by USDA soilDB clients.

    Preserve the upstream HTTP status in server logs for diagnosis. Do not
    expose provider exception bodies to the farmer-facing UI.
    """
    attempts = 2 if retry else 1
    for attempt in range(attempts):
        try:
            response = await client.post(SOIL_URL, data={"query": sql, "format": "JSON"})
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict) or not isinstance(payload.get("Table"), list):
                LOG.warning("USDA unexpected response: HTTP %s, body=%r", response.status_code, response.text[:240])
                raise USDAUnavailable("USDA returned a response without a Table array")
            return payload
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            LOG.warning("USDA SDA upstream HTTP %s, query=%s, body=%r",
                        code, "spatial" if "SDA_Get_Mukey" in sql else "attributes", exc.response.text[:240])
            if code in (429, 500, 502, 503, 504) and attempt + 1 < attempts:
                await asyncio.sleep(0.3)
                continue
            raise USDAUnavailable(f"USDA upstream returned HTTP {code}") from exc
        except httpx.RequestError as exc:
            LOG.warning("USDA SDA transport error: %s: %s", type(exc).__name__, str(exc)[:160])
            raise USDAUnavailable(f"USDA transport error: {type(exc).__name__}") from exc
        except USDAUnavailable:
            raise
        except (ValueError, UnicodeError) as exc:
            LOG.warning("USDA SDA invalid JSON: %s", type(exc).__name__)
            raise USDAUnavailable("USDA returned invalid JSON") from exc
    raise USDAUnavailable("USDA Soil Data Access query could not be completed")


async def fetch_soil(lat: float, lon: float, *, transport=None) -> dict:
    # Validate before any upstream I/O.
    soil_point_query(lat, lon)
    settings = {"timeout": httpx.Timeout(8.0), "follow_redirects": False, "headers": {"Accept": "application/json", "User-Agent": "FieldShift/4.5.2 (NASA Space Apps demo)"}}
    if transport is not None:
        settings["transport"] = transport
    async with httpx.AsyncClient(**settings) as client:
        mapunit = normalize_point_mapunit(
            await _query(client, soil_point_query(lat, lon), retry=True), lat, lon)
        if mapunit["status"] == "unavailable":
            return mapunit
        try:
            return merge_soil_attributes(mapunit, await _query(client, soil_attributes_query(mapunit["soil"]["mapunit_key"])))
        except USDAUnavailable:
            LOG.warning("USDA attributes unavailable, returning verified map-unit identity only")
            return {**mapunit, "reason": "USDA found a map unit, but its detailed soil attributes were temporarily unavailable."}
