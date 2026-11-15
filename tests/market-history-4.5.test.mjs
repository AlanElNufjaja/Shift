import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMarketCsv, groupComparableMarketQuotes, buildMarketPriceHistory } from '../src/lib/marketEvidence.js';

const heading='commodity,quote_date,price,unit,market,grade,package,trade_basis,source_url,report_slug\n';
const url='https://mymarketnews.ams.usda.gov/viewReport/2194';
const row=(date,price, grade='Grade A', package_type='50 lb bag',basis='FOB')=>
  `Cotton,${date},${price},USD/lb,Fresno wholesale,${grade},${package_type},${basis},${url},2194\n`;

test('extended USDA price CSV accepts explicit grade, package and trade basis',()=>{
  const quotes=validateMarketCsv(heading+row('2024-02-02','1.5')+row('2024-04-03','1.8'));
  assert.equal(quotes.length,2);
  assert.equal(quotes[0].comparison_level,'detailed');
  assert.equal(quotes[0].grade,'Grade A');
  assert.equal(quotes[0].package,'50 lb bag');
  assert.equal(quotes[0].trade_basis,'FOB');
});
test('time series is chronological and computes a descriptive difference only for comparable values',()=>{
  const quotes=validateMarketCsv(heading+row('2024-04-03','1.8')+row('2024-02-02','1.5'));
  const [h]=buildMarketPriceHistory(quotes);
  assert.equal(h.canChart,true);
  assert.deepEqual(h.points.map(p=>p.date),['2024-02-02','2024-04-03']);
  assert.ok(Math.abs(h.change-.3)<1e-10);
  assert.ok(Math.abs(h.changePct-20)<1e-10);
  assert.equal(h.latest.price,1.8);
});
test('different package, grade or trade basis never share a history',()=>{
  const quotes=validateMarketCsv(heading+row('2024-04-03', '1.8')+
    row('2024-05-02', '1.9','Grade B')+row('2024-06-02','2.0','Grade A','10 lb crate')+
    row('2024-07-02','2.1','Grade A','50 lb bag','Terminal'));
  assert.equal(groupComparableMarketQuotes(quotes).length,4);
  for(const h of buildMarketPriceHistory(quotes)){assert.equal(h.canChart,false);assert.equal(h.change,null);}
});
test('legacy CSV remains readable but cannot silently make a historical price trend',()=>{
  const legacy='commodity,quote_date,price,unit,market,source_url,report_slug\n'+
  `Cotton,2024-03-01,1.4,USD/lb,Fresno wholesale,${url},2194\n`+
  `Cotton,2024-04-01,1.6,USD/lb,Fresno wholesale,${url},2194\n`;
  const [history]=buildMarketPriceHistory(validateMarketCsv(legacy));
  assert.equal(history.canChart,false);
  assert.equal(history.change,null);
  assert.match(history.warning,/Grade, package and trade basis/);
});
test('duplicate dates are not averaged or cherry-picked into a trend',()=>{
  const [history]=buildMarketPriceHistory(validateMarketCsv(heading+row('2024-05-01','1.2')+
    row('2024-05-01','1.5')+row('2024-06-01','1.8')));
  assert.equal(history.repeatedDates,true);
  assert.equal(history.canChart,false);
  assert.equal(history.change,null);
});
test('extended CSV requires complete commercial descriptors and an official source link',()=>{
  assert.throws(()=>validateMarketCsv(heading+row('2024-05-01','1.2','','50 lb bag')),/grade, package and trade basis/);
  assert.throws(()=>validateMarketCsv(heading+row('2024-05-01','1.2').replace(url,'https://bad.example')),/official/);
});
test('history is a read-only visualization confined to the advanced Market News module',()=>{
  const panel=readFileSync(new URL('../src/components/data/MarketEvidencePanel.jsx',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(panel,/Historical quoted prices/);
  assert.match(panel,/selectedHistory\.canChart/);
  assert.match(panel,/LineChart/);
  assert.match(panel,/not an automatic price feed/);
  assert.doesNotMatch(app,/buildMarketPriceHistory/);
});
