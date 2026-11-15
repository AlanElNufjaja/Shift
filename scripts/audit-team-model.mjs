/** Offline archive contract and internal-consistency check. No model recalculation. */
import { readFileSync } from 'node:fs';
import { normalizeTeamPayload } from '../src/lib/teamPilotAdapter.js';
import { buildTeamModelEvidence } from '../src/lib/teamModelEvidence.js';

const raw = JSON.parse(readFileSync(new URL('../public/data/team-pilot-2015-2024.json', import.meta.url), 'utf8'));
const sites = normalizeTeamPayload(raw);
let issues = 0;
for (const id of ['fresno-01', 'bakersfield-02', 'davis-03']) {
  const report = buildTeamModelEvidence(sites[id]);
  if (!report) throw new Error(`No report for ${id}`);
  const failures = report.checks.filter(check => !check.passed).map(check => check.label);
  issues += failures.length;
  process.stdout.write(`${id}: model score ${report.score ?? 'missing'}; category ${report.category}; crops ${report.candidates.join(', ') || 'missing'}; ${failures.length ? `ISSUES ${failures.join('; ')}` : 'internally consistent'}\n`);
}
process.stdout.write('Internal consistency does not verify model formula, USDA prices or NASA product origins.\n');
if (issues) process.exitCode = 1;
