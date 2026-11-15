import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Database, Download, FileJson2, FileUp, ShieldAlert, XCircle } from 'lucide-react';
import { MAX_IMPORT_BYTES, validarEntregableP1 } from '../../lib/parcelDataIntake.js';
import { prepararEntregableP1, fuentesDisponibles } from '../../lib/multiSourceIntake.js';
import { useField } from '../../context/FieldContext.jsx';

/** Importación explícita por sesión: no sobrescribe las series demo ni llama a un servidor. */
export default function DataIntakePanel() {
  const [resultado, setResultado] = useState(null);
  const [lote, setLote] = useState(null);
  const { parcelasPiloto: parcelas, archivoP1, activarEvidenciasP1, descartarEvidenciasP1 } = useField();
  const [nombre, setNombre] = useState('');
  const [esEjemplo, setEsEjemplo] = useState(false);
  const [error, setError] = useState('');
  const reading = useRef(0);
  async function manejarArchivo(event) {
    const file = event.target.files?.[0];
    const run = ++reading.current;
    setResultado(null); setLote(null); setError(''); setNombre(file?.name || ''); setEsEjemplo(false);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) { setError('Choose a file with a .json extension'); return; }
    if (file.size > MAX_IMPORT_BYTES) { setError('File exceeds the 2 MB local preview limit'); return; }
    try {
      const content = await file.text();
      const json = JSON.parse(content.replace(/^\uFEFF/, ''));
      if (run === reading.current) {
        setResultado(validarEntregableP1(json));
        setEsEjemplo(json?.tipo_dato === 'demo');
        setLote(prepararEntregableP1(json, parcelas.map((p) => p.id), Object.fromEntries(parcelas.map((p) => [p.id, { lat: p.lat, lon: p.lon }]))));
      }
    } catch (err) {
      if (run === reading.current) setError(`Could not parse JSON: ${err.message}`);
    }
    event.target.value = '';
  }
  return (
    <section id="integracion" className="scroll-mt-24 space-y-4" aria-labelledby="intake-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><div className="eyebrow mb-1">05 / P1 data contract</div><h2 className="section-title" id="intake-title">Prepare P1 data</h2>
          <p className="mt-1 max-w-[800px] text-[12px] leading-relaxed text-muted">Upload the P1 JSON and review compatible sources. You can explicitly enable them for individual indicators and evidence panels. Combined demo alerts and strategies are not changed.</p></div>
        <a download className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d5e5d4] bg-white px-4 text-xs font-bold text-agri hover:bg-[#f4faf3]" href="/plantilla-parcelas-p1.json"><Download size={16} />Download JSON template</a>
        <a download className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ead5a9] bg-[#fffcf3] px-4 text-xs font-bold text-[#926b2e] hover:bg-[#fff5dd]" href="/ejemplo-p1-FICTICIO.json"><Download size={16}/>FICTIONAL sample file</a>
      </div>
      <div className="panel grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
        <div>
          <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e7f4e7] text-agri"><FileJson2 size={21} /></span><div><h3 className="text-[15px] font-extrabold text-forest">Local file structure validation</h3><p className="mt-1 text-[11px] text-muted">Checks IDs, coordinates, months, fields and stated provenance.</p></div></div>
          <label htmlFor="p1-file" className="focus-within:ring-2 focus-within:ring-agri mt-4 flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#bbd5bd] bg-[#f7faf5] p-4 text-center hover:bg-[#eff8ee]">
            <FileUp size={24} className="text-agri" aria-hidden="true" /><span className="text-[12px] font-extrabold text-forest">Select parcelas_reales.json</span><span className="text-[11px] text-muted">JSON file, 2 MB maximum · stays on your device</span>
            <input id="p1-file" type="file" accept=".json,application/json" className="sr-only" onChange={manejarArchivo}/>
          </label>
          {nombre && <p className="mt-3 break-all text-[11px] text-muted">Selected file: <strong>{nombre}</strong></p>}
          {error && <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-[#eccfc6] bg-[#fff3ef] p-3 text-[12px] text-[#a7503e]"><XCircle className="shrink-0" size={17}/>{error}</div>}
          {resultado && <div aria-live="polite" className="mt-4 space-y-3">
            <div className={`flex flex-wrap items-center gap-2 rounded-xl p-3 text-[12px] font-bold ${resultado.valido ? 'bg-[#edf7eb] text-[#347548]' : 'bg-[#fff0ec] text-[#aa5847]'}`}>
              {resultado.valido ? <CheckCircle2 size={17}/> : <XCircle size={17}/>} {resultado.valido ? 'Compatible structure (not scientifically verified)' : 'Structure errors'} · {resultado.count} field(s)
            </div>
            {resultado.resumen.length > 0 && <div className="rounded-xl border border-border-soft bg-white p-3"><h4 className="mb-2 text-xs font-extrabold text-forest">Fields detected</h4><div className="flex flex-wrap gap-2">{resultado.resumen.map((p, i) => <span key={`${p.id}-${i}`} className="rounded-lg bg-[#f2f7f0] px-2.5 py-1.5 text-[11px] font-semibold text-[#477151]">{p.nombre} · {p.meses} months</span>)}</div></div>}
            {!!resultado.errores.length && <div className="rounded-xl border border-[#ebd0c6] p-3"><p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-[#a15446]"><XCircle size={14}/> {resultado.errores.length} error(s)</p><ul className="list-inside list-disc space-y-1 text-[11px] text-[#79564d]">{resultado.errores.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
            {!!resultado.avisos.length && <div className="rounded-xl border border-[#efdfba] bg-[#fffbf1] p-3"><p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-[#94682b]"><AlertTriangle size={14}/> {resultado.avisos.length} warning(s)</p><ul className="list-inside list-disc space-y-1 text-[11px] text-[#7a6943]">{resultado.avisos.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          </div>}

          {esEjemplo && <p role="alert" className="mt-3 rounded-xl bg-[#fff0d8] p-3 text-xs font-bold text-[#925b1d]">This is a FICTIONAL SAMPLE: its figures are not from NASA or USDA. It is for testing import only.</p>}
          {lote && <div className="mt-4 space-y-3 rounded-xl border border-[#d6e7d6] bg-[#f6faf5] p-4" aria-live="polite">
            <h4 className="flex items-center gap-2 text-xs font-extrabold text-forest"><Database size={17}/>Sources ready for this session</h4>
            <p className="text-[11px] text-muted">{lote.fuentes} eligible source(s) across {lote.parcelas || 0} field(s). Its provenance is stated by the file and still requires independent audit.</p>
            {Object.entries(lote.porParcela).map(([id, info]) => <div key={id} className="flex flex-wrap items-center gap-2 text-[11px]"><strong className="text-forest">{id}</strong>{fuentesDisponibles(info).map((f) => <span key={f} className="rounded-full bg-[#e0f0df] px-2.5 py-1 font-bold uppercase text-[#316a43]">{f}</span>)}</div>)}
            {!!lote.errores.length && <div role="alert" className="rounded-lg bg-[#fff0ec] p-3 text-[11px] text-[#a7503e]">{lote.errores.map((e, i) => <p key={i}>{e}</p>)}</div>}
            {!!lote.avisos.length && <details className="rounded-lg border border-[#f0dfb9] bg-[#fffaf0] p-3 text-[11px] text-[#7d683b]"><summary className="cursor-pointer font-extrabold">Review {lote.avisos.length} source warning(s)</summary><ul className="mt-2 list-inside list-disc space-y-1">{lote.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul></details>}
            <button type="button" disabled={!lote.valido || !resultado?.valido} onClick={() => { activarEvidenciasP1(lote.porParcela, nombre); document.getElementById('comparacion-fuentes')?.scrollIntoView({ behavior: 'smooth' }); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#286346] disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={16}/>Enable valid sources for this session</button>
            <p className="text-[10px] text-muted">When enabled, the map keeps its demo coordinates. Data remains in memory until refresh. The file is not uploaded.</p>
          </div>}
          {archivoP1 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#cfe4d2] bg-[#ecf6eb] p-3"><p className="break-all text-[11px] font-bold text-[#317047]">P1 sources enabled: {archivoP1}</p><button type="button" onClick={() => { descartarEvidenciasP1(); setLote(null); setResultado(null); setNombre(''); setEsEjemplo(false); }} className="focus-ring rounded-lg border border-[#bfd5c1] bg-white px-3 py-2 text-[11px] font-bold text-[#496a4d]">Return to demo only</button></div>}
        </div>
        <aside className="space-y-3" aria-label="Requirements for integrating real data">
          <div className="flex items-center gap-2"><ClipboardCheck size={19} className="text-agri" /><h3 className="font-extrabold text-forest">Before integration</h3></div>
          <div className="space-y-2 text-[12px] leading-relaxed text-[#526b59]">
            <p className="flex gap-2 rounded-xl bg-[#f0f6ee] p-3"><Database size={17} className="mt-0.5 shrink-0 text-agri" />P1 must provide source, period, units and extraction method for each dataset.</p>
            <p className="flex gap-2 rounded-xl bg-[#f0f6ee] p-3"><ShieldAlert size={17} className="mt-0.5 shrink-0 text-agri" />SMAP, POWER, SSURGO and CropScape operate at different spatial and temporal scales. They must not be merged automatically.</p>
            <p className="flex gap-2 rounded-xl bg-[#fff8eb] p-3"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#b18134]" />A valid file structure does not verify measurements, geolocation or forecasts. Production use still requires human review.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
