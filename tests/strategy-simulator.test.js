import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AJUSTES_INICIALES, simularEstrategias, diferenciaVsBase,
  contarMesesDesnudos, ajustePorPrioridad, csvComparacion,
} from '../src/lib/strategySimulator.js';

const estrategiasDemo = JSON.parse(readFileSync(new URL('../src/data/estrategias_demo.json', import.meta.url), 'utf8'));
const originales = estrategiasDemo['fresno-01'];

test('sin ajustes se preservan valores e instancias de los originales', () => {
  const antes = structuredClone(originales);
  const salida = simularEstrategias(originales, AJUSTES_INICIALES);
  assert.notStrictEqual(salida, originales);
  assert.deepEqual(originales, antes);
  assert.equal(salida[0].agua_mm, 620);
  assert.equal(salida[0].ingreso_usd_acre, 1740);
  assert.equal(salida[2].nitrogeno_kg_acre, 38);
});

test('sensibilidad simula multiplicadores iguales sobre TODAS las estrategias', () => {
  const salida = simularEstrategias(originales, { precioPct: -10, aguaPct: 10 });
  assert.equal(salida[0].agua_mm, 682);
  assert.equal(salida[1].agua_mm, 473);
  assert.equal(salida[2].ingreso_usd_acre, 1769);
  assert.equal(salida[0].ingreso_usd_acre, 1566);
  assert.equal(salida[1].nitrogeno_kg_acre, 14);
});

test('el simulador limita controles extremos para mantener hipótesis acotadas', () => {
  const salida = simularEstrategias(originales, { precioPct: -100, aguaPct: 900 });
  assert.equal(salida[0].ingreso_usd_acre, 1218);
  assert.equal(salida[0].agua_mm, 744);
});

test('valores nulos y -999 permanecen Sin datos, nunca cero ficticio', () => {
  const resultado = simularEstrategias([{ id: 'baseline', agua_mm: -999, ingreso_usd_acre: null, nitrogeno_kg_acre: undefined }], { precioPct: 10, aguaPct: -10 });
  assert.equal(resultado[0].agua_mm, null);
  assert.equal(resultado[0].ingreso_usd_acre, null);
  assert.equal(resultado[0].nitrogeno_kg_acre, null);
  assert.equal(diferenciaVsBase(resultado[0], originales[0], 'agua_mm'), null);
});

test('deltas son simétricos y porcentaje no disponible con base 0', () => {
  assert.deepEqual(diferenciaVsBase(originales[0], originales[1], 'agua_mm'), { absoluta: -190, porcentaje: -30.6 });
  assert.deepEqual(diferenciaVsBase({ agua_mm: 0 }, { agua_mm: 100 }, 'agua_mm'), { absoluta: 100, porcentaje: null });
  assert.deepEqual(diferenciaVsBase(originales[0], originales[0], 'agua_mm'), { absoluta: 0, porcentaje: 0 });
});

test('cobertura incompleta/desconocida no se interpreta como suelo cubierto', () => {
  assert.equal(contarMesesDesnudos(Array(12).fill('Cubierto')), 0);
  assert.equal(contarMesesDesnudos([...Array(11).fill('Cubierto'), 'Desnudo']), 1);
  assert.equal(contarMesesDesnudos(Array(11).fill('Cubierto')), null);
  assert.equal(contarMesesDesnudos([...Array(11).fill('Cubierto'), 'Desconocido']), null);
});

test('agua favorece opción hídrica, suelo e ingreso favorecen regenerativa', () => {
  assert.equal(ajustePorPrioridad(originales, 'agua').id, 'water');
  assert.equal(ajustePorPrioridad(originales, 'suelo').id, 'regen');
  assert.equal(ajustePorPrioridad(originales, 'rentabilidad').id, 'regen');
});

test('erosión empata cuando ambas opciones tienen 0 meses desnudos', () => {
  const resultado = ajustePorPrioridad(originales, 'erosion');
  assert.equal(resultado.id, null);
  assert.equal(resultado.empate, true);
});

test('sin observaciones evaluables no propone ganadora', () => {
  const resultado = ajustePorPrioridad([{ id: 'water', agua_mm: null }, { id: 'regen', agua_mm: -999 }], 'agua');
  assert.equal(resultado.id, null);
  assert.equal(resultado.empate, false);
});

test('CSV describe origen, supuestos y resultados sin presentar ingresos como utilidades', () => {
  const escenarios = simularEstrategias(originales, { precioPct: 5, aguaPct: 10 });
  const csv = csvComparacion({ parcela: { id: 'fresno-01', nombre: 'Fresno Sur' }, prioridad: 'agua', fuente: 'demo', originales,
    ajustes: { precioPct: 5, aguaPct: 10 }, escenarios });
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /Synthetic demonstration data/);
  assert.match(csv, /Gross revenue is not profit/);
  assert.match(csv, /Fresno Sur/);
  assert.match(csv, /"682"/);
  assert.match(csv, /\r\n/);
});
