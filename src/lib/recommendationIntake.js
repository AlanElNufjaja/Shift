/**
 * Contrato P2 v1: validación en la frontera de confianza (archivo o API).
 * Una estructura válida NO prueba que los resultados sean científicos ni reales.
 * Nunca evaluamos código ni utilizamos HTML del JSON.
 */
export const PRIORIDADES_P2 = Object.freeze(['agua', 'suelo', 'rentabilidad', 'erosion']);
export const IDS_ESTRATEGIA = Object.freeze(['baseline', 'water', 'regen']);
export const MAX_P2_BYTES = 1024 * 1024;
const CAMPOS_NUMERICOS = ['agua_mm', 'nitrogeno_kg_acre', 'ingreso_usd_acre'];
const TEXTO_MAX = 650;
const plain = (v) => v && typeof v === 'object' && !Array.isArray(v);
const texto = (v, max = TEXTO_MAX) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const numero = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n !== -999;
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;

export function normalizarEstrategias(estrategias) {
  const errores = [];
  if (!Array.isArray(estrategias) || estrategias.length !== 3) {
    return { valido: false, errores: ['Exactly 3 strategies are required: baseline, water and regen.'], estrategias: [] };
  }
  const ids = estrategias.map((e) => e?.id);
  if (new Set(ids).size !== 3 || IDS_ESTRATEGIA.some((id) => !ids.includes(id))) {
    errores.push('Strategy IDs must be baseline, water and regen, without duplicates.');
  }
  const normalizadas = [];
  for (const [i, raw] of estrategias.entries()) {
    if (!plain(raw) || !IDS_ESTRATEGIA.includes(raw.id)) { errores.push(`Strategy ${i + 1}: unknown ID.`); continue; }
    const titulo = texto(raw.titulo, 90);
    if (!titulo || !texto(raw.cultivos, 350)) errores.push(`${raw.id}: titulo and cultivos are required.`);
    if (!texto(raw.justificacion) || !texto(raw.incertidumbre) || !texto(raw.validacion)) {
      errores.push(`${raw.id}: justificacion, incertidumbre or validacion is missing.`);
    }
    const valores = {};
    for (const campo of CAMPOS_NUMERICOS) {
      if (raw[campo] === null || raw[campo] === undefined) valores[campo] = null;
      else if (!numero(raw[campo])) { errores.push(`${raw.id}: ${campo} must be a number >= 0 or null.`); valores[campo] = null; }
      else valores[campo] = raw[campo];
    }
    const cobertura = raw.cobertura_mensual;
    if (cobertura != null && (!Array.isArray(cobertura) || cobertura.length !== 12 ||
      cobertura.some((m) => !['Cubierto', 'Desnudo', 'Desconocido'].includes(m)))) {
      errores.push(`${raw.id}: cobertura_mensual requires 12 values: Cubierto, Desnudo or Desconocido.`);
    }
    normalizadas.push({
      id: raw.id, titulo, subtitulo: texto(raw.subtitulo, 130), cultivos: texto(raw.cultivos, 350),
      ...valores, justificacion: texto(raw.justificacion), incertidumbre: texto(raw.incertidumbre),
      validacion: texto(raw.validacion), cobertura_mensual: Array.isArray(cobertura) && cobertura.length === 12 &&
        cobertura.every((m) => ['Cubierto', 'Desnudo', 'Desconocido'].includes(m)) ? [...cobertura] : null,
    });
  }
  if (!normalizadas.some((e) => CAMPOS_NUMERICOS.some((campo) => e[campo] !== null))) {
    errores.push('No comparable numeric indicators in any strategy.');
  }
  return { valido: errores.length === 0, errores, estrategias: normalizadas.sort((a, b) => IDS_ESTRATEGIA.indexOf(a.id) - IDS_ESTRATEGIA.indexOf(b.id)) };
}

/** Metadatos descriptivos declarados por P2, no comprobados contra NASA/USDA. */
export function leerProcedenciaP2(raw) {
  if (!plain(raw)) return null;
  const insumos = Array.isArray(raw.insumos) ? raw.insumos.slice(0, 12)
    .filter((item) => plain(item) && texto(item.fuente, 60))
    .map((item) => ({ fuente: texto(item.fuente, 60), periodo: texto(item.periodo, 90),
      estado: texto(item.estado, 100), nota: texto(item.nota, 180) })) : [];
  const supuestos = Array.isArray(raw.supuestos) ? raw.supuestos.slice(0, 12).map((v) => texto(v, 220)).filter(Boolean) : [];
  return { modelo: texto(raw.modelo, 110), version: texto(raw.version, 48), fecha: texto(raw.fecha, 15),
    insumos, supuestos, notas: texto(raw.notas, 500) };
}

export function validarArchivoP2(payload, idsPermitidos) {
  const errores = [], avisos = [], porClave = {};
  if (!plain(payload)) return { valido: false, errores: ['Expected a JSON object.'], avisos, porClave, total: 0 };
  if (payload.version !== '1.0') errores.push('version must be "1.0".');
  if (!['demo', 'declarado'].includes(payload.tipo_dato)) errores.push('tipo_dato must be demo or declarado.');
  if (!Array.isArray(payload.resultados) || !payload.resultados.length || payload.resultados.length > 12) {
    errores.push('resultados must contain 1 to 12 field/priority combinations.');
    return { valido: false, errores, avisos, porClave, total: 0 };
  }
  const permitidos = new Set(idsPermitidos);
  const vistos = new Set();
  for (const [i, item] of payload.resultados.entries()) {
    if (!plain(item)) { errores.push(`Result ${i + 1} is invalid.`); continue; }
    if (!permitidos.has(item.parcela_id) || !PRIORIDADES_P2.includes(item.prioridad)) {
      errores.push(`Result ${i + 1}: unrecognized parcela_id or prioridad.`); continue;
    }
    const clave = `${item.parcela_id}:${item.prioridad}`;
    if (vistos.has(clave)) { errores.push(`${clave}: duplicate combination.`); continue; }
    vistos.add(clave);
    const validacion = normalizarEstrategias(item.estrategias);
    if (!validacion.valido) { errores.push(...validacion.errores.map((e) => `${clave}: ${e}`)); continue; }
    const generacion = leerProcedenciaP2(item.generacion);
    if (!generacion?.modelo || !generacion.version || !fechaValida(generacion.fecha)) {
      errores.push(`${clave}: generacion requires valid modelo, version and YYYY-MM-DD fecha.`); continue;
    }
    if (!generacion.insumos.length) avisos.push(`${clave}: engine declares no specific inputs; provenance cannot be audited.`);
    if (!generacion.supuestos.length) avisos.push(`${clave}: assumptions missing; explanation incomplete.`);
    porClave[clave] = { estrategias: validacion.estrategias, generacion,
      modoEjemplo: payload.tipo_dato === 'demo', origenArchivo: 'P2' };
  }
  return { valido: errores.length === 0, errores, avisos, porClave: errores.length ? {} : porClave,
    total: errores.length ? 0 : Object.keys(porClave).length, modoEjemplo: payload.tipo_dato === 'demo' };
}

/** Compatible con la respuesta existente { estrategias } del endpoint /recomendar. */
export function validarRespuestaP2(payload) {
  if (!plain(payload)) return { valido: false, errores: ['Server did not return a JSON object.'] };
  const validacion = normalizarEstrategias(payload.estrategias);
  if (!validacion.valido) return validacion;
  const generacion = leerProcedenciaP2(payload.generacion);
  const avisos = [];
  if (!generacion?.modelo || !generacion.version || !fechaValida(generacion.fecha)) {
    avisos.push('Backend response did not include full model metadata; results are not audited.');
  }
  return { ...validacion, generacion, avisos };
}

/**
 * Etiqueta de enlace P1/P2: solo comprobación local de los metadatos, nunca auditoría.
 * No inferimos que P2 utilizó P1 porque una fuente esté cargada en la interfaz.
 */
export function resumirVinculoP2({ salida, evidenciaParcela, power }) {
  if (!salida) return { etiqueta: 'No active P2 response', detalle: 'Demo strategies are displayed.' };
  if (salida.modoEjemplo) return { etiqueta: 'P2 FICTIONAL', detalle: 'Invented results for testing the flow; no agronomic backing.' };
  const generacion = salida.generacion;
  if (!generacion?.insumos?.length) return { etiqueta: 'Undocumented provenance', detalle: 'P2 does not declare which inputs were used to calculate these strategies.' };
  const textoInsumos = generacion.insumos.map((x) => x.fuente.toLowerCase());
  const conSmap = textoInsumos.some((x) => x.includes('smap'));
  const conPower = textoInsumos.some((x) => x.includes('power'));
  if (conSmap && !evidenciaParcela?.smap) return { etiqueta: 'P1 not cross-checked', detalle: 'P2 declares SMAP, but no SMAP has been imported for this field in the session.' };
  if (conPower && power?.status !== 'success') return { etiqueta: 'POWER not cross-checked', detalle: 'P2 declares POWER, but the session has not queried POWER.' };
  if (conPower && power?.status === 'success') {
    const referencia = generacion.insumos.find((x) => x.fuente.toLowerCase().includes('power'));
    if (referencia?.periodo && !referencia.periodo.includes(String(power.year))) {
      return { etiqueta: 'Mismatched periods', detalle: `P2 declares POWER ${referencia.periodo}, but the active query is for ${power.year}.` };
    }
  }
  if (conSmap && evidenciaParcela?.smap) {
    const referencia = generacion.insumos.find((x) => x.fuente.toLowerCase().includes('smap'));
    if (referencia?.periodo && !referencia.periodo.includes(String(evidenciaParcela.smap.anio))) {
      return { etiqueta: 'Mismatched periods', detalle: 'The imported SMAP year does not match P2’s declared SMAP period.' };
    }
  }
  if (evidenciaParcela?.modoEjemplo) return { etiqueta: 'Fictional P1', detalle: 'The schema can be compared, but P1 evidence in this session is fictional.' };
  return { etiqueta: 'Declared metadata', detalle: 'Sources declared by P2; model, source files, units and field validation still need auditing.' };
}
