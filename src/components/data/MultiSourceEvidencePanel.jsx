import { displayTerm } from '../../lib/displayEnglish.js';
import { Activity, ArrowUpRight, ClipboardCheck, Database, Droplets, Info, Layers3, Leaf, ShieldAlert } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useField } from '../../context/FieldContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { formatoNumero } from '../../lib/diagnostics.js';

const texto = (value) => value === null || value === undefined || value === '' ? 'No data' : String(value);

function Procedencia({ meta, titulo, modoEjemplo = false }) {
  return <div className="rounded-xl border border-[#e1e9dd] bg-[#f7faf5] p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-[12px] text-forest">{titulo}</strong><span className="rounded-full bg-[#e4f2e2] px-2 py-1 text-[10px] font-extrabold text-[#367347]">{modoEjemplo ? "FICTIONAL EXAMPLE" : "P1 · declared"}</span></div>
    <p className="mt-1 text-[11px] text-[#5e7866]">{meta.fuente} · {meta.periodo} · {meta.unidad}</p>
    {meta.producto && <p className="mt-1 text-[11px] text-muted">Product: {meta.producto}{meta.resolucion_km ? ` · ${meta.resolucion_km} nominal km` : ''}</p>}
    {meta.resolucion_m && <p className="mt-1 text-[11px] text-muted">Declared resolution: {meta.resolucion_m} m</p>}
    {meta.mukey && <p className="mt-1 text-[11px] text-muted">Map unit (mukey): {meta.mukey}</p>}
    {meta.metodo && <p className="mt-1 break-words text-[11px] text-muted">Method: {meta.metodo}</p>}
    {meta.url && <a className="focus-ring mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-agri hover:underline" href={meta.url} target="_blank" rel="noreferrer">Open declared source <ArrowUpRight size={13}/></a>}
  </div>;
}

/**
 * Visualización de observaciones aportadas por P1, separada de las alertas demo.
 * Un cruce con POWER solo se presenta si ambos conjuntos corresponden al mismo año.
 * NO genera umbrales, clasificaciones de estrés ni recomendaciones agronómicas.
 */
export default function MultiSourceEvidencePanel() {
  const { parcela, evidenciaParcela: evidence, archivoP1 } = useField();
  const power = usePower();
  const modoEjemplo = !!evidence?.modoEjemplo;
  const smap = evidence?.smap;
  const suelo = evidence?.ssurgo;
  const cropscape = evidence?.cropscape;
  const ubicacionCompatible = !!evidence && Math.abs(evidence.coordenadasP1.lat - parcela.lat) <= 0.02 && Math.abs(evidence.coordenadasP1.lon - parcela.lon) <= 0.02;
  const mismoAnio = !!smap && ubicacionCompatible && power.status === 'success' && power.year === smap.anio;
  const serie = smap?.serie.map((m, i) => ({
    ...m,
    temperatura: mismoAnio ? power.datos.serie[i]?.temperatura ?? null : null,
  })) ?? [];

  return <section id="evidencias-p1" className="scroll-mt-24 space-y-4" aria-labelledby="evidencia-p1-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="eyebrow mb-1">05 / Multi-source evidence</div>
        <h2 id="evidencia-p1-title" className="section-title">P1-provided observations</h2>
        <p className="mt-1 max-w-[800px] text-[12px] leading-relaxed text-muted">Imported observations by field, without replacing the demo signal calendar, map layers or recommendation engine.</p>
      </div>
      <a className="focus-ring inline-flex min-h-10 items-center rounded-lg border border-[#d9e8d9] px-3 text-xs font-bold text-agri hover:bg-[#f2f8f1]" href="#integracion">Load or remove sources</a>
    </div>
    {!evidence && <div className="panel flex items-start gap-3 p-5 sm:p-6">
      <Database className="mt-0.5 shrink-0 text-agri" size={21}/>
      <div><h3 className="text-sm font-extrabold text-forest">No P1 observations for {parcela.nombre}</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">{archivoP1 ? 'The loaded batch has no eligible sources for this field. ' : 'You have not enabled a team file yet. '}The existing map and charts remain in demo mode. Use “Upload or remove sources” when you receive P1’s file.</p></div>
    </div>}
    {evidence && <>
      <div className="flex items-start gap-2 rounded-xl border border-[#ecd9b2] bg-[#fff9e9] p-3 text-[11px] leading-relaxed text-[#7f6536]"><ShieldAlert className="mt-0.5 shrink-0" size={17}/><p><strong>{modoEjemplo ? "Entirely fictional test file." : "Data provided by P1, not audited."}</strong> Metadata and numeric values do not prove the product, location, map unit or satellite classification is correct. They are not merged into demo alerts, and the map coordinates are unchanged.</p></div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="panel min-w-0 p-4 sm:p-5 xl:col-span-2">
          <div className="flex items-center gap-2"><Droplets size={18} className="text-[#367d9c]"/><h3 className="text-[14px] font-extrabold text-forest">SMAP · volumetric soil moisture</h3></div>
          {!smap && <p className="mt-3 text-xs text-muted">No eligible SMAP series for this field.</p>}
          {smap && <>
            <div className="mt-3 flex flex-wrap items-end gap-5">
              <div><p className="text-[11px] text-muted">Average of available months · {smap.anio}</p><strong className="text-[24px] font-extrabold text-forest">{formatoNumero(smap.media, 1)} %</strong></div>
              <div><p className="text-[11px] text-muted">Months with data</p><strong className="text-xl font-extrabold text-forest">{smap.disponibles} / 12</strong></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold text-[#597163]"><span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-[#3786a8]"/>Imported SMAP (%)</span>{mismoAnio && <span className="flex items-center gap-1"><i className="size-2.5 rounded-full bg-[#d58b4f]"/>Queried POWER (°C)</span>}</div>
            <div className="mt-3 h-[260px] min-w-0" role="img" aria-label={`SMAP series provided by P1 for ${smap.anio}, ${smap.disponibles} months. ${mismoAnio ? 'Shown alongside NASA POWER for the same year, without inferring water stress.' : 'Not combined with a mismatched NASA POWER year or geographic point.'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serie} margin={{top:10,right:4,left:-18,bottom:0}}>
                  <CartesianGrid vertical={false} stroke="#e5eee8" strokeDasharray="4 4"/>
                  <XAxis dataKey="abreviatura" tick={{fontSize:10,fill:'#819287'}} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="s" domain={[0,100]} tick={{fontSize:10,fill:'#3786a8'}} axisLine={false} tickLine={false} tickFormatter={(v)=>`${v}%`}/>
                  {mismoAnio && <YAxis yAxisId="p" orientation="right" tick={{fontSize:10,fill:'#d58b4f'}} axisLine={false} tickLine={false} unit="°"/>}
                  <Tooltip formatter={(value, name)=>value == null ? ['No data',name] : [`${formatoNumero(value,1)} ${name==='SMAP'?'%':'°C'}`,name]}/>
                  <Line yAxisId="s" name="SMAP" type="monotone" dataKey="humedad" stroke="#3786a8" strokeWidth={3} connectNulls={false} dot={{r:3}} isAnimationActive={false}/>
                  {mismoAnio && <Line yAxisId="p" name="POWER" type="monotone" dataKey="temperatura" stroke="#d58b4f" strokeWidth={3} connectNulls={false} dot={{r:3}} isAnimationActive={false}/>}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#6a816c]">{mismoAnio ? `Both series are shown for ${smap.anio}, but their resolutions and methods still differ. No combined alert is generated automatically.` : `POWER is not plotted with SMAP: year and approximate location must match. For ${smap.anio}, query POWER under “Data” if that year is available, and check P1 coordinates.`} Soil moisture is surface volumetric content, not a percentile or usable irrigation water.</p>
            <div className="mt-3"><Procedencia titulo="NASA SMAP" meta={smap.meta} modoEjemplo={modoEjemplo}/></div>
          </>}
        </div>
        <div className="panel p-4 sm:p-5">
          <div className="flex items-center gap-2"><Layers3 size={18} className="text-agri"/><h3 className="text-[14px] font-extrabold text-forest">USDA SSURGO · properties</h3></div>
          {!suelo && <p className="mt-3 text-xs text-muted">No eligible SSURGO properties.</p>}
          {suelo && <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ['Texture',displayTerm(suelo.suelo.textura)],
                ['Retention',displayTerm(suelo.suelo.retencion_agua)],
                ['Erosion',displayTerm(suelo.suelo.riesgo_erosion)],
                ['Organic matter',suelo.suelo.materia_organica_pct === null ? 'No data' : `${formatoNumero(suelo.suelo.materia_organica_pct,1)} %`],
              ].map(([k,v])=><div key={k} className="rounded-lg bg-[#f3f8f0] p-3"><p className="text-[10px] text-muted">{k}</p><p className="mt-1 text-[12px] font-bold text-forest">{v}</p></div>)}
            </div>
            <p className="mt-3 text-[11px] text-muted">A representative soil-map-unit property is not a soil test from this exact point.</p>
            <div className="mt-3"><Procedencia titulo="USDA SSURGO" meta={suelo.meta} modoEjemplo={modoEjemplo}/></div>
          </>}
        </div>
      </div>
      <div className="panel p-4 sm:p-5">
        <div className="flex items-center gap-2"><Leaf size={18} className="text-agri"/><h3 className="text-[14px] font-extrabold text-forest">USDA CropScape · classified crop history</h3></div>
        {!cropscape && <p className="mt-3 text-xs text-muted">No eligible CropScape history.</p>}
        {cropscape && <>
          <div className="mt-3 flex flex-wrap gap-2">{cropscape.registros.map((r)=><div key={r.anio} className="min-w-[112px] flex-1 rounded-xl border border-[#e2ede0] bg-[#f9fbf7] p-3"><p className="text-[10px] font-bold text-muted">{r.anio}</p><p className="mt-1 text-[12px] font-extrabold text-forest">{displayTerm(r.cultivo)}</p></div>)}</div>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted"><Info size={16} className="shrink-0"/>CropScape classifies cover or crop by year. It cannot reliably determine months without cover or identify crops in a field without error.</p>
          <div className="mt-3"><Procedencia titulo="USDA CropScape" meta={cropscape.meta} modoEjemplo={modoEjemplo}/></div>
        </>}
      </div>
      <div className="flex gap-2 rounded-xl bg-[#edf5ec] p-3 text-[11px] text-[#4f7357]"><ClipboardCheck size={17} className="shrink-0"/><p>Before using results for crop recommendations, P1 must verify provenance and geolocation, P2 must check temporal compatibility, and an agronomist must validate conditions in the field.</p></div>
    </>}
  </section>;
}
