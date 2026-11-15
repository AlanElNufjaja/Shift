import { AlertTriangle, ArrowRight, CheckCircle2, CloudSun, Info, Satellite } from 'lucide-react';
import { usePower } from '../../context/PowerContext.jsx';
import { formatoNumero } from '../../lib/diagnostics.js';
import { displayMonth } from '../../lib/displayEnglish.js';
import { POWER_HEAT_REFERENCE_C, resumirClimaPower } from '../../lib/powerDiagnostics.js';

/** Sección climática real solo cuando NASA POWER ha sido consultada explícitamente. */
export default function PowerDiagnosticSummary() {
  const power = usePower();
  const clima = resumirClimaPower(power);

  if (power.status !== 'success') {
    return <div className="rounded-2xl border border-[#c9dfcf] bg-[#f0f7f0] p-4 sm:p-5">
      <div className="flex items-start gap-3"><Satellite size={22} className="mt-0.5 shrink-0 text-agri" aria-hidden="true" />
        <div className="min-w-0"><h3 className="font-extrabold text-forest">NASA POWER climate · available on request</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[#59745f]">Climate indicators in this assessment still use synthetic JSON. Query a NASA POWER year to view real meteorological evidence without merging it with demo SMAP data.</p>
          <a className="focus-ring mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-forest px-3 text-xs font-bold text-white hover:bg-[#2a6245]" href="#datos">Open NASA POWER query <ArrowRight size={15} /></a>
        </div>
      </div>
    </div>;
  }

  return <section className="rounded-2xl border border-[#bbdcca] bg-[#f2f9f2] p-4 sm:p-5" aria-label="NASA POWER climate summary">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5"><Satellite size={20} className="mt-0.5 shrink-0 text-[#36774c]" aria-hidden="true" />
        <div><h3 className="text-[14px] font-extrabold text-forest">Queried climate · NASA POWER {power.year}</h3>
          <p className="mt-1 text-[11px] text-[#607b67]">Monthly regional maximum temperature (T2M_MAX) · {clima.nTemperatura}/12 months with temperature; {clima.nPrecipitacion}/12 with precipitation</p></div>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${clima.completo ? 'bg-[#dbeee0] text-[#387349]' : 'bg-[#fff0d3] text-[#976629]'}`}>
        {clima.completo ? <CheckCircle2 size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}
        {clima.completo ? '12/12 months' : 'Partial series'}
      </span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-white p-3.5"><p className="text-[11px] text-muted">Maximum recorded in available months</p><strong className="mt-1 block text-xl font-extrabold text-forest">{clima.maxTemperatura === null ? 'No data' : `${formatoNumero(clima.maxTemperatura, 1)} °C`}</strong></div>
      <div className="rounded-xl bg-white p-3.5"><p className="text-[11px] text-muted">Months above {POWER_HEAT_REFERENCE_C} °C</p><strong className="mt-1 block text-xl font-extrabold text-forest">{clima.disponible ? `${clima.mesesSuperanReferencia.length} of ${clima.nTemperatura} observed` : 'No data'}</strong></div>
    </div>
    {clima.disponible && <p className="mt-3 text-[11px] text-[#4e6f58]">{clima.mesesSuperanReferencia.length ? `Exploratory reference exceeded in: ${clima.mesesSuperanReferencia.map(displayMonth).join(', ')}.` : 'The exploratory reference was not exceeded in months with available temperature.'} {clima.completo ? '' : 'The series is incomplete; no conclusions are drawn for missing months.'}</p>}
    <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#e3dbba] bg-[#fffaf0] p-3 text-[11px] leading-relaxed text-[#795f3c]"><Info className="mt-0.5 shrink-0" size={17} aria-hidden="true" />{clima.limitacion || 'No NASA temperature is available for this period; missing values are not replaced with zeros.'}</p>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#5e7466]"><span className="inline-flex items-center gap-1"><CloudSun size={14} />Climate source: NASA POWER</span><a href="#datos" className="focus-ring font-bold text-agri hover:underline">Review chart, year and provenance</a></div>
  </section>;
}
