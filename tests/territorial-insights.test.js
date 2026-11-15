import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analizarTerritorio, calendarioTerritorial, descripcionMes, UMBRALES_EXPLORATORIOS } from '../src/lib/territorialInsights.js';

const parcelas = JSON.parse(readFileSync(new URL('../src/data/parcelas.json', import.meta.url), 'utf8'));
const [fresno, bakersfield, davis] = parcelas;

test('umbrales exploratorios explicitos y estrictos, no clasificacion oficial', () => {
  assert.equal(UMBRALES_EXPLORATORIOS.humedadMenorPct, 15);
  assert.equal(UMBRALES_EXPLORATORIOS.temperaturaMayorC, 35);
  const serie = calendarioTerritorial({ clima_mensual: [
    { mes: 'Julio', temp_max_c: 35, humedad_smap_pct: 14 },
    { mes: 'Agosto', temp_max_c: 36, humedad_smap_pct: 15 },
    { mes: 'Septiembre', temp_max_c: 36, humedad_smap_pct: 14 },
  ] });
  assert.equal(serie.find(x => x.mes === 'Julio').coincidencia, false);
  assert.equal(serie.find(x => x.mes === 'Agosto').coincidencia, false);
  assert.equal(serie.find(x => x.mes === 'Septiembre').coincidencia, true);
});

test('las tres parcelas generan señales diferentes a partir del JSON', () => {
  assert.deepEqual(analizarTerritorio(fresno).mesesCoincidentes, ['Julio', 'Agosto']);
  assert.deepEqual(analizarTerritorio(bakersfield).mesesCoincidentes, ['Junio', 'Julio', 'Agosto']);
  assert.deepEqual(analizarTerritorio(davis).mesesCoincidentes, []);
  assert.deepEqual(analizarTerritorio(fresno).solapamiento, ['Julio', 'Agosto']);
  assert.equal(analizarTerritorio(bakersfield).senales.find(x => x.id === 'erosion').estado, 'atencion');
  assert.equal(analizarTerritorio(davis).senales.find(x => x.id === 'rotacion').estado, 'sin-senal');
});

test('faltantes -999 no forman coincidencias y generan aviso de insuficiencia', () => {
  const parcial = {
    clima_mensual: [
      { mes: 'Marzo', temp_max_c: 40, humedad_smap_pct: -999 },
      { mes: 'Abril', temp_max_c: null, humedad_smap_pct: 8 },
      { mes: 'Mayo', temp_max_c: 34, humedad_smap_pct: 9 },
    ],
  };
  const resultado = analizarTerritorio(parcial);
  assert.equal(resultado.mesesEvaluables, 1);
  assert.deepEqual(resultado.mesesCoincidentes, []);
  assert.equal(resultado.senales.find(x => x.id === 'coincidencia').estado, 'insuficiente');
  assert.equal(resultado.senales.find(x => x.id === 'cobertura').estado, 'insuficiente');
  assert.equal(resultado.senales.find(x => x.id === 'rotacion').estado, 'insuficiente');
  assert.equal(resultado.senales.find(x => x.id === 'erosion').estado, 'insuficiente');
  assert.match(descripcionMes(resultado.calendario[2]), /No data/);
});

test('cobertura no senalada no significa suelo cubierto', () => {
  const cal = calendarioTerritorial({ meses_suelo_desnudo: ['Agosto'] });
  assert.equal(cal.find(x => x.mes === 'Julio').sueloDesnudo, false);
  assert.match(descripcionMes(cal.find(x => x.mes === 'Julio')), /cover unknown/);
  assert.equal(cal.find(x => x.mes === 'Agosto').sueloDesnudo, true);
  assert.equal(cal.find(x => x.mes === 'Junio').evaluable, false);
  assert.equal(calendarioTerritorial({})[0].sueloDesnudo, null);
});

test('el calendario se alinea por nombre de mes aun con serie desordenada e incompleta', () => {
  const cal = calendarioTerritorial({ clima_mensual: [
    { mes: 'Septiembre', temp_max_c: 41, humedad_smap_pct: 10 },
    { mes: 'Enero', temp_max_c: 12, humedad_smap_pct: 28 },
  ] });
  assert.equal(cal.length, 12);
  assert.equal(cal[0].mes, 'Enero');
  assert.equal(cal[8].mes, 'Septiembre');
  assert.equal(cal[8].coincidencia, true);
  assert.equal(cal[6].humedad, null);
});

test('prioridad modifica el orden de los empates sin modificar datos originales', () => {
  const original = structuredClone(fresno);
  const agua = analizarTerritorio(fresno, 'agua');
  const suelo = analizarTerritorio(fresno, 'suelo');
  assert.deepEqual(fresno, original);
  assert.equal(agua.senales.length, 4);
  assert.equal(suelo.senales.length, 4);
  assert.deepEqual(new Set(agua.senales.map(x => x.id)), new Set(suelo.senales.map(x => x.id)));
  assert.equal(agua.senales.find(x => x.id === 'coincidencia').metrica, '2 months');
});
