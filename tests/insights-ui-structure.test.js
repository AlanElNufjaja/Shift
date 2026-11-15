import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('nuevo panel conectado al flujo existente del mapa y prioridad', () => {
  const app = leer('../src/App.jsx');
  assert.match(app, /<TerritorialInsights/);
  assert.match(app, /prioridad=\{prioridad\}/);
  assert.match(app, /setMesGeo\(nuevoMes\)/);
  assert.match(app, /setCapaGeo\('humedad'\)/);
  assert.match(app, /<MapView/);
  assert.match(app, /<DiagnosticCard/);
  assert.match(app, /<StrategyComparison/);
});

test('navegación en Topbar incluye señales y ancla navegable', () => {
  const topbar = leer('../src/components/layout/Topbar.jsx');
  const insights = leer('../src/components/insights/TerritorialInsights.jsx');
  assert.match(leer('../src/lib/flowNavigation.js'), /'senales'/);
  assert.match(topbar, /PASOS/);
  assert.match(insights, /id="senales-avanzado"/);
  assert.match(insights, /href="#detalle-terreno"/);
  assert.match(insights, /aria-pressed/);
  assert.match(insights, /Data quality/);
});

test('no se reemplazó mapa OSM por proveedor de pago', () => {
  assert.match(leer('../src/components/MapView.jsx'), /tile\.openstreetmap\.org/);
  assert.doesNotMatch(leer('../src/components/MapView.jsx'), /apiKey|accessToken/);
});
