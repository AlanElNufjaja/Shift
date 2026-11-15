import { displayMonth, displayTerm } from '../lib/displayEnglish.js';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, Download,
  ClipboardCheck, Droplets, Info, Leaf, ShieldCheck,
  Sprout, TrendingUp,
} from 'lucide-react';
import {
  formatoDinero, formatoNumero, MESES,
  numeroSeguro, PRIORIDADES,
} from '../lib/diagnostics.js';
import ScenarioControls from './strategy/ScenarioControls.jsx';
import DeltaSummary from './strategy/DeltaSummary.jsx';
import DecisionBrief from './strategy/DecisionBrief.jsx';
import { AJUSTES_INICIALES, ajustePorPrioridad, csvComparacion, simularEstrategias } from '../lib/strategySimulator.js';

const metadata = {
  baseline: { indice: '01', icono: Leaf, etiqueta: 'Baseline', clase: 'neutral' },
  water: { indice: '02', icono: Droplets, etiqueta: 'Water saving', clase: 'water' },
  regen: { indice: '03', icono: Sprout, etiqueta: 'Regeneration', clase: 'regen' },
};

function Barra({ etiqueta, valor, unidad, maximo, color, icono: Icono, dinero = false }) {
  const numero = numeroSeguro(valor);
  const ancho = numero !== null && maximo > 0 ? Math.min(100, Math.max(0, numero / maximo * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#738579]"><Icono size={13} />{etiqueta}</span>
        <strong className="text-[12px] font-extrabold text-[#23422e]">{numero === null ? 'No data' : dinero ? formatoDinero(numero) : `${formatoNumero(numero)} ${unidad}`}</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf1e9]" role={numero === null ? undefined : 'progressbar'}
        aria-label={`${etiqueta}: ${numero === null ? 'no data' : formatoNumero(numero) + ' ' + unidad}`}
        aria-valuemin={numero === null ? undefined : 0} aria-valuemax={numero === null ? undefined : Math.ceil(maximo) || 1} aria-valuenow={numero ?? undefined}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${ancho}%` }} />
      </div>
    </div>
  );
}

function CalendarioCobertura({ cobertura }) {
  if (!Array.isArray(cobertura) || cobertura.length !== 12) {
    return <p className="mt-2 text-[11px] text-[#8d9a8e]">Cover calendar unavailable.</p>;
  }
  return (
    <div>
      <div className="grid grid-cols-12 gap-[3px]">
        {cobertura.map((estado, indice) => (
          <span key={`${MESES[indice]}-${indice}`} title={`${displayMonth(MESES[indice])}: ${displayTerm(estado)}`}
            className={`h-3 rounded-[3px] ${estado === 'Desnudo' ? 'bg-[#f4a7a4]' : estado === 'Cubierto' ? 'bg-[#89bea0]' : 'bg-[#d8ddd8]'}`} />
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-12 gap-[3px]">
        {MESES.map((mes) => <span key={mes} className="text-center text-[8px] font-bold text-[#a4b0a5]">{displayMonth(mes).charAt(0)}</span>)}
      </div>
    </div>
  );
}

function Transparencia({ estrategia }) {
  const secciones = [
    { icono: Info, titulo: 'Why it is suggested', texto: estrategia.justificacion },
    { icono: ShieldCheck, titulo: 'Satellite uncertainty', texto: estrategia.incertidumbre },
    { icono: ClipboardCheck, titulo: 'Required field validation', texto: estrategia.validacion },
  ];
  return (
    <details className="group mt-5 border-t border-[#e5ece4] pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-extrabold text-[#386a4a] focus-visible:outline-2 focus-visible:outline-[#7bb28c] [&::-webkit-details-marker]:hidden">
        Scientific transparency <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 space-y-4">
        {secciones.map(({ icono: Icono, titulo, texto }) => (
          <div key={titulo} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 rounded-md bg-[#edf4ec] p-1.5 text-[#4d9065]"><Icono size={13} /></span>
            <div><h4 className="text-[11px] font-extrabold text-[#31543c]">{titulo}</h4>
              <p className="mt-1 text-[11px] leading-[1.65] text-[#7a897e]">{texto || 'To be checked with the agronomy team.'}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function TarjetaEstrategia({ estrategia, destacada, seleccionada, onSeleccionar, base, maximos }) {
  const meta = metadata[estrategia.id] ?? metadata.baseline;
  const Icono = meta.icono;
  const agua = numeroSeguro(estrategia.agua_mm);
  const aguaBase = numeroSeguro(base?.agua_mm);
  const ahorro = agua !== null && aguaBase !== null && aguaBase > 0
    ? Math.round((aguaBase - agua) / aguaBase * 100) : null;
  return (
    <article className={`strategy-card relative flex min-w-0 flex-col rounded-[20px] border bg-white p-5 transition-shadow hover:shadow-md sm:p-6 ${seleccionada ? 'border-[#326f49] shadow-[0_12px_35px_rgba(39,110,62,0.10)] ring-2 ring-[#b4dbb3]' : destacada ? 'border-[#91c69c]' : 'border-[#e4ebe2]'}`}>
      {destacada && (
        <div className="absolute -top-3 right-5 flex items-center gap-1.5 rounded-full bg-[#285b3d] px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm">
          <ShieldCheck size={12} /> Highlighted for your goal
        </div>
      )}
      <div className="mb-6 flex items-start justify-between">
        <span className={`flex size-11 items-center justify-center rounded-xl ${meta.clase === 'water' ? 'bg-[#e8f2fc] text-[#568abf]' : meta.clase === 'regen' ? 'bg-[#e4f4e6] text-[#448e5b]' : 'bg-[#f1f2ec] text-[#7a8d77]'}`}>
          <Icono size={21} strokeWidth={1.8} />
        </span>
        <span className="text-[22px] font-extrabold tracking-[-0.07em] text-[#d3ded2]">{meta.indice}</span>
      </div>
      <span className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#71917a]">{meta.etiqueta}</span>
      <h3 className="min-h-[46px] text-[17px] font-extrabold leading-tight tracking-[-0.035em] text-[#193f2a]">{estrategia.titulo}</h3>
      <p className="mb-4 mt-1 text-[11px] text-[#95a29a]">{estrategia.subtitulo}</p>
      <div className="mb-5 min-h-[66px] rounded-xl bg-[#f5f8f3] px-3.5 py-3">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#91a18f]">Suggested rotation</p>
        <p className="text-[11px] font-bold leading-relaxed text-[#4b6653]">{estrategia.cultivos ?? 'To be evaluated'}</p>
      </div>

      <div className="space-y-5">
        <Barra icono={Droplets} etiqueta="Water use" valor={estrategia.agua_mm} unidad="mm/cycle"
          maximo={maximos.agua} color={destacada ? 'bg-[#458e9d]' : 'bg-[#75a7bd]'} />
        <Barra icono={Sprout} etiqueta="Nitrogen contribution" valor={estrategia.nitrogeno_kg_acre} unidad="kg/acre"
          maximo={maximos.nitrogeno} color="bg-[#80b58a]" />
        <Barra icono={TrendingUp} etiqueta="Estimated gross revenue" valor={estrategia.ingreso_usd_acre} unidad="USD/acre"
          maximo={maximos.ingreso} color="bg-[#ddae72]" dinero />
      </div>
      <div className="mt-5 min-h-[27px]">
        {ahorro !== null && estrategia.id !== 'baseline' ? (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${ahorro >= 0 ? 'bg-[#eef7eb] text-[#3c8053]' : 'bg-[#fff0ed] text-[#b86e5b]'}`}>
            {ahorro >= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {Math.abs(ahorro)}% {ahorro >= 0 ? 'less' : 'more'} water vs. baseline
          </span>
        ) : <span className="text-[10px] font-semibold text-[#a1aea0]">Comparison baseline</span>}
      </div>
      <div className="mt-5 border-t border-[#e8eee8] pt-4">
        <div className="mb-2 flex justify-between gap-2 text-[10px] font-bold text-[#728578]">
          <span>Estimated monthly cover</span><span>12 months</span>
        </div>
        <CalendarioCobertura cobertura={estrategia.cobertura_mensual} />
      </div>
      <div className="mt-auto pt-4">
        <button type="button" onClick={() => onSeleccionar(estrategia.id)} aria-pressed={seleccionada}
          className={`focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-[12px] font-extrabold transition-colors ${seleccionada ? 'border-[#285b3d] bg-[#285b3d] text-white' : 'border-[#d3e5d0] bg-[#f0f7ee] text-[#326c45] hover:bg-[#deeedb]'}`}>
          {seleccionada ? 'Comparing this option' : 'View impact vs. baseline'} <ArrowRight size={15} aria-hidden="true" />
        </button>
        <Transparencia estrategia={estrategia} />
      </div>
    </article>
  );
}

/**
 * Sensibilidad local y comparación visual. El motor de P2 sigue recibiendo únicamente
 * { parcela_id, prioridad }: los controles de hipótesis NO se envían al backend.
 */
export default function StrategyComparison({ estrategias = [], fuente, cargando, error, prioridad, parcela, generacion, avisos = [], modoEjemplo = true }) {
  const [ajustes, setAjustes] = useState({ ...AJUSTES_INICIALES });
  const [idManual, setIdManual] = useState(null);
  // Un nuevo modelo o archivo P2 no debe heredar los supuestos manipulados del anterior.
  useEffect(() => { setAjustes({ ...AJUSTES_INICIALES }); setIdManual(null); }, [fuente, generacion]);
  const originales = Array.isArray(estrategias) ? estrategias : [];
  const escenarios = useMemo(() => simularEstrategias(originales, ajustes), [estrategias, ajustes]);
  const base = escenarios.find((e) => e.id === 'baseline');
  const ajuste = ajustePorPrioridad(escenarios, prioridad);
  const idSeleccionado = escenarios.some((e) => e.id === idManual)
    ? idManual : (ajuste.id ?? 'baseline');
  const seleccionada = escenarios.find((e) => e.id === idSeleccionado) ?? null;
  const maximos = {
    agua: Math.max(1, ...escenarios.map((e) => numeroSeguro(e.agua_mm) ?? 0)),
    nitrogeno: Math.max(1, ...escenarios.map((e) => numeroSeguro(e.nitrogeno_kg_acre) ?? 0)),
    ingreso: Math.max(1, ...escenarios.map((e) => numeroSeguro(e.ingreso_usd_acre) ?? 0)),
  };

  function descargarComparacion() {
    if (!escenarios.length) return;
    const csv = csvComparacion({ parcela, prioridad: PRIORIDADES[prioridad] ?? prioridad, fuente,
      originales, ajustes, escenarios, modoEjemplo });
    const archivo = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `field-shift-scenarios-${parcela?.id ?? 'field'}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section id="strategies" className="scroll-mt-24 space-y-5" aria-labelledby="strategies-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">03 / Decision & scenarios</div>
          <h2 id="strategies-title" className="section-title">Compare three possible futures</h2>
          <p className="mt-1.5 text-[12px] text-[#7d8d80]">
            Exploratory selection for: <strong className="text-[#477952]">{PRIORIDADES[prioridad] ?? 'Not set'}</strong>.
            The priority highlights one option; <strong>it does not generate a new rotation</strong> without the recommendation engine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold text-[#52865b]">
            {cargando ? 'Querying engine…' : fuente === 'backend' ? 'Remote P2 · not audited' : fuente === 'p2-importado' ? (modoEjemplo ? 'P2 FICTIONAL' : 'P2 declared · not audited') : 'Synthetic data · demo'}
          </span>
          <button type="button" disabled={!escenarios.length} onClick={descargarComparacion}
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d4e5d0] bg-white px-3.5 text-[12px] font-extrabold text-[#2b6d46] hover:bg-[#eff6ec] disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>
      {fuente !== 'demo' && <div className="rounded-xl border border-[#d3e6d4] bg-[#f1f8f0] px-4 py-3 text-[11px] leading-relaxed text-[#4c7354]">
        <strong>Scenarios from the P2 engine ({modoEjemplo ? 'FICTIONAL' : 'declared, not audited'}).</strong> {generacion?.modelo ? `Model ${generacion.modelo} · ${generacion.version} · ${generacion.fecha}. ` : 'Incomplete execution metadata. '}
        P2 figures are declared outputs, not certified estimates; sensitivity controls remain hypothetical.
        <a className="ml-2 font-extrabold underline" href="#motor-p2">View provenance and differences</a>
      </div>}
      {avisos.map((aviso, i) => <p key={i} role="status" className="rounded-lg bg-[#fff8e8] p-3 text-[11px] text-[#946c31]">{aviso}</p>)}
      {error && <div role="alert" className="rounded-xl border border-[#f4dcc8] bg-[#fff7f0] p-3 text-[11px] font-medium text-[#a26d46]">{error}</div>}
      <ScenarioControls ajustes={ajustes} onChange={setAjustes} onRestaurar={() => setAjustes({ ...AJUSTES_INICIALES })} fuente={fuente} />
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e3ece0] bg-white px-4 py-3">
        <p className="text-[11px] font-semibold text-[#667f6d]">Highlight criterion: <strong className="text-[#285b3d]">{ajuste.descripcion}</strong>.</p>
        <span className="text-[11px] font-bold text-[#6a866d]">{ajuste.empate ? 'No arbitrary tie-break' : ajuste.id ? 'Highlighted by indicator' : 'No reliable winner'}</span>
      </div>
      {escenarios.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {escenarios.map((estrategia) => (
            <TarjetaEstrategia key={estrategia.id} estrategia={estrategia}
              destacada={estrategia.id === ajuste.id} seleccionada={estrategia.id === idSeleccionado}
              onSeleccionar={setIdManual} base={base} maximos={maximos} />
          ))}
        </div>
      ) : <p className="panel p-6 text-[13px] text-[#7a897e]">No strategies are available for this field yet.</p>}
      {escenarios.length > 0 && <DeltaSummary base={base} seleccionada={seleccionada} />}
      {escenarios.length > 0 && <DecisionBrief key={`${parcela?.id}:${prioridad}:${idSeleccionado}:${fuente}`} base={base} estrategia={seleccionada} prioridad={prioridad} parcela={parcela}
        fuente={fuente} modoEjemplo={modoEjemplo} generacion={generacion} ajustes={ajustes} />}
      <div className="flex items-start gap-2 rounded-xl bg-[#eef3eb] px-4 py-3 text-[11px] leading-relaxed text-[#6a7f70]">
        <Info size={15} className="mt-0.5 shrink-0 text-[#6f9977]" aria-hidden="true" />
        <span>Scenarios are exploratory and use simplified assumptions. A taller bar does not always mean a better option.
          <strong> Shown revenue is gross, before costs</strong>. Nitrogen fixation does not automatically mean fertilizer savings.
          Water demand and cover estimates need local agronomist verification.</span>
      </div>
    </section>
  );
}
