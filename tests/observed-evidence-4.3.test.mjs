import test from 'node:test';
import assert from 'node:assert/strict';
import { screenObservedEvidence, MIN_MATCHED_MONTHS } from '../src/lib/observedEvidence.js';
const field={id:'fresno-01',lat:36.6,lon:-120.1};
const year=2024;
const power={status:'success',parcelaId:field.id,year,key:`${field.lat}:${field.lon}:${year}`,
  datos:{year,serie:Array.from({length:12},(_,i)=>({periodo:`2024-${String(i+1).padStart(2,'0')}`,temperatura:i+10}))}};
const smap={year,uploaded:{status:'ready',period:{year},location:{lat:field.lat,lon:field.lon},source:{type:'appeears-api',dataset:'SPL4SMGP',unit:'m³/m³'},
  months:Array.from({length:12},(_,i)=>({date:`2024-${String(i+1).padStart(2,'0')}`,surface_volumetric:Number((0.35-i*0.01).toFixed(3)),sample_count:3}))}};
const check=(overrides={})=>screenObservedEvidence({field,power,smap,...overrides});
test('uses only matching NASA POWER and volumetric SMAP series, not demo signals',()=>{
  const r=check();
  assert.equal(r.status,'screened');
  assert.equal(r.matched_months,12);
  assert.equal(r.relative_overlap_months.length,6);
  assert.deepEqual(r.relative_overlap_months,['Jul','Aug','Sep','Oct','Nov','Dec']);
  assert.equal(r.source_status.smap,'appeears_task');
});
test('different field cannot inherit either official series',()=>{
  const r=check({field:{id:'custom-coord',lat:-34.6,lon:-58.3}});
  assert.equal(r.status,'waiting');
  assert.equal(r.matched_months,0);
});
test('different year or source units block screening',()=>{
  assert.equal(check({smap:{...smap,year:2023}}).status,'waiting');
  assert.equal(check({smap:{...smap,uploaded:{...smap.uploaded,source:{...smap.uploaded.source,unit:'%'}}}}).status,'waiting');
});
test('POWER temperature from the wrong year is not eligible',()=>{
  assert.equal(check({power:{...power,key:'36.6:-120.1:2023'}}).status,'waiting');
});
test('less than eight pairs remains incomplete, never zero-risk',()=>{
  const limited={...smap,uploaded:{...smap.uploaded,months:smap.uploaded.months.map((m,i)=>i<7?m:{...m,sample_count:0,surface_volumetric:null})}};
  const r=check({smap:limited});
  assert.equal(MIN_MATCHED_MONTHS,8);
  assert.equal(r.status,'insufficient');
  assert.equal(r.matched_months,7);
  assert.deepEqual(r.relative_overlap_months,[]);
});
test('missing months never become zeros and user-imported source is labeled',()=>{
  const uploaded={...smap,uploaded:{...smap.uploaded,source:{...smap.uploaded.source,type:'uploaded-csv'},months:smap.uploaded.months.map((m,i)=>i===2?{...m,sample_count:0,surface_volumetric:null}:m)}};
  const r=check({smap:uploaded});
  assert.equal(r.status,'screened');
  assert.equal(r.months[2].moisture_m3m3,null);
  assert.equal(r.source_status.smap,'user_supplied_csv');
});
test('USDA point map unit and CDL pixel are contextual only',()=>{
  const soil={status:'ready',data:{location:{lat:36.6,lon:-120.1},provenance:{provider:'USDA NRCS Soil Data Access (SSURGO)'},soil:{mapunit_key:'464304'}}};
  const crop={status:'ready',data:{location:{lat:36.6,lon:-120.1},provenance:{provider:'USDA NASS Cropland Data Layer (CDL)'},year:2024,classification:{year_verified:true,label:'Cotton'}}};
  const r=check({soil,crop});
  assert.equal(r.source_status.soil,'mapped');
  assert.equal(r.source_status.crop,'pixel_classified');
  assert.equal(r.crop_context.label,'Cotton');
  assert.equal(r.matched_months,12);
  const mismatched=check({soil:{...soil,data:{...soil.data,location:{lat:35,lon:-119}}},crop});
  assert.equal(mismatched.source_status.soil,'not_used');
});
test('numerical SMAP percentile data cannot masquerade as volumetric',()=>{
  const r=check({smap:{year,status:'ready',data:{status:'ready',months:smap.uploaded.months}}});
  assert.equal(r.status,'waiting');
});
test('invalid field requires valid coordinates',()=>{
  assert.throws(()=>check({field:{lat:NaN,lon:0}}),/valid field/i);
});
