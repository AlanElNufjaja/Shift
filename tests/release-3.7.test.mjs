import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFieldReport } from '../src/lib/fieldReport.js';
import { buildPdf } from '../src/lib/simplePdf.js';

const field = { id: 'fresno-01', nombre: 'Fresno South Field', lat: 36.6, lon: -120.1 };
const userPoint = { id: 'custom-coord', origen: 'custom', nombre: 'Global point', lat: -34.6, lon: -58.38 };
const scenario = [
 { id: 'baseline', titulo: 'Current rotation', cultivos: 'Tomato', agua_mm: 620, ingreso_usd_acre: 1200, nitrogeno_kg_acre: 2 },
 { id: 'resilient', titulo: 'Water resilience', cultivos: 'Wheat', agua_mm: 420, ingreso_usd_acre: 1100, nitrogeno_kg_acre: 5 },
];

test('PDF labels pilot imports and archive as unaudited, not live', () => {
 const r = createFieldReport({field, priority:'agua', scenarios:scenario, p1Evidence:{}, p1Filename:'sample.json', scenarioSource:'demo'});
 const t = r.sections.flatMap(s=>s.lines).join('\n');
 assert.match(t,/static team-supplied 2015-2024/);
 assert.match(t,/P1: imported from sample.json/);
 assert.match(t,/Fictional demonstration scenarios/);
 assert.match(t,/USDA SSURGO: optional point lookup not requested/);
 assert.match(t,/NASA SMAP: optional L4 percentile query via POWER and L3 imagery via GIBS; no numerical query completed in this report/);
});

test('Global point does not inherit California scores, crop history or strategies', () => {
 const r = createFieldReport({field:userPoint,priority:'rentabilidad', scenarios:scenario, archive:{score:100}, p1Evidence:{}, scenarioSource:'demo'});
 const t = r.sections.flatMap(s=>s.lines).join('\n');
 assert.match(t,/Global climate-only exploration/);
 assert.match(t,/No global crop rotation advice/);
 assert.doesNotMatch(t,/Highlighted scenario:/);
 assert.doesNotMatch(t,/Water use difference vs/);
});

test('PDF encodes source summary in a valid ASCII PDF envelope', () => {
 const r = createFieldReport({field,priority:'agua',scenarios:[],generatedAt:'2026-11-14T12:00:00Z'});
 const bytes = buildPdf(r);
 const doc = new TextDecoder().decode(bytes);
 assert.ok(doc.startsWith('%PDF-1.4'));
 assert.match(doc,/\/Type \/Catalog/);
 assert.match(doc,/xref\n0 /);
 assert.match(doc,/%%EOF/);
 assert.match(doc,/NASA POWER/);
 assert.match(doc,/trailer/);
 const xrefPos = Number(doc.match(/startxref\n(\d+)/)?.[1]);
 assert.equal(doc.slice(xrefPos, xrefPos+4), 'xref');
});

test('Tour is optional and source controls stay in advanced view', () => {
 const tour = readFileSync(new URL('../src/components/layout/JudgeTour.jsx', import.meta.url),'utf8');
 const app = readFileSync(new URL('../src/App.jsx', import.meta.url),'utf8');
 const workbench = readFileSync(new URL('../src/components/data/DataWorkbench.jsx', import.meta.url),'utf8');
 assert.match(tour,/Optional judge walkthrough/);
 assert.match(tour,/if \(!open \|\| vista !== 'recorrido'\) return null/);
 assert.match(app,/<JudgeTour/);
 assert.match(workbench,/<DataFreshness/);
});


test('PDF labels a mapped SSURGO response as point data, not a soil sample', () => {
 const soilLookup={status:'ready', data:{soil:{mapunit_key:'123456'}}};
 const report=createFieldReport({field,priority:'agua',soilLookup});
 const lines=report.sections.flatMap(s=>s.lines).join('\n');
 assert.match(lines,/USDA SSURGO: point map unit 123456 queried/);
 assert.match(lines,/not a soil test/);
});
