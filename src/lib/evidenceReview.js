import { displayMonth } from './displayEnglish.js';
import { MESES, numeroSeguro, promedio } from './diagnostics.js';

/**
 * Este módulo produce comparaciones descriptivas, nunca califica un terreno
 * como bueno/malo ni certifica que los datos importados sean observaciones.
 * El JSON demo carece de año de muestreo armonizado con P1.
 */
const sinDato = (v) => v === null || v === undefined || v === '';
const etiqueta = (v) => sinDato(v) ? 'No data' : String(v);

export function revisarDiferencias(parcela, evidencia) {
  if (!evidencia) return {
    disponible: false, modoEjemplo: false, indicadores: [], historial: [], mensual: [],
    fuentesActivas: [], cuentaDistintos: 0, cuentaIguales: 0,
  };
  const s = parcela?.suelo_ssurgo ?? {};
  const p1 = evidencia.ssurgo?.suelo ?? null;
  const demoSmap = promedio((parcela?.clima_mensual ?? []).map((fila) => fila.humedad_smap_pct));
  const filas = [];
  const agregar = (key, titulo, demo, importado, fuente, unidad = '') => {
    if (sinDato(importado)) return;
    const igual = typeof demo === 'number' && typeof importado === 'number'
      ? Math.abs(demo - importado) < 1e-9
      : String(demo ?? '').trim().toLocaleLowerCase('en-US') === String(importado).trim().toLocaleLowerCase('en-US');
    filas.push({ key, titulo, demo: sinDato(demo) ? null : demo, importado, fuente, unidad, diferente: !igual });
  };
  if (evidencia.smap) agregar('smap', 'Average surface soil moisture', demoSmap, evidencia.smap.media, 'SMAP', '%');
  if (p1) {
    agregar('materia', 'Organic matter', s.materia_organica_pct, p1.materia_organica_pct, 'SSURGO', '%');
    agregar('textura', 'Soil texture', s.textura, p1.textura, 'SSURGO');
    agregar('retencion', 'Water retention', s.retencion_agua, p1.retencion_agua, 'SSURGO');
    agregar('erosion', 'Erosion risk', s.riesgo_erosion, p1.riesgo_erosion, 'SSURGO');
  }
  const demoHistorial = Array.isArray(parcela?.historial_cropscape) ? parcela.historial_cropscape : [];
  const p1Historial = evidencia.cropscape?.historial ?? [];
  const anioDe = (texto) => /^\s*((?:19|20)\d{2})\s*:/.exec(String(texto))?.[1] ?? null;
  const mapaDemo = new Map(demoHistorial.map((value) => [anioDe(value), value]));
  const mapaP1 = new Map(p1Historial.map((value) => [anioDe(value), value]));
  const anios = [...new Set([...mapaDemo.keys(), ...mapaP1.keys()])].filter(Boolean).sort();
  const historial = evidencia.cropscape ? anios.map((anio) => ({
    anio,
    demo: mapaDemo.get(anio) ?? null,
    importado: mapaP1.get(anio) ?? null,
    diferente: !!mapaDemo.has(anio) && !!mapaP1.has(anio) &&
      String(mapaDemo.get(anio)).trim().toLocaleLowerCase('en-US') !== String(mapaP1.get(anio)).trim().toLocaleLowerCase('en-US'),
  })) : [];
  const demoMensual = new Map((parcela?.clima_mensual ?? []).map((r) => [r.mes, r]));
  const mapaP1Mes = new Map((evidencia.smap?.serie ?? []).map((r) => [r.mes, r]));
  const mensual = evidencia.smap ? MESES.map((mes) => ({
    mes, abreviatura: displayMonth(mes).slice(0, 3),
    demo: numeroSeguro(demoMensual.get(mes)?.humedad_smap_pct),
    importado: numeroSeguro(mapaP1Mes.get(mes)?.humedad),
  })) : [];
  return {
    disponible: true,
    modoEjemplo: !!evidencia.modoEjemplo,
    indicadores: filas,
    historial,
    mensual,
    anioSmap: evidencia.smap?.anio ?? null,
    fuentesActivas: ['smap', 'ssurgo', 'cropscape'].filter((key) => !!evidencia[key]),
    cuentaDistintos: filas.filter((i) => i.diferente).length,
    cuentaIguales: filas.filter((i) => !i.diferente).length,
  };
}

/**
 * Coincidencias descriptivas entre series P1 y NASA POWER.
 * Requiere: archivo NO señalado como demo, producto SMAP aceptado en el
 * validador existente, año idéntico, proximidad entre puntos y valores pares.
 * La coincidencia NO equivale a estrés de cultivo ni a diagnóstico validado.
 */
export const REFERENCIAS_EXPLORATORIAS = Object.freeze({ calorC: 35, humedadVolumetricaPct: 15 });

export function revisarCruceClimatico({ parcela, evidencia, power }) {
  const base = { listo: false, codigo: '', mensaje: '', nPares: 0, nCoincidencias: 0, meses: [], sinDatos: [], anio: null, criterios: REFERENCIAS_EXPLORATORIAS };
  const bloquear = (codigo, mensaje) => ({ ...base, codigo, mensaje });
  if (!evidencia) return bloquear('sin-importar', 'Import and activate P1 data to check source compatibility.');
  if (evidencia.modoEjemplo) return bloquear('ficticio', 'The active file is marked FICTIONAL; no overlaps are reported as real evidence.');
  if (!evidencia.smap) return bloquear('sin-smap', 'This field has no valid SMAP series in the active file.');
  if (power?.status !== 'success' || !Array.isArray(power?.datos?.serie)) return bloquear('sin-power', 'Query NASA POWER for the selected field first.');
  const smap = evidencia.smap;
  if (smap.anio !== power.year || smap.anio !== power.datos.year) return bloquear('anio', `SMAP is for ${smap.anio}, but NASA POWER is for ${power.year}. Use matching years.`);
  const lat = evidencia.coordenadasP1?.lat;
  const lon = evidencia.coordenadasP1?.lon;
  if (![lat, lon, parcela?.lat, parcela?.lon].every(Number.isFinite) ||
    Math.abs(lat - parcela.lat) > 0.02 || Math.abs(lon - parcela.lon) > 0.02) {
    return bloquear('coordenadas', 'The imported and NASA POWER coordinates are too far apart for this exploratory comparison.');
  }
  const mapaSmap = new Map(smap.serie.map((r) => [r.mes, r]));
  const mapaPower = new Map(power.datos.serie.map((r) => [r.mes, r]));
  const meses = MESES.map((mes) => {
    const h = numeroSeguro(mapaSmap.get(mes)?.humedad);
    const t = numeroSeguro(mapaPower.get(mes)?.temperatura);
    const valido = h !== null && h >= 0 && h <= 100 && t !== null && t > -90 && t < 90;
    return {
      mes, humedad: valido ? h : null, temperatura: valido ? t : null,
      disponible: valido,
      coincide: valido && t > REFERENCIAS_EXPLORATORIAS.calorC && h < REFERENCIAS_EXPLORATORIAS.humedadVolumetricaPct,
    };
  });
  const validos = meses.filter((m) => m.disponible);
  if (!validos.length) return bloquear('sin-pares', 'No month has valid temperature and soil moisture values together.');
  return {
    ...base, listo: true, codigo: 'exploratorio', anio: smap.anio,
    mensaje: 'Descriptive overlap of two series with matching year and location; P1 data are not audited and spatial resolutions differ.',
    nPares: validos.length,
    nCoincidencias: validos.filter((m) => m.coincide).length,
    sinDatos: meses.filter((m) => !m.disponible).map((m) => m.mes),
    meses,
  };
}
