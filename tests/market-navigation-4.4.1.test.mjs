import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolverAncla } from '../src/lib/flowNavigation.js';

const src = new URL('../src/', import.meta.url);
const read = (name) => readFileSync(new URL(name, src), 'utf8');

test('USDA Market News has direct routes for current and descriptive URLs', () => {
  for (const hash of ['#detalle-market', '#market-prices']) {
    const route = resolverAncla(hash);
    assert.equal(route?.vista, 'laboratorio');
    assert.equal(route?.tab, 'market');
  }
});

test('farmer My Options links directly to USDA prices', () => {
  const farmer = read('components/overview/FarmerChoices.jsx');
  assert.match(farmer, /Explore USDA market prices/);
  assert.match(farmer, /irADatos\('market'\)/);
  assert.match(farmer, /Research only; estimates above do not change/);
});

test('advanced center has a clearly visible market shortcut, tab and content', () => {
  const ui = read('components/data/DataWorkbench.jsx');
  assert.match(ui, /Open USDA Market News price references/);
  assert.match(ui, /onClick=\{\(\) => irADatos\('market'\)\}/);
  assert.match(ui, /id: 'market', titulo: 'Market News'/);
  assert.match(ui, /id="detalle-market" hidden=\{tab !== 'market'\}/);
  assert.match(ui, /<MarketEvidencePanel\/>/);
});

test('the public browser title and advanced label identify 4.5', () => {
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /Field Shift 4\.5/);
  assert.match(read('components/data/DataWorkbench.jsx'), /Field Shift v4\.5/);
});
