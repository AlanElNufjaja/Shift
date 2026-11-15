"""NASA POWER SMAP L4 numerical soil-moisture *percentiles* (not volumetric %).

The source parameter SFMC_PRCNTL measures relative ranking of surface moisture.
We deliberately never use MERRA-2 SFMC/GWETTOP as a surrogate for SMAP, and
never estimate numerical values from the GIBS colorized images.
"""
from __future__ import annotations

import calendar
from datetime import datetime, timezone
from math import isfinite

import httpx

POWER_DAILY = 'https://power.larc.nasa.gov/api/temporal/daily/point'
PARAMETER = 'SFMC_PRCNTL'
MAX_SMAP_LAT = 84.66


class SmapNumericUnavailable(Exception):
    """A remote source failed; no values may be silently substituted."""


def _valid_percentile(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        return None
    if value <= -900 or not 0 <= value <= 100:
        return None
    return float(value)


def normalize_smap_daily(payload: dict, lat: float, lon: float, year: int) -> dict:
    """Aggregate valid SMAP percentile days into 12 calendar months, preserving gaps."""
    if not isinstance(payload, dict):
        raise SmapNumericUnavailable('NASA returned an unexpected SMAP payload.')
    series = payload.get('properties', {}).get('parameter', {}).get(PARAMETER)
    if not isinstance(series, dict):
        raise SmapNumericUnavailable('The requested SMAP L4 percentile variable was not returned.')
    months = []
    for month in range(1, 13):
        values = []
        for day in range(1, calendar.monthrange(year, month)[1] + 1):
            stamp = f'{year}{month:02d}{day:02d}'
            value = _valid_percentile(series.get(stamp))
            if value is not None:
                values.append(value)
        months.append({
            'date': f'{year}-{month:02d}',
            'surface_percentile': round(sum(values) / len(values), 2) if values else None,
            'valid_days': len(values),
            'calendar_days': calendar.monthrange(year, month)[1],
        })
    return {
        'status': 'ready' if any(m['valid_days'] for m in months) else 'unavailable',
        'location': {'lat': lat, 'lon': lon},
        'period': {'year': year},
        'source': {
            'provider': 'NASA POWER',
            'dataset': 'SMAP Level-4 surface moisture percentile (0-5 cm)',
            'parameter': PARAMETER,
            'unit': 'percentile rank (0-100)',
            'resolution_km_approx': 9,
            'method': 'SMAP-constrained land-surface model, not a direct field sensor',
            'source_url': POWER_DAILY,
            'retrieved_at': datetime.now(timezone.utc).isoformat(),
            'quality': 'Not field-validated',
        },
        'months': months,
        'valid_months': sum(m['valid_days'] > 0 for m in months),
        'limitations': [
            'Percentile rank is NOT volumetric moisture percentage or water available to crops.',
            'Monthly values summarize available daily percentile estimates, not direct readings at the field.',
            'Approximate 9 km model grid is much larger than an individual farm.',
            'No crop-risk classification or change to existing scenarios is performed.',
        ],
    }


async def fetch_smap_numeric(lat: float, lon: float, year: int, *, transport=None) -> dict:
    if not -MAX_SMAP_LAT <= lat <= MAX_SMAP_LAT:
        return {'status': 'unavailable', 'reason': 'SMAP L4 coverage is limited to about 84.66 degrees north/south.',
                'location': {'lat': lat, 'lon': lon}, 'period': {'year': year}, 'months': [], 'valid_months': 0}
    if year < 2015:
        return {'status': 'unavailable', 'reason': 'SMAP observations began in 2015.',
                'location': {'lat': lat, 'lon': lon}, 'period': {'year': year}, 'months': [], 'valid_months': 0}
    query = {
        'parameters': PARAMETER, 'community': 'HY', 'longitude': lon,
        'latitude': lat, 'start': f'{year}0101', 'end': f'{year}1231',
        'time-standard': 'UTC', 'format': 'JSON',
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(28.0), transport=transport, follow_redirects=False) as client:
            response = await client.get(POWER_DAILY, params=query)
            if response.status_code in (400, 404, 422):
                return {
                    'status': 'unavailable',
                    'reason': 'NASA POWER does not currently serve the SMAP surface-percentile parameter for this request. No alternative product was substituted.',
                    'location': {'lat': lat, 'lon': lon}, 'period': {'year': year}, 'months': [], 'valid_months': 0,
                }
            response.raise_for_status()
            payload = response.json()
    except (httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
        raise SmapNumericUnavailable('The NASA SMAP numeric service could not be reached or returned an invalid response.') from exc
    result = normalize_smap_daily(payload, lat, lon, year)
    if result['status'] == 'unavailable':
        result['reason'] = 'NASA returned no usable SMAP surface-percentile observations for this point and year.'
    return result
