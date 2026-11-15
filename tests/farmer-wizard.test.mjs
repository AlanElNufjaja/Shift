import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import parcelas from '../src/data/parcelas.json' with { type: 'json' };
import estrategias from '../src/data/estrategias_demo.json' with { type: 'json' };
import { resumirSituacion, resumirOpciones } from '../src/lib/farmerSummary.js';
import { resolverAncla } from '../src/lib/flowNavigation.js';

const codigo = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('tres pasos sencillos y seis pestañas avanzadas conservan sus rutas', () => {
  for (const [ancla, tab] of Object.entries({
    'detalle-terreno': 'terreno', 'detalle-diagnostico': 'diagnostico',
    'detalle-estrategias': 'estrategias', datos: 'nasa', integracion: 'p1', 'motor-p2': 'p2',
  })) {
    assert.equal(resolverAncla(ancla).tab, tab);
    assert.equal(resolverAncla(ancla).vista, 'laboratorio');
  }
  assert.equal(resolverAncla('#etapa-1').paso, 0);
  assert.equal(resolverAncla('#etapa-2').paso, 1);
  assert.equal(resolverAncla('#etapa-3').paso, 2);
});

test('resumen de situación no inventa mediciones nuevas y limita a tres señales', () => {
  for (const p of parcelas) {
    const resultado = resumirSituacion(p, 'agua');
    assert.ok(resultado.principales.length <= 3);
    assert.ok(resultado.principales.length > 0);
    assert.ok(resultado.principales.every(s => typeof s.textoCorto === 'string' && s.textoCorto.length > 10));
    assert.ok(resultado.principales.every(s => resultado.senales.some(original => original.id === s.id)));
  }
});

test('paso de opciones compara fuente actual y no declara ganador con empate', () => {
  const lista = estrategias[parcelas[0].id];
  const agua = resumirOpciones(lista, 'agua');
  assert.ok(agua.base);
  assert.ok(agua.destacada);
  assert.equal(agua.agua.absoluta, agua.destacada.agua_mm - agua.base.agua_mm);
  assert.equal(resumirOpciones([], 'agua').destacada, null);
  const empate = lista.map((x) => ({ ...x, agua_mm: 400 }));
  assert.equal(resumirOpciones(empate, 'agua').destacada, null);
});

test('se ocultan visualizaciones científicas en el asistente pero no se eliminan', () => {
  const app = codigo('src/App.jsx');
  assert.match(app, /<FarmerLand/);
  assert.match(app, /<FarmerSituation/);
  assert.match(app, /<FarmerChoices/);
  assert.match(app, /<DataWorkbench/);
  assert.match(app, /hidden=\{vista !== 'laboratorio'\}/);
  const shell = codigo('src/components/layout/AppShell.jsx');
  assert.doesNotMatch(shell, /<Sidebar/);
  const map = codigo('src/components/MapView.jsx');
  assert.match(map, /!simple && <GeoLayerToolbar/);
  assert.match(map, /tile\.openstreetmap\.org/);
  const workbench = codigo('src/components/data/DataWorkbench.jsx');
  for (const panel of ['PowerDataPanel', 'DataIntakePanel', 'EvidenceReviewPanel', 'MultiSourceEvidencePanel', 'P2RecommendationPanel']) {
    assert.match(workbench, new RegExp(`<${panel}`));
  }
});
