import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(f)=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
test('Fase 2.6 muestra P1 sin retirar mapa, simulador o NASA POWER',()=>{
  const app=read('App.jsx');
  assert.match(app,/<DataWorkbench/);
  const wb=read('components/data/DataWorkbench.jsx');
  assert.match(wb,/<MultiSourceEvidencePanel/);
  assert.match(app,/<MapView /);
  assert.match(app,/<DiagnosticCard /);
  assert.match(app,/<StrategyComparison /);
  assert.match(wb,/<PowerDataPanel /);
});
test('evidencia se almacena por parcela y nunca sobrescribe geometría/demo',()=>{
  const ctx=read('context/FieldContext.jsx');
  assert.match(ctx,/ACTIVAR_EVIDENCIAS_P1/);
  assert.match(ctx,/DESCARTAR_EVIDENCIAS_P1/);
  assert.match(ctx,/parcelasDemo/);
});
test('importación exige clic explícito y conserva rotulación de demostración',()=>{
  const panel=read('components/data/DataIntakePanel.jsx');
  assert.match(panel,/Enable valid sources for this session/);
  assert.match(panel,/Return to demo only/);
  assert.match(read('components/data/MultiSourceEvidencePanel.jsx'),/not audited/i);
});

test('archivo local de prueba ficticio activa las tres fuentes para los tres pilotos',async()=>{
  const { prepararEntregableP1 } = await import('../src/lib/multiSourceIntake.js');
  const data=JSON.parse(readFileSync(new URL('../public/ejemplo-p1-FICTICIO.json',import.meta.url),'utf8'));
  const report=prepararEntregableP1(data,['fresno-01','bakersfield-02','davis-03']);
  assert.equal(report.valido,true);
  assert.equal(report.fuentes,9);
  assert.equal(report.parcelas,3);
  assert.equal(report.porParcela['davis-03'].modoEjemplo,true);
});
