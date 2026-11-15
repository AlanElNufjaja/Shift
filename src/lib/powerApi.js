import { displayMonth } from './displayEnglish.js';
import { MESES, numeroSeguro } from './diagnostics.js';

/**
 * NASA POWER / Monthly Point API.
 * T2M_MAX: extremo mensual de temperatura del aire (°C).
 * PRECTOTCORR: tasa de precipitación corregida agregada por mes (mm/day).
 * Se consulta por coordenada; NO representa medición de un sensor de parcela.
 */
export const POWER_YEAR_OPTIONS = [2025, 2024, 2023];
export const POWER_SOURCE_URL = 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/';

export function buildPowerUrl({ lat, lon, year, base = '/nasa-power' }) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error('Invalid coordinates for NASA POWER');
  }
  if (!Number.isInteger(year) || year < 1981 || year > 2025) {
    throw new Error('Year outside the configured query window');
  }
  // Se conserva el host bajo control del proyecto: nunca se toma de la respuesta remota.
  const query = new URLSearchParams({
    parameters: 'T2M_MAX,PRECTOTCORR',
    community: 'AG',
    longitude: String(lon),
    latitude: String(lat),
    start: String(year),
    end: String(year),
    format: 'JSON',
  });
  return `${base.replace(/\/$/, '')}/api/temporal/monthly/point?${query.toString()}`;
}

function medida(value, { precipitation = false } = {}) {
  const n = numeroSeguro(value);
  // -999 y -999.00 señalan ausencias en algunos productos NASA POWER.
  if (n === null || n < -900 || (precipitation && n < 0)) return null;
  return n;
}

/** Normalización estricta: 12 meses ordenados; nunca se inventan valores faltantes. */
export function normalizePowerMonthly(payload, year) {
  if (!Number.isInteger(year) || !payload || typeof payload !== 'object') {
    throw new Error('Invalid NASA POWER response');
  }
  const p = payload?.properties?.parameter;
  if (!p || typeof p !== 'object' || (!p.T2M_MAX && !p.PRECTOTCORR)) {
    throw new Error('NASA POWER did not return the requested variables');
  }
  const serie = MESES.map((mes, index) => {
    const key = `${year}${String(index + 1).padStart(2, '0')}`;
    return {
      mes,
      abreviatura: displayMonth(mes).slice(0, 3),
      periodo: `${year}-${String(index + 1).padStart(2, '0')}`,
      temperatura: medida(p.T2M_MAX?.[key]),
      lluvia: medida(p.PRECTOTCORR?.[key], { precipitation: true }),
    };
  });
  const validosTemp = serie.map((v) => v.temperatura).filter((v) => v !== null);
  const validosLluvia = serie.map((v) => v.lluvia).filter((v) => v !== null);
  if (!validosTemp.length && !validosLluvia.length) {
    throw new Error('NASA POWER returned no valid months for this period');
  }
  return {
    year,
    serie,
    mesesTemperatura: validosTemp.length,
    mesesPrecipitacion: validosLluvia.length,
    temperaturaPico: validosTemp.length ? Math.max(...validosTemp) : null,
    lluviaMediaDiaria: validosLluvia.length
      ? validosLluvia.reduce((a, b) => a + b, 0) / validosLluvia.length : null,
    // Fuente explicitada en interfaz; timestamps se calculan en el cliente tras una respuesta exitosa.
    origen: 'NASA POWER · Monthly Point API',
  };
}

/** Opción de abortar y tiempo de espera en el hook, para que el usuario controle cuándo consultar. */
export async function requestPowerMonthly({ lat, lon, year, signal, base, fetcher = fetch }) {
  const url = buildPowerUrl({ lat, lon, year, base });
  const response = await fetcher(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`NASA POWER returned HTTP ${response.status}`);
  const json = await response.json();
  return normalizePowerMonthly(json, year);
}
