import test from 'node:test';
import assert from 'node:assert/strict';
import { requestSoilPoint } from '../src/lib/soilApi.js';

async function withFetch(mock, action) {
  const old = globalThis.fetch;
  globalThis.fetch = mock;
  try { await action(); } finally { globalThis.fetch = old; }
}

test('a controlled USDA upstream error produces a human-readable message', async () => {
  await withFetch(async () => new Response(JSON.stringify({detail: {
    code:'USDA_TEMPORARILY_UNAVAILABLE',
    message:'USDA soil mapping is temporarily unavailable. The rest of your field assessment still works.'
  }}), {status:503, headers:{'Content-Type':'application/json'}}), async () => {
    await assert.rejects(requestSoilPoint({lat:36.6,lon:-120.1}), /The rest of your field assessment still works/);
  });
});

test('an upstream 500 with non-JSON body does not cause a second error', async () => {
  await withFetch(async () => new Response('Internal Server Error', {status:500}), async () => {
    await assert.rejects(requestSoilPoint({lat:36.6,lon:-120.1}), /temporarily unavailable/);
  });
});

test('partial soil data remain labeled as partial and do not invent numeric values', async () => {
  await withFetch(async () => new Response(JSON.stringify({
    status:'partial', soil:{mapunit_key:'1234',organic_matter_percent:null},
    location:{lat:36.6,lon:-120.1},
    provenance:{provider:'USDA NRCS Soil Data Access (SSURGO)'}
  }),{status:200,headers:{'Content-Type':'application/json'}}), async () => {
    const data=await requestSoilPoint({lat:36.6,lon:-120.1});
    assert.equal(data.status, 'partial');
    assert.equal(data.soil.organic_matter_percent, null);
  });
});

test('soil data for another coordinate is rejected', async () => {
  await withFetch(async () => new Response(JSON.stringify({
    status:'ready', soil:{mapunit_key:'1234'},
    location:{lat:35.5,lon:-119.25},
    provenance:{provider:'USDA NRCS Soil Data Access (SSURGO)'}
  }), {status:200,headers:{'Content-Type':'application/json'}}), async () => {
    await assert.rejects(requestSoilPoint({lat:36.6,lon:-120.1}),/does not match the selected location/);
  });
});
