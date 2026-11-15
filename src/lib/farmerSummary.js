import { analizarTerritorio } from './territorialInsights.js';
import { ajustePorPrioridad, diferenciaVsBase } from './strategySimulator.js';

/** Mensajes breves basados EXCLUSIVAMENTE en las señales del JSON demo. */
export function resumirSituacion(parcela, prioridad) {
  const revision = analizarTerritorio(parcela, prioridad);
  const principales = revision.senales.slice(0, 3).map((senal) => {
    const observada = senal.estado === 'atencion' || senal.estado === 'revisar';
    const incompleta = senal.estado === 'insuficiente';
    const textos = {
      coincidencia: observada ? `The sample shows ${senal.metrica} with both high temperatures and low surface soil moisture.`
        : incompleta ? 'Some monthly records are missing; this overlap cannot be fully checked.' : 'No overlap was found using the exploratory rule.',
      cobertura: observada ? `The sample marks ${senal.metrica} with bare soil.`
        : incompleta ? 'Not enough bare-soil information is available.' : 'No bare soil was flagged; this does not confirm vegetation cover.',
      rotacion: observada ? 'The sample history shows the same crop in consecutive years.'
        : incompleta ? 'Crop history records are missing.' : 'No consecutive crop repetition was found in the available records.',
      erosion: observada ? `The sample reports ${senal.metrica.toLowerCase()} erosion risk.`
        : incompleta ? 'No erosion risk category is available.' : 'The sample reports low erosion risk; field verification is still needed.',
    };
    return { ...senal, textoCorto: textos[senal.id] || senal.resumen };
  });
  return { ...revision, principales };
}

/** No elige ganadora con empate, un campo faltante o menos de dos alternativas válidas. */
export function resumirOpciones(estrategias, prioridad) {
  const disponibles = Array.isArray(estrategias) ? estrategias : [];
  const recomendacion = ajustePorPrioridad(disponibles, prioridad);
  const base = disponibles.find((e) => e.id === 'baseline') ?? null;
  const destacada = recomendacion.id ? disponibles.find((e) => e.id === recomendacion.id) ?? null : null;
  return {
    recomendacion, destacada, base,
    restantes: disponibles.filter((e) => e.id !== destacada?.id),
    agua: destacada && base ? diferenciaVsBase(base, destacada, 'agua_mm') : null,
    ingreso: destacada && base ? diferenciaVsBase(base, destacada, 'ingreso_usd_acre') : null,
    nitrogeno: destacada && base ? diferenciaVsBase(base, destacada, 'nitrogeno_kg_acre') : null,
  };
}
