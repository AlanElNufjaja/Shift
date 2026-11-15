import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { construirImpacto, construirProcedenciaDecision, crearFichaDecision } from '../src/lib/decisionBrief.js';
import { simularEstrategias } from '../src/lib/strategySimulator.js';

const demo = JSON.parse(readFileSync(new URL('../src/data/estrategias_demo.json', import.meta.url), 'utf8'));
const [base, agua, regen] = demo['fresno-01'];
const parcela = { id: 'fresno-01', nombre: 'South Fresno Field' };

test('agua frente a base produce un beneficio hídrico y una compensación económica, sin utilidad neta', () => {
  const resultado = construirImpacto(base, agua, 'agua');
  assert.match(resultado.conclusion, /lower modeled water demand/);
  assert.equal(resultado.metricas.find((m) => m.campo === 'agua_mm').delta.absoluta, -190);
  assert.equal(resultado.metricas.find((m) => m.campo === 'agua_mm').sentido, 'favorable');
  assert.equal(resultado.metricas.find((m) => m.campo === 'ingreso_usd_acre').sentido, 'compensacion');
  assert.equal(resultado.metricas.find((m) => m.campo === 'meses_desnudos').delta.absoluta, -4);
});

test('rentabilidad reconoce mayor ingreso bruto, sin afirmar mayor ganancia', () => {
  const resultado = construirImpacto(base, regen, 'rentabilidad');
  assert.equal(resultado.metricas.find((m) => m.campo === 'ingreso_usd_acre').sentido, 'favorable');
  assert.match(resultado.conclusion, /estimated gross revenue/);
  assert.doesNotMatch(resultado.conclusion, /utilidad|beneficio neto/i);
});

test('suelo no se considera mejora científica sino comparación de nitrógeno potencial', () => {
  const resultado = construirImpacto(base, regen, 'suelo');
  assert.match(resultado.conclusion, /potential nitrogen contribution/);
  assert.match(resultado.pregunta, /sampling/);
});

test('erosión utiliza meses desnudos solamente como indicador indirecto', () => {
  const resultado = construirImpacto(base, agua, 'erosion');
  assert.match(resultado.conclusion, /bare-soil months/);
  assert.doesNotMatch(resultado.conclusion, /erosión evitada|redujo la erosión/);
});

test('línea base se identifica como referencia, no alternativa ganadora', () => {
  const resultado = construirImpacto(base, base, 'agua');
  assert.equal(resultado.esBase, true);
  assert.equal(resultado.favorables.length, 0);
  assert.equal(resultado.compensaciones.length, 0);
  assert.match(resultado.conclusion, /baseline/);
});

test('datos numéricos faltantes no se interpretan como ceros', () => {
  const resultado = construirImpacto({ ...base, agua_mm: null }, { ...agua, agua_mm: null }, 'agua');
  assert.equal(resultado.metricas.find((m) => m.campo === 'agua_mm').sentido, 'sin-datos');
  assert.match(resultado.conclusion, /not enough data/i);
});

test('calendario incompleto bloquea inferencias de cobertura', () => {
  const resultado = construirImpacto({ ...base, cobertura_mensual: Array(12).fill('Desconocido') }, agua, 'erosion');
  assert.equal(resultado.metricas.find((m) => m.campo === 'meses_desnudos').sentido, 'sin-datos');
});

test('cuando el dato es igual informa ausencia de cambio', () => {
  const resultado = construirImpacto(base, { ...agua, agua_mm: base.agua_mm }, 'agua');
  assert.equal(resultado.metricas.find((m) => m.campo === 'agua_mm').sentido, 'igual');
});

test('controles locales se reflejan en la comparación sin mutar datos originales', () => {
  const escenarios = simularEstrategias([base, agua], { aguaPct: 10, precioPct: -10 });
  const resultado = construirImpacto(escenarios[0], escenarios[1], 'agua');
  assert.equal(escenarios[0].agua_mm, 682);
  assert.equal(resultado.metricas.find((m) => m.campo === 'agua_mm').delta.absoluta, -209);
  assert.equal(base.agua_mm, 620);
});

test('demo y P2 ficticio son identificados como prueba', () => {
  const local = construirProcedenciaDecision({ fuente: 'demo' });
  const archivo = construirProcedenciaDecision({ fuente: 'p2-importado', modoEjemplo: true });
  assert.equal(local.ficticio, true);
  assert.equal(archivo.ficticio, true);
  assert.match(archivo.origen, /fictional/i);
});

test('P2 declarado sigue sin auditarse y no asume fuentes consumidas', () => {
  const resultado = construirProcedenciaDecision({ fuente: 'p2-importado', modoEjemplo: false,
    generacion: { insumos: [{ fuente: 'NASA POWER' }, { fuente: 'SMAP' }] },
    evidenciaParcela: { smap: {}, ssurgo: {} },
    power: { status: 'success', year: 2025 }, ajustes: { precioPct: 5, aguaPct: 0 } });
  assert.equal(resultado.ficticio, false);
  assert.match(resultado.origen, /not audited/i);
  assert.match(resultado.nasa, /not necessarily used by P2/);
  assert.equal(resultado.declaradas.length, 2);
  assert.match(resultado.sensibilidad, /price \+5/);
  assert.match(resultado.advertencia, /do not prove/);
});

test('archivo P1 ficticio permanece explícito en trazabilidad', () => {
  const resultado = construirProcedenciaDecision({ fuente: 'demo', evidenciaParcela: {
    smap: {}, cropscape: {}, ssurgo: {}, modoEjemplo: true,
  } });
  assert.match(resultado.p1, /3 P1 source\(s\).*FICTIONAL/);
});

test('la ficha para copiar contiene origen, cambios y advertencias', () => {
  const impacto = construirImpacto(base, agua, 'agua');
  const procedencia = construirProcedenciaDecision({ fuente: 'demo' });
  const ficha = crearFichaDecision({ parcela, prioridad: 'agua', estrategia: agua, impacto, procedencia });
  assert.match(ficha, /South Fresno Field/);
  assert.match(ficha, /Water resilience/);
  assert.match(ficha, /WHY IT IS SUGGESTED/);
  assert.match(ficha, /TRACEABILITY/);
  assert.match(ficha, /not a certified agronomic recommendation/);
});

test('la ficha tolera datos faltantes sin lanzar errores', () => {
  const ficha = crearFichaDecision({ });
  assert.match(ficha, /No data/);
});

test('la ficha está conectada a la selección actual y los datos del motor en JSX', () => {
  const comparador = readFileSync(new URL('../src/components/StrategyComparison.jsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/components/strategy/DecisionBrief.jsx', import.meta.url), 'utf8');
  assert.match(comparador, /<DecisionBrief/);
  assert.match(comparador, /estrategia=\{seleccionada\}/);
  assert.match(comparador, /generacion=\{generacion\} ajustes=\{ajustes\}/);
  assert.match(comparador, /ajuste\.id \?\? 'baseline'/);
  assert.match(panel, /navigator\.clipboard\.writeText/);
  assert.match(panel, /useField\(\)/);
  assert.match(panel, /usePower\(\)/);
});
