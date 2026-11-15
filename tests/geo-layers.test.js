import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAPAS, MESES, datoGeografico, escalaVisual, descripcionLeyenda } from '../src/lib/geoLayers.js';

const parcelas = JSON.parse(readFileSync(new URL('../src/data/parcelas.json', import.meta.url), 'utf8'));

test('las cinco capas están definidas, cuatro corresponden a datos del contrato', () => {
  assert.deepEqual(CAPAS.map((capa) => capa.id), ['general', 'humedad', 'temperatura', 'erosion', 'sueloDesnudo']);
  assert.equal(MESES.length, 12);
  assert.equal(new Set(MESES).size, 12);
});

test('humedad, temperatura y suelo se leen desde el JSON por parcela y mes', () => {
  const fresno = parcelas[0];
  assert.equal(datoGeografico(fresno, 'humedad', 'Julio').valor, 13);
  assert.equal(datoGeografico(fresno, 'humedad', 'Julio').etiqueta, '13.0 %');
  assert.equal(datoGeografico(fresno, 'temperatura', 'Julio').valor, 39);
  assert.equal(datoGeografico(fresno, 'erosion', 'Julio').etiqueta, 'Medium');
  assert.notEqual(datoGeografico(parcelas[1], 'humedad', 'Julio').valor, 13);
});

test('un mes inexistente o un valor sentinela no aparece como cero', () => {
  const fresno = parcelas[0];
  assert.equal(datoGeografico(fresno, 'humedad', 'Mes inválido').etiqueta, 'No data');
  const parcial = { ...fresno, clima_mensual: [{ mes: 'Julio', humedad_smap_pct: -999, temp_max_c: null }] };
  assert.equal(datoGeografico(parcial, 'humedad', 'Julio').disponible, false);
  assert.equal(datoGeografico(parcial, 'temperatura', 'Julio').disponible, false);
  assert.equal(datoGeografico({ ...fresno, suelo_ssurgo: {} }, 'erosion').etiqueta, 'No data');
});

test('buscar registros por nombre de mes permite series desordenadas', () => {
  const ejemplo = { clima_mensual: [{ mes: 'Julio', temp_max_c: 31 }, { mes: 'Enero', temp_max_c: 9 }] };
  assert.equal(datoGeografico(ejemplo, 'temperatura', 'Julio').valor, 31);
  assert.equal(datoGeografico(ejemplo, 'temperatura', 'Enero').valor, 9);
});

test('suelo no señalado no se declara confirmado como cubierto', () => {
  const fresno = parcelas[0];
  assert.equal(datoGeografico(fresno, 'sueloDesnudo', 'Julio').etiqueta, 'Bare soil indicated');
  const diciembre = datoGeografico(fresno, 'sueloDesnudo', 'Diciembre');
  assert.equal(diciembre.etiqueta, 'Not marked');
  assert.match(diciembre.detalle, /unverified/i);
  assert.equal(datoGeografico({ ...fresno, meses_suelo_desnudo: undefined }, 'sueloDesnudo').etiqueta, 'No data');
});

test('gradientes son escalas gráficas acotadas, no umbrales de riesgo', () => {
  assert.equal(escalaVisual('humedad', -5).proporcion, 0);
  assert.equal(escalaVisual('humedad', 100).proporcion, 1);
  assert.equal(escalaVisual('temperatura', 45).proporcion, 1);
  assert.equal(escalaVisual('temperatura', NaN), null);
  assert.match(descripcionLeyenda('humedad').nota, /do not indicate water stress/i);
  assert.match(descripcionLeyenda('temperatura').nota, /not a heat warning/i);
});

test('cada punto real del demo dispone de datos para los meses existentes', () => {
  for (const parcela of parcelas) {
    for (const mes of MESES) {
      assert.equal(datoGeografico(parcela, 'humedad', mes).disponible, true);
      assert.equal(datoGeografico(parcela, 'temperatura', mes).disponible, true);
      assert.equal(datoGeografico(parcela, 'sueloDesnudo', mes).disponible, true);
    }
  }
});
