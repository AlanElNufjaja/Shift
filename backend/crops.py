"""Optional USDA NASS Cropland Data Layer (CDL) point lookup.

One geospatial pixel, not a surveyed field. The service is geographically
restricted to CONUS and results are *not* merged into the team-supplied crop
history or P2 recommendation engine.

Official metadata: https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer?f=pjson
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from math import isfinite

import httpx

CDL_SERVICE = "https://pdi.scinet.usda.gov/image/rest/services/CDL_WM/ImageServer"
CDL_YEARS = tuple(range(2020, 2025))  # conservative years supported by this specific service


class CDLUnavailable(ValueError):
    """The remote service rejected the request or returned an unusable response."""


def within_conus_bounds(lat: float, lon: float) -> bool:
    """Loose mainland bounding rectangle only; actual coverage is decided upstream."""
    return isfinite(lat) and isfinite(lon) and 24 <= lat <= 50 and -125 <= lon <= -66


def request_parameters(lat: float, lon: float, year: int) -> dict[str, str]:
    if not isfinite(lat) or not isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise ValueError("Invalid coordinates")
    if year not in CDL_YEARS:
        raise ValueError("Requested year is outside the supported CDL service window")
    geometry = {"x": lon, "y": lat, "spatialReference": {"wkid": 4326}}
    # Explicit year filter, rather than relying on the default mosaic sorting.
    mosaic = {"mosaicMethod": "esriMosaicAttribute", "where": f"Year = {year}",
              "sortField": "Year", "sortValue": str(year), "ascending": True}
    return {"f": "json", "geometry": json.dumps(geometry, separators=(",", ":")),
            "geometryType": "esriGeometryPoint", "returnGeometry": "false",
            "returnCatalogItems": "true", "mosaicRule": json.dumps(mosaic, separators=(",", ":"))}


def _provenance():
    return {"provider": "USDA NASS Cropland Data Layer (CDL)",
            "source_url": CDL_SERVICE, "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "method": "Single mapped raster pixel via ArcGIS ImageServer identify",
            "audited": False, "scope": "CONUS only; not a field-boundary or farmer-reported crop record"}


def _no_data(lat, lon, year, reason: str, status: str = "unavailable"):
    return {"status": status, "location": {"lat": lat, "lon": lon}, "year": year,
            "classification": None, "reason": reason, "provenance": _provenance()}


def _catalog_years(raw: dict) -> list[int]:
    catalog = raw.get("catalogItems")
    features = catalog.get("features", []) if isinstance(catalog, dict) else []
    years = []
    if isinstance(features, list):
        for feature in features:
            attrs = feature.get("attributes", {}) if isinstance(feature, dict) else {}
            if isinstance(attrs, dict):
                value = attrs.get("Year", attrs.get("YEAR"))
                if value is not None:
                    try:
                        years.append(int(value))
                    except (ValueError, TypeError):
                        pass
    return years


def _pixel_code(raw: dict) -> int | None:
    # ArcGIS image services return an 'value' string or 'properties.Values'.
    value = raw.get("value")
    if value is None:
        prop = raw.get("properties", {})
        value = prop.get("Values") if isinstance(prop, dict) else None
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value) if float(value).is_integer() else None
    if isinstance(value, str) and re.fullmatch(r"\s*\d+\s*", value):
        return int(value.strip())
    return None


def class_labels_from_attribute_table(raw: dict) -> dict[int, str]:
    result = {}
    if not isinstance(raw, dict) or not isinstance(raw.get("features"), list):
        raise CDLUnavailable("The CDL class legend could not be read")
    for feat in raw["features"]:
        attrs = feat.get("attributes") if isinstance(feat, dict) else None
        if not isinstance(attrs, dict):
            continue
        try:
            code = int(attrs["Value"])
        except (KeyError, TypeError, ValueError):
            continue
        label = attrs.get("Class_Names")
        if isinstance(label, str) and label.strip():
            result[code] = label.strip()
    return result


def normalize_cdl(raw: dict, lat: float, lon: float, year: int, classes: dict[int, str] | None = None) -> dict:
    if not isinstance(raw, dict) or raw.get("error"):
        raise CDLUnavailable("CDL identify returned a service error")
    years = _catalog_years(raw)
    code = _pixel_code(raw)
    if code in (None, 0, 255):
        return _no_data(lat, lon, year, "No classified CDL pixel was returned for this location and year.")
    if not years:
        # Never claim an unchecked map layer represents the selected year.
        return _no_data(lat, lon, year,
                        "CDL returned a pixel but did not confirm the source year. It was not used.", "unverified")
    if year not in years or any(y != year for y in years):
        return _no_data(lat, lon, year,
                        "The returned raster item does not match the requested year. No classification was accepted.", "unverified")
    label = classes.get(code) if classes else None
    return {"status": "ready", "location": {"lat": lat, "lon": lon}, "year": year,
            "classification": {"code": code, "label": label,
                               "year_verified": True, "raster_item_years": years,
                               "is_field_crop": False},
            "reason": None, "provenance": _provenance(),
            "limitations": [
                "A single CDL pixel is not the crop mix for an entire field.",
                "Raster classification can be wrong; check field boundaries and planting records.",
                "CDL may show a land-cover class rather than a cultivated crop.",
                "This observation does not change model scores or recommendations.",
            ]}


async def fetch_cdl(lat: float, lon: float, year: int, transport=None) -> dict:
    if not within_conus_bounds(lat, lon):
        return _no_data(lat, lon, year, "Outside the approximate continental U.S. coverage of this CDL service.", "outside_coverage")
    timeout = httpx.Timeout(16.0, connect=6.0)
    async with httpx.AsyncClient(timeout=timeout, transport=transport, follow_redirects=False) as client:
        try:
            response = await client.get(CDL_SERVICE + "/identify", params=request_parameters(lat, lon, year))
            response.raise_for_status()
            raw = response.json()
        except (httpx.TimeoutException, httpx.HTTPError, ValueError) as exc:
            raise CDLUnavailable("CDL identify request failed") from exc
        if not isinstance(raw, dict) or raw.get("error"):
            raise CDLUnavailable("CDL identify returned a service error")
        # A failed legend request must not prevent showing a verified *numeric* class code.
        result = normalize_cdl(raw, lat, lon, year)
        if result["status"] != "ready":
            return result
        try:
            legend_response = await client.get(CDL_SERVICE + "/rasterAttributeTable", params={"f": "json"})
            legend_response.raise_for_status()
            classes = class_labels_from_attribute_table(legend_response.json())
            result["classification"]["label"] = classes.get(result["classification"]["code"])
        except (httpx.TimeoutException, httpx.HTTPError, ValueError, CDLUnavailable):
            pass
        return result
