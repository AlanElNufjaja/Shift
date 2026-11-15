import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');

test('el mapa incluye controles, leyenda y comparación sin proveedor de pago', () => {
  const mapa = read('src/components/MapView.jsx');
  for (const tag of ['GeoLayerToolbar', 'GeoLegend', 'GeoComparison', 'CircleMarker', 'TileLayer']) {
    assert.ok(mapa.includes(tag), `Falta ${tag}`);
  }
  assert.match(mapa, /tile\.openstreetmap\.org/);
  assert.match(mapa, /interactive=\{false\}/);
  assert.doesNotMatch(mapa, /mapboxgl|maptiler|api_key=/i);
});

test('capas y mes se elevan a App, la parcela sigue en FieldContext', () => {
  const app = read('src/App.jsx');
  assert.match(app, /useState\('general'\)/);
  assert.match(app, /useState\('Julio'\)/);
  assert.match(app, /<ParcelInfoPanel parcela=\{parcela\} capa=\{capaGeo\} mes=\{mesGeo\}/);
  assert.match(read('src/components/MapView.jsx'), /useField\(\)/);
  assert.match(read('src/components/map/GeoComparison.jsx'), /onSeleccionar\(parcela\.id\)/);
});

test('la UI informa el alcance demostrativo y evita interpretar cobertura no verificada', () => {
  const toolbar = read('src/components/map/GeoLayerToolbar.jsx');
  const leyenda = read('src/lib/geoLayers.js');
  assert.match(toolbar, /Demo data/);
  assert.match(toolbar, /Unspecified year/);
  assert.match(leyenda, /Not marked does not mean vegetation cover/);
  assert.match(read('src/components/MapView.jsx'), /not measured surfaces or parcel boundaries/);
});
