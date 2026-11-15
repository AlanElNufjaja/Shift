/** Accept any valid global coordinate. No automatic 'California fallback'. */
export function validateCoordinates(latInput, lonInput) {
  const latText = String(latInput ?? '').trim();
  const lonText = String(lonInput ?? '').trim();
  if (!latText || !lonText) return { valid: false, error: 'Enter both latitude and longitude.' };
  // Avoid interpreting empty strings, hexadecimal, infinity or scientific typos as valid positions.
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!decimal.test(latText) || !decimal.test(lonText)) return { valid: false, error: 'Use decimal degrees, such as 36.6000 and -120.1000.' };
  const lat = Number(latText), lon = Number(lonText);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { valid: false, error: 'Latitude must be between -90 and 90.' };
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { valid: false, error: 'Longitude must be between -180 and 180.' };
  return { valid: true, lat, lon };
}

export function makeCustomField(lat, lon) {
  return {
    id: 'custom-coord', nombre: 'My coordinate', ciudad: 'Custom location', lat, lon,
    origen: 'custom', datos_procedencia: 'unavailable',
    suelo_ssurgo: {}, historial_cropscape: [], clima_mensual: [],
    // Absent is unknown, not a false assertion of full crop cover.
    meses_suelo_desnudo: null,
  };
}
