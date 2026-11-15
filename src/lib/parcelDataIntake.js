import { MESES } from './diagnostics.js';

/**
 * Validador local de entregables P1. Solo prepara una VISTA PREVIA:
 * ni una estructura válida ni un campo 'real' demuestran verificación científica.
 * El usuario no puede importar estas filas directamente al mapa/demo.
 */
const MAX_ISSUES = 80;
const MISSING = new Set([null, undefined, '', -999]);
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const validNum = (n) => typeof n === 'number' && Number.isFinite(n) && n !== -999;
const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const recordIssue = (items, text) => { if (items.length < MAX_ISSUES) items.push(text); };

export function validarEntregableP1(payload) {
  const errors = [];
  const warnings = [];
  const list = Array.isArray(payload) ? payload : payload?.parcelas;
  if (!Array.isArray(list) || !list.length) {
    return { valido: false, errores: ['Root must be a nonempty array of fields or an object with "parcelas": [...].'], avisos: [], count: 0, resumen: [] };
  }
  const ids = new Set();
  const resumen = [];
  for (const [index, parcel] of list.entries()) {
    const at = `Field ${index + 1}`;
    if (!isObject(parcel)) { recordIssue(errors, `${at}: must be an object`); continue; }
    const name = typeof parcel.nombre === 'string' && parcel.nombre.trim() ? parcel.nombre.trim() : at;
    if (typeof parcel.id !== 'string' || !parcel.id.trim()) recordIssue(errors, `${at}: missing valid "id"`);
    else if (ids.has(parcel.id)) recordIssue(errors, `${at}: duplicate identifier: ${parcel.id}`);
    else ids.add(parcel.id);
    if (name === at) recordIssue(errors, `${at}: missing name`);
    if (!validNum(parcel.lat) || parcel.lat < -90 || parcel.lat > 90 || !validNum(parcel.lon) || parcel.lon < -180 || parcel.lon > 180) {
      recordIssue(errors, `${name}: invalid lat/lon coordinates`);
    }
    if (!isObject(parcel.suelo_ssurgo)) recordIssue(errors, `${name}: missing suelo_ssurgo`);
    else {
      for (const field of ['textura', 'retencion_agua', 'riesgo_erosion']) {
        if (typeof parcel.suelo_ssurgo[field] !== 'string' || !parcel.suelo_ssurgo[field].trim()) recordIssue(warnings, `${name}: SSURGO ${field} not documented`);
      }
      const org = parcel.suelo_ssurgo.materia_organica_pct;
      if (org === -999) recordIssue(warnings, `${name}: materia_organica_pct uses -999; normalize to null`);
      if (!MISSING.has(org) && (!validNum(org) || org < 0 || org > 100)) recordIssue(errors, `${name}: materia_organica_pct must be between 0 and 100 or null`);
    }
    if (!Array.isArray(parcel.historial_cropscape)) recordIssue(errors, `${name}: historial_cropscape must be an array`);
    else if (parcel.historial_cropscape.some((v) => typeof v !== 'string')) recordIssue(errors, `${name}: historial_cropscape must contain strings`);
    if (!Array.isArray(parcel.clima_mensual)) recordIssue(errors, `${name}: clima_mensual must be an array`);
    else {
      const meses = new Set();
      for (const [j, item] of parcel.clima_mensual.entries()) {
        if (!isObject(item) || !MESES.includes(item.mes)) { recordIssue(errors, `${name}: invalid month in clima_mensual[${j}]`); continue; }
        if (meses.has(item.mes)) recordIssue(errors, `${name}: repeated month (${item.mes})`);
        meses.add(item.mes);
        for (const field of ['temp_max_c', 'lluvia_mm', 'humedad_smap_pct']) {
          const value = item[field];
          if (value !== undefined && value !== null && !validNum(value)) {
            if (value === -999) recordIssue(warnings, `${name}: -999 en ${item.mes}.${field} must be normalized to null`);
            else recordIssue(errors, `${name}: ${item.mes}.${field} must be a number or null`);
          }
          if (validNum(value) && field === 'humedad_smap_pct' && (value < 0 || value > 100)) recordIssue(errors, `${name}: ${item.mes}.humedad_smap_pct outside the 0–100 range`);
          if (validNum(value) && field === 'lluvia_mm' && value < 0) recordIssue(errors, `${name}: ${item.mes}.lluvia_mm is negative`);
        }
      }
      if (meses.size < 12) recordIssue(warnings, `${name}: only ${meses.size}/12 months available`);
    }
    const provenance = parcel.datos_procedencia;
    const declaracion = isObject(provenance) ? provenance : null;
    if (!declaracion) recordIssue(warnings, `${name}: sources and periods are missing for each dataset (datos_procedencia)`);
    else for (const src of ['power', 'smap', 'ssurgo', 'cropscape']) {
      if (!isObject(declaracion[src]) || !declaracion[src].fuente || !declaracion[src].periodo) recordIssue(warnings, `${name}: incomplete ${src} provenance (source and period required for traceability)`);
    }
    resumen.push({ id: String(parcel.id || `sin-id-${index}`), nombre: name, meses: Array.isArray(parcel.clima_mensual) ? parcel.clima_mensual.length : 0, procedencia: !!declaracion });
  }
  if (!Array.isArray(payload) && !isObject(payload)) recordIssue(errors, 'Unrecognized JSON');
  return { valido: !errors.length, errores: errors, avisos: warnings, count: list.length, resumen };
}
