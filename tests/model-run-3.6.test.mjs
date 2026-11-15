import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_RUN_SCHEMA, PILOT_IDS, validateModelRun } from '../src/lib/modelRunBridge.js';
import { normalizeTeamPayload } from '../src/lib/teamPilotAdapter.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const baseline = normalizeTeamPayload(JSON.parse(read('public/data/team-pilot-2015-2024.json')));
const example = JSON.parse(read('public/model-run-SAMPLE-NOT-COMPUTED.json'));
const updated = edits => {const p=structuredClone(example); edits(p); return p;};

test('archival sample covers exactly 3 pilot sites and explicitly declares no calculation', () => {
  const result = validateModelRun(example, baseline);
  assert.equal(result.valid, true);
  assert.equal(result.fictional, true);
  assert.equal(result.kind, 'snapshot-replay');
  assert.equal(result.archiveMatchCount, 3);
  assert.deepEqual(result.covered, [...PILOT_IDS]);
  assert.ok(result.warnings.some(w => /NOT demonstrate.*executed/i.test(w)));
  assert.ok(result.warnings.some(w => /not proof of reproducibility/i.test(w)));
});

test('contract and sample share schema but contract declares an actual future P2 run', () => {
  const contract = JSON.parse(read('public/model-run-CONTRACT.json'));
  assert.equal(contract.schema_version, MODEL_RUN_SCHEMA);
  assert.equal(contract.kind, 'model-run');
  assert.equal(contract.fictional, false);
  assert.equal(validateModelRun(contract, baseline).valid, true);
  assert.equal(contract.results.length, 3);
});

test('a changed score is visible but not labeled invalid or as an improvement', () => {
  const result = validateModelRun(updated(p => {p.results[0].score = 45.3;}), baseline);
  assert.equal(result.valid, true);
  assert.equal(result.archiveMatchCount, 2);
  assert.equal(result.comparisons[0].scoreDifference, 13);
  assert.ok(result.warnings.some(w => /differ from the 2024 archive/i.test(w)));
});

test('must not silently accept output for mismatched global or pilot coordinates', () => {
  for (const [lat,lon] of [[-34.6037,-58.3816],[36.7468,-119.7726],[NaN,-120.1]]) {
    const result = validateModelRun(updated(p => {p.results[0].coordinates={lat,lon};}), baseline);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(s => /coordinates/i.test(s)));
  }
});

test('wrong year, duplicated pilots and unknown ids are rejected', () => {
  for (const edit of [
    p => {p.results[0].year=2025;},
    p => {p.results[1].field_id=p.results[0].field_id;},
    p => {p.results[0].field_id='custom-coord';},
  ]) {
    assert.equal(validateModelRun(updated(edit), baseline).valid, false);
  }
});

test('non-finite score and missing model inputs are rejected, not defaulted', () => {
  for (const edit of [
    p => {p.results[0].score='32.3';},
    p => {p.results[0].inputs.Estres_Termico=null;},
    p => {delete p.results[0].inputs.Historial_Monocultivo;},
  ]) assert.equal(validateModelRun(updated(edit),baseline).valid,false);
});

test('unknown schema, invalid time, missing fictional flag block import', () => {
  for (const edit of [
    p => {p.schema_version='other';},
    p => {p.metadata.executed_at='2024';},
    p => {delete p.fictional;},
  ]) assert.equal(validateModelRun(updated(edit),baseline).valid,false);
});

test('a declared model-run without code is accepted but visibly unverifiable', () => {
  const result = validateModelRun(updated(p => {p.kind='model-run'; p.fictional=false; p.metadata.code_reference='';}),baseline);
  assert.equal(result.valid,true);
  assert.ok(result.warnings.some(s => /code_reference/i.test(s)));
});

test('partial pilot results can be inspected but never treated as global model', () => {
  const result = validateModelRun(updated(p => {p.results=p.results.slice(0,1);}),baseline);
  assert.equal(result.valid,true);
  assert.deepEqual(result.covered,['fresno-01']);
  assert.ok(result.warnings.some(s => /Only 1 of 3/i.test(s)));
});

test('model review lives only in advanced P2 and never writes to FieldContext', () => {
  const workbench=read('src/components/data/DataWorkbench.jsx');
  const panel=read('src/components/strategy/ModelRunReviewPanel.jsx');
  const choices=read('src/components/overview/FarmerChoices.jsx');
  assert.match(workbench, /<ModelRunReviewPanel active=\{tab === 'p2'\}/);
  assert.match(panel, /Local comparison only/);
  assert.doesNotMatch(panel, /activarRecomendacionesP2|seleccionarPrioridad|seleccionarCoordenadas|useStrategies/);
  assert.doesNotMatch(choices, /ModelRunReviewPanel/);
  assert.match(choices, /parcela\.origen === 'custom'/);
});
