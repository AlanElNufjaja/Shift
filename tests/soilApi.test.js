import test from 'node:test';
import assert from 'node:assert/strict';
import {requestSoilPoint} from '../src/lib/soilApi.js';

test('USDA soil lookup rejects invalid coordinates before network',async()=>{
  await assert.rejects(requestSoilPoint({lat:91,lon:0}),/Invalid coordinates/);
  await assert.rejects(requestSoilPoint({lat:NaN,lon:3}),/Invalid coordinates/);
});

test('USDA soil lookup accepts matched provider, selected coordinates and valid shape',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async (uri, init)=>{
    assert.match(uri,/\/api\/fields\/soil$/);
    assert.equal(JSON.parse(init.body).lat,36.6);
    return {ok:true,json:async()=>({status:'ready',location:{lat:36.6,lon:-120.1},provenance:{provider:'USDA NRCS Soil Data Access (SSURGO)'},soil:{mapunit_key:'123',organic_matter_percent:null}})};
  };
  try {
    const result=await requestSoilPoint({lat:36.6,lon:-120.1});
    assert.equal(result.soil.organic_matter_percent,null);
  } finally {globalThis.fetch=previous;}
});

test('USDA soil lookup refuses unrelated location or empty ready response',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'ready',location:{lat:0,lon:0},provenance:{provider:'USDA NRCS Soil Data Access (SSURGO)'},soil:{}})});
  try {await assert.rejects(requestSoilPoint({lat:36.6,lon:-120.1}),/does not match/);} finally {globalThis.fetch=previous;}
});

test('USDA soil lookup accepts explicit unavailability with no fabricated soil',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'unavailable',location:{lat:-34.6,lon:-58.4},provenance:{provider:'USDA NRCS Soil Data Access (SSURGO)'},soil:null})});
  try {const result=await requestSoilPoint({lat:-34.6,lon:-58.4});assert.equal(result.status,'unavailable');} finally {globalThis.fetch=previous;}
});
