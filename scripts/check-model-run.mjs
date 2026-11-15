#!/usr/bin/env node
/** CLI companion for the local P2 model-run integrity review. No network access. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeTeamPayload } from '../src/lib/teamPilotAdapter.js';
import { validateModelRun } from '../src/lib/modelRunBridge.js';

const path = process.argv[2];
if (!path) {
  process.stderr.write('Usage: npm run model:check -- ./path/to/p2-model-run.json\n');
  process.exit(2);
}
try {
  const payload = JSON.parse(readFileSync(resolve(path), 'utf8').replace(/^\uFEFF/, ''));
  const archive = normalizeTeamPayload(JSON.parse(readFileSync(new URL('../public/data/team-pilot-2015-2024.json', import.meta.url), 'utf8')));
  const result = validateModelRun(payload, archive);
  for (const error of result.errors) process.stderr.write(`ERROR: ${error}\n`);
  if (!result.valid) process.exit(1);
  process.stdout.write(`STRUCTURALLY COMPATIBLE: ${result.covered.length}/3 pilot fields; ${result.archiveMatchCount} identical to archive.\n`);
  for (const row of result.comparisons) process.stdout.write(`${row.field_id}: score ${row.currentScore} (archive ${row.archiveScore}); ${row.sameAsArchive ? 'same as archive' : 'DIFFERENCES found'}\n`);
  for (const warning of result.warnings) process.stdout.write(`NOTE: ${warning}\n`);
  process.stdout.write('NOT a verified or executed agronomic model; do not use to predict field outcomes.\n');
} catch (error) {
  process.stderr.write(`Unable to check model-run JSON: ${error.message}\n`);
  process.exit(1);
}
