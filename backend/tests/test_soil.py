"""Mocked USDA integration checks: no requests to NASA or USDA during tests."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from fastapi.testclient import TestClient
from app import app, _SOIL_CACHE
from soil import normalize_soil, soil_point_query, soil_attributes_query, fetch_soil

class SoilTests(unittest.TestCase):
    def setUp(self):
        _SOIL_CACHE.clear()

    def test_query_is_point_with_validated_numeric_coordinates(self):
        sql=soil_point_query(36.6, -120.1)
        self.assertIn('point(-120.1000000 36.6000000)',sql)
        self.assertNotIn('JOIN chorizon',sql)  # lightweight spatial phase
        self.assertIn('JOIN chorizon',soil_attributes_query('466621'))
        self.assertIn('SDA_Get_Mukey_from_intersection_with_WktWgs84',sql)
        with self.assertRaises(ValueError):soil_point_query(91, -120)
        with self.assertRaises(ValueError):soil_point_query(float('nan'), 0)

    def test_normalizer_keeps_missing_as_null(self):
        raw={'Table': [['466621','Mapped soil unit','Major component',75,0,20,'1.7',None,'0.32']]}
        result=normalize_soil(raw,36.6,-120.1)
        self.assertEqual(result['status'],'ready')
        self.assertEqual(result['soil']['organic_matter_percent'],1.7)
        self.assertEqual(result['soil']['horizon_bottom_cm'],20)
        self.assertIsNone(result['soil']['available_water_capacity_fraction'])
        self.assertNotIn('erosion_risk',result['soil'])

    def test_not_mapped_is_not_fresno_fallback(self):
        result=normalize_soil({'Table':[]},-34.6,-58.4)
        self.assertEqual(result['status'],'unavailable')
        self.assertIsNone(result['soil'])
        with self.assertRaises(ValueError):normalize_soil({'unexpected':[]},0,0)
        with self.assertRaises(ValueError):normalize_soil({'Table':[['short']]},0,0)

    def test_mock_usda_fetch_over_transport(self):
        async def route(req):
            from urllib.parse import parse_qs
            submitted = parse_qs(req.content.decode())["query"][0]
            assert req.headers["content-type"].startswith("application/x-www-form-urlencoded")
            assert req.url.host == 'sdmdataaccess.sc.egov.usda.gov'
            assert req.method == 'POST'
            if 'point(-120.1000000 36.6000000)' in submitted:
                return httpx.Response(200,json={'Table':[['466621','Unit']]})
            assert '466621' in submitted and 'chorizon' in submitted
            return httpx.Response(200,json={'Table':[['Component',60,0,22,1.5,0.16,0.28]]})
        transport=httpx.MockTransport(route)
        import asyncio
        result=asyncio.run(fetch_soil(36.6,-120.1,transport=transport))
        self.assertEqual(result['status'],'ready')
        self.assertEqual(result['soil']['mapunit_key'],'466621')

    def test_route_exposes_no_data_without_fabrication(self):
        async def fake_soil(lat,lon):
            return normalize_soil({'Table':[]},lat,lon)
        with patch('app.fetch_soil',fake_soil), TestClient(app) as client:
            result=client.post('/api/fields/soil',json={'lat':-34.6,'lon':-58.4})
            self.assertEqual(result.status_code,200)
            self.assertEqual(result.json()['status'],'unavailable')
            self.assertIsNone(result.json()['soil'])
            second=client.post('/api/fields/soil',json={'lat':-34.6,'lon':-58.4})
            self.assertEqual(second.json()['cache'],'hit')
            invalid=client.post('/api/fields/soil',json={'lat':99,'lon':0})
            self.assertEqual(invalid.status_code,422)

    def test_route_upstream_failure_returns_503(self):
        async def fail_soil(lat,lon):
            raise httpx.ReadTimeout('unavailable')
        with patch('app.fetch_soil',fail_soil),TestClient(app) as client:
            response=client.post('/api/fields/soil',json={'lat':36.6,'lon':-120.1})
            self.assertEqual(response.status_code,503)
            self.assertIn('USDA soil mapping is temporarily unavailable',response.json()['detail']['message'])

if __name__=='__main__':unittest.main()
