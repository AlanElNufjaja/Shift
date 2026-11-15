import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('un PowerProvider compartido conecta resumen, diagnóstico y panel de consulta', () => {
  const app = file('App.jsx');
  assert.match(app, /PowerProvider key=\{`\$\{parcela.id\}:\$\{parcela.lat\}:\$\{parcela.lon\}`\}/);
  for (const path of ['components/overview/ParcelOverview.jsx', 'components/DiagnosticCard.jsx', 'components/data/PowerDataPanel.jsx']) {
    assert.match(file(path), /usePower|PowerDiagnosticSummary/);
  }
});

test('el resumen y el diagnóstico distinguen clima NASA del gráfico combinado DEMO', () => {
  const diagnostics = file('components/DiagnosticCard.jsx');
  assert.match(diagnostics, /PowerDiagnosticSummary/);
  assert.match(diagnostics, /DEMO monthly series/);
  assert.match(diagnostics, /NASA POWER · DEMO/);
});

test('importación de P1 solo genera vista previa y no sobreescribe FieldContext', () => {
  const intake = file('components/data/DataIntakePanel.jsx');
  assert.match(intake, /validarEntregableP1/);
  assert.match(intake, /file\.text\(/);
  assert.doesNotMatch(intake, /seleccionarParcela|fetch\(/);
  assert.match(file('App.jsx'), /DataWorkbench/);
  assert.match(file('components/data/DataWorkbench.jsx'), /<DataIntakePanel/);
});
