import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarEntregableP1, MAX_IMPORT_BYTES } from '../src/lib/parcelDataIntake.js';
const demos = JSON.parse(readFileSync(new URL('../src/data/parcelas.json', import.meta.url), 'utf8'));

test('acepta el contrato demo sin certificarlo como dato real', () => {
  const output = validarEntregableP1(demos);
  assert.equal(output.valido, true);
  assert.equal(output.count, 3);
  assert.ok(output.avisos.some((warn) => warn.includes('sources and periods')));
});

test('rechaza raíz incorrecta e ids repetidos sin alterar el proyecto', () => {
  assert.equal(validarEntregableP1({ foo: [] }).valido, false);
  const copy = structuredClone(demos);
  copy[1].id = copy[0].id;
  const result = validarEntregableP1(copy);
  assert.equal(result.valido, false);
  assert.ok(result.errores.some((e) => e.includes('duplicate')));
});

test('rechaza mes duplicado, humedad fuera de escala y geometrías inválidas', () => {
  const copy = structuredClone(demos);
  copy[0].lat = 109;
  copy[0].clima_mensual[1].mes = copy[0].clima_mensual[0].mes;
  copy[0].clima_mensual[2].humedad_smap_pct = 105;
  const result = validarEntregableP1(copy);
  assert.ok(result.errores.some((e) => e.includes('coordinates')));
  assert.ok(result.errores.some((e) => e.includes('repeated')));
  assert.ok(result.errores.some((e) => e.includes('outside the 0')));
});

test('acepta faltantes null, señala sentinela -999 sin convertirlo a cero', () => {
  const copy = structuredClone(demos);
  copy[0].clima_mensual[0].temp_max_c = null;
  copy[0].clima_mensual[1].temp_max_c = -999;
  const result = validarEntregableP1(copy);
  assert.equal(result.valido, true);
  assert.ok(result.avisos.some((e) => e.includes('-999')));
});

test('permite formato objeto {parcelas} y limita el tamaño de carga', () => {
  const result = validarEntregableP1({ parcelas: [demos[0]] });
  assert.equal(result.valido, true);
  assert.equal(MAX_IMPORT_BYTES, 2 * 1024 * 1024);
});
