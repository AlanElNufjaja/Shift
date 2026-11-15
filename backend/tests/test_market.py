from __future__ import annotations

import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.market import MarketUnavailable, fetch_report, safe_slug, safe_excerpt


def test_slug_validation():
    assert safe_slug('2194') == '2194'
    with pytest.raises(MarketUnavailable): safe_slug('../../bad')
    with pytest.raises(MarketUnavailable): safe_slug('https://example.com')


def test_market_disabled_by_default(monkeypatch):
    monkeypatch.delenv('FIELD_SHIFT_MARKET_LOCAL_MODE', raising=False)
    monkeypatch.delenv('FIELD_SHIFT_MMN_API_KEY', raising=False)
    with TestClient(app) as c:
        assert c.get('/api/market/status').json()['configured'] is False
        r=c.get('/api/market/reports/2194')
    assert r.status_code == 403
    assert 'key' not in r.text.lower() or 'API key' not in r.text


def test_key_never_exposed_in_status(monkeypatch):
    monkeypatch.setenv('FIELD_SHIFT_MARKET_LOCAL_MODE', '1')
    monkeypatch.setenv('FIELD_SHIFT_MMN_API_KEY', 'TOP_SECRET_KEY_123')
    with TestClient(app) as c: data=c.get('/api/market/status')
    assert data.status_code == 200
    assert data.json()['configured'] is True
    assert 'TOP_SECRET_KEY_123' not in data.text


def test_market_api_official_origin_and_safe_excerpt(monkeypatch):
    monkeypatch.setenv('FIELD_SHIFT_MMN_API_KEY', 'TEST_KEY')
    def handler(request: httpx.Request):
        assert request.url.host == 'marsapi.ams.usda.gov'
        assert request.url.path == '/services/v1.2/reports/2194/Details'
        assert request.url.params.get('lastReports') == '1'
        assert request.headers['authorization'].startswith('Basic ')
        return httpx.Response(200, json={'results':[{'commodity':'Example','price': '1.2','large': 'x' * 1000}]})
    client=httpx.AsyncClient(transport=httpx.MockTransport(handler))
    result=asyncio.run(fetch_report('2194', client=client))
    asyncio.run(client.aclose())
    assert result['total_rows_received'] == 1
    assert len(result['preview'][0]['large']) == 400
    assert 'TEST_KEY' not in json.dumps(result)


def test_market_reports_fail_safely(monkeypatch):
    monkeypatch.setenv('FIELD_SHIFT_MMN_API_KEY', 'TEST_KEY')
    for code, expected in ((401,401), (404,404), (500,503)):
        c=httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(code)))
        with pytest.raises(MarketUnavailable) as exc:
            asyncio.run(fetch_report('2194',client=c))
        asyncio.run(c.aclose())
        assert exc.value.status == expected
    assert safe_excerpt({'complex': [{'x': 'good'}]}) == {'complex': [{'x': 'good'}]}
