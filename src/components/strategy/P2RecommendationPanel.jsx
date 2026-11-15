import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, Download, FileUp, FlaskConical, GitCompareArrows, Info, RotateCcw, ShieldAlert } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { formatoDinero, formatoNumero, PRIORIDADES } from '../../lib/diagnostics.js';
import { MAX_P2_BYTES, resumirVinculoP2, validarArchivoP2 } from '../../lib/recommendationIntake.js';
import { usePower } from '../../context/PowerContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import estrategiasDemo from '../../data/estrategias_demo.json';

const METRICAS = [
  { key: 'agua_mm', label: 'Water (mm/cycle)' },
  { key: 'nitrogeno_kg_acre', label: 'Nitrogen (kg/acre)' },
  { key: 'ingreso_usd_acre', label: 'Gross revenue (USD/acre)' },
];
const NUMERO = (v, key) => v == null ? 'No data' : key === 'ingreso_usd_acre' ? formatoDinero(v) : formatoNumero(v, 1);

function CuadroDiferencias({ estrategias, parcela }) {
  const demos = estrategiasDemo[parcela.id] ?? [];
  return <div className="mt-4 min-w-0 overflow-x-auto rounded-xl border border-[#dbe9d8]" aria-label="Differences between demo and P2 strategies">
    <table className="w-full min-w-[610px] border-collapse text-left text-[11px]">
      <thead><tr className="bg-[#eef5ec] text-[#3f6d49]"><th className="px-3 py-3">Strategy</th>{METRICAS.map((m) => <th key={m.key} className="px-3 py-3">{m.label}<span className="mt-0.5 block text-[10px] font-normal">Demo → P2</span></th>)}</tr></thead>
      <tbody>{estrategias.map((e) => {
        const demo = demos.find((d) => d.id === e.id);
        return <tr key={e.id} className="border-t border-[#e2ece0] align-top text-[#335440]"><th scope="row" className="px-3 py-3 font-extrabold">{e.titulo}</th>{METRICAS.map((m) => {
          const distinto = demo?.[m.key] !== e[m.key];
          return <td key={m.key} className={`px-3 py-3 ${distinto ? 'bg-[#f0f9ec] font-semibold' : ''}`}><span className="text-[#7b927f]">{NUMERO(demo?.[m.key], m.key)}</span><span className="px-1 text-[#8b9f8e]">→</span><span className="text-forest">{NUMERO(e[m.key], m.key)}</span>{distinto && <span className="mt-1 block text-[9px] text-[#387a4b]">Changed in output</span>}</td>;
        })}</tr>;
      })}</tbody>
    </table>
  </div>;
}

export default function P2RecommendationPanel({ estrategias, fuente, cargando, error, generacion, modoEjemplo }) {
  const { irAPaso } = useGuidedFlow();
  const { parcelasPiloto: parcelas, parcela, prioridad, resultadosP2, archivoP2, evidenciaParcela,
    activarRecomendacionesP2, descartarRecomendacionesP2 } = useField();
  const power = usePower();
  const [previa, setPrevia] = useState(null);
  const [nombre, setNombre] = useState('');
  const [errorArchivo, setErrorArchivo] = useState('');
  const operacion = useRef(0);
  const clave = `${parcela.id}:${prioridad}`;
  const importado = resultadosP2[clave] ?? null;
  const salida = importado ?? (fuente === 'backend' ? { generacion, modoEjemplo: false } : null);
  const estado = resumirVinculoP2({ salida, evidenciaParcela, power });

  async function importar(event) {
    const file = event.target.files?.[0];
    const token = ++operacion.current;
    setErrorArchivo(''); setPrevia(null); setNombre(file?.name ?? '');
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) { setErrorArchivo('Select a .json file'); return; }
    if (file.size > MAX_P2_BYTES) { setErrorArchivo('File exceeds 1 MB.'); return; }
    try {
      const json = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      if (token !== operacion.current) return;
      setPrevia(validarArchivoP2(json, parcelas.map((p) => p.id)));
    } catch (err) { if (token === operacion.current) setErrorArchivo(`Invalid JSON: ${err.message}`); }
  }

  return <section id="motor-p2" className="scroll-mt-24 space-y-4" aria-labelledby="p2-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="eyebrow mb-1">07 / Agronomic engine</div>
        <h2 id="p2-title" className="section-title">Connect P2 recommendations</h2>
        <p className="mt-1 max-w-[890px] text-[12px] leading-relaxed text-muted">Import strategies calculated by your teammate and compare them with the demo scenario. File structure is validated, <strong>but calculations are not certified</strong>. The remote engine can also connect through <code>VITE_API_URL</code>.</p></div>
      <div className="flex flex-wrap gap-2">
        <a className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#cee2ce] bg-white px-3 text-[11px] font-bold text-agri" href="/plantilla-respuesta-p2.json" download><Download size={15}/>P2 contract</a>
        <a className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#edd7ae] bg-[#fff9ef] px-3 text-[11px] font-bold text-[#8b682d]" href="/ejemplo-p2-FICTICIO.json" download><FlaskConical size={15}/>FICTIONAL sample</a>
      </div>
    </div>

    <div className="panel grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
      <div className="space-y-4">
        <div className="flex items-start gap-2"><FileUp size={20} className="mt-0.5 shrink-0 text-agri"/><div><h3 className="text-[14px] font-extrabold text-forest">Controlled scenario import</h3><p className="mt-1 text-[11px] text-muted">Accepts up to 12 combinations: 3 fields × 4 priorities. The browser keeps the file only for this session.</p></div></div>
        <label htmlFor="archivo-p2" className="focus-within:ring-2 focus-within:ring-agri flex min-h-[102px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#bbd5bd] bg-[#f8fbf6] p-4 text-center hover:bg-[#f0f8ee]"><FileUp size={22} className="text-agri"/><span className="text-[12px] font-extrabold text-forest">Select P2 response (.json)</span><span className="text-[10px] text-muted">1 MB maximum · no upload to a server</span><input id="archivo-p2" className="sr-only" type="file" accept=".json,application/json" onChange={importar}/></label>
        {errorArchivo && <p role="alert" className="rounded-lg bg-[#fff0eb] p-3 text-[11px] text-[#9c4c3d]">{errorArchivo}</p>}
        {previa && <div className="space-y-3 rounded-xl border border-[#dfebdc] bg-[#f9fbf8] p-3 text-[11px]">
          <p className="font-extrabold text-forest">{nombre} · {previa.valido ? `${previa.total} valid combinations` : 'Import blocked'}</p>
          <div className="flex flex-wrap gap-1.5">{Object.keys(previa.porClave).map((k) => <span key={k} className="rounded-full bg-[#e4f0df] px-2 py-1 font-semibold text-[#326b43]">{k}</span>)}</div>
          {previa.modoEjemplo && <p className="font-bold text-[#9d6a26]">Fictional example: the figures have no scientific backing.</p>}
          {previa.errores.map((e, i) => <p key={i} className="text-[#a45143]">{e}</p>)}
          {!!previa.avisos.length && <details><summary className="cursor-pointer font-semibold text-[#866629]">{previa.avisos.length} provenance warnings</summary><ul className="mt-2 list-disc pl-4">{previa.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul></details>}
          <button type="button" disabled={!previa.valido} onClick={() => { activarRecomendacionesP2(previa.porClave, nombre); irAPaso(2); }}
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-forest px-4 text-[12px] font-bold text-white hover:bg-[#276746] disabled:opacity-50"><CheckCircle2 size={16}/>Activate P2 results</button>
        </div>}
        {archivoP2 && !importado && <p className="rounded-lg bg-[#fff7e8] p-3 text-[11px] text-[#87602d]">The P2 file is active but does not include the combination <strong>{parcela.id}:{prioridad}</strong>. For this objective, the remote engine (if available) or demo scenarios are used.</p>}
        {archivoP2 && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#c7dfca] bg-[#eff8ee] p-3"><p className="min-w-0 break-all text-[11px] font-bold text-[#366e46]">Active file: {archivoP2}</p><button type="button" onClick={() => { descartarRecomendacionesP2(); setPrevia(null); setNombre(''); }} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-3 text-[11px] font-bold text-[#527659]"><RotateCcw size={14}/>Remove imported P2</button></div>}
      </div>
      <aside className="space-y-3" aria-label="P2 provenance assessment">
        <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-forest"><ClipboardCheck size={19}/>Recommendation status</h3>
        <div className="rounded-xl border border-[#dce9d8] bg-[#f5faf2] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#65836a]">Active field and objective</p><p className="mt-1 text-[13px] font-extrabold text-forest">{parcela.nombre} · {PRIORIDADES[prioridad] || prioridad}</p>
          <p className="mt-2 text-[11px] text-muted">Source: <strong>{fuente === 'p2-importado' ? 'P2 file' : fuente === 'backend' ? 'P2 endpoint' : 'Demo scenarios'}</strong>{cargando ? ' · loading…' : ''}</p></div>
        <div className="rounded-xl border border-[#f0dfbd] bg-[#fff9ee] p-3 text-[11px] leading-relaxed text-[#826438]"><p className="flex items-center gap-1.5 font-bold"><ShieldAlert size={16}/>{estado.etiqueta}</p><p className="mt-1">{estado.detalle}</p></div>
        {generacion && <div className="rounded-xl border border-[#e0eadc] p-3 text-[11px] leading-relaxed text-muted"><strong className="text-forest">Declared engine: </strong>{generacion.modelo || 'Unidentified'} · {generacion.version || 'No version'} · {generacion.fecha || 'No date'}
          {!!generacion.insumos?.length && <details className="mt-2"><summary className="cursor-pointer font-bold text-agri">View stated inputs and assumptions</summary><div className="mt-2 space-y-1">{generacion.insumos.map((it, i) => <p key={i}>• {it.fuente}: {it.periodo || 'No period'} {it.estado && `(${it.estado})`}</p>)}{generacion.supuestos?.map((it, i) => <p key={`s-${i}`}>• Assumption: {it}</p>)}</div></details>}
        </div>}
        <div className="flex items-start gap-2 rounded-xl bg-[#f2f6f0] p-3 text-[11px] text-[#6a806e]"><Info size={16} className="mt-0.5 shrink-0"/><p>P2 responses and P1 files are not merged automatically. Matching source names do not prove traceability. The simulator applies additional assumptions in the browser.</p></div>
        {error && <p role="alert" className="text-[11px] text-[#aa6746]">{error}</p>}
      </aside>
    </div>
    {fuente !== 'demo' && estrategias.length === 3 && <div className="panel p-4 sm:p-5"><h3 className="flex items-center gap-2 text-[13px] font-extrabold text-forest"><GitCompareArrows size={18}/>What changes compared with demo strategies?</h3><p className="mt-1 text-[11px] text-muted">Comparison of two outputs, not evidence of a real crop effect. Values are <strong>{modoEjemplo ? 'P2 FICTIONAL' : 'P2 declared, without independent audit'}</strong>.</p><CuadroDiferencias estrategias={estrategias} parcela={parcela}/></div>}
    {fuente === 'demo' && <div className="rounded-xl border border-[#e0eadb] bg-[#f5faf2] px-4 py-3 text-[11px] text-[#5d7963]"><ArrowRight size={14} className="mr-1 inline"/>The three original strategies are still shown. Import the P2 sample to see differences without setting up a backend.</div>}
  </section>;
}
