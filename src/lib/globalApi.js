/** Vite /api proxy in local development; deployed backend requires a separate configured proxy. */
export async function requestGlobalField({ lat, lon, year = 2024, signal }) {
  const base = (import.meta.env.VITE_GLOBAL_API_BASE || '/api').replace(/\/$/, '');
  const response = await fetch(`${base}/fields/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({lat, lon, year}), signal });
  if (!response.ok) throw new Error(`Climate service unavailable (HTTP ${response.status}).`);
  const value = await response.json();
  if (value?.status !== 'climate-only' || value?.location?.lat !== lat || value?.location?.lon !== lon ||
      !Array.isArray(value?.climate?.months) || value.climate.months.length !== 12 || value.period?.year !== year) {
    throw new Error('Climate response does not match the selected coordinates or year.');
  }
  return value;
}
