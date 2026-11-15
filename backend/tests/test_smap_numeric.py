import asyncio
import math
import httpx
import pytest
from fastapi.testclient import TestClient

from backend import app as main
from backend.smap_numeric import PARAMETER, SmapNumericUnavailable, fetch_smap_numeric, normalize_smap_daily


def make_payload(year=2024):
    return {'properties': {'parameter': {PARAMETER: {
        f'{year}0101': 23.2,
        f'{year}0102': 26.8,
        f'{year}0201': 50,
        f'{year}0301': -999,
        f'{year}0302': 101,
        f'{year}0401': 'not a number',
        f'{year}0501': True,
        f'{year}0601': 0.0,
    }}}}


def test_smap_percentile_monthly_aggregation_retains_gaps():
    result = normalize_smap_daily(make_payload(), 36.7468, -119.7726, 2024)
    assert result['status'] == 'ready'
    assert result['source']['parameter'] == PARAMETER
    assert result['source']['unit'] == 'percentile rank (0-100)'
    assert result['months'][0]['surface_percentile'] == 25
    assert result['months'][0]['valid_days'] == 2
    assert result['months'][1]['surface_percentile'] == 50
    assert result['months'][2]['surface_percentile'] is None
    assert result['months'][5]['surface_percentile'] == 0
    assert result['valid_months'] == 3
    assert len(result['months']) == 12
    assert result['months'][1]['calendar_days'] == 29


def test_smap_never_accepts_other_power_parameters():
    with pytest.raises(SmapNumericUnavailable):
        normalize_smap_daily({'properties': {'parameter': {'GWETTOP': {'20240101': 0.2}}}}, 36, -119, 2024)
    with pytest.raises(SmapNumericUnavailable):
        normalize_smap_daily({}, 36, -119, 2024)


def test_outside_mission_coverage_no_remote_request():
    for lat in [87, -85]:
        result = asyncio.run(fetch_smap_numeric(lat, 0, 2024))
        assert result['status'] == 'unavailable'
        assert result['months'] == []


def test_upstream_valid_payload_using_mock_transport():
    async def handler(request):
        assert request.url.host == 'power.larc.nasa.gov'
        assert request.url.params['community'] == 'HY'
        assert request.url.params['parameters'] == 'SFMC_PRCNTL'
        assert request.url.params['time-standard'] == 'UTC'
        return httpx.Response(200, json=make_payload())
    response = asyncio.run(fetch_smap_numeric(36.7468, -119.7726, 2024, transport=httpx.MockTransport(handler)))
    assert response['status'] == 'ready'
    assert response['valid_months'] == 3


def test_upstream_refusal_never_substitutes_another_product():
    async def handler(request):
        return httpx.Response(422, json={'message': 'Parameter unavailable'})
    response = asyncio.run(fetch_smap_numeric(36, -119, 2024, transport=httpx.MockTransport(handler)))
    assert response['status'] == 'unavailable'
    assert response['months'] == []


def test_backend_input_validation_and_controlled_unavailability(monkeypatch):
    client = TestClient(main.app)
    assert client.post('/api/fields/smap/monthly', json={'lat': 91, 'lon': 0, 'year': 2024}).status_code == 422
    assert client.post('/api/fields/smap/monthly', json={'lat': 36, 'lon': 0, 'year': 2014}).status_code == 422
    async def bad(*args, **kwargs):
        raise SmapNumericUnavailable('NASA refused this numeric request')
    monkeypatch.setattr(main, 'fetch_smap_numeric', bad)
    main._SMAP_CACHE.clear()
    result = client.post('/api/fields/smap/monthly', json={'lat': 35.12, 'lon': 85.24, 'year': 2024})
    assert result.status_code == 503
    assert result.json()['detail']['code'] == 'SMAP_NUMERIC_SERVICE_UNAVAILABLE'


def test_cache_only_successful_observations(monkeypatch):
    main._SMAP_CACHE.clear()
    calls = []
    async def available(lat, lon, year):
        calls.append((lat, lon, year))
        return normalize_smap_daily(make_payload(), lat, lon, year)
    monkeypatch.setattr(main, 'fetch_smap_numeric', available)
    client = TestClient(main.app)
    args={'lat': 36.7468, 'lon':-119.7726, 'year':2024}
    r1=client.post('/api/fields/smap/monthly',json=args)
    r2=client.post('/api/fields/smap/monthly',json=args)
    assert r1.json()['cache']=='miss'
    assert r2.json()['cache']=='hit'
    assert calls == [(36.7468,-119.7726,2024)]
