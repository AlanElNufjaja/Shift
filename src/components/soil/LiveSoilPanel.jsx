import { CheckCircle2, ChevronDown, Database, Globe2, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { useSoil } from '../../context/SoilContext.jsx';

function read(value, unit='') {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('en-US',{maximumFractionDigits:2})}${unit}` : 'Not reported';
}

/** USDA is U.S.-focused. A point lookup is neither a field survey nor a crop recommendation. */
export default function LiveSoilPanel({compact=false}) {
  const soil=useSoil();
  const ready=['ready','partial'].includes(soil.status);
  return <details className="rounded-[18px] border border-[#dbe9d8] bg-white p-4 sm:p-5" aria-label="Optional official soil evidence">
    <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-forest">
      <span className="flex items-center gap-2"><Database size={18} className="text-agri"/> Check USDA soil mapping</span>
      <ChevronDown size={18} className="text-[#6a856d]"/>
    </summary>
    <div className="mt-3 space-y-3">
      <p className="text-sm leading-relaxed text-[#5e7764]">Optional official SSURGO lookup for the selected point, primarily within the United States. Coordinates are sent to the USDA service only after you press the button. Not a field soil test.</p>
      <button type="button" onClick={soil.check} disabled={soil.status==='loading'} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-60">
        {soil.status==='loading'?<RefreshCw size={17} className="animate-spin"/>:<Globe2 size={17}/>} {soil.status==='loading'?'Checking USDA…':soil.status==='idle'?'Check this location':'Check again'}
      </button>
      {soil.status==='idle'&&<p className="text-xs text-[#738b76]">No lookup has been made for this location yet.</p>}
      {soil.status==='loading'&&<p role="status" className="text-sm text-[#65816b]">Searching USDA NRCS Soil Data Access…</p>}
      {soil.status==='error'&&<p role="alert" className="rounded-xl border border-[#eedbb6] bg-[#fff8eb] p-3 text-sm text-[#8e652c]">{soil.error} This does not change your existing assessment.</p>}
      {soil.status==='unavailable'&&<div role="status" className="rounded-xl border border-[#e7dfca] bg-[#fff8ea] p-3 text-sm text-[#846833]"><ShieldAlert size={17} className="mr-1 inline"/> No mapped USDA soil unit was returned. This may be outside USDA coverage or in an unmapped area. No California fallback was used.</div>}
      {ready&&<div className="space-y-3" aria-live="polite">
        <div className="flex items-start gap-2 rounded-xl bg-[#eaf4e7] p-3 text-sm text-[#2e6441]"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/> <span>{soil.status === 'partial' ? 'USDA located a map unit, but detailed soil attributes are not available right now.' : 'USDA point mapping found. It has not been used to recalculate field risk or crop recommendations.'}</span></div>
        <div className={`grid gap-2 ${compact?'sm:grid-cols-2':'sm:grid-cols-3'}`}>
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Mapped soil unit</p><p className="mt-1 text-sm font-bold text-forest">{soil.data.soil.mapunit_name || 'Not reported'}</p><p className="mt-1 text-xs text-[#69816e]">MUKEY: {soil.data.soil.mapunit_key || '—'}</p></div>
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Major component / top horizon</p><p className="mt-1 text-sm font-bold text-forest">{soil.data.soil.component_name || 'Not reported'}</p><p className="mt-1 text-xs text-[#69816e]">Depth: {read(soil.data.soil.horizon_top_cm)}–{read(soil.data.soil.horizon_bottom_cm,' cm')}</p></div>
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Organic matter (horizon)</p><p className="mt-1 text-lg font-extrabold text-forest">{read(soil.data.soil.organic_matter_percent,' %')}</p></div>
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Available water capacity</p><p className="mt-1 text-sm font-bold text-forest">{read(soil.data.soil.available_water_capacity_fraction,' cm³/cm³')}</p></div>
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Soil erodibility K factor</p><p className="mt-1 text-sm font-bold text-forest">{read(soil.data.soil.soil_erodibility_k_factor)}</p><p className="mt-1 text-xs text-[#69816e]">Not field erosion risk</p></div>
        </div>
        {soil.status === 'partial' && <p role="status" className="rounded-xl bg-[#fff8eb] p-3 text-sm text-[#8e652c]">{soil.data.reason}</p>}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[#627b68]"><Info size={15} className="mt-0.5 shrink-0"/> {soil.data.provenance.provider} · Retrieved {new Date(soil.data.provenance.retrieved_at).toLocaleDateString('en-US')} · {soil.data.cache==='hit'?'Cached response':'New response'} · Top horizon of major mapped component, not field measurement.</p>
      </div>}
    </div>
  </details>;
}
