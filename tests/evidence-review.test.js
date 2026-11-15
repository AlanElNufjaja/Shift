import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { revisarCruceClimatico, revisarDiferencias } from '../src/lib/evidenceReview.js';
import { prepararEntregableP1 } from '../src/lib/multiSourceIntake.js';
import parcelas from '../src/data/parcelas.json' with { type: 'json' };

const fresno = parcelas.find((p) => p.id === 'fresno-01');
const ejemplo = JSON.parse(readFileSync(new URL('../public/ejemplo-p1-FICTICIO.json', import.meta.url), 'utf8'));
const originales = Object.fromEntries(parcelas.map((p) => [p.id, { lat: p.lat, lon: p.lon }]));
const entrega = prepararEntregableP1(ejemplo, parcelas.map((p) => p.id), originales);
const p1 = entrega.porParcela['fresno-01'];
const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const power = (year = 2025) => ({ status: 'success', year, datos: {
  year, serie: months.map((mes, i) => ({ mes, temperatura: i === 6 ? 39 : 26 })),
}});
const vigente = () => ({ ...p1, modoEjemplo: false });

test('el ejemplo P1 es elegible, pero permanece explícitamente ficticio', () => {
  assert.equal(entrega.valido, true);
  assert.equal(p1.modoEjemplo, true);
});

test('sin datos importados, no inventa filas ni cambios', () => {
  const result = revisarDiferencias(fresno, null);
  assert.equal(result.disponible, false);
  assert.equal(result.indicadores.length, 0);
});

test('la comparación enseña cambio visible en materia orgánica, con mismo dato demo intacto', () => {
  const demoAntes = fresno.suelo_ssurgo.materia_organica_pct;
  const result = revisarDiferencias(fresno, p1);
  const fila = result.indicadores.find((item) => item.key === 'materia');
  assert.equal(fila.demo, demoAntes);
  assert.equal(fila.importado, p1.ssurgo.suelo.materia_organica_pct);
  assert.equal(fila.diferente, demoAntes !== fila.importado);
  assert.equal(fresno.suelo_ssurgo.materia_organica_pct, demoAntes);
});

test('humedad compara doce meses visualmente sin inventar meses', () => {
  const result = revisarDiferencias(fresno, p1);
  assert.equal(result.mensual.length, 12);
  assert.equal(result.anioSmap, 2025);
  assert.equal(result.mensual[0].mes, 'Enero');
});

test('dos valores iguales no se etiquetan como diferentes', () => {
  const s = revisarDiferencias(fresno, { ssurgo: { suelo: { textura: fresno.suelo_ssurgo.textura } } });
  assert.equal(s.indicadores[0].diferente, false);
});

test('sin observaciones P1, el cruce queda bloqueado', () => {
  assert.equal(revisarCruceClimatico({ parcela: fresno, evidencia: null, power: power() }).codigo, 'sin-importar');
});

test('el archivo marcado demo nunca genera coincidencias científicas', () => {
  const result = revisarCruceClimatico({ parcela: fresno, evidencia: p1, power: power() });
  assert.equal(result.listo, false);
  assert.equal(result.codigo, 'ficticio');
});

test('un año distinto bloquea el cruce', () => {
  assert.equal(revisarCruceClimatico({ parcela: fresno, evidencia: vigente(), power: power(2024) }).codigo, 'anio');
});

test('sin consulta POWER el cruce queda bloqueado', () => {
  assert.equal(revisarCruceClimatico({ parcela: fresno, evidencia: vigente(), power: { status: 'idle' } }).codigo, 'sin-power');
});

test('coordenadas P1 diferentes bloquean el cruce', () => {
  const evidence = { ...vigente(), coordenadasP1: { lat: 40.8, lon: -120 } };
  assert.equal(revisarCruceClimatico({ parcela: fresno, evidencia: evidence, power: power() }).codigo, 'coordenadas');
});

test('coincidencias se cuentan por pares reales y no por meses incompletos', () => {
  const evidence = vigente();
  const smap = { ...evidence.smap, serie: evidence.smap.serie.map((r) => ({ ...r, humedad: r.mes === 'Julio' ? 10 : null })) };
  const result = revisarCruceClimatico({ parcela: fresno, evidencia: { ...evidence, smap }, power: power() });
  assert.equal(result.listo, true);
  assert.equal(result.nPares, 1);
  assert.equal(result.nCoincidencias, 1);
  assert.equal(result.meses.filter(m => m.coincide).length, 1);
  assert.equal(result.sinDatos.length, 11);
});

test('no inferir estrés de cultivo: solo pares que superan las referencias', () => {
  const evidence = vigente();
  const smap = { ...evidence.smap, serie: evidence.smap.serie.map((r) => ({ ...r, humedad: 25 })) };
  const result = revisarCruceClimatico({ parcela: fresno, evidencia: { ...evidence, smap }, power: power() });
  assert.equal(result.nCoincidencias, 0);
  assert.equal(result.nPares, 12);
});

test('ningún mes emparejado produce estado sin-pares, no un cero de riesgos', () => {
  const evidence = vigente();
  const smap = { ...evidence.smap, serie: evidence.smap.serie.map((r) => ({ ...r, humedad: null })) };
  const result = revisarCruceClimatico({ parcela: fresno, evidencia: { ...evidence, smap }, power: power() });
  assert.equal(result.listo, false);
  assert.equal(result.codigo, 'sin-pares');
});

test('el nuevo panel conserva comparación y se accede desde Centro de datos', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const workbench = readFileSync(new URL('../src/components/data/DataWorkbench.jsx', import.meta.url), 'utf8');
  const navigation = readFileSync(new URL('../src/lib/flowNavigation.js', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/components/data/EvidenceReviewPanel.jsx', import.meta.url), 'utf8');
  assert.match(app, /<DataWorkbench/);
  for (const component of ['MapView', 'DiagnosticCard', 'StrategyComparison']) assert.match(app, new RegExp(`<${component}\\b`));
  for (const component of ['EvidenceReviewPanel', 'MultiSourceEvidencePanel', 'PowerDataPanel', 'DataIntakePanel']) assert.match(workbench, new RegExp(`<${component}\\b`));
  assert.match(navigation, /comparacion-fuentes/);
  assert.match(panel, /Demo vs. imported file/);
});
