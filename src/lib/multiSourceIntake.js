import { displayMonth } from './displayEnglish.js';
import { MESES } from './diagnostics.js';

/**
 * Adaptador de P1 para SMAP / SSURGO / CropScape. NO consulta APIs, y una URL o
 * nombre de fuente declarados por el autor NO equivalen a validación externa.
 * Mantiene la geometría y las alertas demo fuera de este adaptador.
 */
export const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const ORIGENES = ['smap', 'ssurgo', 'cropscape'];
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texto = (v) => typeof v === 'string' ? v.trim() : '';
const numero = (v) => typeof v === 'number' && Number.isFinite(v) && v !== -999;
const falta = (v) => v === null || v === undefined || v === '' || v === -999;
const periodoYear = (p, year) => typeof p === 'string' && p.includes(String(year));
const metaLink = (v) => {
  try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; }
  catch { return ''; }
};

function leerMeta(raw, fuente, avisos, id) {
  const meta = raw?.datos_procedencia?.[fuente];
  if (!object(meta) || !texto(meta.fuente) || !texto(meta.periodo) || !texto(meta.unidad)) {
    avisos.push(`${id} / ${fuente}: source, period or units missing; source omitted.`);
    return null;
  }
  const esperado = { smap: /smap/i, ssurgo: /ssurgo/i, cropscape: /cropscape|cropland data layer|\bcdl\b/i }[fuente];
  if (!esperado.test(meta.fuente)) {
    avisos.push(`${id} / ${fuente}: declared source does not match the dataset; source omitted.`);
    return null;
  }
  if (!metaLink(meta.url)) avisos.push(`${id} / ${fuente}: a reviewable HTTP(S) provenance URL is missing.`);
  // Copiar únicamente campos esperados evita inyectar objetos JSON arbitrarios
  // en JSX o sobrescribir claves internas del estado de la aplicación.
  return {
    fuente: texto(meta.fuente), periodo: texto(meta.periodo), unidad: texto(meta.unidad),
    url: metaLink(meta.url), producto: texto(meta.producto), metodo: texto(meta.metodo),
    mukey: texto(meta.mukey), variable: texto(meta.variable),
    anio: meta.anio, resolucion_km: meta.resolucion_km, resolucion_m: meta.resolucion_m,
    resoluciones_por_anio: object(meta.resoluciones_por_anio) ? meta.resoluciones_por_anio : null,
  };
}

function leerSmap(raw, avisos) {
  const id = raw.id;
  const m = leerMeta(raw, 'smap', avisos, id);
  if (!m) return null;
  const year = m.anio;
  if (!Number.isInteger(year) || year < 2015 || year > 2026 || !periodoYear(m.periodo, year)) {
    avisos.push(`${id} / SMAP: specify a year (2015–2026) consistent with the period; source omitted.`);
    return null;
  }
  if (!texto(m.producto) || !numero(m.resolucion_km) || m.resolucion_km <= 0) {
    avisos.push(`${id} / SMAP: declare product and a positive resolucion_km; source omitted.`);
    return null;
  }
  const unit = m.unidad.toLowerCase().replaceAll(' ', '').replaceAll('³', '3').replaceAll('⁻', '-');
  const isVolume = ['m3/m3', 'm^3/m^3', 'm³/m³'].includes(unit);
  const isPercent = ['%', 'porcentajevolumetrico'].includes(unit);
  if (!isVolume && !isPercent) {
    avisos.push(`${id} / SMAP: unsupported units (${m.unidad}); use m3/m3 or volumetric %. `);
    return null;
  }
  if (isPercent && (!/volum|m3\/m3/i.test(m.metodo ?? '') || !/100|porcentaje/i.test(m.metodo ?? ''))) {
    avisos.push(`${id} / SMAP: percentage needs an explicit volumetric conversion method (m3/m3 × 100); source omitted.`);
    return null;
  }
  if (/percentil|percentile/i.test(`${m.variable ?? ''} ${m.metodo ?? ''}`)) {
    avisos.push(`${id} / SMAP: a percentile cannot be used as a volumetric percentage; source omitted.`);
    return null;
  }
  const monthly = Array.isArray(raw.clima_mensual) ? raw.clima_mensual : [];
  if (monthly.some((r) => !object(r) || !MESES.includes(r.mes)) || new Set(monthly.map((r) => r.mes)).size !== monthly.length) {
    avisos.push(`${id} / SMAP: invalid or repeated months; source omitted.`);
    return null;
  }
  const serie = MESES.map((mes) => {
    const record = monthly.find((r) => r.mes === mes);
    const rawValue = record?.[isVolume ? 'humedad_smap_m3m3' : 'humedad_smap_pct'];
    if (falta(rawValue)) return { mes, abreviatura: displayMonth(mes).slice(0, 3), humedad: null };
    if (!numero(rawValue) || rawValue < 0 || rawValue > (isVolume ? 1 : 100)) {
      throw new Error(`${id} / SMAP: invalid value in ${mes}; required ${isVolume ? '0–1 m3/m3' : '0–100%'}.`);
    }
    // El porcentaje final es contenido volumétrico × 100, NO percentil.
    const humedad = isVolume ? Math.round(rawValue * 10000) / 100 : rawValue;
    return { mes, abreviatura: displayMonth(mes).slice(0, 3), humedad };
  });
  const n = serie.filter((r) => r.humedad !== null).length;
  if (!n) { avisos.push(`${id} / SMAP: no months have measurements; source omitted.`); return null; }
  if (n < 12) avisos.push(`${id} / SMAP: ${n}/12 available months; missing months are not filled in.`);
  return { meta: m, anio: year, serie, disponibles: n, media: serie.reduce((s, r) => s + (r.humedad ?? 0), 0) / n };
}

function leerSsurgo(raw, avisos) {
  const m = leerMeta(raw, 'ssurgo', avisos, raw.id);
  if (!m) return null;
  if (!texto(m.metodo)) { avisos.push(`${raw.id} / SSURGO: describe extraction method and soil map-unit association; source omitted.`); return null; }
  if (!texto(m.mukey)) avisos.push(`${raw.id} / SSURGO: missing mukey; verify soil map-unit assignment.`);
  const s = raw.suelo_ssurgo;
  if (!object(s)) { avisos.push(`${raw.id} / SSURGO: suelo_ssurgo is missing; source omitted.`); return null; }
  if (!falta(s.materia_organica_pct) && (!numero(s.materia_organica_pct) || s.materia_organica_pct < 0 || s.materia_organica_pct > 100)) {
    throw new Error(`${raw.id} / SSURGO: materia_organica_pct must be between 0 and 100 or null.`);
  }
  const suelo = {
    textura: texto(s.textura) || null,
    retencion_agua: texto(s.retencion_agua) || null,
    riesgo_erosion: texto(s.riesgo_erosion) || null,
    materia_organica_pct: falta(s.materia_organica_pct) ? null : s.materia_organica_pct,
  };
  if (Object.values(suelo).every((v) => v === null)) { avisos.push(`${raw.id} / SSURGO: no usable properties; source omitted.`); return null; }
  return { meta: m, suelo };
}

function leerCropscape(raw, avisos) {
  const m = leerMeta(raw, 'cropscape', avisos, raw.id);
  if (!m) return null;
  const registros = raw.historial_cropscape;
  if (!Array.isArray(registros) || !registros.length) { avisos.push(`${raw.id} / CropScape: no classified years; source omitted.`); return null; }
  const anios = new Set();
  const serie = [];
  for (const row of registros) {
    const match = typeof row === 'string' && row.match(/^\s*((?:19|20)\d{2})\s*:\s*(.+?)\s*$/);
    if (!match) { avisos.push(`${raw.id} / CropScape: registro '${String(row).slice(0, 40)}' without YYYY: crop format; source omitted.`); return null; }
    const year = Number(match[1]);
    if (anios.has(year)) { avisos.push(`${raw.id} / CropScape: year ${year} duplicated; source omitted.`); return null; }
    anios.add(year);
    serie.push({ anio: year, cultivo: match[2] });
  }
  serie.sort((a, b) => a.anio - b.anio);
  const cruzaCambioResolucion = serie.some((r) => r.anio <= 2023) && serie.some((r) => r.anio >= 2024);
  const resoluciones = m.resoluciones_por_anio;
  if (cruzaCambioResolucion && !object(resoluciones)) {
    avisos.push(`${raw.id} / CropScape: years before/after 2024 require resoluciones_por_anio; source omitted.`);
    return null;
  }
  if (object(resoluciones)) {
    if (serie.some((r) => !numero(resoluciones[String(r.anio)]) || resoluciones[String(r.anio)] <= 0)) {
      avisos.push(`${raw.id} / CropScape: year-specific resolution missing or invalid; source omitted.`);
      return null;
    }
  } else if (!numero(m.resolucion_m) || m.resolucion_m <= 0) {
    avisos.push(`${raw.id} / CropScape: declare resolucion_m or resoluciones_por_anio; source omitted.`);
    return null;
  }
  if (serie.some((v) => !periodoYear(m.periodo, v.anio) && !rangoIncluye(m.periodo, v.anio))) {
    avisos.push(`${raw.id} / CropScape: period does not cover all years; source omitted.`);
    return null;
  }
  return { meta: m, registros: serie, historial: registros.slice() };
}

function rangoIncluye(periodo, anio) {
  const years = String(periodo).match(/(?:19|20)\d{2}/g)?.map(Number) ?? [];
  return years.length >= 2 && anio >= Math.min(...years) && anio <= Math.max(...years);
}

/** Produce una PREVISUALIZACIÓN con fuentes elegibles, sin actualizar ningún estado. */
export function prepararEntregableP1(payload, idsPermitidos, coordenadasPermitidas = {}) {
  const errores = [];
  const avisos = [];
  const out = {};
  const lista = Array.isArray(payload) ? payload : payload?.parcelas;
  if (!Array.isArray(lista) || !lista.length) return { valido: false, errores: ['A nonempty array of fields is required.'], avisos, porParcela: {}, fuentes: 0 };
  if (lista.length > 100) return { valido: false, errores: ['Too many fields (maximum 100).'], avisos, porParcela: {}, fuentes: 0 };
  const ids = new Set();
  const permitidos = new Set(idsPermitidos);
  const modoEjemplo = !Array.isArray(payload) && payload?.tipo_dato === 'demo';
  for (const [i, raw] of lista.entries()) {
    if (!object(raw) || !texto(raw.id)) { errores.push(`Entrada ${i + 1}: id de parcela obligatorio.`); continue; }
    if (ids.has(raw.id)) { errores.push(`ID duplicado: ${raw.id}`); continue; }
    ids.add(raw.id);
    if (!permitidos.has(raw.id)) { avisos.push(`${raw.id}: ID no reconocido en las tres pilot fields; entrada omitida.`); continue; }
    if (!numero(raw.lat) || raw.lat < -90 || raw.lat > 90 || !numero(raw.lon) || raw.lon < -180 || raw.lon > 180) {
      errores.push(`${raw.id}: invalid lat/lon.`);
      continue;
    }
    const original = coordenadasPermitidas[raw.id];
    if (original && (Math.abs(raw.lat - original.lat) > 0.02 || Math.abs(raw.lon - original.lon) > 0.02)) {
      avisos.push(`${raw.id}: P1 coordinates differ from the pilot point; the map will retain demo points and SMAP/POWER will not be compared at mismatched locations.`);
    }
    const fuentes = {};
    for (const origen of ORIGENES) {
      try {
        const resultado = { smap: leerSmap, ssurgo: leerSsurgo, cropscape: leerCropscape }[origen](raw, avisos);
        if (resultado) fuentes[origen] = resultado;
      } catch (err) { avisos.push(`${err.message} Source skipped.`); }
    }
    if (Object.keys(fuentes).length) {
      out[raw.id] = { ...fuentes, coordenadasP1: { lat: raw.lat, lon: raw.lon }, nombreP1: texto(raw.nombre), modoEjemplo };
    } else avisos.push(`${raw.id}: no sources ready to activate.`);
  }
  const count = Object.values(out).reduce((n, value) => n + ORIGENES.filter((k) => value[k]).length, 0);
  if (!count) errores.push('No eligible sources to activate; review metadata and values.');
  return { valido: errores.length === 0, errores, avisos, porParcela: out, fuentes: count, parcelas: Object.keys(out).length };
}

export function fuentesDisponibles(evidencia) {
  return ORIGENES.filter((key) => !!evidencia?.[key]);
}
