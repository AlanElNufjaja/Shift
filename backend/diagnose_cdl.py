r"""Run: py backend\diagnose_cdl.py  (from Field Shift root on Windows)
Reads the remote USDA NASS image service; no local files are modified.
"""
import asyncio
import json
import pathlib
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from crops import CDL_SERVICE, request_parameters
import httpx

async def main():
    lat,lon,year=36.7468,-119.7726,2024
    url=CDL_SERVICE+'/identify'
    print('Field Shift CDL diagnostic: Fresno demo map coordinates, year 2024')
    print('Provider:',CDL_SERVICE)
    try:
        async with httpx.AsyncClient(timeout=20,follow_redirects=False) as client:
            response=await client.get(url,params=request_parameters(lat,lon,year))
            print('Status:',response.status_code)
            data=response.json()
            if data.get('error'):print('Service error:',str(data['error'])[:600]);return
            print('Pixel value:',data.get('value'))
            items=data.get('catalogItems') or {}
            feats=items.get('features') or []
            print('Catalog item years:',[(f.get('attributes') or {}).get('Year') for f in feats[:5]])
            print('Catalog items returned:',len(feats))
            print('Classification accepted only when item years confirm 2024.')
    except (httpx.HTTPError,ValueError) as exc:
        print('Service unavailable:',type(exc).__name__,str(exc)[:250])

if __name__=='__main__': asyncio.run(main())
