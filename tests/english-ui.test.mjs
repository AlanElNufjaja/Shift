import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { displayMonth, displayTerm } from '../src/lib/displayEnglish.js';
import { datoGeografico } from '../src/lib/geoLayers.js';
const read = (url) => readFileSync(new URL(url, import.meta.url), 'utf8');

const parcels = JSON.parse(read('../src/data/parcelas.json'));
const strategies = JSON.parse(read('../src/data/estrategias_demo.json'));

test('US English document language and main journey labels', () => {
  assert.match(read('../index.html'), /<html lang="en">/);
  const journey = read('../src/components/layout/JourneyHeader.jsx');
  assert.match(journey, /Which field would you like to explore\?/);
});

test('internal month and coverage codes stay compatible but display in English', () => {
  assert.equal(displayMonth('Julio'), 'July');
  assert.equal(displayTerm('Desnudo'), 'Bare soil');
  assert.equal(displayTerm('Franco-arcilloso'), 'Clay loam');
  assert.equal(parcels[0].clima_mensual[0].mes, 'Enero');
  assert.equal(strategies['fresno-01'][0].cobertura_mensual[5], 'Desnudo');
});

test('map label and fictitious sample scenarios appear in English', () => {
  assert.equal(datoGeografico(parcels[0], 'erosion').etiqueta, 'Medium');
  assert.equal(datoGeografico(parcels[0], 'sueloDesnudo', 'Julio').etiqueta, 'Bare soil indicated');
  assert.equal(parcels[0].nombre, 'South Fresno Field');
  assert.equal(strategies['fresno-01'][1].titulo, 'Water resilience');
});
