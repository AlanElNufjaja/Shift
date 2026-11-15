import { Activity, ArrowUpRight, CheckCircle2, CloudRain, Database, FlaskConical, Info, LoaderCircle, RefreshCw, Satellite, ThermometerSun, WifiOff } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatoNumero } from '../../lib/diagnostics.js';
import { displayMonth } from '../../lib/displayEnglish.js';
import { POWER_SOURCE_URL, POWER_YEAR_OPTIONS } from '../../lib/powerApi.js';
import { usePower } from '../../context/PowerContext.jsx';
import { useSmapNumeric } from '../../context/SmapNumericContext.jsx';
import { useField } from '../../context/FieldContext.jsx';

const fuentes = [
  { name: 'NASA POWER', detail: 'Monthly climate · official API on request', type: 'power' },
  { name: 'NASA SMAP', detail: 'Optional SMAP L4 numerical percentile query; GIBS L3 imagery is separate.', type: 'smap' },
  { name: 'USDA SSURGO', detail: 'Soil properties · demo values', type: 'demo' },
  { name: 'USDA CropScape', detail: 'Crop history · demo values', type: 'demo' },
  { name: 'USDA Market News', detail: 'Prices/scenarios · demo estimates', type: 'demo' },
];

function PowerTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const mes = payload[0]?.payload;
  if (!mes) return null;
  return (
    <div className="rounded-xl border border-[#dfebde] bg-white p-3 text-xs shadow-lg">
      <strong className="block text-forest">{displayMonth(mes.mes)} {mes.periodo.slice(0, 4)}</strong>
      <span className="mt-1 block text-[#bc6a3e]">Reported max. temperature: {mes.temperatura === null ? 'No data' : `${formatoNumero(mes.temperatura, 1)} °C`}</span>
      <span className="mt-1 block text-[#377f9b]">Average precipitation: {mes.lluvia === null ? 'No data' : `${formatoNumero(mes.lluvia, 2)} mm/day`}</span>
    </div>
  );
}

/** Consulta explícita: no sustituye los indicadores SMAP/USDA ni el simulador de demostración. */
export default function PowerDataPanel({ parcela }) {
  const { year, setYear, status, datos, mensaje, consultedAt, consultar } = usePower();
  const success = status === 'success';
  const { evidenciaParcela } = useField();
  const smapNumeric = useSmapNumeric();

  return (
    <section id="datos" className="scroll-mt-24 space-y-4" aria-labelledby="data-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">04 / Evidence and sources</div>
          <h2 id="data-title" className="section-title">Verifiable data and source coverage</h2>
          <p className="mt-1 max-w-[800px] text-[12px] leading-relaxed text-muted">Query NASA POWER climate for the selected field. The overview and assessment update climate indicators only. When enabled, P1 SMAP/USDA observations show their stated provenance; combined alerts and strategies remain synthetic demo scenarios.</p>
        </div>
        <div className="flex flex-wrap gap-3"><a href="#integracion" className="focus-ring inline-flex min-h-10 items-center rounded-lg border border-[#d9e8d9] px-3 text-xs font-bold text-agri hover:bg-[#f2f8f1]">Validate P1 JSON</a><a href={POWER_SOURCE_URL} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-agri hover:underline">NASA POWER documentation <ArrowUpRight size={15} aria-hidden="true" /></a></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(265px,1fr)]">
        <div className="panel min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e4f1ed] text-agri"><Satellite size={21} aria-hidden="true" /></span>
              <div>
                <h3 className="text-[15px] font-extrabold text-forest">Monthly climate · NASA POWER</h3>
                <p className="mt-0.5 text-[11px] text-muted">{parcela?.nombre} · {parcela?.lat?.toFixed(4)}, {parcela?.lon?.toFixed(4)} · regional resolution</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold ${success ? 'bg-[#e8f6e8] text-[#367947]' : 'bg-[#f1f5ef] text-[#687e6a]'}`}>
              {success ? <CheckCircle2 size={13} aria-hidden="true" /> : <Database size={13} aria-hidden="true" />}
              {success ? 'NASA response received' : 'Optional query'}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-[11px] font-bold text-forest" htmlFor="power-year">
              Full year
              <select id="power-year" value={year} onChange={(event) => setYear(Number(event.target.value))} className="focus-ring min-h-11 rounded-xl border border-border-soft bg-white px-3 text-sm text-forest">
                {POWER_YEAR_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <button type="button" disabled={status === 'loading'} onClick={() => consultar({ refresh: success })}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-xs font-extrabold text-white transition-colors hover:bg-[#255e42] disabled:opacity-60">
              {status === 'loading' ? <LoaderCircle className="animate-spin" size={17} /> : success ? <RefreshCw size={17} /> : <Satellite size={17} />}
              {status === 'loading' ? 'Querying NASA…' : success ? 'Refresh query' : 'Query NASA POWER'}
            </button>
          </div>
          <div className="mt-4" role="status" aria-live="polite">
            {status === 'idle' && <p className="rounded-xl bg-[#eef5eb] px-4 py-3 text-xs leading-relaxed text-[#527459]">Select a year and click “Query NASA POWER”. No API keys are required. The response updates the climate indicator and assessment; it does not modify SMAP or strategies.</p>}
            {status === 'loading' && <p className="rounded-xl bg-[#f1f6f3] px-4 py-3 text-xs text-[#416a4e]">Requesting a 12-month series for the selected location…</p>}
            {status === 'error' && <div className="flex gap-2 rounded-xl border border-[#f1ddc4] bg-[#fff7ec] px-4 py-3 text-xs leading-relaxed text-[#8d5e2b]"><WifiOff className="mt-0.5 shrink-0" size={17} aria-hidden="true" />{mensaje}</div>}
            {success && <p className="rounded-xl border border-[#d8e9d9] bg-[#f1f8f0] px-4 py-3 text-xs text-[#39704a]">Query received {new Date(consultedAt).toLocaleString('en-US')} · {mensaje || 'NASA POWER Monthly Point API'} · period {year}</p>}
          </div>

          {success && <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e9efea] bg-[#fbfcfa] p-3"><div className="flex items-center gap-1.5 text-[10px] text-[#718775]"><ThermometerSun size={14} /> Reported maximum</div><strong className="mt-1 block text-lg text-forest">{datos.temperaturaPico === null ? 'No data' : `${formatoNumero(datos.temperaturaPico, 1)} °C`}</strong></div>
              <div className="rounded-xl border border-[#e9efea] bg-[#fbfcfa] p-3"><div className="flex items-center gap-1.5 text-[10px] text-[#718775]"><CloudRain size={14} /> Average precipitation</div><strong className="mt-1 block text-lg text-forest">{datos.lluviaMediaDiaria === null ? 'No data' : `${formatoNumero(datos.lluviaMediaDiaria, 2)} mm/day`}</strong></div>
              <div className="rounded-xl border border-[#e9efea] bg-[#fbfcfa] p-3"><div className="flex items-center gap-1.5 text-[10px] text-[#718775]"><Activity size={14} /> Valid months (T° / P)</div><strong className="mt-1 block text-lg text-forest">{datos.mesesTemperatura}/12 · {datos.mesesPrecipitacion}/12</strong></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[13px] font-extrabold text-forest">Temperature and precipitation · {year}</h4>
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-muted"><span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-[#c57e49]" />Maximum °C</span><span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-[#448ba4]" />Precipitation mm/day</span></div>
            </div>
            <div className="mt-3 h-[270px] min-w-0" role="img" aria-label={`NASA POWER maximum temperature and monthly precipitation during ${year}, with separate axes and missing values left uninterpolated.`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={datos.serie} margin={{ top: 10, right: 4, bottom: 4, left: -16 }}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e7eee8" />
                  <XAxis dataKey="abreviatura" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#78907b' }} />
                  <YAxis yAxisId="t" tick={{ fontSize: 10, fill: '#bc7a4f' }} axisLine={false} tickLine={false} width={42} unit="°" />
                  <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 10, fill: '#448ba4' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<PowerTooltip />} />
                  <Line yAxisId="t" type="monotone" dataKey="temperatura" connectNulls={false} stroke="#c57e49" strokeWidth={2.8} dot={{ r: 2.5 }} isAnimationActive={false} />
                  <Line yAxisId="p" type="monotone" dataKey="lluvia" connectNulls={false} stroke="#448ba4" strokeWidth={2.8} dot={{ r: 2.5 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-[#677b6c]"><Info size={16} className="mt-0.5 shrink-0" /> NASA POWER variables come from regional meteorological products. Monthly precipitation is expressed as a mean rate (mm/day), not a monthly total. The series does not establish conditions measured inside a field.</p>
          </>}
        </div>

        <aside className="panel p-4 sm:p-5" aria-label="Data source status">
          <div className="mb-4 flex items-center gap-2"><Database size={19} className="text-agri" /><h3 className="text-sm font-extrabold text-forest">Source traceability</h3></div>
          <div className="space-y-2.5">
            {fuentes.map(({ name, detail, type }) => {
              const real = (type === 'power' && success) || (type === 'smap' && smapNumeric.status === 'ready');
              const fuenteP1 = ({'NASA SMAP':'smap','USDA SSURGO':'ssurgo','USDA CropScape':'cropscape'})[name];
              const importada = !!(fuenteP1 && evidenciaParcela?.[fuenteP1]);
              const userSmap = type === 'smap' && smapNumeric.uploaded?.status === 'ready';
              return <div key={name} className="rounded-xl border border-[#e4ece2] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[12px] text-forest">{name}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${real ? 'bg-[#e5f3e4] text-[#35784d]' : 'bg-[#fff3df] text-[#916329]'}`}>{userSmap ? (smapNumeric.uploaded.source?.type==='appeears-api'?'NASA API task':'Earthdata CSV · not audited') : real ? 'API queried' : importada ? (evidenciaParcela.modoEjemplo ? 'Fictional' : 'P1 declared') : type === 'power' || type === 'smap' ? 'Optional' : 'Demo'}</span></div>
                <p className="mt-1 text-[11px] text-muted">{userSmap ? `AppEEARS ${smapNumeric.uploaded.source.dataset} point sample for ${smapNumeric.year}; volumetric m³/m³; quality flags not independently reviewed.` : importada ? `Local file ${evidenciaParcela.modoEjemplo ? "FICTIONAL" : "P1 not audited"}: ${evidenciaParcela[fuenteP1].meta.periodo}.` : type === 'smap' && smapNumeric.status === 'unavailable' ? 'SMAP percentile request unavailable; no substitute product used.' : type === 'smap' && smapNumeric.status === 'error' ? 'SMAP percentile request failed; no substitute product used.' : real && type === 'smap' ? `SMAP L4 percentile for ${smapNumeric.year}; not moisture content percentage.` : detail}</p>
              </div>;
            })}
          </div>
          <div className="mt-4 rounded-xl bg-[#f2f7f0] p-3"><div className="flex items-center gap-2 text-[11px] font-extrabold text-forest"><FlaskConical size={15} /> Data integrity rule</div><p className="mt-1 text-[11px] leading-relaxed text-[#627869]">The point-map layers, mixed demo alerts, combined diagnostic chart and simulator remain illustrative. Individual indicators may use imported P1 data that have not been audited. SMAP/POWER series are compared only for matching years; no recommendations are generated automatically.</p></div>
        </aside>
      </div>
    </section>
  );
}
