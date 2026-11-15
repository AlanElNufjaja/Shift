import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileUp, GitCompareArrows, Info, ShieldAlert, XCircle } from 'lucide-react';
import { useTeamPilotArchive } from '../../hooks/useTeamPilotArchive.js';
import { MODEL_RUN_MAX_BYTES, validateModelRun } from '../../lib/modelRunBridge.js';
import { useField } from '../../context/FieldContext.jsx';

const fmt = value => typeof value === 'number' && Number.isFinite(value)
  ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value)
  : (value ?? 'No data');
const name = id => ({'fresno-01':'Fresno','bakersfield-02':'Bakersfield','davis-03':'Davis'}[id] || id);

/**
 * Optional local integrity checks for model runs provided by P2.
 * No upload, automatic activation, scoring, predictions, or scenario replacement.
 */
export default function ModelRunReviewPanel({active = false}) {
  const archive = useTeamPilotArchive(active);
  const {parcela} = useField();
  const [selection, setSelection] = useState(null);
  const [filename, setFilename] = useState('');
  const [fileError, setFileError] = useState('');
  const seq = useRef(0);
  const report = selection && archive.status === 'ready' ? validateModelRun(selection, archive.byId) : null;

  async function load(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const job = ++seq.current;
    setSelection(null); setFilename(file?.name ?? ''); setFileError('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {setFileError('Choose a JSON file (.json).'); return;}
    if (file.size > MODEL_RUN_MAX_BYTES) {setFileError('File exceeds the 256 KB limit.'); return;}
    try {
      const payload = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      if (job === seq.current) setSelection(payload);
    } catch (error) {
      if (job === seq.current) setFileError(`Cannot read JSON: ${error.message}`);
    }
  }

  return <section className="panel space-y-4 p-4 sm:p-6" aria-labelledby="model-run-review-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-[760px]">
        <div className="eyebrow mb-1">Field Shift 3.6 · P2 handoff</div>
        <h2 id="model-run-review-title" className="section-title flex items-center gap-2"><ClipboardCheck size={23} aria-hidden="true"/> Review a model run</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">P2 can deliver a JSON result for a 2024 California pilot field. Compare its declared score, crop, classification and four inputs with the team's historical archive. <strong>This does not run or verify the fuzzy model.</strong></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cee2ce] bg-white px-3 text-xs font-bold text-agri" href="/model-run-CONTRACT.json" download><Download size={15}/> P2 JSON contract</a>
        <a className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#efd7a9] bg-[#fff8e9] px-3 text-xs font-bold text-[#8b662a]" href="/model-run-SAMPLE-NOT-COMPUTED.json" download><Download size={15}/> Sample (not computed)</a>
      </div>
    </div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div>
        <label htmlFor="p2-model-run-file" className="focus-within:ring-2 focus-within:ring-agri flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#b7d2b9] bg-[#f8fbf6] p-4 text-center hover:bg-[#eff7ed]">
          <FileUp size={24} className="text-agri" aria-hidden="true"/>
          <span className="text-sm font-bold text-forest">Choose a P2 model-run JSON</span>
          <span className="text-xs text-muted">Local comparison only · 256 KB maximum · nothing is uploaded</span>
          <input id="p2-model-run-file" type="file" accept=".json,application/json" className="sr-only" onChange={load}/>
        </label>
        {filename && <p className="mt-2 break-all text-xs text-muted">Selected: {filename}</p>}
        {fileError && <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-[#fff0ea] p-3 text-sm text-[#98523d]"><XCircle size={18} aria-hidden="true"/>{fileError}</p>}
        {archive.status === 'loading' && <p role="status" className="mt-3 text-sm text-muted">Loading the California pilot archive…</p>}
        {archive.status === 'error' && <p role="alert" className="mt-3 text-sm text-[#98523d]">Cannot load the reference archive: {archive.error}</p>}
      </div>
      <aside className="rounded-xl bg-[#f1f7ee] p-4 text-sm text-[#526e58]" aria-label="Model scope and integrity">
        <h3 className="font-extrabold text-forest">What this check can and cannot do</h3>
        <p className="mt-2">Checks the 2024 pilot field identity, coordinates, four declared inputs and output consistency.</p>
        <p className="mt-2">Does <strong>not</strong> establish data provenance, calibration, accuracy, model execution or suitability for new coordinates.</p>
        <p className="mt-2 text-xs">Current selection: <strong>{parcela.origen === 'custom' ? 'Global field (out of scope)' : `${parcela.nombre} (pilot)`}</strong>. All three California pilots can be inspected; no comparison is attributed to a global field.</p>
      </aside>
    </div>
    {report && <div className="space-y-4" aria-live="polite">
      <div className={`rounded-xl border p-4 ${report.valid ? 'border-[#cde2c9] bg-[#eef8eb]' : 'border-[#edd1c9] bg-[#fff5f1]'}`}>
        <p className={`flex items-center gap-2 text-sm font-extrabold ${report.valid ? 'text-[#2d6e43]' : 'text-[#a04e3b]'}`}>
          {report.valid ? <CheckCircle2 size={19} aria-hidden="true"/> : <XCircle size={19} aria-hidden="true"/>}
          {report.valid ? `Accepted for comparison · ${report.covered.length}/3 pilot fields · ${report.archiveMatchCount} match(es)` : 'Comparison blocked — invalid model-run contract'}
        </p>
        {report.valid && <p className="mt-2 text-xs text-[#526f5d]">{report.kind === 'snapshot-replay' ? 'Snapshot replay (not a computed run)' : 'Reported model run (computation not independently verified)'} · {report.fictional ? 'FICTIONAL' : 'P2 declared, not audited'} · {report.metadata.model_id} / {report.metadata.version}</p>}
        {!!report.errors.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[#994c3b]">{report.errors.map((item,i)=><li key={i}>{item}</li>)}</ul>}
      </div>
      {report.valid && <div className="grid gap-3 md:grid-cols-3">
        {report.comparisons.map(row=><div key={row.field_id} className={`rounded-xl border p-4 ${row.sameAsArchive ? 'border-[#cfe3cd] bg-white' : 'border-[#ead7b5] bg-[#fffaf0]'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-extrabold text-forest">{name(row.field_id)}</h3><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${row.sameAsArchive ? 'bg-[#e6f3e2] text-[#34734a]' : 'bg-[#fff0d3] text-[#986929]'}`}>{row.sameAsArchive ? 'Matches archive' : 'Differences found'}</span></div>
          <p className="mt-3 text-xs text-muted">Model score · P2 file vs. team archive</p>
          <p className="mt-1 text-lg font-extrabold text-forest">{fmt(row.currentScore)} <span className="text-xs font-normal text-muted">vs.</span> {fmt(row.archiveScore)}</p>
          <p className="mt-1 text-xs text-muted">Difference: {fmt(row.scoreDifference)} · 2024</p>
          <details className="mt-3 rounded-lg border border-[#dfebdd] bg-white p-3"><summary className="focus-ring cursor-pointer text-xs font-bold text-agri">Inspect score, crop and four inputs</summary>
            <div className="mt-3 space-y-2">
              {row.checks.map(check=><p key={check.label} className="text-xs text-[#5b745f]"><strong>{check.label}:</strong> {check.same ? 'Same' : 'Changed'}<span className="block break-words text-[11px] text-muted">P2: {String(check.actual)} · archive: {String(check.archived)}</span></p>)}
              {row.inputChecks.map(input=><p key={input.key} className="text-xs text-[#5b745f]"><strong>{input.label}:</strong> {input.same ? 'Same' : 'Changed'}<span className="block text-[11px] text-muted">P2: {fmt(input.current)} · archive: {fmt(input.archived)}</span></p>)}
            </div>
          </details>
        </div>)}
      </div>}
      {!!report.warnings.length && <details className="rounded-xl border border-[#ead9b4] bg-[#fffaf0] p-4" open>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#8a6530]"><AlertTriangle size={18} aria-hidden="true"/> {report.warnings.length} scientific and provenance notice(s)</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-[#805f34]">{report.warnings.map((item,i)=><li key={i}>{item}</li>)}</ul>
      </details>}
    </div>}
    <p className="flex items-start gap-2 rounded-xl border border-[#e2eadd] p-3 text-xs leading-relaxed text-[#5f7764]"><ShieldAlert size={18} className="shrink-0" aria-hidden="true"/>No imported model-run file changes the farmer assistant, scenario figures, NASA queries or global-coordinate analysis. A complete reproducible implementation from P2 is still required before calculating fresh suitability scores.</p>
  </section>;
}
