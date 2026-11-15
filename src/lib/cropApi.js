/** Optional USDA NASS CDL point classification. Never merges into P1/P2 records. */
export const CDL_YEARS = [2024, 2023, 2022, 2021, 2020];

export async function requestCropPoint({lat, lon, year=2024, signal}) {
  if (![lat,lon].every(Number.isFinite) || Math.abs(lat)>90 || Math.abs(lon)>180 || !CDL_YEARS.includes(year)) {
    throw new Error('Please enter valid coordinates and a supported CDL year.');
  }
  const base=(import.meta.env?.VITE_GLOBAL_API_BASE || '/api').replace(/\/$/,'');
  let response;
  try {
    response=await fetch(`${base}/fields/crops`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lat,lon,year}),signal,
    });
  } catch(err) {
    if(signal?.aborted) throw err;
    throw new Error('Could not reach the crop data backend. Check that Python is running.');
  }
  if(!response.ok) {
    const body=await response.json().catch(()=>null);
    const detail=body?.detail;
    const message=typeof detail?.message==='string'?detail.message:null;
    throw new Error(message || (response.status>=500
      ? 'USDA crop classification is temporarily unavailable. Try again later.'
      : `Crop classification could not be loaded (HTTP ${response.status}).`));
  }
  const data=await response.json();
  const allowed=['ready','unavailable','outside_coverage','unverified'];
  if(!allowed.includes(data?.status) || data?.year!==year ||
      !Number.isFinite(data.location?.lat) || !Number.isFinite(data.location?.lon) ||
      Math.abs(data.location.lat-lat)>0.0000001 || Math.abs(data.location.lon-lon)>0.0000001 ||
      data.provenance?.provider!=='USDA NASS Cropland Data Layer (CDL)' ||
      (data.status==='ready' && (!Number.isInteger(data.classification?.code) ||
        data.classification.year_verified!==true ||
        !data.classification.raster_item_years?.every(y=>y===year)))) {
    throw new Error('Crop classification did not match the requested location, year or official source.');
  }
  return data;
}
