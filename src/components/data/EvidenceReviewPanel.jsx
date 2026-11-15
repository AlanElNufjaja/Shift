import { displayMonth, displayTerm } from '../../lib/displayEnglish.js';
import { ArrowRight, ArrowUpRight, CheckCircle2, Database, Droplets, FlaskConical, GitCompareArrows, Info, ShieldAlert, ThermometerSun } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useField } from '../../context/FieldContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { formatoNumero } from '../../lib/diagnostics.js';
import { revisarCruceClimatico, revisarDiferencias } from '../../lib/evidenceReview.js';

function verValor(valor, unidad = '') {
  if (valor === null || valor === undefined || valor === '') return 'No data';
  return `${typeof valor === 'number' ? formatoNumero(valor, 1) : displayTerm(valor)}${unidad ? ` ${unidad}` : ''}`;
}

function Estado({ listo, children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${listo ? 'bg-[#e8f4e8] text-[#316f42]' : 'bg-[#fff4df] text-[#90642b]'}`}>{listo ? <CheckCircle2 size={12} /> : <Info size={12} />}{children}</span>;
}

function Comparacion({ revision }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Estado listo={true}>{revision.fuentesActivas.length} P1 source(s) visible</Estado>
      <Estado listo={false}>{revision.cuentaDistintos} indicator(s) changed</Estado>
      <span className="text-[#728878]">{revision.cuentaIguales} match</span>
    </div>
    <p className="rounded-xl border border-[#e5ebde] bg-[#f7faf5] p-3 text-[11px] leading-relaxed text-[#627764]">
      <strong>Before and after importing.</strong> “Demo” is the illustrative dashboard data. “P1” is the active imported file, not yet audited. Differences show what changed on screen, <strong>not</strong> real farming trends or improvements.
    </p>
    {revision.indicadores.length === 0 ? <p className="text-xs text-muted">No imported indicators are available to compare.</p> :
      <div className="overflow-hidden rounded-xl border border-[#e5ece5]">
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 bg-[#eef5ed] px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#48664f]">
          <span>Indicator</span><span>Before · DEMO</span><span>After · P1</span>
        </div>
        {revision.indicadores.map((item) => <div key={item.key} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-t border-[#e8efe8] px-3 py-3 text-[11px]">
          <div className="min-w-0"><span className="block font-extrabold text-forest">{item.titulo}</span><span className="mt-1 text-[10px] text-muted">{item.fuente}</span></div>
          <span className="break-words font-semibold text-[#718276]">{verValor(item.demo, item.unidad)}</span>
          <div className="min-w-0"><span className="block break-words font-extrabold text-forest">{verValor(item.importado, item.unidad)}</span><span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${item.diferente ? 'bg-[#fff1db] text-[#9a681e]' : 'bg-[#e7f5e7] text-[#387048]'}`}>{item.diferente ? 'Changed' : 'Matches'}</span></div>
        </div>)}
      </div>}
    {revision.mensual.length > 0 && <div className="rounded-xl border border-[#e4ece3] bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2"><Droplets size={18} className="text-[#357e9b]"/><h4 className="text-[13px] font-extrabold text-forest">How do the soil-moisture curves differ?</h4></div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">Blue: imported SMAP series ({revision.anioSmap}). Dashed green: demo data with no specified observation year. Curves are overlaid <strong>only to compare displayed values</strong>, not to calculate a time anomaly.</p>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold"><span className="text-[#347c9d]">● SMAP P1</span><span className="text-[#347b50]">┄ SMAP demo</span></div>
      <div className="mt-2 h-[218px] min-w-0" role="img" aria-label="Visual comparison of twelve demo moisture values and imported SMAP data; the periods are not equivalent.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revision.mensual} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e5ece6" strokeDasharray="3 4" />
            <XAxis dataKey="abreviatura" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#819287' }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#819287' }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(n, name) => n == null ? ['No data', name] : [`${formatoNumero(n, 1)} %`, name]} />
            <Line name="SMAP P1" dataKey="importado" type="monotone" stroke="#347c9d" strokeWidth={3} connectNulls={false} dot={{ r: 2 }} isAnimationActive={false}/>
            <Line name="SMAP demo" dataKey="demo" type="monotone" stroke="#347b50" strokeWidth={2} strokeDasharray="5 4" connectNulls={false} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>}
    {revision.historial.length > 0 && <div className="rounded-xl border border-[#e4ece3] p-3 sm:p-4">
      <h4 className="text-[12px] font-extrabold text-forest">Crop history: year-by-year differences</h4>
      <div className="mt-2 space-y-2">{revision.historial.map((r) => <div key={r.anio} className="grid grid-cols-[45px_minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-lg bg-[#f7faf6] p-2 text-[10px]"><strong>{r.anio}</strong><span className="break-words text-[#718276]">DEMO: {r.demo ? displayTerm(r.demo) : 'No data'}</span><span className="break-words font-semibold text-forest">P1: {r.importado ? displayTerm(r.importado) : 'No data'}{r.diferente ? ' · changed' : ''}</span></div>)}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">CropScape classifies land cover by pixel; an imported record alone cannot confirm the full cropping history of a field.</p>
    </div>}
  </div>;
}

function CruceExploratorio({ resultado, power, revision }) {
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-[14px] font-extrabold text-forest"><ThermometerSun size={19} className="text-[#cb8b50]"/>Climate overlaps</h3><Estado listo={resultado.listo}>{resultado.listo ? `Descriptive overlap ${resultado.anio}` : 'Comparison blocked'}</Estado></div>
    {!resultado.listo ? <div className="rounded-xl border border-[#f0dfc0] bg-[#fff9ee] p-4 text-[11px] leading-relaxed text-[#795f31]"><div className="flex items-start gap-2"><ShieldAlert size={18} className="mt-0.5 shrink-0"/><div><strong>Why these sources cannot yet be combined</strong><p className="mt-1">{resultado.mensaje}</p></div></div>
      <div className="mt-3 flex flex-wrap gap-2"><a href="#datos" className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#e5cca1] bg-white px-3 py-1 font-bold">Query NASA POWER <ArrowUpRight size={13}/></a><a href="#integracion" className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#e5cca1] bg-white px-3 py-1 font-bold">Load P1 data <ArrowUpRight size={13}/></a></div>
    </div> : <>
      <div className="grid gap-2 sm:grid-cols-3">
        {[['Paired months', `${resultado.nPares}/12`], ['Overlaps', `${resultado.nOverlaps}`], ['Months without valid pairs', `${12 - resultado.nPares}`]].map(([title, value]) => <div key={title} className="rounded-xl bg-[#f0f7ef] p-3"><p className="text-[10px] font-semibold text-[#658068]">{title}</p><p className="mt-1 text-[23px] font-extrabold text-forest">{value}</p></div>)}
      </div>
      <p className="rounded-xl bg-[#f6f9f5] p-3 text-[11px] leading-relaxed text-[#526e5a]">Exploratory team reference: monthly POWER temperature <strong>above 35 °C</strong> and SMAP surface volumetric moisture <strong>below 15%</strong> within the same month. These are not universal agronomic thresholds; the overlap does not establish crop stress or an irrigation need.</p>
      <div className="flex flex-wrap gap-1.5" aria-label="Paired months and overlaps">{resultado.meses.map((m) => <div key={m.mes} title={`${displayMonth(m.mes)}: ${m.disponible ? `${verValor(m.humedad, '%')}, ${verValor(m.temperatura, '°C')}` : 'No valid pair'}`} className={`flex min-w-[61px] flex-1 flex-col items-center rounded-lg border px-2 py-2 text-[10px] ${!m.disponible ? 'border-[#e6eae6] bg-[#f7f8f7] text-[#8e9b8f]' : m.coincide ? 'border-[#eac79c] bg-[#fff1db] text-[#946122]' : 'border-[#d6e8d8] bg-[#edf7ed] text-[#357047]'}`}><span className="font-extrabold">{displayMonth(m.mes).slice(0, 3)}</span><span>{!m.disponible ? 'No data' : m.coincide ? 'Matches' : 'No overlap'}</span></div>)}</div>
      <p className="text-[11px] leading-relaxed text-muted">{resultado.mensaje} {resultado.nPares < 12 ? `There are ${12 - resultado.nPares} missing paired months; they cannot be assumed risk-free.` : 'Twelve valid pairs are available, but the analysis remains exploratory.'}</p>
    </>}
    <div className="rounded-xl border border-[#dce8db] p-3 text-[11px] leading-relaxed text-muted"><strong className="text-forest">Source status: </strong>{revision.modoEjemplo ? 'P1 FICTIONAL' : revision.disponible ? 'P1 declared, not audited' : 'P1 not enabled'} · {power.status === 'success' ? `POWER queried (${power.year})` : 'POWER not queried'}. The point map, demo diagnostic alerts and three strategies are not recalculated from this comparison. Decisions require data auditing and field validation.</div>
  </div>;
}

export default function EvidenceReviewPanel() {
  const { parcela, evidenciaParcela, archivoP1 } = useField();
  const power = usePower();
  const revision = revisarDiferencias(parcela, evidenciaParcela);
  const resultado = revisarCruceClimatico({ parcela, evidencia: evidenciaParcela, power });
  return <section id="comparacion-fuentes" className="scroll-mt-24 space-y-4" aria-labelledby="compare-title">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><div className="eyebrow mb-1">06 / Clear, traceable data</div><h2 id="compare-title" className="section-title">What changed after importing your data?</h2><p className="mt-1 text-[12px] text-muted">Visual comparison between the prototype and P1 sources, including climate overlaps when the data supports them.</p></div>
      <a href="#integracion" className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d8e7d5] bg-white px-3 text-xs font-bold text-agri">Manage file <ArrowRight size={16}/></a>
    </div>
    {!revision.disponible && <div className="panel flex items-start gap-3 p-5 sm:p-6"><Database size={23} className="mt-0.5 shrink-0 text-agri"/><div><h3 className="text-sm font-extrabold text-forest">Enable a P1 file first</h3><p className="mt-1 text-[12px] leading-relaxed text-muted">To see the differences, open “P1 data”, download the FICTIONAL example, import it and select “Activate valid sources”. Return here to compare the values side by side.</p><a className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-3 py-2 text-[11px] font-bold text-white" href="#integracion">Go to import <ArrowRight size={14}/></a></div></div>}
    {revision.disponible && <>
      <div className="flex items-start gap-2 rounded-xl border border-[#f0dab7] bg-[#fff9ef] p-3 text-[11px] text-[#80643a]"><FlaskConical size={18} className="mt-0.5 shrink-0"/><p><strong>{revision.modoEjemplo ? 'Fictional test file.' : 'P1 file enabled, without independent audit.'}</strong> {archivoP1} · this comparison shows which on-screen values changed; it does not validate them or prove real-world impacts.</p></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel min-w-0 p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><GitCompareArrows size={19} className="text-agri"/><h3 className="text-[14px] font-extrabold text-forest">Demo vs. imported file</h3></div><Comparacion revision={revision}/></div>
        <div className="panel min-w-0 p-4 sm:p-5"><CruceExploratorio resultado={resultado} power={power} revision={revision}/></div>
      </div>
    </>}
  </section>;
}
