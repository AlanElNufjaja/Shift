"""On-user-PC diagnostic: check whether POWER serves the SMAP-only percentile."""
import asyncio
import json
try:
    from backend.smap_numeric import fetch_smap_numeric
except ImportError:
    from smap_numeric import fetch_smap_numeric

async def main():
    print('Field Shift / NASA SMAP L4 numerical source check')
    print('Fresno pilot reference, year 2024; no credentials required.')
    try:
        result = await fetch_smap_numeric(36.7468, -119.7726, 2024)
        print('STATUS:', result['status'])
        print('VALID MONTHS:', result.get('valid_months', 0))
        print('SOURCE:', json.dumps(result.get('source'), indent=2))
        print('JAN, FEB, MAR:', json.dumps(result.get('months', [])[:3], indent=2))
        if result['status'] != 'ready':
            print('WHY:', result.get('reason'))
    except Exception as exc:
        print('ERROR:', str(exc))
        print('This does not affect POWER climate, SMAP imagery, or the assessment.')

if __name__ == '__main__':
    asyncio.run(main())
