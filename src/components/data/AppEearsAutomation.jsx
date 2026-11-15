import { useEffect, useRef, useState } from 'react';
import { CloudDownload, Info, LoaderCircle, ShieldCheck } from 'lucide-react';
import { inspectSmapCsv, parseSmapCsv } from '../../lib/smapCsvImport.js';

const API = '/api/earthdata';
async function api(path, options = {}) {
  let response;
  try { response = await fetch(`${API}${path}`, {...options, headers:{'Content-Type':'application/json', ...options.headers}}); }
  catch { throw new Error('The local Python backend is not reachable.'); }
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'NASA AppEEARS service unavailable.');
  return data;
}

/** Optional local-only bridge: Earthdata credentials never enter React. */
export default function AppEearsAutomation({ lat, lon, year, onLoaded }) {
  const [config,setConfig] = useState(null);
  const [options,setOptions] = useState(null);
  const [task,setTask] = useState(null);
  const [stage,setStage] = useState('idle');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const keyRef=useRef(`${lat}:${lon}:${year}`);
  keyRef.current=`${lat}:${lon}:${year}`;

  useEffect(()=>{
    let active=true;
    setTask(null);setStage('idle');setMessage('');setConfig(null);setOptions(null);
    api('/config').then(info=>{if(active) {setConfig(info);return api('/options');}}).then(value=>{if(active&&value)setOptions(value);}).catch(error=>{if(active)setMessage(error.message);});
    return ()=>{active=false;};
  },[lat,lon,year]);

  useEffect(()=>{
    if(!task?.task_id || !['submitted','pending','queued','processing'].includes(stage))return;
    let active=true;
    const check=()=>api(`/tasks/${encodeURIComponent(task.task_id)}`).then(result=>{
      if(active) {setStage(result.status); if(['failed','error','cancelled'].includes(result.status))setMessage('NASA could not process this request. Try manual CSV import.');}
    }).catch(error=>{if(active){setStage('error');setMessage(error.message);}});
    check();const timer=setInterval(check,20000);
    return ()=>{active=false;clearInterval(timer);};
  },[task?.task_id,stage]);

  async function submit() {
    const requestedKey=keyRef.current;
    setBusy(true);setMessage('');
    try {
      const result=await api('/tasks',{method:'POST',body:JSON.stringify({lat,lon,year})});
      if(keyRef.current!==requestedKey) return;
      setTask(result);setStage(result.status);setMessage('NASA is processing your point sample. You can keep exploring Field Shift.');
    } catch(error) {if(keyRef.current===requestedKey)setMessage(error.message);} finally {if(keyRef.current===requestedKey)setBusy(false);}
  }

  async function loadData() {
    if(!task?.task_id) return;
    const requestedKey=keyRef.current;
    setBusy(true);setMessage('');
    try {
      const result=await api(`/tasks/${encodeURIComponent(task.task_id)}/csv`);
      const details=inspectSmapCsv(result.csv,'SPL4SMGP');
      if(details.candidates.length!==1) throw new Error('NASA returned multiple surface-moisture columns. Download the CSV and choose the column manually.');
      const parsed=parseSmapCsv({text:result.csv,product:'SPL4SMGP',column:details.candidates[0],year,lat,lon});
      if(keyRef.current!==requestedKey) return;
      onLoaded({...parsed,source:{...parsed.source,type:'appeears-api',dataset:result.product,
        provider:'NASA AppEEARS (authenticated local API task)',task_id:result.task_id,
        verification:'Downloaded from AppEEARS using the local account; per-observation quality flags not independently verified.'}});
      setMessage(`SMAP measurements loaded for ${parsed.valid_months}/12 months. No crop recommendations were changed.`);
    } catch(error) {if(keyRef.current===requestedKey)setMessage(error.message);} finally {if(keyRef.current===requestedKey)setBusy(false);}
  }

  return <div className="space-y-3 rounded-2xl border border-[#d4e5d3] bg-[#f6faf4] p-4">
    <div className="flex items-center gap-2"><CloudDownload size={20} className="text-agri"/><h3 className="font-bold text-forest">Request SMAP directly from NASA AppEEARS</h3></div>
    <p className="text-xs leading-relaxed text-[#59735f]">Optional local automation. A free NASA Earthdata account is needed. Your password is entered in your own terminal, never in this page. NASA may take time to process the task.</p>
    {!config && <p className="text-xs text-[#7b7457]" role="status">{message || 'Checking local AppEEARS configuration…'}</p>}
    {config && !config.authenticated && <p className="rounded-xl bg-[#fff4e7] p-3 text-xs text-[#986b35]">Set up Earthdata locally: <code>py backend\earthdata_login.py</code>, then refresh this page. Start the API with <code>backend\start-local.cmd</code>.</p>}
    {config && config.authenticated && <>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#416c4e]"><ShieldCheck size={17}/> AppEEARS token configured · backend-only</div>
      {options ? <p className="text-xs text-[#58725f]">Dataset: <strong>{options.product}</strong> · layer <code>{options.layer}</code> · requested {year} at {lat.toFixed(4)}, {lon.toFixed(4)}</p> : <p className="text-xs text-[#986b35]">{message || 'Checking NASA product and layer availability…'}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!options||busy||!!task} onClick={submit} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-50">{busy?<LoaderCircle size={17} className="animate-spin"/>:<CloudDownload size={17}/>} Request point sample</button>
        {task && <span role="status" className="rounded-lg border border-[#d4e5d3] bg-white px-3 py-2 text-xs font-semibold text-forest">NASA task: {stage}</span>}
        {task && ['error','failed','cancelled'].includes(stage) && <button type="button" onClick={()=>{setTask(null);setStage('idle');setMessage('');}} className="focus-ring min-h-11 rounded-xl border border-[#d5e5d3] bg-white px-4 text-sm font-bold text-forest">Try again</button>}
        {stage==='done' && <button type="button" disabled={busy} onClick={loadData} className="focus-ring min-h-11 rounded-xl bg-[#d9edcf] px-4 text-sm font-bold text-forest disabled:opacity-50">Load into chart</button>}
      </div>
    </>}
    {message && config && <p role="status" className="text-xs leading-relaxed text-[#617966]">{message}</p>}
    <p className="flex items-start gap-2 text-xs text-[#6a806d]"><Info size={15} className="mt-0.5 shrink-0"/> This is a regional SMAP L4 estimate. A completed NASA task confirms its origin, not independent QA of each observation. The manual CSV option below remains available.</p>
  </div>;
}
