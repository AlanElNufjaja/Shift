import { displayMonth } from './displayEnglish.js';
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const PRIORIDADES = {
  agua: 'Save water',
  suelo: 'Soil health',
  rentabilidad: 'Profitability',
  erosion: 'Reduce erosion',
};

// Los valores -999, usados como nulos en algunas descargas, NO son observaciones válidas.
export function numeroSeguro(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero !== -999 ? numero : null;
}

export function promedio(valores) {
  const validos = valores.map(numeroSeguro).filter((numero) => numero !== null);
  return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null;
}

export function formatoNumero(valor, decimales = 0) {
  const numero = numeroSeguro(valor);
  return numero === null ? 'No data' : new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales,
  }).format(numero);
}

export function formatoDinero(valor) {
  const numero = numeroSeguro(valor);
  return numero === null ? 'No data' : new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(numero);
}

function extraerCultivo(registro) {
  if (typeof registro !== 'string') return '';
  return registro
    .replace(/^\s*\d{4}\s*:\s*/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim().toLocaleLowerCase('es');
}

// Detección de repetición consecutiva; una señal para revisar, NO un diagnóstico agronómico.
export function detectarMonocultivo(historial = []) {
  const cultivos = (Array.isArray(historial) ? historial : []).map(extraerCultivo).filter(Boolean);
  return cultivos.some((cultivo, i) => i > 0 && cultivo === cultivos[i - 1]);
}

export function diagnosticarParcela(parcela) {
  const mensual = Array.isArray(parcela?.clima_mensual) ? parcela.clima_mensual : [];
  const temperaturas = mensual.map((mes) => numeroSeguro(mes.temp_max_c));
  const humedades = mensual.map((mes) => numeroSeguro(mes.humedad_smap_pct));
  const maxTemp = temperaturas.filter((valor) => valor !== null);
  const mesesCriticos = mensual.filter((mes) => {
    const t = numeroSeguro(mes.temp_max_c);
    const h = numeroSeguro(mes.humedad_smap_pct);
    return t !== null && h !== null && t > 35 && h < 15;
  });

  return {
    tempMax: maxTemp.length ? Math.max(...maxTemp) : null,
    humedadMedia: promedio(humedades),
    lluviaAcumulada: mensual.length ? mensual.reduce((total, mes) => total + (numeroSeguro(mes.lluvia_mm) ?? 0), 0) : null,
    heladas: mensual.filter((mes) => mes.riesgo_helada === true).length,
    monocultivo: detectarMonocultivo(parcela?.historial_cropscape),
    mesesCriticos,
    mesesDesnudos: Array.isArray(parcela?.meses_suelo_desnudo) ? parcela.meses_suelo_desnudo : [],
  };
}

export function serieMensual(parcela) {
  const mensual = new Map((parcela?.clima_mensual ?? []).map((mes) => [mes.mes, mes]));
  const desnudos = new Set(parcela?.meses_suelo_desnudo ?? []);
  return MESES.map((mes) => {
    const item = mensual.get(mes) ?? {};
    return {
      mes,
      abreviatura: displayMonth(mes).slice(0, 3),
      humedad: numeroSeguro(item.humedad_smap_pct),
      temperatura: numeroSeguro(item.temp_max_c),
      // Columna roja indicativa, no una lectura cuantitativa.
      sueloDesnudoMarker: desnudos.has(mes) ? 45 : 0,
      sueloDesnudo: desnudos.has(mes),
    };
  });
}

export function mejorEstrategia(estrategias = [], prioridad) {
  const alternativas = estrategias.filter((estrategia) => estrategia.id !== 'baseline');
  if (!alternativas.length) return null;
  const criterio = {
    agua: (estrategia) => -(numeroSeguro(estrategia.agua_mm) ?? Infinity),
    suelo: (estrategia) => numeroSeguro(estrategia.nitrogeno_kg_acre) ?? -Infinity,
    rentabilidad: (estrategia) => numeroSeguro(estrategia.ingreso_usd_acre) ?? -Infinity,
    erosion: (estrategia) => -(estrategia.cobertura_mensual ?? []).filter((mes) => mes === 'Desnudo').length
      + (numeroSeguro(estrategia.nitrogeno_kg_acre) ?? 0) / 1000,
  }[prioridad] ?? (() => 0);
  return [...alternativas].sort((a, b) => criterio(b) - criterio(a))[0]?.id ?? null;
}
