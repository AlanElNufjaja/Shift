import { useMemo } from 'react';
import { Activity, ArrowUpRight, Database, Info, ShieldAlert } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useField } from '../../context/FieldContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { useSmapNumeric } from '../../context/SmapNumericContext.jsx';
import { useSoil } from '../../context/SoilContext.jsx';
import { useCrop } from '../../context/CropContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { screenObservedEvidence } from '../../lib/observedEvidence.js';

/** Independent evidence review. Never feeds demo alerts or recommendations. */
export function useObservedEvidence() {
  const { parcela } = useField();
  const power = usePower();
  const smap = useSmapNumeric();
  const soil = useSoil();
  const crop = useCrop();
  return useMemo(() => screenObservedEvidence({ field:parcela, power, smap, soil, crop }),
    [parcela, power.status, power.year, power.key, power.datos, power.parcelaId,
      smap.year, smap.uploaded, soil.status, soil.data, crop.status, crop.data]);
}

export function EvidenceQuickAccess() {
  const screen = useObservedEvidence();
  const { irADatos } = useGuidedFlow();
  // Keep the farmer's screen uncluttered until at least one relevant official source was requested.
  if (screen.source_status.power === 'not_eligible' && screen.source_status.smap === 'not_eligible' &&
      screen.source_status.soil === 'not_used' && screen.source_status.crop === 'not_used') return null;
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#dce8d7] bg-white p-4" aria-label="Official evidence status">
    <div className="max-w-[560px]">
      <p className="flex items-center gap-2 text-sm font-bold text-forest"><Database size={17} className="text-agri"/> Official evidence review</p>
      <p className="mt-1 text-xs leading-relaxed text-[#607865]">{screen.status === 'screened'
        ? `${screen.matched_months} matching POWER–SMAP months in ${screen.year}; ${screen.relative_overlap_months.length} warmer-and-drier months relative to this year's medians. Not a crop diagnosis.`
        : 'Official source records are available or pending. Cross-source screening requires matching POWER and volumetric SMAP months.'}</p>
    </div>
    <button type="button" onClick={()=>irADatos('diagnostico')} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbdcca] px-3 text-xs font-bold text-[#2d6b42]">Review evidence <ArrowUpRight size={15}/></button>
  </div>;
}

export default function ObservedEvidencePanel() {
  const screen = useObservedEvidence();
  const { irADatos } = useGuidedFlow();
  const screened = screen.status === 'screened';
  return <section className="space-y-4 rounded-[20px] border border-[#d7e7d5] bg-white p-4 sm:p-6" aria-labelledby="observed-evidence-title">
    <header className="space-y-2">
      <p className="eyebrow">Observed evidence · Cross-source review</p>
      <h2 id="observed-evidence-title" className="section-title flex items-center gap-2"><Activity className="text-agri" size={21}/> Do warmer and drier months overlap?</h2>
      <p className="max-w-[790px] text-sm text-[#5b7563]">This is a descriptive comparison of official-source records, <strong>not a field diagnosis</strong> and not a recomputed crop recommendation.</p>
    </header>
    <div className="grid gap-2 sm:grid-cols-4" aria-label="Eligible observation sources">
      {[
        ['NASA POWER',screen.source_status.power === 'queried' ? 'Matching year' : 'Not ready'],
        ['NASA SMAP',screen.source_status.smap === 'appeears_task' ? 'API task' : screen.source_status.smap === 'bundled_appeears' ? 'Bundled Fresno 2024 sample' : screen.source_status.smap === 'user_supplied_csv' ? 'Imported CSV' : 'Not ready'],
        ['USDA SSURGO',screen.source_status.soil === 'mapped' ? 'Mapped unit' : screen.source_status.soil === 'partial' ? 'Partial mapping' : 'Not checked'],
        ['USDA CDL',screen.source_status.crop === 'pixel_classified' ? `${screen.crop_context.year} pixel` : 'Not checked'],
      ].map(([label, status])=><div key={label} className="rounded-xl bg-[#f4f8f2] px-3 py-3"><strong className="block text-xs text-forest">{label}</strong><span className="mt-1 block text-xs text-[#5d7663]">{status}</span></div>)}
    </div>
    <div className={`rounded-xl p-4 text-sm ${screened ? 'border border-[#cfe4c9] bg-[#eff7ec] text-[#315f3b]' : 'border border-[#eeddbf] bg-[#fff8ea] text-[#835f32]'}`} role="status">
      <strong>{screened ? `${screen.relative_overlap_months.length} of ${screen.matched_months} matched months are relatively warmer and drier (${screen.year}).` : 'Cross-source screening is not available yet.'}</strong>
      <p className="mt-1 leading-relaxed">{screen.reason}</p>
      {!screened && <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={()=>irADatos('nasa')} className="focus-ring min-h-10 rounded-lg border border-current px-3 text-xs font-bold">Open NASA POWER</button>
        <button type="button" onClick={()=>irADatos('smap')} className="focus-ring min-h-10 rounded-lg border border-current px-3 text-xs font-bold">Open NASA SMAP</button>
      </div>}
    </div>
    {screened && <>
      <p className="text-xs text-[#5f7764]">The rule uses the <strong>median of matching months within the selected year</strong>: temperature above its median AND volumetric surface moisture below its median. It does not detect simultaneous daily events.</p>
      <div className="h-[290px] w-full" role="img" aria-label="Monthly NASA POWER maximum air temperature and AppEEARS volumetric surface moisture on separate axes">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={screen.months} margin={{left:0,right:8,top:14,bottom:12}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e9e0"/>
            <XAxis dataKey="label" tick={{fontSize:11}}/>
            <YAxis yAxisId="temperature" orientation="left" unit="°C" tick={{fontSize:11}} width={48}/>
            <YAxis yAxisId="moisture" orientation="right" unit="" tick={{fontSize:11}} width={48} domain={[0,0.8]}/>
            <Tooltip formatter={(value,name)=>[typeof value==='number' ? value.toFixed(name==='Surface moisture (m³/m³)'?3:1) : '—',name]}/>
            <Line yAxisId="temperature" type="monotone" dataKey="temperature_c" name="Monthly max temp (°C)" stroke="#cf8249" strokeWidth={2} connectNulls={false} dot={{r:3}}/>
            <Line yAxisId="moisture" type="monotone" dataKey="moisture_m3m3" name="Surface moisture (m³/m³)" stroke="#287bb4" strokeWidth={2} connectNulls={false} dot={{r:3}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5b7662]"><Info size={15}/> Relative overlap months: <strong>{screen.relative_overlap_months.length ? screen.relative_overlap_months.join(', ') : 'None under this descriptive rule'}</strong>. Missing observations remain blank.</div>
    </>}
    <details className="rounded-xl border border-[#dce8d9] p-4">
      <summary className="cursor-pointer text-sm font-bold text-forest">Data quality, method and field checks</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-[#59745f]">{screen.limitations.map(item=><li key={item}>{item}</li>)}</ul>
      <p className="mt-3 flex items-start gap-2 text-xs text-[#866532]"><ShieldAlert size={16} className="shrink-0"/> Consult an agronomist and check root-zone moisture, irrigation and crop stage before making decisions.</p>
    </details>
  </section>;
}
