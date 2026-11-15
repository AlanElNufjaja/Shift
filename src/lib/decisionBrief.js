import { diferenciaVsBase, contarMesesDesnudos } from './strategySimulator.js';
import { formatoDinero, formatoNumero, PRIORIDADES } from './diagnostics.js';

/**
 * Ficha explicativa de Field Shift 2.9.
 * Solo resume comparaciones aritméticas de los escenarios recibidos.
 * NO calcula una probabilidad, un índice de confianza ni el beneficio real de una rotación.
 */
const CRITERIOS = Object.freeze({
  agua: { campo: 'agua_mm', referencia: 'lower modeled water demand', sentido: -1,
    pregunta: 'Does estimated water demand match irrigation records and local water availability?' },
  suelo: { campo: 'nitrogeno_kg_acre', referencia: 'greater potential nitrogen contribution', sentido: 1,
    pregunta: 'Which nitrogen contributions are confirmed by soil sampling and agronomic balances?' },
  rentabilidad: { campo: 'ingreso_usd_acre', referencia: 'higher estimated gross revenue', sentido: 1,
    pregunta: 'What is the margin after production costs, transportation, losses and sales contracts?' },
  erosion: { campo: 'meses_desnudos', referencia: 'fewer estimated bare-soil months', sentido: -1,
    pregunta: 'Is the proposed cover feasible in the field and does it reduce soil exposure?' },
});

const METRICAS = Object.freeze([
  { campo: 'agua_mm', titulo: 'Water', unidad: 'mm/cycle', mejor: -1 },
  { campo: 'nitrogeno_kg_acre', titulo: 'Potential nitrogen contribution', unidad: 'kg/acre', mejor: 1 },
  { campo: 'ingreso_usd_acre', titulo: 'Estimated gross revenue', unidad: 'USD/acre', mejor: 1 },
  { campo: 'meses_desnudos', titulo: 'Months with bare soil', unidad: 'months', mejor: -1 },
]);

const texto = (v) => typeof v === 'string' ? v.trim() : '';
const fmt = (valor, metrica) => metrica.campo === 'ingreso_usd_acre'
  ? formatoDinero(Math.abs(valor)) : formatoNumero(Math.abs(valor), metrica.campo === 'agua_mm' ? 1 : 0);

function deltaCobertura(base, seleccionada) {
  const antes = contarMesesDesnudos(base?.cobertura_mensual);
  const despues = contarMesesDesnudos(seleccionada?.cobertura_mensual);
  if (antes === null || despues === null) return null;
  const diferencia = despues - antes;
  return { absoluta: diferencia, porcentaje: antes === 0 ? null : diferencia / antes * 100 };
}

function leerDiferencia(base, seleccionada, campo) {
  return campo === 'meses_desnudos' ? deltaCobertura(base, seleccionada)
    : diferenciaVsBase(base, seleccionada, campo);
}

export function construirImpacto(base, seleccionada, prioridad = 'agua') {
  const criterio = CRITERIOS[prioridad] ?? CRITERIOS.agua;
  const esBase = !!seleccionada && seleccionada.id === 'baseline';
  const metricas = METRICAS.map((metrica) => {
    const delta = leerDiferencia(base, seleccionada, metrica.campo);
    const sentido = delta === null ? 'sin-datos' : delta.absoluta === 0 ? 'igual'
      : delta.absoluta * metrica.mejor > 0 ? 'favorable' : 'compensacion';
    const cambio = delta === null ? 'No comparable data'
      : delta.absoluta === 0 ? 'No change versus baseline'
        : `${delta.absoluta > 0 ? '↑' : '↓'} ${fmt(delta.absoluta, metrica)} ${metrica.unidad} versus baseline`;
    return { ...metrica, sentido, cambio, delta };
  });
  const dePrioridad = metricas.find((m) => m.campo === criterio.campo);
  let conclusion;
  if (!base || !seleccionada) conclusion = 'Not enough strategies are available to compare.';
  else if (esBase) conclusion = 'This is the baseline used to compare the other two options.';
  else if (!dePrioridad || dePrioridad.sentido === 'sin-datos') conclusion = `There is not enough data to evaluate the goal of ${PRIORIDADES[prioridad] ?? prioridad}.`;
  else if (dePrioridad.sentido === 'igual') conclusion = `The indicator for ${criterio.referencia} does not change from baseline.`;
  else if (dePrioridad.sentido === 'favorable') conclusion = `This option improves the indicator for ${criterio.referencia} compared with baseline, according to scenario values.`;
  else conclusion = `This option involves a trade-off in ${criterio.referencia} compared with baseline.`;
  return {
    esBase, metricas, conclusion, criterio: criterio.referencia, pregunta: criterio.pregunta,
    favorables: metricas.filter((m) => m.sentido === 'favorable'),
    compensaciones: metricas.filter((m) => m.sentido === 'compensacion'),
    faltantes: metricas.filter((m) => m.sentido === 'sin-datos'),
  };
}

/** Una fuente visible en la sesión no prueba que el algoritmo P2 la haya utilizado. */
export function construirProcedenciaDecision({ fuente = 'demo', modoEjemplo = true, generacion = null,
  evidenciaParcela = null, power = null, ajustes = null } = {}) {
  const ficticio = fuente === 'demo' || modoEjemplo;
  const origen = fuente === 'demo' ? 'Built-in demo scenarios'
    : modoEjemplo ? 'Fictional P2 test file'
      : fuente === 'backend' ? 'P2 backend response, not audited'
        : 'P2 file, not audited';
  const p1 = evidenciaParcela
    ? `${['smap', 'ssurgo', 'cropscape'].filter((clave) => !!evidenciaParcela[clave]).length} P1 source(s) visible this session${evidenciaParcela.modoEjemplo ? ' · FICTIONAL' : ' · not audited'}`
    : 'No P1 sources imported for this field';
  const nasa = power?.status === 'success'
    ? `NASA POWER queried for ${power.year}; available this session but not necessarily used by P2`
    : 'NASA POWER not queried this session';
  const declaradas = (generacion?.insumos ?? []).map((insumo) => texto(insumo.fuente)).filter(Boolean);
  const sensibilidad = (ajustes?.precioPct || ajustes?.aguaPct)
    ? `Local assumptions: price ${ajustes.precioPct > 0 ? '+' : ''}${ajustes.precioPct ?? 0} %, water ${ajustes.aguaPct > 0 ? '+' : ''}${ajustes.aguaPct ?? 0} %.`
    : 'No changes to sensitivity settings.';
  return {
    ficticio, origen, p1, nasa, declaradas, sensibilidad,
    advertencia: 'Available or declared sources do not prove that P2 used them. Imported data has not been audited, and recommendations require field validation.',
  };
}

export function crearFichaDecision({ parcela, prioridad, estrategia, impacto, procedencia }) {
  const encabezado = [
    'FIELD SHIFT · EXPLORATORY DECISION BRIEF',
    `Field: ${texto(parcela?.nombre) || 'No data'}`,
    `Priority: ${PRIORIDADES[prioridad] ?? prioridad ?? 'No data'}`,
    `Strategy: ${texto(estrategia?.titulo) || 'Not selected'}`,
    `Crops: ${texto(estrategia?.cultivos) || 'No data'}`,
    `Origin: ${procedencia?.origen || 'No data'}`,
    '',
    `Interpretation: ${impacto?.conclusion || 'No comparison available'}`,
    ...(impacto?.metricas ?? []).map((metrica) => `${metrica.titulo}: ${metrica.cambio}`),
    '', 'WHY IT IS SUGGESTED', texto(estrategia?.justificacion) || 'To be documented.',
    'UNCERTAINTY', texto(estrategia?.incertidumbre) || 'To be documented.',
    'FIELD VALIDATION', texto(estrategia?.validacion) || 'To be documented.',
    impacto?.pregunta || '', '',
    'TRACEABILITY',
    procedencia?.p1 || '', procedencia?.nasa || '',
    `P2-declared sources: ${procedencia?.declaradas?.join(', ') || 'Not documented'}`,
    procedencia?.sensibilidad || '',
    procedencia?.advertencia || '',
    '', 'WARNING: This is not a certified agronomic recommendation. Gross revenue is not profit; potential nitrogen is not verified fertilizer savings; cover months do not quantify prevented erosion.',
  ];
  return encabezado.join('\n');
}
