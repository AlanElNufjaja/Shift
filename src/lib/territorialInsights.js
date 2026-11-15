import { displayMonth, displayTerm } from './displayEnglish.js';
import { detectarMonocultivo, MESES, numeroSeguro, formatoNumero } from './diagnostics.js';

/**
 * Reglas de cribado EXPLORATORIAS del equipo; no son umbrales oficiales de NASA,
 * ni una evaluación de estrés del cultivo o un diagnóstico de campo.
 */
export const UMBRALES_EXPLORATORIOS = Object.freeze({ humedadMenorPct: 15, temperaturaMayorC: 35 });

const intensidad = { atencion: 3, revisar: 2, 'sin-senal': 1, insuficiente: 0 };
const porPrioridad = {
  agua: ['coincidencia', 'cobertura'],
  suelo: ['rotacion', 'cobertura'],
  erosion: ['erosion', 'cobertura'],
  rentabilidad: [],
};

function formato(valor, unidad) {
  return valor === null ? 'No data' : `${formatoNumero(valor, 1)} ${unidad}`;
}

/**
 * Agrupa por nombre de mes, no por índice. Los faltantes (-999/null) se conservan
 * como NO evaluables; meses no indicados como desnudos NO significan cubierta confirmada.
 */
export function calendarioTerritorial(parcela) {
  const registros = new Map();
  for (const fila of Array.isArray(parcela?.clima_mensual) ? parcela.clima_mensual : []) {
    if (fila && MESES.includes(fila.mes)) registros.set(fila.mes, fila);
  }
  const hayCoberturaDeclarada = Array.isArray(parcela?.meses_suelo_desnudo);
  const sueloDesnudo = new Set(hayCoberturaDeclarada ? parcela.meses_suelo_desnudo : []);

  return MESES.map((mes) => {
    const fila = registros.get(mes);
    const temperatura = numeroSeguro(fila?.temp_max_c);
    const humedad = numeroSeguro(fila?.humedad_smap_pct);
    const evaluable = temperatura !== null && humedad !== null;
    const coincidencia = evaluable
      && temperatura > UMBRALES_EXPLORATORIOS.temperaturaMayorC
      && humedad < UMBRALES_EXPLORATORIOS.humedadMenorPct;
    return {
      mes,
      corto: displayMonth(mes).slice(0, 3),
      humedad,
      temperatura,
      evaluable,
      coincidencia,
      sueloDesnudo: hayCoberturaDeclarada ? sueloDesnudo.has(mes) : null,
      // True indica solo que el registro del JSON lleva esa etiqueta.
      riesgoHelada: fila?.riesgo_helada === true,
    };
  });
}

export function analizarTerritorio(parcela, prioridad = 'agua') {
  const calendario = calendarioTerritorial(parcela);
  const complete = calendario.filter((m) => m.evaluable);
  const mesesCoincidentes = complete.filter((m) => m.coincidencia).map((m) => m.mes);
  const hayListaDesnudos = Array.isArray(parcela?.meses_suelo_desnudo);
  const desnudos = hayListaDesnudos ? calendario.filter((m) => m.sueloDesnudo).map((m) => m.mes) : [];
  const solapamiento = calendario.filter((m) => m.coincidencia && m.sueloDesnudo).map((m) => m.mes);
  const historial = Array.isArray(parcela?.historial_cropscape) ? parcela.historial_cropscape : [];
  const hayHistorial = historial.filter((item) => typeof item === 'string' && item.trim()).length >= 2;
  const repeticion = hayHistorial && detectarMonocultivo(historial);
  const erosion = String(parcela?.suelo_ssurgo?.riesgo_erosion ?? '').trim();
  const claseErosion = erosion.toLocaleLowerCase('es');
  const erosionValida = ['alto', 'medio', 'bajo'].includes(claseErosion);

  const senales = [
    {
      id: 'coincidencia', titulo: 'Heat and low soil moisture', categoria: 'Climate and water',
      estado: mesesCoincidentes.length ? 'atencion' : (complete.length === 12 ? 'sin-senal' : 'insuficiente'),
      metrica: `${mesesCoincidentes.length} ${mesesCoincidentes.length === 1 ? 'month' : 'months'}`,
      resumen: mesesCoincidentes.length
        ? `Exploratory overlap in ${mesesCoincidentes.map(displayMonth).join(', ')}.`
        : complete.length === 12
          ? 'No overlap was detected using exploratory thresholds across all 12 months.'
          : `Only ${complete.length} of 12 months have both variables; missing overlaps cannot be ruled out.`,
      evidencia: `${complete.length}/12 evaluable months · surface moisture and maximum temperature.`,
      regla: 'Same-month overlap: maximum temperature > 35 °C and surface moisture < 15%.',
      fuente: 'Sample fields: clima_mensual (NASA POWER / SMAP references, not real observations).',
      limite: 'Does not measure root-zone water or establish crop damage. Satellite averages are not direct field measurements.',
      verificacion: 'Measure root-zone moisture, check irrigation, and compare field dates and plant stress.',
    },
    {
      id: 'cobertura', titulo: 'Bare-soil periods', categoria: 'Soil cover',
      estado: !hayListaDesnudos ? 'insuficiente' : (desnudos.length ? 'revisar' : 'sin-senal'),
      metrica: !hayListaDesnudos ? 'No data' : `${desnudos.length} ${desnudos.length === 1 ? 'month' : 'months'}`,
      resumen: !hayListaDesnudos ? 'No bare-soil month list is available.'
        : desnudos.length ? `Marked months: ${desnudos.map(displayMonth).join(', ')}.`
          : 'No bare soil was marked; this does not confirm vegetation cover.',
      evidencia: !hayListaDesnudos ? 'Field meses_suelo_desnudo is missing.' : `${desnudos.length} of 12 months are explicitly flagged in the JSON.`,
      regla: 'Descriptive signal: months explicitly listed in meses_suelo_desnudo.',
      fuente: 'Demo field meses_suelo_desnudo; this is not a classified satellite image.',
      limite: 'Cover is unknown for unmarked months. A labeled month does not quantify the exposed soil area.',
      verificacion: 'Inspect residue and vegetation cover; document actual planting and harvest dates.',
    },
    {
      id: 'rotacion', titulo: 'Repeated crops', categoria: 'Cropping history',
      estado: !hayHistorial ? 'insuficiente' : (repeticion ? 'revisar' : 'sin-senal'),
      metrica: !hayHistorial ? 'No data' : repeticion ? 'Detected' : 'Not detected',
      resumen: !hayHistorial ? 'At least two comparable crop records are needed.'
        : repeticion ? 'The same crop appears in consecutive history entries.'
          : 'No consecutive crop repetition appears in the available entries.',
      evidencia: `${historial.length} entries in the sample crop history.`,
      regla: 'Exact crop-name match in two consecutive entries, after removing annotations.',
      fuente: 'Field historial_cropscape · USDA CropScape-inspired sample format.',
      limite: 'Does not evaluate rotations within a year or confirm agronomic monoculture; accuracy depends on record completeness.',
      verificacion: 'Confirm crops and dates against production records, and assess pests, nutrients and management with an agronomist.',
    },
    {
      id: 'erosion', titulo: 'Declared erosion risk', categoria: 'Soil properties',
      estado: !erosionValida ? 'insuficiente' : (claseErosion === 'alto' ? 'atencion' : claseErosion === 'medio' ? 'revisar' : 'sin-senal'),
      metrica: erosionValida ? displayTerm(erosion) : 'No data',
      resumen: erosionValida ? `The JSON assigns this field an erosion risk of “${displayTerm(erosion)}”.` : 'Category missing or unrecognized.',
      evidencia: erosionValida ? `Declared category: ${erosion}.` : 'No valid Low/Medium/High category was found.',
      regla: 'Displays the JSON Low, Medium, or High category; does not recalculate it.',
      fuente: 'Field suelo_ssurgo.riesgo_erosion · USDA SSURGO reference.',
      limite: 'The sample category is not a forecast and does not replace slope, runoff and management measurements.',
      verificacion: 'Inspect slope, cover, runoff, compaction and erosion signs in the field.',
    },
  ];

  const enfocadas = porPrioridad[prioridad] ?? [];
  const ordenadas = [...senales].sort((a, b) =>
    intensidad[b.estado] - intensidad[a.estado]
    || Number(enfocadas.includes(b.id)) - Number(enfocadas.includes(a.id))
    || senales.indexOf(a) - senales.indexOf(b));

  return {
    calendario,
    senales: ordenadas,
    mesesCoincidentes,
    solapamiento,
    mesesEvaluables: complete.length,
    mesesNoEvaluables: 12 - complete.length,
    senalesParaRevisar: senales.filter((s) => s.estado === 'atencion' || s.estado === 'revisar').length,
    senalesSinDatos: senales.filter((s) => s.estado === 'insuficiente').length,
    completa: complete.length === 12 && hayListaDesnudos && hayHistorial && erosionValida,
    resumen: mesesCoincidentes.length
      ? `${mesesCoincidentes.length} ${mesesCoincidentes.length === 1 ? 'month shows' : 'months show'} simultaneous heat and low moisture in the example.`
      : complete.length === 12
        ? 'No exploratory heat and low moisture overlap was observed in the monthly series.'
        : 'Incomplete monthly data: the entire season cannot be assessed.',
  };
}

export function descripcionMes(mes) {
  if (!mes) return null;
  const cubierta = mes.sueloDesnudo === null ? 'no bare-soil information'
    : mes.sueloDesnudo ? 'bare soil flagged' : 'bare soil not marked (cover unknown)';
  return `${displayMonth(mes.mes)}: temperature ${formato(mes.temperatura, '°C')}, soil moisture ${formato(mes.humedad, '%')}; ${cubierta}.`;
}
