"""Field Shift USDA diagnostic (no field data is changed).

Run on Windows from project root: py backend/diagnose_usda.py
Requires httpx, already listed in backend/requirements.txt.
"""
from __future__ import annotations
import asyncio
import json
import time
import httpx

URL = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"
POINT = "point(-120.1000000 36.6000000)"
BASIC = "SELECT TOP 1 mukey FROM mapunit WHERE mukey = '466621'"
POINT_SQL = ("SELECT TOP 1 m.mukey, m.muname FROM mapunit AS m "
             f"WHERE m.mukey IN (SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('{POINT}')) "
             "ORDER BY m.mukey")


def explain_response(response):
    print(f"  HTTP: {response.status_code} | Content-Type: {response.headers.get('content-type', 'unknown')}")
    try:
        data=response.json()
        if isinstance(data,dict) and isinstance(data.get('Table'),list):
            print(f"  USDA Table rows: {len(data['Table'])}")
            print(f"  First row: {str(data['Table'][0])[:180] if data['Table'] else '(empty)'}")
        else:
            print(f"  JSON keys: {list(data)[:8] if isinstance(data,dict) else type(data).__name__}")
            print(f"  Response excerpt: {json.dumps(data,ensure_ascii=True)[:300]}")
    except ValueError:
        print(f"  Response excerpt: {response.text[:300]!r}")


async def run_probe(client, label, sql, method):
    print(f"\\n[{label}] ({method})")
    t0=time.perf_counter()
    try:
        kwargs={method:{'query':sql,'format':'JSON'}}
        res=await client.post(URL,**kwargs)
        print(f"  Duration: {time.perf_counter()-t0:.2f}s")
        explain_response(res)
        return res
    except httpx.TimeoutException as exc:
        print(f"  TIMEOUT ({type(exc).__name__}) after {time.perf_counter()-t0:.1f}s")
    except httpx.RequestError as exc:
        print(f"  CONNECTION ERROR ({type(exc).__name__}): {str(exc)[:250]}")
    return None


async def main():
    print('FIELD SHIFT / USDA SDA DIAGNOSTIC')
    print('Tests only official USDA service; does not edit project or send private credentials.')
    print('Coordinates used: Fresno pilot 36.6000, -120.1000')
    print('Please share the console output if USDA still fails.')
    timeout=httpx.Timeout(14.0, connect=6.0)
    async with httpx.AsyncClient(timeout=timeout,follow_redirects=False,headers={
        'Accept':'application/json','User-Agent':'FieldShift-Diagnostics/3.8.2'}) as client:
        await run_probe(client,'1. Basic catalog query',BASIC,'data')
        await run_probe(client,'2. Point lookup with form-encoded POST',POINT_SQL,'data')
        await run_probe(client,'3. Point lookup with JSON POST',POINT_SQL,'json')
    print('\\nDONE — Any 200 + Table result confirms the service answered that query.')
    print('A 500, timeout, or connection failure identifies the step that needs attention.')

if __name__=='__main__':
    asyncio.run(main())
