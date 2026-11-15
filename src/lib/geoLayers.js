import { numeroSeguro } from './diagnostics.js';
import { displayTerm } from './displayEnglish.js';

/**
 * Las capas de Fase 2 son REPRESENTACIONES EN PUNTOS de pilot fields.
 * No son rásteres SMAP/POWER, polígonos SSURGO ni superficies interpoladas.
 * Fuente actual: parcelas.json sintético. Mantener esa limitación en la UI.
 */
export const MESES = Object.freeze([
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]);

export const CAPAS = Object.freeze([
  { id: 'general', label: 'Locations', descripcion: 'Three pilot points', fuente: 'Pilot coordinates', temporal: false },
  { id: 'humedad', label: 'SMAP soil moisture', descripcion: 'Monthly surface moisture', fuente: 'Field humedad_smap_pct · NASA SMAP reference', temporal: true },
  { id: 'temperatura', label: 'Temperature', descripcion: 'Monthly maximum temperature', fuente: 'Field temp_max_c · NASA POWER reference', temporal: true },
  { id: 'erosion', label: 'Erosion', descripcion: 'Declared soil risk', fuente: 'Field riesgo_erosion · USDA SSURGO reference', temporal: false },
  { id: 'sueloDesnudo', label: 'Bare soil', descripcion: 'Months marked without cover', fuente: 'Field meses_suelo_desnudo · demo', temporal: true },
]);

const num = (n, digitos = 0) => Number(n).toLocaleString('en-US', {
  maximumFractionDigits: digitos, minimumFractionDigits: digitos,
});
const colores = {
  humedad: ['#D8EAF4', '#24759D'],
  temperatura: ['#F2DFB6', '#BE5A35'],
};
const categoriasErosion = {
  bajo: '#4F946F', medio: '#DE9A42', alto: '#CB6552',
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function mezclarColores(inicio, fin, proporcion) {
  const t = clamp(proporcion, 0, 1);
  const a = inicio.replace('#', '');
  const b = fin.replace('#', '');
  const canal = (idx) => Math.round(parseInt(a.slice(idx, idx + 2), 16) * (1 - t) + parseInt(b.slice(idx, idx + 2), 16) * t)
    .toString(16).padStart(2, '0');
  return `#${canal(0)}${canal(2)}${canal(4)}`;
}

/** Normalización VISUAL fija, no umbrales de riesgo ni clasificación agronómica. */
export function escalaVisual(capa, valor) {
  if (!Number.isFinite(valor)) return null;
  if (capa === 'humedad') {
    const t = clamp(valor / 40, 0, 1);
    return { color: mezclarColores(...colores.humedad, t), proporcion: t };
  }
  if (capa === 'temperatura') {
    const t = clamp((valor - 5) / 40, 0, 1);
    return { color: mezclarColores(...colores.temperatura, t), proporcion: t };
  }
  return null;
}

function sinDatos(capa) {
  return { capa, disponible: false, valor: null, etiqueta: 'No data', color: '#A5B5A9', proporcion: null };
}

/**
 * El mes se busca por NOMBRE, no por posición: una serie incompleta sigue mostrando
 * correctamente los valores restantes. -999/null se mantienen como faltantes.
 */
export function datoGeografico(parcela, capa, mes = 'Julio') {
  if (!parcela || capa === 'general') return sinDatos(capa);
  const registro = (parcela.clima_mensual ?? []).find((fila) => fila.mes === mes);

  if (capa === 'humedad' || capa === 'temperatura') {
    const clave = capa === 'humedad' ? 'humedad_smap_pct' : 'temp_max_c';
    const valor = numeroSeguro(registro?.[clave]);
    if (valor === null) return sinDatos(capa);
    const escala = escalaVisual(capa, valor);
    const unidad = capa === 'humedad' ? '%' : '°C';
    return {
      capa, disponible: true, valor, unidad,
      etiqueta: `${num(valor, 1)} ${unidad}`,
      color: escala.color, proporcion: escala.proporcion,
      detalle: capa === 'humedad' ? 'Illustrative surface soil moisture' : 'Illustrative maximum temperature',
    };
  }

  if (capa === 'erosion') {
    const valor = String(parcela.suelo_ssurgo?.riesgo_erosion ?? '').trim();
    if (!valor) return sinDatos(capa);
    const clave = valor.toLocaleLowerCase('es');
    return {
      capa, disponible: true, valor,
      etiqueta: displayTerm(valor),
      color: categoriasErosion[clave] ?? '#8CA396',
      proporcion: null, detalle: 'Classification declared in sample JSON',
    };
  }

  if (capa === 'sueloDesnudo') {
    if (!Array.isArray(parcela.meses_suelo_desnudo)) return sinDatos(capa);
    const estaDesnudo = parcela.meses_suelo_desnudo.includes(mes);
    // Ausencia en la lista NO equivale a cobertura vegetal confirmada.
    return {
      capa, disponible: true, valor: estaDesnudo,
      etiqueta: estaDesnudo ? 'Bare soil indicated' : 'Not marked',
      color: estaDesnudo ? '#C75A49' : '#92AAA1',
      proporcion: null,
      detalle: estaDesnudo ? 'Month labeled as bare soil' : 'No bare soil is marked; cover remains unverified',
    };
  }

  return sinDatos(capa);
}

export function descripcionLeyenda(capa) {
  if (capa === 'humedad') return { titulo: 'Surface soil moisture (%)', tipo: 'gradiente', min: '0%', max: '40% or more', nota: 'Descriptive colors; do not indicate water stress or spatial coverage.' };
  if (capa === 'temperatura') return { titulo: 'Maximum temperature (°C)', tipo: 'gradiente', min: '5 °C or lower', max: '45 °C or higher', nota: 'Descriptive color; not a heat warning.' };
  if (capa === 'erosion') return { titulo: 'Erosion risk (declared data)', tipo: 'categorias', items: [{ label: 'Low', color: '#4F946F' }, { label: 'Medium', color: '#DE9A42' }, { label: 'High', color: '#CB6552' }], nota: 'Demo categories, not an observed erosion map.' };
  if (capa === 'sueloDesnudo') return { titulo: 'Bare soil (selected month)', tipo: 'categorias', items: [{ label: 'Marked', color: '#C75A49' }, { label: 'Not marked', color: '#92AAA1' }], nota: 'Not marked does not mean vegetation cover is confirmed.' };
  return { titulo: 'Pilot markers', tipo: 'ninguna', nota: 'Approximate points, not mapped field boundaries.' };
}
