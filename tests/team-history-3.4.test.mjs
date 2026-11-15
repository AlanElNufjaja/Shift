import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTeamPayload, teamYearDetails, teamModelCategory, extractTeamCandidateCrops } from '../src/lib/teamPilotAdapter.js';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const raw = JSON.parse(read('public/data/team-pilot-2015-2024.json'));
const sites = normalizeTeamPayload(raw);

test('all three pilots contain independent, ordered 2015–2024 monthly histories', () => {
  for (const id of ['fresno-01', 'bakersfield-02', 'davis-03']) {
    const p = sites[id];
    assert.equal(p.fullMonths.length, 120);
    assert.equal(p.fullMonths[0].date, '2015-01');
    assert.equal(p.fullMonths.at(-1).date, '2024-12');
    assert.deepEqual(p.fullMonths.slice(-12).map(row => row.date), p.months2024.map(row => row.date));
    assert.equal(p.annual.length, 10);
    for (const year of [2015, 2018, 2021, 2024]) {
      const selected = teamYearDetails(p, year);
      assert.equal(selected.months.length, 12);
      assert.equal(selected.annual.year, year);
      assert.equal(selected.months[0].date, `${year}-01`);
      assert.equal(selected.months[11].date, `${year}-12`);
    }
  }
  assert.equal(sites['fresno-01'].coordinates.lat, 36.6);
  assert.equal(sites['bakersfield-02'].coordinates.lat, 35.5);
});

test('2024 pilot crops and model outputs match supplied source records', () => {
  assert.equal(teamYearDetails(sites['fresno-01'], 2024).annual.crop, 'Tomato');
  assert.equal(teamYearDetails(sites['bakersfield-02'], 2024).annual.crop, 'Cotton');
  assert.equal(teamYearDetails(sites['davis-03'], 2024).annual.crop, 'Tomato');
  assert.equal(sites['fresno-01'].model.score, 32.3);
  assert.equal(sites['bakersfield-02'].model.score, 18.65);
  assert.equal(sites['davis-03'].model.score, 50);
  assert.deepEqual(sites['fresno-01'].model.candidateCrops, ['Safflower', 'Wheat']); // preserve order in source text
  assert.equal(teamModelCategory('No_Recomendado'), 'Not favored by team model');
  assert.deepEqual(extractTeamCandidateCrops(null), []);
});

test('year selectors never invent missing years or leak global pilot data', () => {
  assert.equal(teamYearDetails(sites['fresno-01'], 2014), null);
  assert.equal(teamYearDetails(sites['fresno-01'], 2025), null);
  assert.equal(teamYearDetails(sites['fresno-01'], NaN), null);
  assert.equal(teamYearDetails(sites['custom-coord'], 2024), null);
});

test('invalid monthly archives fail closed instead of silently filling holes', () => {
  const bad = structuredClone(raw);
  bad.parcelas.fresno.historial_completo_120_meses.splice(0, 1);
  assert.throws(() => normalizeTeamPayload(bad), /incomplete history/);
  const duplicate = structuredClone(raw);
  duplicate.parcelas.davis.historial_completo_120_meses[10].fecha = '2015-10';
  assert.throws(() => normalizeTeamPayload(duplicate), /inconsistent or duplicated/);
  const wrongSite = structuredClone(raw);
  wrongSite.parcelas.bakersfield.id_original = 'fresno-01';
  assert.throws(() => normalizeTeamPayload(wrongSite), /Missing pilot bakersfield/);
});

test('farmer wizard shows one opt-in history link, with full science in advanced tab', () => {
  const wizard = read('src/components/overview/FarmerSituation.jsx');
  const panel = read('src/components/global/TeamPilotPanel.jsx');
  const advanced = read('src/components/data/DataWorkbench.jsx');
  assert.match(wizard, /team-pilot-summary\.json/);
  assert.match(wizard, /Explore history/);
  assert.match(wizard, /irADatos\('p1'\)/);
  assert.match(panel, /Team-supplied · Not audited/);
  assert.match(panel, /teamYearDetails/);
  assert.match(panel, /LineChart/);
  assert.match(panel, /no verified geographic transform|no verified geographic/i);
  assert.match(advanced, /TeamPilotPanel/);
  assert.doesNotMatch(panel, /import.*StrategyComparison/);
});

test('farmer-facing crop preview matches the actual team archive', () => {
  const summary = JSON.parse(read('src/data/team-pilot-summary.json'));
  const idToRaw = { 'fresno-01': 'fresno', 'bakersfield-02': 'bakersfield', 'davis-03': 'davis' };
  for (const [id, key] of Object.entries(idToRaw)) {
    assert.equal(summary[id].latestCrop, raw.parcelas[key].estado_actual_2024.cultivo_actual);
    assert.equal(summary[id].yearStart, 2015);
    assert.equal(summary[id].yearEnd, 2024);
    assert.equal(summary[id].audited, false);
  }
});
