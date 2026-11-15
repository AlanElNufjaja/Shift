import { useEffect, useRef, useState } from 'react';
import { Database, Droplets, ExternalLink, FileUp, Info, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePower } from '../../context/PowerContext.jsx';
import { useSmapNumeric } from '../../context/SmapNumericContext.jsx';
import { SMAP_NUMERIC_REFERENCE, SMAP_NUMERIC_YEARS } from '../../lib/smapNumericApi.js';
import { inspectSmapCsv, parseSmapCsv } from '../../lib/smapCsvImport.js';
import { useField } from '../../context/FieldContext.jsx';
import AppEearsAutomation from './AppEearsAutomation.jsx';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const APPEEARS = 'https://appeears.earthdatacloud.nasa.gov/';
const FRESNO_2024 = '/data/smap-fresno-2024.csv';
const FRESNO_SM_COORDS = {lat:36.7468,lon:-119.7726};

/** Independent SMAP numerical evidence. An unsupported POWER alias is never silently
 * replaced by MERRA-2 or by pixel colors. Real exported point samples can be imported.
 */
export default function SmapNumericPanel() {
  const { parcela } = useField();
  const smap = useSmapNumeric();
  const power = usePower();
  const [product,setProduct] = useState('SPL4SMGP');
  const [csv,setCsv] = useState('');
  const [fileName,setFileName] = useState('');
  const [column,setColumn] = useState('');
  const [columns,setColumns] = useState([]);
  const [importError,setImportError] = useState('');
  const [bundledLoading,setBundledLoading] = useState(false);
  const bundledAbort = useRef(null);
  useEffect(()=>()=>bundledAbort.current?.abort(),[]);
  const canLoadBundled = smap.year===2024 && Math.abs(parcela.lat-FRESNO_SM_COORDS.lat)<0.00001 && Math.abs(parcela.lon-FRESNO_SM_COORDS.lon)<0.00001;
  useEffect(()=>{bundledAbort.current?.abort();smap.clearSample();setCsv('');setFileName('');setColumn('');setColumns([]);setImportError('');setBundledLoading(false);},[smap.year]);

  function inspect(text,selectedProduct) {
    setCsv(text);smap.clearSample();setColumn('');setColumns([]);setImportError('');
    if(!text) return;
    try {
      const details=inspectSmapCsv(text,selectedProduct);
      setColumns(details.candidates);
      setColumn(details.candidates[0]);
    } catch(err) {setImportError(err.message);}
  }
  async function readCsv(event) {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file) return;
    if(file.size>8_000_000) {setImportError('Maximum CSV size is 8 MB.');return;}
    try { const text=await file.text(); setFileName(file.name);inspect(text,product); }
    catch {setImportError('The CSV file could not be read.');}
  }
  function applyCsv() {
    try {
      const result=parseSmapCsv({text:csv,product,column,year:smap.year,lat:parcela.lat,lon:parcela.lon});
      smap.importSample(result);setImportError('');
    } catch(err) {smap.clearSample();setImportError(err.message);}
  }
  async function loadBundledFresno() {
    if(!canLoadBundled) return;
    bundledAbort.current?.abort();
    const controller=new AbortController();
    bundledAbort.current=controller;
    setBundledLoading(true);setImportError('');
    try {
      const response=await fetch(FRESNO_2024,{signal:controller.signal});
      if(!response.ok) throw new Error(`Bundled sample download failed (HTTP ${response.status}).`);
      const text=await response.text();
      const details=inspectSmapCsv(text,'SPL4SMGP');
      const expected='SPL4SMGP_008_Geophysical_Data_sm_surface';
      if(!details.candidates.includes(expected)) throw new Error('The bundled sample has an unexpected NASA product column.');
      const result=parseSmapCsv({text,product:'SPL4SMGP',column:expected,year:2024,lat:FRESNO_SM_COORDS.lat,lon:FRESNO_SM_COORDS.lon});
      if(result.audit.matched_rows!==2928 || result.valid_months!==12) throw new Error('Bundled sample failed its expected monthly coverage checks.');
      if(controller.signal.aborted) return;
      smap.importSample({...result,source:{...result.source,
        provider:'NASA Earthdata AppEEARS — bundled Fresno point sample',
        type:'bundled-appeears',dataset:'SPL4SMGP',product_version:'008',
        task_id:'26454539-0d77-4a58-9996-fdd3d8b9abaf',
        verification:'AppEEARS export supplied with the project; CSV format, coordinates, dates and range checked. Independent per-observation QA not completed.'}});
    } catch(error) {if(!controller.signal.aborted)setImportError(error.message);}
    finally {if(!controller.signal.aborted)setBundledLoading(false);}
  }
  const display=smap.uploaded ?? (smap.status==='ready' ? smap.data : null);
  const ready=display?.status==='ready';
  const volumetric=['uploaded-csv','appeears-api','bundled-appeears'].includes(display?.source?.type);
  const alignPower=ready && power.status==='success' && power.year===smap.year;
  const chart=ready?display.months.map((month,i)=>({
    name:MONTHS[i],date:month.date,
    moisture:volumetric?month.surface_volumetric:month.surface_percentile,
    count:volumetric?month.sample_count:month.valid_days,
    temperature:alignPower?power.datos?.serie?.[i]?.temperatura ?? null:null,
  })):[];
  return <section className="space-y-5 rounded-[20px] border border-[#d7e7d5] bg-white p-4 sm:p-6" aria-labelledby="smap-numeric-title">
    <header className="space-y-2">
      <p className="eyebrow">NASA SMAP · numerical soil moisture</p>
      <h2 id="smap-numeric-title" className="section-title flex items-center gap-2"><Droplets size={20} className="text-agri"/> Soil moisture by month</h2>
      <p className="max-w-[820px] text-sm leading-relaxed text-[#58725f]">SMAP numerical data can describe modeled or satellite-derived <strong>surface moisture (0–5 cm)</strong>. Volumetric moisture (m³/m³) is different from a percentile ranking. Neither is a direct field sensor.</p>
    </header>
    <label className="grid w-fit gap-1.5 text-xs font-bold text-forest">Observation year
      <select aria-label="SMAP numerical year" value={smap.year} onChange={event=>smap.setYear(Number(event.target.value))} className="focus-ring min-h-11 rounded-xl border border-[#d5e5d3] bg-white px-3 text-sm">
        {SMAP_NUMERIC_YEARS.map(year=><option key={year} value={year}>{year}</option>)}
      </select>
    </label>
    {canLoadBundled && <div className="space-y-2 rounded-2xl border border-[#c7dfc9] bg-[#f1f8ee] p-4">
      <div className="flex items-center gap-2"><Database size={18} className="text-agri"/><h3 className="text-sm font-bold text-forest">Fresno 2024 · supplied NASA AppEEARS sample</h3></div>
      <p className="text-xs leading-relaxed text-[#5b735e]">The team provided a SMAP L4 v8 point-sample export for this exact location: 2,928 observations in 2024. Load the 12-month mean series without an Earthdata sign-in. This is a regional 9 km model estimate; observation-level quality flags were not independently reviewed.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={bundledLoading} onClick={loadBundledFresno} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-60">{bundledLoading?<LoaderCircle size={16} className="animate-spin"/>:<Database size={16}/>} {bundledLoading?'Loading NASA sample…':'Load supplied Fresno sample'}</button>
        <a href={FRESNO_2024} download className="text-xs font-semibold text-agri underline">Download source CSV</a>
      </div>
    </div>}
    <AppEearsAutomation lat={parcela.lat} lon={parcela.lon} year={smap.year} onLoaded={smap.importSample}/>
    <div className="space-y-3 rounded-2xl border border-[#d4e5d3] bg-[#f6faf4] p-4">
      <div className="flex items-center gap-2"><FileUp size={20} className="text-agri"/><h3 className="font-bold text-forest">Import an official Earthdata point-sample CSV</h3></div>
      <p className="text-sm leading-relaxed text-[#536d5c]">The automatic POWER request for <code>SFMC_PRCNTL</code> is unavailable for your test. NASA <strong>AppEEARS</strong> provides downloadable SMAP point samples for a chosen date range and coordinate. This import runs locally in your browser; it does not request your Earthdata password.</p>
      <a href={APPEEARS} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 text-sm font-semibold text-agri underline">Open NASA AppEEARS (free Earthdata sign-in) <ExternalLink size={14}/></a>
      <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-[#58725f]">
        <li>Create a <strong>Point Sample</strong> for the selected coordinates ({parcela.lat.toFixed(4)}, {parcela.lon.toFixed(4)}) and {smap.year}.</li>
        <li>Choose <strong>SPL4SMGP</strong> layer <code>sm_surface</code>, or <strong>SPL3SMP_E</strong> layer <code>soil_moisture_am</code>/<code>soil_moisture_pm</code>; download the results CSV.</li>
        <li>Upload the CSV below. Latitude, longitude, Date, and one supported measurement column are required. Values must be in <strong>m³/m³</strong>, not percent.</li>
      </ol>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-forest">SMAP dataset
          <select aria-label="Earthdata SMAP product" className="focus-ring min-h-11 rounded-xl border border-[#d5e5d3] bg-white px-3 text-sm" value={product} onChange={event=>{setProduct(event.target.value);inspect(csv,event.target.value);}}>
            <option value="SPL4SMGP">SPL4SMGP · L4 model · 9 km</option>
            <option value="SPL3SMP_E">SPL3SMP_E · L3 radiometer · 9 km</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-forest">AppEEARS results (.csv)
          <input type="file" accept=".csv,text/csv" aria-label="Upload Earthdata CSV" onChange={readCsv} className="focus-ring block w-full min-w-0 rounded-xl border border-[#d5e5d3] bg-white p-2 text-xs text-forest"/>
        </label>
        {columns.length>0 && <label className="grid gap-1 text-xs font-bold text-forest">Measurement column
          <select aria-label="SMAP measurement column" className="focus-ring min-h-11 rounded-xl border border-[#d5e5d3] bg-white px-3 text-sm" value={column} onChange={e=>setColumn(e.target.value)}>
            {columns.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </label>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!csv||!column} onClick={applyCsv} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-50">Show imported measurements</button>
        {fileName && <span className="text-xs text-[#607765]">{fileName}</span>}
      </div>
      {importError && <p role="alert" className="rounded-xl bg-[#fff4e7] p-3 text-xs text-[#966334]">{importError}</p>}
      <p className="text-xs text-[#6a7e6d]"><Info size={14} className="mr-1 inline"/> Uploaded data are labeled <strong>user-supplied</strong> until their Earthdata provenance, processing and quality flags have been independently checked.</p>
    </div>
    <details className="rounded-xl border border-[#dce7d9] p-4">
      <summary className="cursor-pointer text-sm font-bold text-forest">Experimental: check POWER SMAP percentile availability</summary>
      <div className="mt-3 space-y-3 text-sm text-[#58725f]">
        <p>This older request is retained for diagnostics, not as the primary numerical data source. NASA POWER may reject the requested alias. <strong>A percentile of 20 does not mean 20% water content.</strong></p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={smap.status==='loading'} onClick={smap.query} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#bed6be] bg-white px-4 text-sm font-bold text-forest disabled:opacity-60">
            {smap.status==='loading'?<LoaderCircle size={17} className="animate-spin"/>:<RefreshCw size={17}/>}
            {smap.status==='loading'?'Checking NASA…':'Check POWER parameter'}
          </button>
          <a href={SMAP_NUMERIC_REFERENCE} target="_blank" rel="noreferrer" className="text-xs text-agri underline">NASA POWER hydrology documentation</a>
        </div>
        {smap.status==='unavailable' && <p role="status" className="rounded-xl bg-[#fff4e7] p-3 text-xs text-[#956b37]">{smap.data?.reason || 'No SMAP percentile series returned.'} Import a verified AppEEARS point CSV instead.</p>}
        {smap.status==='error' && <p role="alert" className="rounded-xl bg-[#fff4e7] p-3 text-xs text-[#956b37]">{smap.error}</p>}
      </div>
    </details>
    {ready && <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eef6eb] p-4 text-xs text-[#356747]">
        <strong>{display.valid_months}/12 months · {smap.year}</strong>
        <span>{volumetric?`${display.source.dataset} · surface moisture m³/m³ · ${display.source.type==='appeears-api'?'NASA AppEEARS API task':display.source.type==='bundled-appeears'?'supplied NASA AppEEARS export':'user-uploaded CSV'}`:'SMAP percentile rank · NASA POWER'}</span>
      </div>
      {volumetric && <p className="flex items-start gap-2 rounded-xl border border-[#f1dfc5] bg-[#fff9ee] p-3 text-xs text-[#93672e]"><TriangleAlert size={17} className="shrink-0"/>The CSV values and coordinates were checked. NASA API tasks identify their source, but observation-level quality flags have not been independently verified. Do not use it to automatically adjust crop recommendations.</p>}
      <div role="img" aria-label={`Monthly ${volumetric?'volumetric SMAP soil moisture':'SMAP moisture percentile'} during ${smap.year}; missing months are gaps. ${alignPower?'POWER temperature shown on another axis.':''}`}>
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{top:12,right:10,bottom:6,left:0}}>
              <CartesianGrid stroke="#e5eee6" strokeDasharray="4 4" vertical={false}/>
              <XAxis dataKey="name" tick={{fontSize:11,fill:'#66846d'}}/>
              <YAxis yAxisId="m" domain={volumetric?[0,'auto']:[0,100]} width={48} tick={{fontSize:11,fill:'#2b8f85'}}/>
              {alignPower && <YAxis yAxisId="t" orientation="right" width={44} tick={{fontSize:11,fill:'#c57e49'}}/>}
              <Tooltip formatter={(val,key)=>[key==='Surface moisture'?`${Number(val).toFixed(3)} m³/m³`:key==='SMAP percentile'?`${Number(val).toFixed(1)}th percentile`:`${Number(val).toFixed(1)} °C`,key]}/>
              <Line yAxisId="m" type="monotone" dataKey="moisture" name={volumetric?'Surface moisture':'SMAP percentile'} stroke="#2b8f85" strokeWidth={3} dot={{r:3}} connectNulls={false} isAnimationActive={false}/>
              {alignPower && <Line yAxisId="t" type="monotone" dataKey="temperature" name="POWER maximum temperature" stroke="#c57e49" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false}/>}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-[#617966]">{alignPower ? 'SMAP moisture (left axis) and POWER temperature in °C (right axis), matched by year and selected field.' : 'To compare with temperature, query NASA POWER for the same year.'}</p>
      </div>
      <details className="rounded-xl border border-[#e1eadf] p-3 text-xs text-[#58725f]"><summary className="cursor-pointer font-bold text-forest">Monthly values and sample counts</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{chart.map(m=><div key={m.date} className="rounded-lg bg-[#f6f9f4] p-2"><strong>{m.name}</strong><p>{m.moisture===null?'No data':volumetric?`${m.moisture.toFixed(3)} m³/m³`:`${m.moisture.toFixed(1)}th percentile`}</p><p>{m.count} observations</p></div>)}</div>
      </details>
    </div>}
    <p className="flex items-start gap-2 rounded-xl border border-[#dce8dd] bg-[#f6faf4] p-3 text-xs leading-relaxed text-[#536d5c]"><Info size={16} className="mt-0.5 shrink-0"/> SMAP imagery is a different product from the numerical series. Both are regional estimates, not field probes. Neither changes the existing demo risk alerts or P2 strategies.</p>
  </section>;
}
