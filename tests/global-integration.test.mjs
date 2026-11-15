import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCoordinates, makeCustomField} from '../src/lib/globalCoordinates.js';
import { normalizeTeamPayload } from '../src/lib/teamPilotAdapter.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('coordinates accept valid worldwide points and reject malformed values',()=>{
  assert.deepEqual(validateCoordinates('-34.60','-58.40'),{valid:true,lat:-34.6,lon:-58.4});
  assert.equal(validateCoordinates('90','180').valid,true);
  for(const [lat,lon] of [['91','0'],['0','181'],['','0'],['0',''],['Infinity','0'],['0','-181'],['0x1','0'],['abc','def']]){
    assert.equal(validateCoordinates(lat,lon).valid,false,`${lat},${lon}`);
  }
});
test('custom field never inherits Fresno soil, crop, monthly data or cover',()=>{
  const f=makeCustomField(10,40);
  assert.equal(f.id,'custom-coord');
  assert.deepEqual(f.suelo_ssurgo,{});
  assert.deepEqual(f.historial_cropscape,[]);
  assert.deepEqual(f.clima_mensual,[]);
  assert.equal(f.meses_suelo_desnudo,null);
});
test('REAL package normalizes 3 sites and never applies a pilot score globally',()=>{
  const raw=JSON.parse(read('public/data/team-pilot-2015-2024.json'));
  const byId=normalizeTeamPayload(raw);
  assert.deepEqual(Object.keys(byId).sort(),['bakersfield-02','davis-03','fresno-01']);
  assert.equal(byId['fresno-01'].months2024.length,12);
  assert.equal(byId['davis-03'].annual.length,10);
  assert.equal(byId['fresno-01'].coordinates.lat,36.6);
  assert.equal(byId['fresno-01'].currentCrop,'Tomato');
  assert.match(byId['fresno-01'].notice,/NOT independently validated as SMAP/);
});
test('global custom locations do not access California demo strategies',()=>{
  const hook=read('src/hooks/useStrategies.js');
  const choices=read('src/components/overview/FarmerChoices.jsx');
  assert.match(hook,/parcelaId === 'custom-coord'/);
  assert.match(choices,/parcela.origen === 'custom'/);
  assert.match(read('src/components/overview/FarmerSituation.jsx'),/GlobalClimateSummary/);
  assert.match(read('src/components/overview/FarmerLand.jsx'),/useCoordinates/);
});
test('global API and map pick are wired and team history stays separately presented',()=>{
  assert.match(read('vite.config.js'), /'\/api'/);
  assert.match(read('src/components/MapView.jsx'),/useMapEvents/);
  assert.match(read('src/components/data/DataWorkbench.jsx'),/TeamPilotPanel/);
  assert.match(read('src/components/global/TeamPilotPanel.jsx'),/2015–2024/);
});
