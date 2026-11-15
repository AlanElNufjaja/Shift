import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app import app, FieldQuery, normalize_power, clean

class BackendTests(unittest.TestCase):
    def test_valid_coordinates_worldwide(self):
        self.assertEqual(FieldQuery(lat=-34.6, lon=-58.4).year, 2024)
        self.assertEqual(FieldQuery(lat=0, lon=0).lat, 0)

    def test_invalid_coordinates(self):
        for lat, lon in [(91, 0), (-91, 0), (0, 181), (0, -181), (float('nan'), 0), (float('inf'), 0)]:
            with self.assertRaises(ValidationError): FieldQuery(lat=lat, lon=lon)

    def test_nulls_not_invented(self):
        self.assertIsNone(clean(-999))
        self.assertIsNone(clean(None))
        self.assertEqual(clean(0), 0)
        raw = {'properties': {'parameter': {'T2M_MAX': {'202401': 29, '202402': -999},
            'PRECTOTCORR': {'202401': 1.2, '202402': -999}}}}
        result = normalize_power(raw, -34.6, -58.4, 2024)
        self.assertEqual(result['climate']['months'][0]['precipitation_mm_per_day'], 1.2)
        self.assertIsNone(result['climate']['months'][1]['temperature_max_c'])
        self.assertEqual(result['climate']['available_temperature_months'], 1)
        self.assertEqual(result['soil']['status'], 'unavailable')
        self.assertEqual(result['recommendations']['status'], 'unavailable')

    def test_api_route_with_mocked_nasa_no_network(self):
        class FakeResponse:
            def raise_for_status(self): pass
            def json(self): return {'properties': {'parameter': {
                'T2M_MAX': {'202401': 32.1}, 'PRECTOTCORR': {'202401': 0.5}}}}
        class FakeClient:
            def __init__(self, *args, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): pass
            async def get(self, url, params=None):
                assert url == 'https://power.larc.nasa.gov/api/temporal/monthly/point'
                assert params['latitude'] == -34.6037
                assert params['longitude'] == -58.3816
                return FakeResponse()
        with patch('app.httpx.AsyncClient', FakeClient), TestClient(app) as client:
            response = client.post('/api/fields/analyze', json={'lat': -34.6037, 'lon': -58.3816, 'year': 2024})
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result['climate']['months'][0]['temperature_max_c'], 32.1)
        self.assertIsNone(result['climate']['months'][2]['temperature_max_c'])
        self.assertEqual(result['recommendations']['status'], 'unavailable')

    def test_model_capabilities_do_not_claim_executable_model(self):
        with TestClient(app) as client:
            response = client.get('/api/models/capabilities')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'reference-only')
        self.assertFalse(body['model_execution_available'])
        self.assertEqual(body['model_run_contract'], 'field-shift.model-run.v1')
        self.assertEqual(len(body['pilot_fields']), 3)
        self.assertEqual(body['supported_archive_year'], 2024)

    def test_bad_response_rejected(self):
        with self.assertRaises(ValueError):normalize_power({}, 0, 0, 2024)

if __name__ == '__main__': unittest.main()
