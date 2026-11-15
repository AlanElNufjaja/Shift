import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTeamPayload } from '../src/lib/teamPilotAdapter.js';
import { buildTeamModelEvidence, TEAM_INPUTS } from '../src/lib/teamModelEvidence.js';

const read = filename => readFileSync(new URL(`../${filename}`, import.meta.url), 'utf8');
const raw = JSON.parse(read('public/data/team-pilot-2015-2024.json'));
const all = normalizeTeamPayload(raw);

test('2024 reported scores/categories/candidates remain strictly site-specific', () => {
  const samples = [
    ['fresno-01', 32.3, 'Not favored by team model', 'Tomato', ['Safflower', 'Wheat']],
    ['bakersfield-02', 18.65, 'Not favored by team model', 'Cotton', ['Safflower', 'Wheat']],
    ['davis-03', 50, 'Acceptable in team model', 'Tomato', ['Tomato', 'Safflower']],
  ];
  for (const [id, score, category, crop, candidates] of samples) {
    const e = buildTeamModelEvidence(all[id]);
    assert.equal(e.score, score);
    assert.equal(e.category, category);
    assert.equal(e.recordedCrop, crop);
    assert.deepEqual(e.candidates, candidates);
    assert.equal(e.year, 2024);
    assert.equal(e.status, 'internally-consistent');
  }
});

test('model inputs are literal source values, not invented ratios or percentages', () => {
  const evidence = buildTeamModelEvidence(all['fresno-01']);
  const values = Object.fromEntries(evidence.inputs.map(input => [input.key, input.value]));
  assert.deepEqual(values, raw.parcelas.fresno.inputs_fuzzy_normalizados);
  assert.equal(values.Historial_Monocultivo, 3);
  assert.equal(values.Disponibilidad_Hidrica, 0.62);
  assert.equal(TEAM_INPUTS.length, 4);
});

test('no claim of validated crops, transferability or scenario recalculation', () => {
  for (const site of Object.values(all)) {
    const evidence = buildTeamModelEvidence(site);
    assert.equal(evidence.audited, false);
    assert.equal(evidence.canDriveScenarioComparison, false);
    assert.equal(evidence.canApplyToGlobalFields, false);
  }
  assert.equal(buildTeamModelEvidence(null), null);
  assert.equal(buildTeamModelEvidence(all['custom-coord']), null);
});

test('missing model inputs are shown missing instead of being made up', () => {
  const bad = structuredClone(all['fresno-01']);
  delete bad.model.rawInputs.Estres_Termico;
  const evidence = buildTeamModelEvidence(bad);
  assert.equal(evidence.inputs.find(v => v.key === 'Estres_Termico').value, null);
  assert.equal(evidence.status, 'requires-review');
  assert.equal(evidence.checks.at(-1).passed, false);
});

test('score mismatch and crop mismatch are reported, not silently repaired', () => {
  const site = structuredClone(all['davis-03']);
  site.model.score = 87;
  site.currentCrop = 'Cotton';
  const evidence = buildTeamModelEvidence(site);
  assert.equal(evidence.status, 'requires-review');
  assert.equal(evidence.checks.filter(item => !item.passed).length, 2);
});

test('archived candidate order remains the order actually written by the team', () => {
  const fresno = all['fresno-01'].model.candidateCrops;
  assert.deepEqual(fresno, ['Safflower', 'Wheat']);
});

test('farmer wizard sees an optional model snapshot, no global recommendation', () => {
  const choices = read('src/components/overview/FarmerChoices.jsx');
  const app = read('src/App.jsx');
  assert.match(choices, /parcela\.origen === 'custom'/);
  assert.match(choices, /TeamModelEvidence/);
  assert.match(choices, /useTeamPilotArchive\(visible && parcela\.origen !== 'custom'\)/);
  assert.match(app, /<FarmerChoices visible=\{vista === 'recorrido' && paso === 2\}/);
});

test('historical score is shown separately from the demo/engine scenarios', () => {
  const panel = read('src/components/global/TeamModelEvidence.jsx');
  assert.match(panel, /not a percent, probability or yield forecast/i);
  assert.match(panel, /not independently audited/i);
  assert.match(panel, /not.*select or calculate the scenario/i);
  assert.doesNotMatch(panel, /useStrategies|diferenciaVsBase|ajustePorPrioridad/);
});

test('advanced panel retains historic chart and includes source evidence', () => {
  const panel = read('src/components/global/TeamPilotPanel.jsx');
  assert.match(panel, /<TeamModelEvidence site=\{current\}/);
  assert.match(panel, /teamYearDetails/);
  assert.match(panel, /LineChart/);
  assert.match(panel, /Team-supplied · Not audited/);
});

test('archive is shared across views and fetched only when needed in the assistant', () => {
  const archive = read('src/hooks/useTeamPilotArchive.js');
  assert.match(archive, /pendingArchive/);
  assert.match(archive, /cachedArchive/);
  assert.match(archive, /if \(!enabled\)/);
  assert.match(archive, /normalizeTeamPayload/);
});
