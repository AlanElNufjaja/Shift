import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url),'utf8');

test('Earthdata automation keeps NASA authentication server side',()=>{
  const ui=read('../src/components/data/AppEearsAutomation.jsx');
  const backend=read('../backend/earthdata.py');
  assert.match(ui,/\/api\/earthdata/);
  assert.match(ui,/Request point sample/);
  assert.match(ui,/Load into chart/);
  assert.doesNotMatch(ui,/getpass|Authorization:\s*Bearer|passwordInput|NASA_EARTHDATA_PASSWORD/);
  assert.match(backend,/Bearer \{token\}/);
  assert.match(backend,/FIELD_SHIFT_APPEEARS_LOCAL_MODE/);
});

test('both manual and authenticated point sample paths remain accessible',()=>{
  const view=read('../src/components/data/SmapNumericPanel.jsx');
  assert.match(view,/<AppEearsAutomation/);
  assert.match(view,/parseSmapCsv/);
  assert.match(view,/appeears-api/);
  assert.match(view,/No data/);
});

test('local secret files are excluded from Git',()=>{
  assert.match(read('../.gitignore'),/backend\/\.private\//);
  assert.match(read('../backend/start-local.cmd'),/--host 127\.0\.0\.1/);
});
