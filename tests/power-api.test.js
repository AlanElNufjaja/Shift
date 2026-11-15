import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPowerUrl, normalizePowerMonthly, requestPowerMonthly } from '../src/lib/powerApi.js';

function responseFixture(override = {}) {
  return {
    properties: { parameter: {
      T2M_MAX: { '202501': 15.8, '202502': 20.3, '202503': -999 },
      PRECTOTCORR: { '202501': 1.26, '202502': 0.34, '202503': -999 },
    } },
    ...override,
  };
}

test('NASA POWER: URL utiliza punto, comunidad AG y año completo', () => {
  const url = buildPowerUrl({ lat: 36.7468, lon: -119.7726, year: 2025 });
  const u = new URL(url, 'http://localhost');
  assert.equal(u.pathname, '/nasa-power/api/temporal/monthly/point');
  assert.equal(u.searchParams.get('parameters'), 'T2M_MAX,PRECTOTCORR');
  assert.equal(u.searchParams.get('longitude'), '-119.7726');
  assert.equal(u.searchParams.get('community'), 'AG');
  assert.equal(u.searchParams.get('start'), '2025');
  assert.equal(u.searchParams.get('end'), '2025');
});

test('NASA POWER: no acepta coordenadas o años inválidos', () => {
  assert.throws(() => buildPowerUrl({ lat: 120, lon: -119, year: 2025 }), /coordinates/i);
  assert.throws(() => buildPowerUrl({ lat: 36, lon: NaN, year: 2025 }), /coordinates/i);
  assert.throws(() => buildPowerUrl({ lat: 36, lon: -119, year: 2030 }), /Year/);
});

test('NASA POWER: normaliza 12 meses en español con unidades separadas', () => {
  const data = normalizePowerMonthly(responseFixture(), 2025);
  assert.equal(data.serie.length, 12);
  assert.equal(data.serie[0].periodo, '2025-01');
  assert.equal(data.serie[0].temperatura, 15.8);
  assert.equal(data.serie[0].lluvia, 1.26);
  assert.equal(data.mesesTemperatura, 2);
  assert.equal(data.mesesPrecipitacion, 2);
  assert.equal(data.temperaturaPico, 20.3);
  assert.equal(data.lluviaMediaDiaria, 0.8);
});

test('NASA POWER: nulos y -999 nunca se convierten en valores reales', () => {
  const data = normalizePowerMonthly(responseFixture(), 2025);
  assert.equal(data.serie[2].temperatura, null);
  assert.equal(data.serie[2].lluvia, null);
  assert.equal(data.serie[3].temperatura, null);
  assert.equal(data.serie[3].lluvia, null);
});

test('NASA POWER: rechaza datos malformados o vacíos', () => {
  assert.throws(() => normalizePowerMonthly({ properties: {} }, 2025), /requested variables/);
  assert.throws(() => normalizePowerMonthly({ properties: { parameter: { T2M_MAX: { '202501': -999 } } } }, 2025), /valid months/i);
  assert.throws(() => normalizePowerMonthly(null, 2025), /invalid/i);
});

test('NASA POWER: rechaza precipitación negativa y permite temperaturas bajo cero', () => {
  const data = normalizePowerMonthly({ properties: { parameter: { T2M_MAX: { '202501': -3 }, PRECTOTCORR: { '202501': -5, '202502': 0 } } } }, 2025);
  assert.equal(data.serie[0].temperatura, -3);
  assert.equal(data.serie[0].lluvia, null);
  assert.equal(data.serie[1].lluvia, 0);
});

test('NASA POWER: integra fetch inyectado y conserva la señal de cancelación', async () => {
  const controller = new AbortController();
  const results = [];
  const data = await requestPowerMonthly({
    lat: 36.7468, lon: -119.7726, year: 2025, signal: controller.signal, base: '/nasa-power',
    fetcher: async (url, options) => { results.push({ url, options }); return { ok: true, json: async () => responseFixture() }; },
  });
  assert.equal(data.mesesTemperatura, 2);
  assert.equal(results.length, 1);
  assert.equal(results[0].options.signal, controller.signal);
});

test('NASA POWER: los errores HTTP no generan falsos datos', async () => {
  await assert.rejects(() => requestPowerMonthly({
    lat: 36.7468, lon: -119.7726, year: 2025,
    fetcher: async () => ({ ok: false, status: 502 }),
  }), /HTTP 502/);
});
