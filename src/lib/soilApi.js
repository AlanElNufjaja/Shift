/** USDA NRCS soil lookup through the FastAPI proxy. No fabricated fallback. */
export async function requestSoilPoint({lat, lon, signal}) {
  if (![lat, lon].every(Number.isFinite) || Math.abs(lat)>90 || Math.abs(lon)>180) {
    throw new Error('Invalid coordinates for soil lookup.');
  }
  const base = (import.meta.env?.VITE_GLOBAL_API_BASE || '/api').replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${base}/fields/soil`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({lat,lon}), signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('The soil service could not be reached. Check that the Python backend is running, then try again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = (typeof detail === 'object' && typeof detail?.message === 'string')
      ? detail.message
      : (typeof detail === 'string' && !/^Internal Server Error$/i.test(detail) ? detail : null);
    throw new Error(message || (response.status >= 500
      ? 'USDA soil mapping is temporarily unavailable. You can continue using Field Shift and try again later.'
      : `Soil lookup could not be completed (HTTP ${response.status}).`));
  }
  const data=await response.json();
  if (!['ready','partial','unavailable'].includes(data?.status) ||
      Math.abs(data.location?.lat-lat)>0.0000001 || Math.abs(data.location?.lon-lon)>0.0000001 ||
      data.provenance?.provider !== 'USDA NRCS Soil Data Access (SSURGO)' ||
      (['ready','partial'].includes(data.status) && !data.soil)) {
    throw new Error('Soil data does not match the selected location or provider.');
  }
  return data;
}
