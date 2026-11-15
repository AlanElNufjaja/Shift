import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarArchivoP2, validarRespuestaP2, normalizarEstrategias, resumirVinculoP2 } from '../src/lib/recommendationIntake.js';

const ejemplo = JSON.parse(readFileSync(new URL('../public/ejemplo-p2-FICTICIO.json', import.meta.url), 'utf8'));
const ids = ['fresno-01', 'bakersfield-02', 'davis-03'];
const clone = (v) => JSON.parse(JSON.stringify(v));

test('ejemplo P2 ficticio contiene 12 combinaciones completas', () => {
  const analisis = validarArchivoP2(ejemplo, ids);
  assert.equal(analisis.valido, true, analisis.errores.join('\n'));
  assert.equal(analisis.total, 12);
  assert.equal(analisis.modoEjemplo, true);
  assert.equal(analisis.porClave['fresno-01:agua'].estrategias.length, 3);
  assert.notDeepEqual(analisis.porClave['fresno-01:agua'].estrategias, analisis.porClave['fresno-01:suelo'].estrategias);
});

test('plantilla P2 permite importar una combinación documentada', () => {
  const plantilla = JSON.parse(readFileSync(new URL('../public/plantilla-respuesta-p2.json', import.meta.url), 'utf8'));
  assert.equal(validarArchivoP2(plantilla, ids).valido, true);
});

test('rechaza combinaciones duplicadas y no activa parcialmente', () => {
  const archivo = clone(ejemplo);
  archivo.resultados.push(clone(archivo.resultados[0]));
  const resultado = validarArchivoP2(archivo, ids);
  assert.equal(resultado.valido, false);
  assert.deepEqual(resultado.porClave, {});
});

test('rechaza IDs de parcelas desconocidos y prioridades inválidas', () => {
  for (const campo of ['parcela_id', 'prioridad']) {
    const archivo = clone(ejemplo);
    archivo.resultados[0][campo] = 'valor-desconocido';
    assert.equal(validarArchivoP2(archivo, ids).valido, false);
  }
});

test('rechaza los IDs de estrategias duplicados e indicadores negativos o string', () => {
  const escenario = clone(ejemplo.resultados[0].estrategias);
  escenario[2].id = 'water';
  assert.equal(normalizarEstrategias(escenario).valido, false);
  for (const valor of [-999, '620', -2, Infinity]) {
    const copia = clone(ejemplo.resultados[0].estrategias);
    copia[0].agua_mm = valor;
    assert.equal(normalizarEstrategias(copia).valido, false);
  }
});

test('acepta números nulos individuales sin inventar un cero', () => {
  const escenario = clone(ejemplo.resultados[0].estrategias);
  escenario[0].agua_mm = null;
  const respuesta = normalizarEstrategias(escenario);
  assert.equal(respuesta.valido, true);
  assert.equal(respuesta.estrategias[0].agua_mm, null);
});

test('rechaza calendarios incompletos y estados no reconocidos', () => {
  for (const cobertura of [['Desnudo'], Array(12).fill('Verde')]) {
    const escenario = clone(ejemplo.resultados[0].estrategias);
    escenario[0].cobertura_mensual = cobertura;
    assert.equal(normalizarEstrategias(escenario).valido, false);
  }
});

test('respuesta remota antigua válida sin metadatos se acepta, pero advierte auditoría', () => {
  const respuesta = validarRespuestaP2({ estrategias: ejemplo.resultados[0].estrategias });
  assert.equal(respuesta.valido, true);
  assert.ok(respuesta.avisos.length);
});

test('rechaza respuestas remotas con solo títulos', () => {
  const respuesta = validarRespuestaP2({ estrategias: [{ id: 'baseline', titulo: 'A' }, { id: 'water', titulo: 'B' }, { id: 'regen', titulo: 'C' }] });
  assert.equal(respuesta.valido, false);
});

test('cadena de plantilla malformada o fecha imposible bloquea archivo', () => {
  const archivo = clone(ejemplo);
  archivo.resultados[0].generacion.fecha = '2026-02-31';
  assert.equal(validarArchivoP2(archivo, ids).valido, false);
});

test('resumen de vínculo distingue demo, P1 ficticio y falta de auditoría', () => {
  const ficticio = { modoEjemplo: true, generacion: ejemplo.resultados[0].generacion };
  assert.match(resumirVinculoP2({ salida: ficticio }).etiqueta, /FICTIONAL/);
  const declarado = { modoEjemplo: false, generacion: ejemplo.resultados[0].generacion };
  const falta = resumirVinculoP2({ salida: declarado });
  assert.match(falta.etiqueta, /P1 not cross-checked|POWER not cross-checked/);
  const p1Demo = { smap: { anio: 2025 }, modoEjemplo: true };
  const power = { status: 'success', year: 2025 };
  assert.equal(resumirVinculoP2({ salida: declarado, evidenciaParcela: p1Demo, power }).etiqueta, 'Fictional P1');
  const p1Real = { smap: { anio: 2024 }, modoEjemplo: false };
  assert.equal(resumirVinculoP2({ salida: declarado, evidenciaParcela: p1Real, power }).etiqueta, 'Mismatched periods');
});

test('recorta texto externo y descarta claves arbitrarias', () => {
  const escenario = clone(ejemplo.resultados[0].estrategias);
  escenario[0].titulo = 'x'.repeat(500);
  escenario[0].__proto_pollution__ = 'NO';
  const respuesta = normalizarEstrategias(escenario);
  assert.equal(respuesta.valido, true);
  assert.equal(respuesta.estrategias[0].titulo.length, 90);
  assert.equal(respuesta.estrategias[0].__proto_pollution__, undefined);
});

test('un indicador incompleto no gana una comparación por ausencia de competidor', async () => {
  const { ajustePorPrioridad } = await import('../src/lib/strategySimulator.js');
  const resultado = ajustePorPrioridad([
    { id: 'baseline', agua_mm: 500 }, { id: 'water', agua_mm: 420 }, { id: 'regen', agua_mm: null },
  ], 'agua');
  assert.equal(resultado.id, null);
  assert.match(resultado.descripcion, /Insufficient data/i);
});

test('CSV distingue ejemplo P2 ficticio de respuesta P2 declarada', async () => {
  const { csvComparacion } = await import('../src/lib/strategySimulator.js');
  const filas = ejemplo.resultados[0].estrategias;
  const csv = csvComparacion({ parcela: { id: 'fresno-01' }, prioridad: 'agua', fuente: 'p2-importado', modoEjemplo: true,
    originales: filas, escenarios: filas, ajustes: { aguaPct: 0, precioPct: 0 } });
  assert.match(csv, /FICTIONAL P2/);
  assert.match(csv, /NOT AUDITED/);
});
