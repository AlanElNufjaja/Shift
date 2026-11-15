import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(resolve(root, file), 'utf8');

test('NASA chart and summary import the English month formatter', () => {
  for (const file of ['src/components/data/PowerDataPanel.jsx', 'src/components/data/PowerDiagnosticSummary.jsx']) {
    const source = read(file);
    assert.match(source, /import\s*\{\s*displayMonth\s*\}\s*from\s*['"]\.\.\/\.\.\/lib\/displayEnglish\.js['"]/);
    assert.ok((source.match(/\bdisplayMonth\b/g) || []).length >= 2);
  }
});

test('advanced NASA error stays inside the section, not a blank SPA', () => {
  assert.match(read('src/main.jsx'), /<ErrorBoundary[^>]*>/);
  const advanced = read('src/components/data/DataWorkbench.jsx');
  assert.match(advanced, /title="NASA POWER panel could not be displayed\."/);
  assert.match(advanced, /title="The detailed assessment could not be displayed\."/);
  assert.match(read('src/components/ui/ErrorBoundary.jsx'), /Try again/);
});

test('P1 and P2 fictional example download paths point to real public files', () => {
  for (const file of ['src/components/data/DataIntakePanel.jsx', 'src/components/strategy/P2RecommendationPanel.jsx']) {
    const source = read(file);
    const paths = [...source.matchAll(/href="(\/[^"\s]+\.json)"/g)].map((m) => m[1]);
    assert.ok(paths.length, `no JSON downloads found in ${file}`);
    for (const publicPath of paths) {
      assert.ok(existsSync(resolve(root, 'public', publicPath.slice(1))), `broken download ${publicPath}`);
    }
  }
});

test('screenshot strings are translated for the public UI', () => {
  const files = [
    'src/components/strategy/DecisionBrief.jsx',
    'src/components/strategy/DeltaSummary.jsx',
    'src/components/insights/TerritorialInsights.jsx',
    'src/components/data/DataWorkbench.jsx',
    'src/components/data/PowerDataPanel.jsx',
  ];
  const all = files.map(read).join('\n');
  for (const phrase of ['Copiar ficha', 'Evidencia y procedencia', 'Regla explicable', 'Evidencia disponible', 'Trazabilidad de fuentes', 'Coincidencia</span>', 'Δ frente a la base', 'Strategys', 'Terreno y capas']) {
    assert.ok(!all.includes(phrase), `untranslated UI text: ${phrase}`);
  }
  assert.match(read('index.html'), /<html lang="en">/);
});

test('original data protocols and year/month identifiers are unchanged', () => {
  const parcel = JSON.parse(read('src/data/parcelas.json'))[0];
  assert.equal(parcel.clima_mensual[0].mes, 'Enero');
  assert.ok(Object.hasOwn(parcel, 'suelo_ssurgo'));
  const p1 = JSON.parse(read('public/ejemplo-p1-FICTICIO.json'));
  const p2 = JSON.parse(read('public/ejemplo-p2-FICTICIO.json'));
  assert.equal(p1.tipo_dato, 'demo');
  assert.equal(p2.tipo_dato, 'demo');
  assert.equal(p2.resultados[0].prioridad, 'agua');
});

test('sidebar keyboard focus trap uses defined variable', () => {
  const sidebar = read('src/components/Sidebar.jsx');
  assert.match(sidebar, /\.filter\(\(elemento\) => elemento\.offsetParent !== null\)/);
});
