import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
test('El recorrido conserva mapa y análisis; Centro de datos conserva POWER, P1 y P2', () => {
  const ui = read('../src/App.jsx');
  const workbench = read('../src/components/data/DataWorkbench.jsx');
  for (const nombre of ['MapView', 'DiagnosticCard', 'TerritorialInsights', 'StrategyComparison']) {
    assert.match(ui, new RegExp(`<${nombre}`));
  }
  assert.match(ui, /<DataWorkbench/);
  for (const nombre of ['PowerDataPanel', 'DataIntakePanel', 'EvidenceReviewPanel', 'P2RecommendationPanel']) {
    assert.match(workbench, new RegExp(`<${nombre}`));
  }
});
test('P2 usa FieldContext y no reemplaza P1', () => {
  const c = read('../src/context/FieldContext.jsx');
  assert.match(c, /ACTIVAR_RECOMENDACIONES_P2/);
  assert.match(c, /DESCARTAR_RECOMENDACIONES_P2/);
  assert.match(c, /ACTIVAR_EVIDENCIAS_P1/);
});
test('API mantiene contrato de P2, desactiva solicitudes anteriores y valida respuestas', () => {
  const hook = read('../src/hooks/useStrategies.js');
  assert.match(hook, /parcela_id: parcelaId, prioridad/);
  assert.match(hook, /AbortController/);
  assert.match(hook, /validarRespuestaP2/);
  assert.match(hook, /remoto\.clave !== clave/);
});
test('estrategias P2 y CSV identifican su fuente no auditada', () => {
  const componente = read('../src/components/StrategyComparison.jsx');
  const simulator = read('../src/lib/strategySimulator.js');
  assert.match(componente, /P2 declared · not audited/);
  assert.match(simulator, /Imported P2, NOT AUDITED/);
});
