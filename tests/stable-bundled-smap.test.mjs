import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inspectSmapCsv, parseSmapCsv } from '../src/lib/smapCsvImport.js';
import { screenObservedEvidence } from '../src/lib/observedEvidence.js';

const sourcePath = new URL('../public/data/smap-fresno-2024.csv', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('../public/data/smap-fresno-2024-provenance.json', import.meta.url), 'utf8'));
const source = readFileSync(sourcePath, 'utf8');
const column = 'SPL4SMGP_008_Geophysical_Data_sm_surface';
const field = { id:'fresno-01', lat:36.7468,lon:-119.7726 };

function parse() {
  const result = parseSmapCsv({text:source,product:'SPL4SMGP',column,year:2024,lat:field.lat,lon:field.lon});
  return {...result, source:{...result.source,type:'bundled-appeears'}};
}

test('bundled SMAP sample is the exact supplied AppEEARS export and has no identity metadata', () => {
  assert.equal(createHash('sha256').update(source).digest('hex'),manifest.sha256);
  assert.equal(manifest.product,'SPL4SMGP.008');
  assert.equal(manifest.unit,'m³/m³');
  assert.deepEqual(manifest.point,{latitude:36.7468,longitude:-119.7726});
  assert.equal(manifest.observations,2928);
  assert.equal(manifest.months_with_observations,12);
  assert.equal(JSON.stringify(manifest).includes('@'),false,'do not leak Earthdata user email');
});

test('existing AppEEARS adapter processes real 2928-row file into 12 monthly means', () => {
  const structure=inspectSmapCsv(source,'SPL4SMGP');
  assert.deepEqual(structure.candidates,[column]);
  assert.equal(structure.observations,2928);
  const result=parse();
  assert.equal(result.audit.matched_rows,2928);
  assert.equal(result.valid_months,12);
  assert.equal(result.months.length,12);
  assert.equal(result.months.reduce((n,m)=>n+m.sample_count,0),2928);
  assert.equal(result.months[0].sample_count,248);
  assert.equal(result.months[1].sample_count,232);
  assert.equal(result.months[6].surface_volumetric,0.0346);
  assert.equal(result.months[7].surface_volumetric,0.0323);
  assert.equal(result.months.every(m=>m.surface_volumetric>0 && m.surface_volumetric<0.8),true);
});

test('different parcel and different year are not given Fresno 2024 sample', () => {
  assert.throws(()=>parseSmapCsv({text:source,product:'SPL4SMGP',column,year:2024,lat:35.5000,lon:-119.2500}),/coordinates farther/);
  assert.throws(()=>parseSmapCsv({text:source,product:'SPL4SMGP',column,year:2023,lat:field.lat,lon:field.lon}),/no rows for 2023/);
  const ui=readFileSync(new URL('../src/components/data/SmapNumericPanel.jsx',import.meta.url),'utf8');
  assert.match(ui,/const canLoadBundled = smap\.year===2024/);
  assert.match(ui,/Math\.abs\(parcela\.lat-FRESNO_SM_COORDS\.lat\)<0\.00001/);
  assert.match(ui,/Math\.abs\(parcela\.lon-FRESNO_SM_COORDS\.lon\)<0\.00001/);
  assert.match(ui,/if\(!canLoadBundled\) return/);
});

test('bundled AppEEARS evidence may enter descriptive screening but never P2 recommendation engine', () => {
  const smap={year:2024,uploaded:parse()};
  const screen=screenObservedEvidence({field,power:null,smap,soil:null,crop:null});
  assert.equal(screen.status,'waiting');
  assert.equal(screen.source_status.smap,'bundled_appeears');
  assert.match(screen.reason,/Query NASA POWER/);
  const text=readFileSync(new URL('../src/components/data/SmapNumericPanel.jsx',import.meta.url),'utf8');
  assert.match(text,/setBundledLoading/);
  assert.match(text,/smap\.importSample/);
  assert.doesNotMatch(text,/activarRecomendacionesP2/);
});

test('stable release version is synchronized between browser and backend', () => {
  const title=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const backend=readFileSync(new URL('../backend/app.py',import.meta.url),'utf8');
  const p=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(p.version,'4.5.2');
  assert.match(title,/Field Shift 4\.5\.2 Stable/);
  assert.match(backend,/version="4\.5\.2"/);
});
