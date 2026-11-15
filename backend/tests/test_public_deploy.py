"""Offline regression tests for public Render deployment routes."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import app as module

class PublicDeployTests(unittest.TestCase):
    def test_power_proxy_accepts_only_known_parameters(self):
        with TestClient(module.app) as client:
            base = '/nasa-power/api/temporal/monthly/point'
            args = {'latitude': 36.6, 'longitude': -120.1, 'start': 2024,
                    'end': 2024, 'parameters': 'T2M_MAX,PRECTOTCORR',
                    'community': 'AG', 'format': 'JSON'}
            self.assertEqual(client.get(base, params={**args, 'parameters':'ALL'}).status_code, 400)
            self.assertEqual(client.get(base, params={**args, 'latitude':91}).status_code, 422)
            self.assertEqual(client.get(base, params={**args, 'end':2023}).status_code, 400)

    def test_nasa_upstream_proxy_returns_original_payload(self):
        payload = {'properties': {'parameter': {
            'T2M_MAX': {'202401': 20.5}, 'PRECTOTCORR': {'202401': 0.4}}}}
        class FakeResponse:
            def raise_for_status(self): pass
            def json(self): return payload
        class FakeClient:
            def __init__(self, *a, **k): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *a): pass
            async def get(self, url, params):
                assert url == module.POWER_URL
                assert params['start'] == 2023
                return FakeResponse()
        module._POWER_PROXY_CACHE.clear()
        with patch.object(module.httpx,'AsyncClient', FakeClient), TestClient(module.app) as client:
            args = {'latitude': 36.6, 'longitude': -120.1, 'start':2023,
                    'end':2023, 'parameters':'T2M_MAX,PRECTOTCORR', 'community':'AG', 'format':'JSON'}
            r = client.get('/nasa-power/api/temporal/monthly/point', params=args)
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json(),payload)
            r2 = client.get('/nasa-power/api/temporal/monthly/point', params=args)
            self.assertEqual(r2.status_code, 200)
        module._POWER_PROXY_CACHE.clear()

    def test_frontend_build_served_from_same_origin(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            (root/'index.html').write_text('<!doctype html><title>Field Shift</title>')
            (root/'assets').mkdir()
            (root/'assets'/'main.js').write_text('console.log(123)')
            with patch.object(module, '_FRONTEND_DIR', root), TestClient(module.app) as client:
                self.assertEqual(client.get('/').status_code,200)
                self.assertEqual(client.get('/assets/main.js').status_code,200)
                self.assertEqual(client.get('/any-route').status_code,200)
                self.assertEqual(client.get('/assets/missing.js').status_code,404)
                self.assertEqual(client.get('/api/missing').status_code,404)
                self.assertEqual(client.get('/../backend/app.py').status_code,404)

if __name__=='__main__': unittest.main()
