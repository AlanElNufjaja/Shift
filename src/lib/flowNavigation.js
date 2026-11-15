/** Rutas compartidas: conserva las anclas históricas además del asistente sencillo. */
export const PASOS = Object.freeze([
  { id: 'explorar', nombre: 'My field', subtitulo: 'Choose your field' },
  { id: 'entender', nombre: 'Field conditions', subtitulo: 'Understand the signals' },
  { id: 'decidir', nombre: 'My options', subtitulo: 'Compare alternatives' },
]);

const TAB_POR_ANCLA = Object.freeze({
  'detalle-terreno': 'terreno',
  'detalle-diagnostico': 'diagnostico',
  'detalle-estrategias': 'estrategias',
  datos: 'nasa',
  'detalle-smap': 'smap',
  integracion: 'p1',
  'evidencias-p1': 'p1',
  'comparacion-fuentes': 'p1',
  'motor-p2': 'p2',
  'detalle-market': 'market',
  'market-prices': 'market',
});

export function resolverAncla(ancla) {
  const id = String(ancla ?? '').replace(/^#/, '').trim();
  if (['etapa-1', 'resumen', 'mapa'].includes(id)) return { vista: 'recorrido', paso: 0, ancla: id };
  if (['etapa-2', 'senales', 'diagnostico'].includes(id)) return { vista: 'recorrido', paso: 1, ancla: id };
  if (['etapa-3', 'strategies'].includes(id)) return { vista: 'recorrido', paso: 2, ancla: id };
  if (id === 'laboratorio') return { vista: 'laboratorio', tab: 'nasa', ancla: id };
  if (Object.hasOwn(TAB_POR_ANCLA, id)) return { vista: 'laboratorio', tab: TAB_POR_ANCLA[id], ancla: id };
  return null;
}

export function limitarPaso(paso) {
  return Math.max(0, Math.min(PASOS.length - 1, Number.isFinite(paso) ? Math.floor(paso) : 0));
}
