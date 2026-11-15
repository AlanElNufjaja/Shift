import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requestCropPoint, CDL_YEARS } from '../src/lib/cropApi.js';

const lat=36.7468, lon=-119.7726, year=2024;
function example(status='ready') {
  return {status, location:{lat,lon}, year, provenance:{provider:'USDA NASS Cropland Data Layer (CDL)'},
    classification:status==='ready'?{code:54,label:'Tomatoes',year_verified:true,raster_item_years:[2024]}:null};
}
async function fakeFetch(fn, task){
  const prev=globalThis.fetch;
  globalThis.fetch=fn;
  try {return await task();} finally {globalThis.fetch=prev;}
}

test('CDL years are explicitly bounded by verified service metadata',()=>{
  assert.deepEqual(CDL_YEARS,[2024,2023,2022,2021,2020]);
});
test('request posts only coordinates and year to local backend',async()=>{
  await fakeFetch(async(url,opts)=>{
    assert.match(url,/\/api\/fields\/crops$/);
    assert.deepEqual(JSON.parse(opts.body),{lat,lon,year});
    return {ok:true,json:async()=>example()};
  },async()=>{
    const data=await requestCropPoint({lat,lon,year});
    assert.equal(data.classification.label,'Tomatoes');
  });
});
test('rejected or mismatched response never appears as a crop',async()=>{
  await fakeFetch(async()=>({ok:true,json:async()=>({...example(),year:2023})}),
    async()=>await assert.rejects(requestCropPoint({lat,lon,year}),/did not match/));
  await fakeFetch(async()=>({ok:true,json:async()=>({...example(),classification:{...example().classification,raster_item_years:[2023]}})}),
    async()=>await assert.rejects(requestCropPoint({lat,lon,year}),/did not match/));
});
test('explicit outside-coverage result is not a fake California crop',async()=>{
  await fakeFetch(async()=>({ok:true,json:async()=>({...example('outside_coverage'),classification:null})}),
    async()=>assert.equal((await requestCropPoint({lat,lon,year})).status,'outside_coverage'));
});
test('upstream errors become useful messages',async()=>{
  await fakeFetch(async()=>({ok:false,status:503,json:async()=>({detail:{message:'CDL temporarily unavailable'}})}),
    async()=>await assert.rejects(requestCropPoint({lat,lon,year}),/temporarily unavailable/));
});
test('structure keeps crop pixels separate from demo alerts and strategies',()=>{
  const farmer=readFileSync(new URL('../src/components/overview/FarmerSituation.jsx',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const context=readFileSync(new URL('../src/context/CropContext.jsx',import.meta.url),'utf8');
  assert.match(farmer, /LiveCropPanel/);
  assert.match(app,/CropProvider/);
  assert.doesNotMatch(context,/SELECCIONAR_PARCELA|ACTIVAR_RECOMENDACIONES_P2/);
});
