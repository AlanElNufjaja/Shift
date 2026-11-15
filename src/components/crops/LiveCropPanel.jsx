import { CalendarDays, CheckCircle2, ChevronDown, Crop, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { useCrop } from '../../context/CropContext.jsx';
import { CDL_YEARS } from '../../lib/cropApi.js';

/** Single-pixel official USDA classification, never promoted to farmer planting records. */
export default function LiveCropPanel() {
  const crop=useCrop();
  return <details className="rounded-[18px] border border-[#dbe9d8] bg-white p-4 sm:p-5" aria-label="Optional USDA crop classification">
    <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-forest">
      <span className="flex items-center gap-2"><Crop size={18} className="text-agri"/> Check USDA crop map</span>
      <ChevronDown size={18} className="text-[#6a856d]"/>
    </summary>
    <div className="mt-3 space-y-3">
      <p className="text-sm leading-relaxed text-[#5e7764]">An optional USDA Cropland Data Layer (CDL) lookup for one map pixel in the continental United States. It does not confirm what was planted across your entire field.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[135px] flex-col gap-1 text-sm font-semibold text-forest"><span className="flex items-center gap-1"><CalendarDays size={15}/> Map year</span>
          <select value={crop.year} onChange={e=>crop.selectYear(e.target.value)} className="focus-ring min-h-11 rounded-xl border border-[#d6e6d4] bg-white px-3 text-sm">
            {CDL_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <button type="button" onClick={crop.check} disabled={crop.status==='loading'} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-60">
          {crop.status==='loading'?<RefreshCw size={17} className="animate-spin"/>:<Crop size={17}/>}{crop.status==='loading'?'Checking USDA…':crop.status==='idle'?'Check this point':'Check again'}
        </button>
      </div>
      {crop.status==='idle'&&<p className="text-xs text-[#718876]">No crop-map request has been made for this point and year.</p>}
      {crop.status==='loading'&&<p role="status" className="text-sm text-[#65816b]">Looking up the {crop.year} classified pixel…</p>}
      {crop.status==='error'&&<p role="alert" className="rounded-xl border border-[#f0dbb7] bg-[#fff7e9] p-3 text-sm text-[#8a622a]">{crop.error} The rest of Field Shift remains available.</p>}
      {['unavailable','outside_coverage','unverified'].includes(crop.status)&&<p role="status" className="flex items-start gap-2 rounded-xl border border-[#e7dfca] bg-[#fff8ea] p-3 text-sm text-[#846833]"><ShieldAlert size={17} className="mt-0.5 shrink-0"/>{crop.data?.reason || 'No accepted classification was returned.'}</p>}
      {crop.status==='ready'&&<div className="space-y-3" aria-live="polite">
        <div className="flex items-start gap-2 rounded-xl bg-[#eaf4e7] p-3 text-sm text-[#2e6441]"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/><span>USDA returned a classification for a {crop.year} map pixel. It is not a verified field-wide planting record.</span></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Mapped class</p><p className="mt-1 text-lg font-extrabold text-forest">{crop.data?.classification?.label || 'Class name unavailable'}</p></div>
          <div className="rounded-xl bg-[#f4f8f2] p-3"><p className="text-xs text-[#628068]">Class code / year</p><p className="mt-1 text-lg font-extrabold text-forest">{crop.data?.classification?.code} · {crop.data?.year}</p></div>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[#617866]"><Info size={15} className="mt-0.5 shrink-0"/>Single raster pixel; crop boundaries and classification accuracy must be checked. This does not replace team history, recalculate P2 strategies or confirm monoculture.</p>
        <p className="text-xs text-[#728977]">Source: {crop.data.provenance.provider} · Queried {new Date(crop.data.provenance.retrieved_at).toLocaleDateString('en-US')} · {crop.data.cache==='hit'?'Cached result':'New request'}</p>
      </div>}
    </div>
  </details>;
}
