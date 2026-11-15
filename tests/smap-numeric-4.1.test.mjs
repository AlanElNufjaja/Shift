import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSmapNumericalResponse, requestSmapNumerical} from '../src/lib/smapNumericApi.js';
const payload={status:'ready',location:{lat:36.7,lon:-119.7},period:{year:2024},source:{parameter:'SFMC_PRCNTL',unit:'percentile rank (0-100)'},months:Array.from({length:12},(_,i)=>({date:`2024-${String(i+1).padStart(2,'0')}`,surface_percentile: i===0?25:null,valid_days:i===0?1:0,calendar_days:31}))};
test('validates numerical SMAP source product rather than accepting general NASA wetness',()=>{
  assert.equal(validateSmapNumericalResponse(payload,{lat:36.7,lon:-119.7,year:2024}).months[0].surface_percentile,25);
  assert.throws(()=>validateSmapNumericalResponse({...payload, source:{parameter:'GWETTOP',unit:'percentile rank (0-100)'}},{lat:36.7,lon:-119.7,year:2024}),/invalid months, units or source/);
  assert.throws(()=>validateSmapNumericalResponse({...payload, location:{lat:0,lon:0}},{lat:36.7,lon:-119.7,year:2024}),/does not match/);
  assert.throws(()=>validateSmapNumericalResponse({...payload,months:[{...payload.months[0],surface_percentile: 102},...payload.months.slice(1)]},{lat:36.7,lon:-119.7,year:2024}),/invalid/);
});
test('numeric source is explicit and does not substitute demo, color layers or other models',()=>{
  const cmp=readFileSync('src/components/data/SmapNumericPanel.jsx','utf8');
  const app=readFileSync('src/App.jsx','utf8');
  const advanced=readFileSync('src/components/data/DataWorkbench.jsx','utf8');
  assert.match(cmp,/does not mean 20% water content/);
  assert.match(cmp,/SFMC_PRCNTL/);
  assert.match(advanced,/<SmapNumericPanel\/>/);
  assert.match(app,/<SmapNumericProvider/);
  assert.doesNotMatch(app,/smapNumeric.*estrategias/i);
});
test('HTTP failures do not silently create numeric values',async()=>{
  const fetcher=async()=>({ok:false,json:async()=>({detail:{message:'unavailable'}})});
  await assert.rejects(requestSmapNumerical({lat:36.7,lon:-119.7,year:2024,fetcher}),/unavailable/);
  const success=async()=>({ok:true,json:async()=>payload});
  const v=await requestSmapNumerical({lat:36.7,lon:-119.7,year:2024,fetcher:success});
  assert.equal(v.status,'ready');
});
test('PDF provenance states percentile versus water content without inventing measurements',async()=>{
  const {createFieldReport}=await import('../src/lib/fieldReport.js');
  const field={id:'fresno-01',nombre:'Fresno',lat:36.7,lon:-119.7};
  const r=createFieldReport({field,priority:'agua',smapNumeric:{status:'ready',year:2024,data:{valid_months:3}}});
  assert.match(r.sections.flatMap(s=>s.lines).join(' '),/surface moisture percentile rank queried for 2024/);
  assert.match(r.sections.flatMap(s=>s.lines).join(' '),/not volumetric water %/);
});
