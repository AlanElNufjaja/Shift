import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const data = readFileSync(new URL('../src/components/data/PowerDataPanel.jsx', import.meta.url), 'utf8');
const workbench = readFileSync(new URL('../src/components/data/DataWorkbench.jsx', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/hooks/usePowerMonthly.js', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

test('Fase 2.4 integra NASA POWER sin retirar mapa, diagnóstico ni estrategias', () => {
  for (const s of ['<MapView', '<ParcelInfoPanel', '<DiagnosticCard', '<TerritorialInsights', '<StrategyComparison']) assert.ok(app.includes(s), `Falta ${s}`);
  assert.match(app, /<DataWorkbench/);
  assert.match(workbench, /<PowerDataPanel/);
});

test('Consulta explícita; los gráficos y estrategias demo no se sobrescriben', () => {
  assert.match(data, /onClick=\{\(\) => consultar/);
  assert.match(data, /synthetic demo scenarios/i);
  assert.match(data, /id="datos"/);
  assert.doesNotMatch(app, /setParcela.*datos/);
});

test('Hook cancela en cambio de parcela y protege disponibilidad con timeout', () => {
  assert.match(hook, /requestRef\.current\?\.abort\(\)/);
  assert.match(hook, /setTimeout\(/);
  assert.match(hook, /cache = new Map\(\)/);
});

test('Vite configura proxy sin claves de mapa ni secretos NASA', () => {
  assert.match(vite, /power\.larc\.nasa\.gov/);
  assert.match(vite, /\/nasa-power/);
  assert.doesNotMatch(vite, /apiKey|MAPBOX_TOKEN/);
});
