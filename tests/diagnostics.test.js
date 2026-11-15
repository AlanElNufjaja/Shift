import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  detectarMonocultivo, diagnosticarParcela, mejorEstrategia,
  numeroSeguro, serieMensual,
} from '../src/lib/diagnostics.js';

const json = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'));
const parcelas = json('../src/data/parcelas.json');
const estrategias = json('../src/data/estrategias_demo.json');

test('valores faltantes no contaminan indicadores', () => {
  assert.equal(numeroSeguro(-999), null);
  assert.equal(numeroSeguro(null), null);
  assert.equal(numeroSeguro('no-data'), null);
  assert.equal(numeroSeguro(21.4), 21.4);
});

test('señala repetición consecutiva real en el historial sintético', () => {
  assert.equal(detectarMonocultivo(parcelas[0].historial_cropscape), true);
  assert.equal(detectarMonocultivo(parcelas[2].historial_cropscape), false);
});

test('tres parcelas con 12 meses y análisis finito', () => {
  assert.equal(parcelas.length, 3);
  for (const parcela of parcelas) {
    assert.equal(serieMensual(parcela).length, 12);
    assert.ok(Number.isFinite(diagnosticarParcela(parcela).humedadMedia));
    assert.equal(estrategias[parcela.id].length, 3);
  }
});

test('prioridades cambian la estrategia destacada, no los datos originales', () => {
  for (const parcela of parcelas) {
    const opcion = estrategias[parcela.id];
    assert.equal(mejorEstrategia(opcion, 'agua'), 'water');
    assert.equal(mejorEstrategia(opcion, 'suelo'), 'regen');
    assert.equal(mejorEstrategia(opcion, 'rentabilidad'), 'regen');
    assert.equal(mejorEstrategia(opcion, 'erosion'), 'regen');
  }
});
