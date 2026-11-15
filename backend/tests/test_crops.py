"""Official CDL integration is validated with mocked network responses."""
import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import httpx
from fastapi.testclient import TestClient
from app import app, _CDL_CACHE
from crops import request_parameters, normalize_cdl, fetch_cdl, class_labels_from_attribute_table

LAT, LON, YEAR = 36.7468, -119.7726, 2024


def fixture(value='54', years=(2024,)):
    return {'value':value, 'catalogItems':{'features':[{'attributes':{'Year':y}} for y in years]}}

class CropLookupTests(unittest.TestCase):
    def setUp(self): _CDL_CACHE.clear()

    def test_request_requires_year_filter_and_wgs84(self):
        params=request_parameters(LAT,LON,YEAR)
        self.assertIn('Year = 2024',params['mosaicRule'])
        self.assertIn('4326',params['geometry'])
        self.assertEqual(params['returnCatalogItems'],'true')
        with self.assertRaises(ValueError):request_parameters(91,0,2024)
        with self.assertRaises(ValueError):request_parameters(40,0,2025)

    def test_valid_pixel_preserves_verified_year(self):
        result=normalize_cdl(fixture(),LAT,LON,YEAR,{54:'Tomatoes'})
        self.assertEqual(result['status'],'ready')
        self.assertEqual(result['classification']['code'],54)
        self.assertEqual(result['classification']['label'],'Tomatoes')
        self.assertFalse(result['classification']['is_field_crop'])

    def test_wrong_or_missing_year_is_rejected(self):
        for raw in [fixture(years=[2023]),fixture(years=[]),fixture(years=[2023,2024])]:
            self.assertEqual(normalize_cdl(raw,LAT,LON,YEAR)['status'],'unverified')
            self.assertIsNone(normalize_cdl(raw,LAT,LON,YEAR)['classification'])

    def test_null_pixel_unavailable(self):
        for value in ['NoData',None,0,255]:
            self.assertEqual(normalize_cdl(fixture(value),LAT,LON,YEAR)['status'],'unavailable')
        with self.assertRaises(ValueError):normalize_cdl({'error':{'message':'token required'}},LAT,LON,YEAR)

    def test_legend_from_usda_attribute_table(self):
        mapping=class_labels_from_attribute_table({'features':[{'attributes':{'Value':54,'Class_Names':'Tomatoes'}},{'attributes':{'Value':99,'Class_Names':None}}]})
        self.assertEqual(mapping,{54:'Tomatoes'})

    def test_mocked_identify_and_legend(self):
        async def route(req):
            self.assertEqual(req.url.host,'pdi.scinet.usda.gov')
            if req.url.path.endswith('/identify'):
                self.assertIn('Year = 2024',req.url.params['mosaicRule'])
                return httpx.Response(200,json=fixture())
            self.assertTrue(req.url.path.endswith('/rasterAttributeTable'))
            return httpx.Response(200,json={'features':[{'attributes':{'Value':54,'Class_Names':'Tomatoes'}}]})
        data=asyncio.run(fetch_cdl(LAT,LON,YEAR,transport=httpx.MockTransport(route)))
        self.assertEqual(data['status'],'ready')
        self.assertEqual(data['classification']['label'],'Tomatoes')

    def test_legend_failure_still_keeps_verified_code(self):
        async def route(req):
            return httpx.Response(200,json=fixture()) if req.url.path.endswith('/identify') else httpx.Response(503)
        data=asyncio.run(fetch_cdl(LAT,LON,YEAR,transport=httpx.MockTransport(route)))
        self.assertEqual(data['classification']['code'],54)
        self.assertIsNone(data['classification']['label'])

    def test_non_us_without_upstream_call(self):
        async def fail(req):raise AssertionError('USDA must not be queried outside CONUS bounds')
        data=asyncio.run(fetch_cdl(-34.6,-58.4,2024,transport=httpx.MockTransport(fail)))
        self.assertEqual(data['status'],'outside_coverage')

    def test_api_route_caches_only_verified(self):
        async def fake(lat,lon,year):return normalize_cdl(fixture(),lat,lon,year,{54:'Tomatoes'})
        with patch('app.fetch_cdl',fake),TestClient(app) as client:
            r=client.post('/api/fields/crops',json={'lat':LAT,'lon':LON,'year':YEAR})
            self.assertEqual(r.status_code,200)
            self.assertEqual(r.json()['cache'],'miss')
            self.assertEqual(client.post('/api/fields/crops',json={'lat':LAT,'lon':LON,'year':YEAR}).json()['cache'],'hit')
            self.assertEqual(client.post('/api/fields/crops',json={'lat':LAT,'lon':LON,'year':2025}).status_code,422)

    def test_api_upstream_failure_returns_controlled_503(self):
        async def failure(lat,lon,year):raise httpx.ReadTimeout('down')
        with patch('app.fetch_cdl',failure),TestClient(app) as client:
            r=client.post('/api/fields/crops',json={'lat':LAT,'lon':LON,'year':YEAR})
            self.assertEqual(r.status_code,503)
            self.assertIn('did not answer',r.json()['detail']['message'])

if __name__=='__main__':unittest.main()
