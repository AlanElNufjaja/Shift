import test from 'node:test';
import assert from 'node:assert/strict';
import { POWER_HEAT_REFERENCE_C, resumirClimaPower } from '../src/lib/powerDiagnostics.js';

const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function sample(overrides = {}) {
  return { status: 'success', year: 2025, datos: { serie: months.map((mes, i) => ({ mes, temperatura: 20 + i * 2, lluvia: 1.5 })) }, ...overrides };
}

test('sin consulta NASA no se inventan métricas reales', () => {
  const result = resumirClimaPower({ status: 'idle', datos: null });
  assert.equal(result.disponible, false);
  assert.equal(result.maxTemperatura, null);
  assert.deepEqual(result.mesesSuperanReferencia, []);
});

test('serie completa NASA: identifica meses >35°C y nunca mezcla humedad SMAP', () => {
  const result = resumirClimaPower(sample());
  assert.equal(result.completo, true);
  assert.equal(result.nTemperatura, 12);
  assert.deepEqual(result.mesesSuperanReferencia, ['Septiembre', 'Octubre', 'Noviembre', 'Diciembre']);
  assert.equal(result.maxTemperatura, 42);
  assert.ok(result.limitacion.includes('SMAP'));
  assert.equal(POWER_HEAT_REFERENCE_C, 35);
});

test('serie parcial: mantiene ausencias y no llama seguro al año', () => {
  const p = sample();
  p.datos.serie[0].temperatura = null;
  p.datos.serie[1].temperatura = -999;
  p.datos.serie[2].lluvia = -999;
  const result = resumirClimaPower(p);
  assert.equal(result.completo, false);
  assert.equal(result.tipo, 'parcial');
  assert.equal(result.nTemperatura, 10);
  assert.equal(result.nPrecipitacion, 11);
  assert.ok(result.mesesSinDatos.includes('Enero'));
});

test('sin temperaturas válidas pero con lluvias NASA no se simula pico ni calor cero', () => {
  const p = sample();
  p.datos.serie = months.map((mes) => ({ mes, temperatura: null, lluvia: 0 }));
  const result = resumirClimaPower(p);
  assert.equal(result.tipo, 'sin-temperatura');
  assert.equal(result.disponible, false);
  assert.equal(result.maxTemperatura, null);
  assert.equal(result.nPrecipitacion, 12);
});
