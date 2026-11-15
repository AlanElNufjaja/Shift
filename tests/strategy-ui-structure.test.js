import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

test('App conserva mapa, señales, diagnóstico y comparador 2.3', () => {
  const app = leer('../src/App.jsx');
  for (const etiqueta of ['MapView', 'ParcelInfoPanel', 'TerritorialInsights', 'DiagnosticCard', 'StrategyComparison']) {
    assert.match(app, new RegExp(`<${etiqueta}`));
  }
  assert.match(app, /parcela=\{parcela\} estrategias=\{estrategias\}/);
  assert.match(app, /key=\{`\$\{parcela\.id\}:\$\{prioridad\}`\}/);
});

test('comparador ofrece sensibilidad y diferencias con selector explícito', () => {
  const ui = leer('../src/components/StrategyComparison.jsx');
  assert.match(ui, /<ScenarioControls/);
  assert.match(ui, /<DeltaSummary/);
  assert.match(ui, /aria-pressed=\{seleccionada\}/);
  assert.match(ui, /Export CSV/);
  assert.match(ui, /ajustePorPrioridad/);
});

test('sensibilidad no modifica cobertura ni el nitrógeno de forma artificial', () => {
  const lib = leer('../src/lib/strategySimulator.js');
  assert.match(lib, /nitrogeno_kg_acre: numeroSeguro/);
  assert.doesNotMatch(lib, /cobertura_mensual: .*map/);
});
