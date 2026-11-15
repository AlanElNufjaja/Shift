"""Read-only USDA AMS MyMarketNews report access for the local Field Shift demo.

No commodity-to-price mapping is inferred from arbitrary market report tables.
The personal API key stays on the Python server and is never included in JSON.
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx

API_BASE = 'https://marsapi.ams.usda.gov/services/v1.2/reports'
SAFE_SLUG = re.compile(r'^[A-Za-z0-9_-]{2,40}$')
MAX_BODY_BYTES = 1_500_000


class MarketUnavailable(Exception):
    def __init__(self, message: str, status: int = 503):
        super().__init__(message)
        self.status = status


def enabled() -> bool:
    return os.getenv('FIELD_SHIFT_MARKET_LOCAL_MODE', '') == '1'


def credentials_available() -> bool:
    return bool(os.getenv('FIELD_SHIFT_MMN_API_KEY', '').strip())


def require_local(request) -> None:
    if not enabled() or not request.client or request.client.host not in ('127.0.0.1', '::1'):
        raise MarketUnavailable('USDA Market News access is restricted to the local backend.', 403)
    if not credentials_available():
        raise MarketUnavailable('Configure a personal USDA MyMarketNews API key in the backend terminal.', 401)


def safe_slug(value: str) -> str:
    if not SAFE_SLUG.fullmatch(str(value)):
        raise MarketUnavailable('Invalid USDA Market News report identifier.', 400)
    return value


def response_rows(payload: Any):
    if isinstance(payload, dict) and isinstance(payload.get('results'), list):
        return payload['results']
    if isinstance(payload, list):
        return payload
    raise MarketUnavailable('USDA Market News returned a different report schema.')


def safe_excerpt(value: Any, limit: int = 40, depth: int = 0) -> Any:
    """Output limit and field-level sanitization. Untrusted data stays untrusted."""
    if depth > 3:
        return '[nested fields omitted]'
    if isinstance(value, dict):
        return {str(k)[:70]: safe_excerpt(v, limit, depth + 1)
                for k, v in list(value.items())[:limit]}
    if isinstance(value, list):
        return [safe_excerpt(v, limit, depth + 1) for v in value[:8]]
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return str(value)[:400]


async def fetch_report(report_slug: str, *, client: httpx.AsyncClient | None = None):
    slug = safe_slug(report_slug)
    key = os.getenv('FIELD_SHIFT_MMN_API_KEY', '').strip()
    if not key:
        raise MarketUnavailable('USDA MyMarketNews API key is not configured.', 401)
    # Explicit read-only endpoint, no arbitrary user URLs or query filters.
    endpoint = f'{API_BASE}/{slug}/Details'
    try:
        if client is None:
            async with httpx.AsyncClient(timeout=httpx.Timeout(16.0), follow_redirects=False) as c:
                response = await c.get(endpoint, params={'lastReports': 1}, auth=httpx.BasicAuth(key, ''))
        else:
            response = await client.get(endpoint, params={'lastReports': 1}, auth=httpx.BasicAuth(key, ''))
    except (httpx.RequestError, httpx.TimeoutException) as exc:
        raise MarketUnavailable('USDA Market News could not be reached. Retry later.') from exc
    if response.status_code in (401, 403):
        raise MarketUnavailable('USDA rejected the personal API key or report permissions.', 401)
    if response.status_code == 404:
        raise MarketUnavailable('The report or Details section was not found. Check its slug ID.', 404)
    if response.status_code != 200:
        raise MarketUnavailable('USDA Market News returned an upstream error. No values were substituted.')
    if len(response.content) > MAX_BODY_BYTES:
        raise MarketUnavailable('The USDA report response exceeds the local preview limit.', 413)
    try:
        rows = response_rows(response.json())
    except (ValueError, TypeError) as exc:
        raise MarketUnavailable('USDA returned an unexpected report format.') from exc
    # Do not interpret/convert crop, units, prices or dates without report-specific mapping.
    return {
        'status': 'retrieved',
        'report_slug': slug,
        'source_url': endpoint,
        'fetched_at': datetime.now(timezone.utc).isoformat(),
        'total_rows_received': len(rows),
        'preview': [safe_excerpt(r) for r in rows[:6]],
        'note': 'Official report rows (read-only). Prices have NOT been normalized or applied to crop scenarios; check commodity, quotation date, grade, market and units.',
    }
