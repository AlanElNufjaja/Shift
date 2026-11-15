import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? walk(join(dir, x.name)) : [join(dir, x.name)]);
}

test('todos los imports relativos JS/JSX/CSS/JSON apuntan a archivos existentes', () => {
  for (const file of walk(join(root, 'src')).filter((f) => ['.jsx', '.js'].includes(extname(f)))) {
    const code = readFileSync(file, 'utf8');
    const matches = code.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g);
    for (const match of matches) {
      assert.ok(existsSync(resolve(dirname(file), match[1])), `${file}: falta ${match[1]}`);
    }
  }
});

test('App conserva mapa, diagnóstico, estrategias y contexto compartido', () => {
  const app = read('src/App.jsx');
  for (const component of ['AppShell', 'ParcelOverview', 'MapView', 'ParcelInfoPanel', 'DiagnosticCard', 'StrategyComparison']) {
    assert.ok(app.includes(`<${component}`), `Componente ${component} ausente de App`);
  }
  assert.match(read('src/context/FieldContext.jsx'), /SELECCIONAR_PARCELA/);
  assert.match(read('src/context/FieldContext.jsx'), /SELECCIONAR_PRIORIDAD/);
});

test('mapa gratuito y anclas funcionales acordadas', () => {
  const map = read('src/components/MapView.jsx');
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /Show all/);
  assert.match(map, /seleccionarParcela/);
  const top = read('src/components/layout/Topbar.jsx');
  const rutas = read('src/lib/flowNavigation.js');
  assert.match(top, /PASOS/);
  for (const id of ['resumen', 'mapa', 'diagnostico', 'strategies']) {
    assert.ok(rutas.includes(`'${id}'`), `Falta la ruta antigua ${id}`);
  }
});
