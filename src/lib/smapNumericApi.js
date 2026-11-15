/** NASA POWER serves SMAP L4 *percentile ranks*. Percentiles are NOT volumetric %.
 * Never use the GIBS image colors, demo GWETTOP, or the MERRA default as numeric SMAP.
 */
export const SMAP_NUMERIC_YEARS = [2025, 2024, 2023];
export const SMAP_NUMERIC_REFERENCE = 'https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/';

export function validateSmapNumericalResponse(data, {lat, lon, year}) {
  if (!data || !['ready', 'unavailable'].includes(data.status) ||
      data.location?.lat !== lat || data.location?.lon !== lon || data.period?.year !== year) {
    throw new Error('SMAP response does not match the selected location and year.');
  }
  if (data.status === 'unavailable') return data;
  if (data.source?.parameter !== 'SFMC_PRCNTL' || data.source?.unit !== 'percentile rank (0-100)' ||
      !Array.isArray(data.months) || data.months.length !== 12 ||
      data.months.some((m, i) => m.date !== `${year}-${String(i+1).padStart(2,'0')}` ||
        (m.surface_percentile !== null && (!Number.isFinite(m.surface_percentile) || m.surface_percentile < 0 || m.surface_percentile > 100)) ||
        !Number.isInteger(m.valid_days) || !Number.isInteger(m.calendar_days) || m.calendar_days < 28 || m.calendar_days > 31 || m.valid_days < 0 || m.valid_days > m.calendar_days || (m.surface_percentile === null && m.valid_days > 0))) {
    throw new Error('SMAP series has invalid months, units or source metadata.');
  }
  return data;
}

export async function requestSmapNumerical({lat, lon, year, signal, fetcher = fetch, base='/api'}) {
  if (!Number.isFinite(lat) || Math.abs(lat)>90 || !Number.isFinite(lon) || Math.abs(lon)>180 || !Number.isInteger(year) || year<2015 || year>2026) {
    throw new Error('Please select valid field coordinates and a SMAP observation year.');
  }
  const response = await fetcher(`${base.replace(/\/$/, '')}/fields/smap/monthly`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lat,lon,year}), signal,
  });
  if (!response.ok) {
    let message = 'SMAP numerical service is temporarily unavailable.';
    try { const error = await response.json(); if (error?.detail?.message) message = error.detail.message; } catch { /* safe generic message */ }
    throw new Error(message);
  }
  return validateSmapNumericalResponse(await response.json(), {lat, lon, year});
}
