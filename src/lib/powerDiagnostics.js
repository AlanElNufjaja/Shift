import { numeroSeguro } from './diagnostics.js';

/**
 * Lectura DESCRIPTIVA del clima mensual NASA POWER. No cruzar con SMAP demo:
 * se desconoce el año/fuente del SMAP y hay diferencias de escala espacial.
 * Un mes no data es desconocido, no un mes sin calor.
 */
export const POWER_HEAT_REFERENCE_C = 35;

export function resumirClimaPower(power) {
  if (power?.status !== 'success' || !power?.datos || !Array.isArray(power.datos.serie)) {
    return { disponible: false, completo: false, tipo: 'sin-consulta', nTemperatura: 0, nPrecipitacion: 0, maxTemperatura: null, mesesSuperanReferencia: [], mesesSinDatos: [], filas: [] };
  }
  const filas = power.datos.serie.filter((item) => item && typeof item.mes === 'string').map((item) => ({
    mes: item.mes,
    temperatura: numeroSeguro(item.temperatura),
    lluvia: numeroSeguro(item.lluvia),
  }));
  const tempValidos = filas.filter((item) => item.temperatura !== null && item.temperatura > -100 && item.temperatura < 90);
  const lluviaValidos = filas.filter((item) => item.lluvia !== null && item.lluvia >= 0);
  const nTemperatura = tempValidos.length;
  const nPrecipitacion = lluviaValidos.length;
  const maxTemperatura = nTemperatura ? Math.max(...tempValidos.map((item) => item.temperatura)) : null;
  const mesesSuperanReferencia = tempValidos.filter((item) => item.temperatura > POWER_HEAT_REFERENCE_C).map((item) => item.mes);
  return {
    disponible: nTemperatura > 0,
    completo: nTemperatura === 12,
    tipo: nTemperatura === 12 ? 'completa' : nTemperatura ? 'parcial' : 'sin-temperatura',
    nTemperatura,
    nPrecipitacion,
    maxTemperatura,
    mesesSuperanReferencia,
    mesesSinDatos: filas.filter((item) => item.temperatura === null).map((item) => item.mes),
    year: power.year,
    consultedAt: power.consultedAt,
    filas,
    // Advertencia persistente en UI. No es una inferencia de estrés hídrico.
    limitacion: 'NASA POWER describes regional climate for the selected period. Dashboard SMAP values are synthetic and have no aligned year; combined alerts and recommendations are not recalculated.',
  };
}
