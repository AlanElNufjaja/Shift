import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMarketCsv, parseMarketCsv, groupComparableMarketQuotes } from '../src/lib/marketEvidence.js';
import { marketReport } from '../src/lib/marketApi.js';
const SRC = new URL('../src/', import.meta.url);
const base = 'commodity,quote_date,price,unit,market,source_url,report_slug\n';
const link = 'https://mymarketnews.ams.usda.gov/viewReport/2194';
const r1 = `Cotton,2024-04-01,45.2,USD/lb,CA Market,${link},2194\n`;
const r2 = `Cotton,2024-05-01,47.2,USD/lb,CA Market,${link},2194\n`;

test('market CSV parses a quoted commodity name', () => {
  const s = `${base}"Peppers, sweet",2024-04-01,2.3,USD/lb,CA Market,${link},2194\n`;
  assert.equal(validateMarketCsv(s)[0].commodity, 'Peppers, sweet');
});
test('market CSV requires correct explicit schema, prices and official domain', () => {
  assert.equal(validateMarketCsv(base+r1)[0].price, 45.2);
  assert.throws(() => validateMarketCsv('crop,date,price\nA,2024-01-01,1'), /Expected columns/);
  assert.throws(() => validateMarketCsv(base+r1.replace('45.2','-1')), /positive/);
  assert.throws(() => validateMarketCsv(base+r1.replace('USD\/lb', 'lb')), /unit/);
  assert.throws(() => validateMarketCsv(base+r1.replace('https://mymarketnews.ams.usda.gov','https://example.com')), /official/);
  assert.throws(() => validateMarketCsv(base+r1.replace('2024-04-01','2024-02-31')), /date/);
});
test('different units and markets do not get merged', () => {
  const rows=validateMarketCsv(base + r1 + r2 + r1.replace('USD/lb','USD/short_ton') + r1.replace('CA Market','TX Market'));
  const groups = groupComparableMarketQuotes(rows);
  assert.equal(groups.length, 3);
  assert.equal(groups.find(g=>g.length===2)[0].quote_date, '2024-05-01');
});
test('CSV parser rejects unclosed quotes and unreasonable size', () => {
  assert.throws(() => parseMarketCsv('"bad'), /unclosed/);
  assert.throws(() => validateMarketCsv('x'.repeat(250001)), /too large/);
});
test('market API rejects unsafe slug before making request', async () => {
  await assert.rejects(marketReport('../evil'), /valid USDA/);
});
test('market module is only in advanced view and leaves farmer calculations alone', () => {
  const ui = readFileSync(new URL('components/data/DataWorkbench.jsx', SRC), 'utf8');
  const app = readFileSync(new URL('App.jsx', SRC), 'utf8');
  const report = readFileSync(new URL('lib/fieldReport.js', SRC), 'utf8');
  assert.match(ui, /MarketEvidencePanel/);
  assert.match(ui, /tab !== 'market'/);
  assert.doesNotMatch(app, /MarketEvidencePanel/);
  assert.match(report, /no verified prices imported into the scenario model/);
});
