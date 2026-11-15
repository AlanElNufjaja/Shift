import { ArrowUpRight, CheckCircle2, Info, ShieldAlert, Sprout } from 'lucide-react';
import { buildTeamModelEvidence } from '../../lib/teamModelEvidence.js';

const format = n => n === null ? 'Not recorded' : new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(n);

/** One historical snapshot, deliberately distinct from the three modeled scenarios. */
export default function TeamModelEvidence({ site, compact = false, onExplore }) {
  const evidence = buildTeamModelEvidence(site);
  if (!evidence) return null;

  return <section className={`rounded-[20px] border border-[#dbe8d8] bg-white ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`} aria-label="Team model evidence, 2024">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-extrabold text-forest"><Sprout size={18} aria-hidden="true"/> Team model · 2024 snapshot</p>
      <span className="rounded-full bg-[#fff4e5] px-3 py-1 text-xs font-bold text-[#8b622e]">Not independently audited</span>
    </div>
    <p className="mt-2 text-sm leading-relaxed text-[#5a7461]">This historical model output is provided by the team. It did <strong>not</strong> select or calculate the scenario shown above.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-[#f2f7ef] p-3">
        <p className="text-xs text-[#68806d]">Team's label</p>
        <p className="mt-1 text-base font-extrabold text-forest">{evidence.category}</p>
        <p className="mt-1 text-xs text-[#6e826f]">For the recorded 2024 crop: {evidence.recordedCrop}</p>
      </div>
      <div className="rounded-xl bg-[#f2f7ef] p-3">
        <p className="text-xs text-[#68806d]">Reported suitability score</p>
        <p className="mt-1 text-2xl font-extrabold text-forest">{format(evidence.score)}</p>
        <p className="text-xs text-[#6e826f]">Raw score; not a percent, probability or yield forecast</p>
      </div>
    </div>
    <p className="mt-3 text-sm text-[#516c58]"><strong>Crops mentioned by the team:</strong> {evidence.candidates.join(' · ') || 'None recorded'}.</p>
    <details className="mt-4 rounded-xl border border-[#dce8d9] bg-[#fbfdfa] p-3">
      <summary className="focus-ring cursor-pointer text-sm font-bold text-[#2f7046]">See reported model inputs and checks</summary>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {evidence.inputs.map(input => <div key={input.key} className="rounded-lg border border-[#e4ebe0] bg-white p-3">
          <p className="text-xs font-semibold text-[#64806e]">{input.label}</p>
          <p className="mt-1 text-lg font-bold text-forest">{format(input.value)}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#738775]">{input.note}</p>
        </div>)}
      </div>
      <div className="mt-4 space-y-2">
        {evidence.checks.map(check => <p key={check.label} className="flex items-start gap-2 text-xs text-[#5f7964]">
          {check.passed ? <CheckCircle2 size={16} className="shrink-0 text-[#347b50]" aria-hidden="true"/> : <ShieldAlert size={16} className="shrink-0 text-[#b37b37]" aria-hidden="true"/>}
          {check.label}: <strong>{check.passed ? 'Consistent within archive' : 'Needs review'}</strong>
        </p>)}
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fff7e9] p-3 text-xs leading-relaxed text-[#875d29]"><Info size={16} className="shrink-0"/>Internal agreement does not confirm satellite provenance, calibration or the formula. Model weights and validation records were not delivered.</p>
    </details>
    {compact && onExplore && <button type="button" onClick={onExplore} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbdcc9] px-4 text-sm font-bold text-[#326c47] hover:bg-[#eef7eb]">Open 10-year team history <ArrowUpRight size={16} aria-hidden="true"/></button>}
    {!compact && <p className="mt-3 text-xs leading-relaxed text-[#728475]">Team-provided historical data · pilot coordinates differ from illustrative map pins · Not used for global fields or economic scenario calculations.</p>}
  </section>;
}
