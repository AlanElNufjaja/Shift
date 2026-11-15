"""Exercise the actual soil adapter with failing external services, no internet."""
import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from fastapi.testclient import TestClient
from app import app, _SOIL_CACHE
from soil import USDAUnavailable, fetch_soil, soil_attributes_query


class ResilienceTests(unittest.TestCase):
    def setUp(self):
        _SOIL_CACHE.clear()

    def test_query_rejects_sql_injected_mukey(self):
        with self.assertRaises(ValueError):
            soil_attributes_query("123; DROP TABLE component")

    def test_two_stage_query_returns_full_record(self):
        calls = []
        async def responder(req):
            sql = req.content.decode()
            calls.append(sql)
            if 'SDA_Get_Mukey' in sql:
                return httpx.Response(200, json={'Table': [['1234', 'Good soil unit']]})
            return httpx.Response(200, json={'Table': [['Main component', 76, 0, 25, 1.9, 0.14, 0.30]]})
        result = asyncio.run(fetch_soil(36.6, -120.1, transport=httpx.MockTransport(responder)))
        self.assertEqual(len(calls), 2)
        self.assertEqual(result['status'], 'ready')
        self.assertEqual(result['soil']['organic_matter_percent'], 1.9)
        self.assertEqual(result['soil']['mapunit_key'], '1234')

    def test_upstream_returns_500_at_spatial_lookup(self):
        async def always_500(req):
            return httpx.Response(500, text='USDA internal error')
        with self.assertRaises(USDAUnavailable):
            asyncio.run(fetch_soil(36.6, -120.1, transport=httpx.MockTransport(always_500)))

    def test_attribute_500_returns_partial_mapping_not_fictitious_values(self):
        async def responder(req):
            if b'SDA_Get_Mukey' in req.content:
                return httpx.Response(200, json={'Table': [['1234', 'Mapped area']]})
            return httpx.Response(500, text='USDA failed on attribute join')
        result = asyncio.run(fetch_soil(36.6, -120.1, transport=httpx.MockTransport(responder)))
        self.assertEqual(result['status'], 'partial')
        self.assertEqual(result['soil']['mapunit_key'], '1234')
        self.assertIsNone(result['soil']['organic_matter_percent'])

    def test_no_coverage_returns_unavailable(self):
        async def responder(req):
            return httpx.Response(200, json={'Table': []})
        result = asyncio.run(fetch_soil(-34.6, -58.4, transport=httpx.MockTransport(responder)))
        self.assertEqual(result['status'], 'unavailable')
        self.assertIsNone(result['soil'])

    def test_malformed_response_is_failure_not_deduced_soil(self):
        async def responder(req):
            return httpx.Response(200, json={'error': 'unknown'})
        with self.assertRaises(USDAUnavailable):
            asyncio.run(fetch_soil(36.6, -120.1, transport=httpx.MockTransport(responder)))

    def test_endpoint_500_external_becomes_controlled_503(self):
        async def no_usda(lat, lon):
            raise USDAUnavailable('upstream 500')
        with patch('app.fetch_soil', no_usda), TestClient(app) as client:
            response = client.post('/api/fields/soil', json={'lat': 36.6, 'lon': -120.1})
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()['detail']['code'], 'USDA_TEMPORARILY_UNAVAILABLE')
            self.assertEqual(_SOIL_CACHE, {})

    def test_partial_not_cached(self):
        async def partial(lat, lon):
            return {'status':'partial', 'soil':{'mapunit_key':'1234'},
                    'location':{'lat':lat,'lon':lon}}
        with patch('app.fetch_soil', partial), TestClient(app) as client:
            response = client.post('/api/fields/soil', json={'lat': 36.6, 'lon': -120.1})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['status'], 'partial')
            self.assertEqual(_SOIL_CACHE, {})


if __name__ == '__main__':
    unittest.main()
