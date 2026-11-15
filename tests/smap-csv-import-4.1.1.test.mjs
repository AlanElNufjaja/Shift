import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSmapCsv,parseSmapCsv} from '../src/lib/smapCsvImport.js';
const coord={lat:36.7468,lon:-119.7726,year:2024};
const l4='Date,Latitude,Longitude,SPL4SMGP_007_sm_surface\n2024-01-15,36.7468,-119.7726,0.21\n2024-01-16,36.7468,-119.7726,0.25\n2024-02-01,36.7468,-119.7726,-999\n2024-03-01,36.7468,-119.7726,0.11\n2025-01-01,36.7468,-119.7726,0.30\n';
const parse=(text=l4,product='SPL4SMGP',column='SPL4SMGP_007_sm_surface',options=coord)=>parseSmapCsv({text,product,column,...options});
test('AppEEARS typical wide CSV yields genuine volumetric units and preserves gaps',()=>{
  assert.deepEqual(inspectSmapCsv(l4,'SPL4SMGP').candidates,['SPL4SMGP_007_sm_surface']);
  const result=parse();
  assert.equal(result.status,'ready');
  assert.equal(result.source.type,'uploaded-csv');
  assert.equal(result.source.unit,'m³/m³');
  assert.equal(result.source.verification.includes('not independently authenticated'),true);
  assert.equal(result.months[0].surface_volumetric,0.23);
  assert.equal(result.months[1].surface_volumetric,null);
  assert.equal(result.months[2].surface_volumetric,0.11);
  assert.equal(result.audit.ignored_other_years,1);
  assert.equal(result.valid_months,2);
  assert.equal(result.months.length,12);
});
test('Supports quoted rows, CRLF and L3 AM product with an unversioned header',()=>{
  const csv='"Date","Latitude","Longitude","soil_moisture_am"\r\n"2024-07-15","36.7468","-119.7726","0.315"\r\n';
  const result=parse(csv,'SPL3SMP_E','soil_moisture_am');
  assert.equal(result.source.dataset,'SPL3SMP_E');
  assert.equal(result.months[6].surface_volumetric,0.315);
});
test('Rejects a different point rather than labelling its data as Fresno',()=>{
  assert.throws(()=>parse(l4.replaceAll('36.7468','40.3000')),/coordinates farther/);
});
test('Rejects unsupported percentile, demo moisture, and wrong products',()=>{
  assert.throws(()=>inspectSmapCsv('Date,Latitude,Longitude,GWETTOP\n2024-01-01,36.7,-119.7,0.2','SPL4SMGP'),/No SPL4SMGP/);
  assert.throws(()=>inspectSmapCsv('Date,Latitude,Longitude,SFMC_PRCNTL\n2024-01-01,36.7,-119.7,25','SPL4SMGP'),/No SPL4SMGP/);
  assert.throws(()=>parse(l4,'SPL3SMP_E','SPL4SMGP_007_sm_surface'),/No SPL3SMP_E/);
});
test('Out-of-range values never get auto-scaled, and no valid observations are rejected',()=>{
  assert.throws(()=>parse(l4.replaceAll('0.21','18').replaceAll('0.25','19').replace('0.11','20')),/No valid numerical/);
});
test('Rejects mismatched years, missing coordinates and invalid calendar dates',()=>{
  assert.throws(()=>parse(l4,'SPL4SMGP','SPL4SMGP_007_sm_surface',{...coord,year:2023}),/no rows for 2023/);
  assert.throws(()=>inspectSmapCsv('Date,SPL4SMGP_007_sm_surface\n2024-01-01,0.2','SPL4SMGP'),/Latitude and Longitude/);
  assert.throws(()=>parse(l4.replace('2024-01-15','2024-02-30')),/YYYY-MM-DD/);
});
test('UI advertises AppEEARS rather than promising SMAP POWER point results',async()=>{
  const fs=await import('node:fs');
  const s=fs.readFileSync('src/components/data/SmapNumericPanel.jsx','utf8');
  assert.match(s,/Import an official Earthdata point-sample CSV/);
  assert.match(s,/Experimental: check POWER SMAP percentile availability/);
  assert.match(s,/user-supplied/);
  assert.match(s,/SPL4SMGP/);
});
