import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GIBS_SMAP_WMS, SMAP_PRODUCTS, validSmapDate, smapLayerConfig } from '../src/lib/smapImagery.js';
import { resolverAncla } from '../src/lib/flowNavigation.js';

test('SMAP GIBS endpoint is HTTPS and distinct from NASA POWER numerical API', () => {
  assert.match(GIBS_SMAP_WMS, /^https:\/\/gibs\.earthdata\.nasa\.gov\/wms\/epsg3857\/best\/wms\.cgi$/);
  assert.equal(Object.keys(SMAP_PRODUCTS).length, 2);
  assert.match(SMAP_PRODUCTS.day.layer, /SMAP_L3_Passive_Enhanced_Day_Soil_Moisture/);
});
test('SMAP dates must be calendar-valid and within mission range', () => {
  assert.equal(validSmapDate('2015-03-30','2026-11-14'), false);
  assert.equal(validSmapDate('2015-03-31','2026-11-14'), true);
  assert.equal(validSmapDate('2024-02-29','2026-11-14'), true);
  assert.equal(validSmapDate('2024-02-30','2026-11-14'), false);
  assert.equal(validSmapDate('2027-01-01','2026-11-14'), false);
});
test('WMS parameters use actual NASA GIBS layers; invalid pass rejected', () => {
  const p = smapLayerConfig('day','2024-07-15');
  assert.equal(p.layers, SMAP_PRODUCTS.day.layer);
  assert.equal(p.format,'image/png');
  assert.equal(p.time,'2024-07-15');
  assert.throws(()=>smapLayerConfig('unknown','2024-07-15'));
});
test('advanced link navigates directly to SMAP without changing farmer journey', () => {
  assert.deepEqual(resolverAncla('#detalle-smap'),{vista:'laboratorio',tab:'smap',ancla:'detalle-smap'});
  const farmer=readFileSync('src/components/overview/FarmerSituation.jsx','utf8');
  assert.match(farmer,/irADatos\('smap'\)/);
});
test('SMAP imagery cannot be treated as numerical values or used to change simulated strategies',()=>{
  const component=readFileSync('src/components/data/SmapImageryPanel.jsx','utf8');
  assert.match(component,/not a numerical point measurement/);
  assert.match(component,/does not modify the assessment/);
  const app=readFileSync('src/App.jsx','utf8');
  assert.doesNotMatch(app, /smapImagery.*estrategias/i);
});
