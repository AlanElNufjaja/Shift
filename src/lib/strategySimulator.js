import { numeroSeguro } from './diagnostics.js';

/**
 * Field Shift 2.3 — sensibilidad ilustrativa sobre cifras existentes.
 * No predice rendimientos ni calcula demanda agronómica; no altera los originales.
 * El mismo multiplicador se aplica a TODAS las estrategias, incluida la línea base.
 */
export const AJUSTES_INICIALES = Object.freeze({ precioPct: 0, aguaPct: 0 });
export const LIMITES_AJUSTES = Object.freeze({ precioPct: [-30, 30], aguaPct: [-20, 20] });

function limitarAjuste(valor, nombre) {
  const [minimo, maximo] = LIMITES_AJUSTES[nombre];
  const n = numeroSeguro(valor);
  return n === null ? 0 : Math.max(minimo, Math.min(maximo, n));
}

function redondear(n, decimales = 1) {
  return Math.round((n + Number.EPSILON) * 10 ** decimales) / 10 ** decimales;
}

export function simularEstrategias(estrategias = [], ajustes = AJUSTES_INICIALES) {
  const precio = 1 + limitarAjuste(ajustes?.precioPct, 'precioPct') / 100;
  const agua = 1 + limitarAjuste(ajustes?.aguaPct, 'aguaPct') / 100;
  if (!Array.isArray(estrategias)) return [];
  return estrategias.map((e) => {
    const originalAgua = numeroSeguro(e?.agua_mm);
    const originalIngreso = numeroSeguro(e?.ingreso_usd_acre);
    return {
      ...e,
      agua_mm: originalAgua === null ? null : redondear(originalAgua * agua),
      ingreso_usd_acre: originalIngreso === null ? null : redondear(originalIngreso * precio, 0),
      // El aporte de nitrógeno se muestra sin ajustar: estos controles no justifican modificarlo.
      nitrogeno_kg_acre: numeroSeguro(e?.nitrogeno_kg_acre),
    };
  });
}

export function diferenciaVsBase(base, alternativa, campo) {
  const b = numeroSeguro(base?.[campo]);
  const a = numeroSeguro(alternativa?.[campo]);
  if (a === null || b === null) return null;
  const absoluta = redondear(a - b);
  return {
    absoluta,
    porcentaje: b === 0 ? null : redondear(100 * (a - b) / Math.abs(b)),
  };
}

/** null significa que el calendario no permite distinguir meses cubiertos de desnudos. */
export function contarMesesDesnudos(cobertura) {
  if (!Array.isArray(cobertura) || cobertura.length !== 12 ||
      !cobertura.every((mes) => mes === 'Cubierto' || mes === 'Desnudo')) return null;
  return cobertura.filter((mes) => mes === 'Desnudo').length;
}

const CRITERIOS = {
  agua: { label: 'Lower simulated water demand', obtener: (e) => {
    const x = numeroSeguro(e?.agua_mm);
    return x === null ? null : -x;
  } },
  suelo: { label: 'Higher potential nitrogen contribution', obtener: (e) => numeroSeguro(e?.nitrogeno_kg_acre) },
  rentabilidad: { label: 'Higher estimated GROSS revenue, not profit', obtener: (e) => numeroSeguro(e?.ingreso_usd_acre) },
  erosion: { label: 'Fewer bare-soil months (indirect indicator)', obtener: (e) => {
    const x = contarMesesDesnudos(e?.cobertura_mensual);
    return x === null ? null : -x;
  } },
};

/**
 * Solo compara las dos ALTERNATIVAS, no afirma que una sea mejor que mantener la línea base.
 * Un empate o información insuficiente devuelve id=null para no inventar un ganador.
 */
export function ajustePorPrioridad(estrategias = [], prioridad = 'agua') {
  const criterio = CRITERIOS[prioridad] ?? CRITERIOS.agua;
  const opciones = (Array.isArray(estrategias) ? estrategias : [])
    .filter((e) => e && e.id !== 'baseline')
    .map((e) => ({ id: e.id, puntuacion: criterio.obtener(e) }))
    .filter((e) => e.id && e.puntuacion !== null);
  if (opciones.length < 2) return { id: null, empate: false, descripcion: 'Insufficient data to compare both options' };
  const mejor = Math.max(...opciones.map((e) => e.puntuacion));
  const empatadas = opciones.filter((e) => e.puntuacion === mejor);
  return {
    id: empatadas.length === 1 ? empatadas[0].id : null,
    empate: empatadas.length > 1,
    descripcion: empatadas.length > 1 ? `Tie: ${criterio.label.toLowerCase()}` : criterio.label,
  };
}

function celdaCsv(valor) {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  // Evita fórmulas de Excel en texto que pudiera provenir del backend.
  if (/^[=+@\t\r]/.test(texto) || (/^-/.test(texto) && !/^-\d+(?:\.\d+)?$/.test(texto))) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""').replaceAll('\r', ' ').replaceAll('\n', ' ')}"`;
}

export function csvComparacion({ parcela, prioridad, fuente, modoEjemplo = false, originales, ajustes, escenarios }) {
  const base = escenarios.find((e) => e.id === 'baseline');
  const filas = [
    ['FIELD SHIFT · ILLUSTRATIVE COMPARISON'],
    ['Field', parcela?.nombre ?? 'No data'],
    ['Priority', prioridad ?? 'No data'],
    ['Scenario source', fuente === 'backend' ? 'Remote P2, NOT AUDITED; browser sensitivity adjustment' : fuente === 'p2-importado' ? (modoEjemplo ? 'FICTIONAL P2, NOT AUDITED; browser sensitivity adjustment' : 'Imported P2, NOT AUDITED; browser sensitivity adjustment') : 'Synthetic demonstration data'],
    ['Assumption: proportional price change (%)', limitarAjuste(ajustes?.precioPct, 'precioPct')],
    ['Assumption: proportional water-use change (%)', limitarAjuste(ajustes?.aguaPct, 'aguaPct')],
    [],
    ['Strategy', 'Water (mm/cycle)', 'Nitrogen (kg/acre)', 'Gross revenue (USD/acre)',
      'Δ water vs. baseline (mm/cycle)', 'Δ nitrogen vs. baseline (kg/acre)', 'Δ gross revenue vs. baseline (USD/acre)', 'Bare-soil months'],
    ...escenarios.map((e) => [
      e.titulo || e.id,
      numeroSeguro(e.agua_mm),
      numeroSeguro(e.nitrogeno_kg_acre),
      numeroSeguro(e.ingreso_usd_acre),
      diferenciaVsBase(base, e, 'agua_mm')?.absoluta ?? null,
      diferenciaVsBase(base, e, 'nitrogeno_kg_acre')?.absoluta ?? null,
      diferenciaVsBase(base, e, 'ingreso_usd_acre')?.absoluta ?? null,
      contarMesesDesnudos(e.cobertura_mensual),
    ]),
    [],
    ['NOTICE', 'These are not field measurements. Adjustments are uniform hypothetical factors.'],
    ['NOTICE', 'Gross revenue is not profit: costs and sales contracts are not included.'],
    ['NOTICE', 'Nitrogen contribution does not equal fertilizer savings. Agronomic validation required.'],
    ['ORIGINAL SCENARIOS', `Number of original alternatives: ${Array.isArray(originales) ? originales.length : 0}`],
  ];
  return '\uFEFF' + filas.map((fila) => fila.map(celdaCsv).join(';')).join('\r\n') + '\r\n';
}
