"""Smoke-test the NASA GIBS WMS layer, without API keys or making farm predictions.

Run: py backend\diagnose_smap.py
Prints HTTP status, content types and any error excerpt. Does not save imagery.
"""
from __future__ import annotations
import math
import httpx

ROOT = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"
LAYER = "SMAP_L3_Passive_Enhanced_Day_Soil_Moisture"
DATE = "2024-07-15"


def mercator(lon: float, lat: float) -> tuple[float, float]:
    lat = max(-85.05, min(85.05, lat))
    x = 6378137 * math.radians(lon)
    y = 6378137 * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return x, y


def run():
    print('FIELD SHIFT / NASA GIBS SMAP DIAGNOSTIC')
    print('This checks a public NASA satellite-image service, NOT a numerical point API.')
    print(f'Layer: {LAYER} | Date: {DATE}')
    x, y = mercator(-119.7726, 36.7468)
    queries = [
        ('Capabilities', {'service': 'WMS', 'request': 'GetCapabilities', 'version': '1.1.1'}),
        ('Image preview', {'service':'WMS', 'version':'1.1.1', 'request':'GetMap', 'layers':LAYER,
            'styles':'', 'srs':'EPSG:3857', 'bbox':f'{x-35000},{y-35000},{x+35000},{y+35000}',
            'width':'256', 'height':'256', 'format':'image/png', 'transparent':'true', 'time':DATE}),
    ]
    with httpx.Client(timeout=25.0, follow_redirects=False) as client:
        for name, params in queries:
            print(f'\n{name}:')
            try:
                r = client.get(ROOT, params=params)
                ct = r.headers.get('content-type', 'unknown')
                print(f'HTTP {r.status_code} | content-type: {ct} | bytes: {len(r.content)}')
                if name == 'Capabilities' and r.status_code == 200:
                    print('SMAP layer listed:', LAYER.encode() in r.content)
                if name == 'Image preview' and r.status_code == 200 and 'image/' in ct:
                    print('NASA returned an image; color/pixel coverage remains to be visually checked.')
                elif r.status_code >= 400 or (name == 'Image preview' and 'image/' not in ct):
                    print('Response excerpt:', r.text[:400] if 'image' not in ct else '(image bytes)')
            except httpx.HTTPError as exc:
                print(f'Connection problem: {type(exc).__name__}: {exc}')


if __name__ == '__main__':
    run()
