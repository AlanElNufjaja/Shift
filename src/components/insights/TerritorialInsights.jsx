import { displayMonth } from '../../lib/displayEnglish.js';
import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ChevronDown,
  ClipboardCheck, Droplets, FlaskConical, Info, Layers3, MapPinned,
  Mountain, SearchCheck, Sprout, ThermometerSun,
} from 'lucide-react';
import { analizarTerritorio, descripcionMes, UMBRALES_EXPLORATORIOS } from '../../lib/territorialInsights.js';
import { formatoNumero, PRIORIDADES } from '../../lib/diagnostics.js';

const iconos = { coincidencia: ThermometerSun, cobertura: Layers3, rotacion: Sprout, erosion: Mountain };
const estados = {
  atencion: {
    etiqueta: 'Review first',
    clase: 'border-[#f1cec4] bg-[#fff4ee] text-[#ae513b]',
    barra: 'bg-[#c36b4d]',
  },
  revisar: {
    etiqueta: 'Worth checking',
    clase: 'border-[#f2e1bc] bg-[#fffaec] text-[#a5732e]',
    barra: 'bg-[#d5a052]',
  },
  'sin-senal': {
    etiqueta: 'No signal in the example',
    clase: 'border-[#dbeadd] bg-[#f1f8f1] text-[#437950]',
    barra: 'bg-[#6c9b78]',
  },
  insuficiente: {
    etiqueta: 'Insufficient information',
    clase: 'border-[#dde5e2] bg-[#f5f7f7] text-[#647973]',
    barra: 'bg-[#91a6a0]',
  },
};

function SenalCard({ senal, seleccionada, onSeleccionar }) {
  const Icono = iconos[senal.id];
  const visual = estados[senal.estado];
  return (
    <button type="button" onClick={onSeleccionar} aria-pressed={seleccionada}
      className={`focus-ring group relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all hover:border-[#abc9ac] hover:shadow-sm sm:p-5 ${seleccionada ? 'border-[#52906b] shadow-[0_0_0_2px_#d5e9d3]' : 'border-[#e4ebe3]'}`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${visual.barra}`} aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf5eb] text-[#31744c]"><Icono size={20} aria-hidden="true" /></span>
        <span className={`max-w-full rounded-full border px-2.5 py-1 text-[10px] font-bold leading-snug ${visual.clase}`}>{visual.etiqueta}</span>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#7b917e]">{senal.categoria}</div>
        <h3 className="mt-1 text-[14px] font-extrabold tracking-[-0.025em] text-forest">{senal.titulo}</h3>
        <p className="mt-1 text-[22px] font-extrabold tracking-[-0.04em] text-[#215437]">{senal.metrica}</p>
        <p className="mt-2 text-[11px] leading-[1.6] text-[#64796b]">{senal.resumen}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-agri group-hover:underline">
        {seleccionada ? 'Selected evidence' : 'View evidence'} <ArrowRight size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

function TarjetaEvidencia({ senal }) {
  return (
    <div className="rounded-2xl border border-[#dfeadf] bg-[#f7faf5] p-4 sm:p-5" aria-live="polite" aria-atomic="true">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow mb-1">About this indicator</p>
          <h3 className="text-[15px] font-extrabold text-forest">{senal.titulo}</h3>
        </div>
        <span className="rounded-full border border-[#d8e7d6] bg-white px-2.5 py-1 text-[10px] font-bold text-[#4e7a56]">Explainable rule</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#668d6b]">Available evidence</p>
            <p className="mt-1 text-[12px] leading-[1.6] text-[#385542]">{senal.evidencia}</p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#668d6b]">How it is evaluated</p>
            <p className="mt-1 text-[12px] leading-[1.6] text-[#385542]">{senal.regla}</p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#668d6b]">Data provenance</p>
            <p className="mt-1 text-[11px] leading-[1.6] text-[#667c6d]">{senal.fuente}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-[#f2e3c4] bg-[#fffaf0] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#996d2d]"><AlertTriangle size={15} aria-hidden="true" /> Limitation / uncertainty</p>
            <p className="mt-1.5 text-[11px] leading-[1.6] text-[#795f3c]">{senal.limite}</p>
          </div>
          <div className="rounded-xl border border-[#d9e8dd] bg-white p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#3a7653]"><ClipboardCheck size={15} aria-hidden="true" /> What to check in the field</p>
            <p className="mt-1.5 text-[11px] leading-[1.6] text-[#4b6554]">{senal.verificacion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Fase 2B: interpreta la serie de demostración SIN generar recomendaciones de siembra.
 * El clic sobre un mes sincroniza el explorador geoespacial existente.
 */
export default function TerritorialInsights({ parcela, prioridad, mes, onExplorarMes }) {
  const analisis = useMemo(() => analizarTerritorio(parcela, prioridad), [parcela, prioridad]);
  const [senalElegida, setSenalElegida] = useState(null);
  const senal = analisis.senales.find((s) => s.id === senalElegida) ?? analisis.senales[0];
  const mesActivo = analisis.calendario.find((item) => item.mes === mes) ?? analisis.calendario[0];

  return (
    <section id="senales-avanzado" className="scroll-mt-24 space-y-4" aria-labelledby="signals-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">02 / Field assessment</p>
          <h2 id="signals-title" className="section-title">Signals worth reviewing</h2>
          <p className="mt-1 text-[12px] text-[#718675]">Exploratory combination of climate, moisture, cover and crop history.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead9b9] bg-[#fff8e9] px-3 py-1.5 text-[10px] font-bold text-[#976a2a]">
          <FlaskConical size={14} aria-hidden="true" /> Synthetic data
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[20px] bg-[#173e2b] p-5 text-white sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 size-60 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b9daa8]">Quick look · {parcela?.ciudad ?? 'Pilot field'}</p>
            <h3 className="text-[17px] font-extrabold leading-snug tracking-tight sm:text-[20px]">{analisis.resumen}</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-[#cee3d1]">
              {analisis.mesesEvaluables}/12 months with evaluable climate data. Signals show overlaps and reported properties; <strong className="text-white">they are not forecasts or automatic irrigation recommendations.</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-center">
            <div className="min-w-28 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <span className="block text-[27px] font-black leading-tight">{analisis.senalesParaRevisar}</span>
              <span className="text-[10px] text-[#dae9d9]">Signals to review</span>
            </div>
            <div className="min-w-28 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <span className="block text-[27px] font-black leading-tight">{analisis.solapamiento.length}</span>
              <span className="text-[10px] text-[#dae9d9]">Months with overlap*</span>
            </div>
          </div>
        </div>
        <p className="relative mt-3 text-[10px] leading-relaxed text-[#b7d3be]">*Overlap of temperature &gt; {UMBRALES_EXPLORATORIOS.temperaturaMayorC} °C, soil moisture &lt; {UMBRALES_EXPLORATORIOS.humedadMenorPct} % and a bare-soil label in the same month.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#728779]">Ordered by attention level and, in ties, by your objective: <strong className="text-forest">{PRIORIDADES[prioridad] ?? 'Not selected'}</strong>.</p>
        <span className="text-[10px] text-[#819286]">Select a card to see evidence</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {analisis.senales.map((item) => (
          <SenalCard key={item.id} senal={item} seleccionada={senal.id === item.id} onSeleccionar={() => setSenalElegida(item.id)} />
        ))}
      </div>
      <TarjetaEvidencia key={`${parcela?.id}-${senal.id}`} senal={senal} />

      <div className="panel overflow-hidden p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Signal calendar</p>
            <h3 className="text-[16px] font-extrabold text-forest">Which months coincide?</h3>
            <p className="mt-1 text-[11px] text-[#778c7d]">Select a month to see its values on the map.</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-[#627d6d]">
            <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-full bg-[#c36b4d]" /> Heat/moisture overlap</span>
            <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-full bg-[#d5a052]" /> Bare soil indicated</span>
            <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-full bg-[#9cbca5]" /> No overlap detected</span>
            <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-full bg-[#b4bbc0]" /> Insufficient data</span>
          </div>
        </div>
        <div role="group" aria-label="Choose a month from the demo series" className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-12">
          {analisis.calendario.map((item) => {
            const esActivo = mesActivo.mes === item.mes;
            const estilo = item.coincidencia ? 'bg-[#c36b4d]' : item.sueloDesnudo ? 'bg-[#d5a052]' : !item.evaluable ? 'bg-[#b4bbc0]' : 'bg-[#9cbca5]';
            return (
              <button key={item.mes} type="button" aria-pressed={esActivo} onClick={() => onExplorarMes(item.mes)}
                aria-label={`${displayMonth(item.mes)}: ${item.coincidencia ? 'heat and low moisture overlap' : item.evaluable ? 'no overlap detected' : 'insufficient climate data'}; ${item.sueloDesnudo ? 'bare soil flagged' : 'cover not confirmed'}`}
                className={`focus-ring rounded-xl border px-1.5 py-2.5 text-center transition-colors ${esActivo ? 'border-[#347b50] bg-[#eff7eb] ring-2 ring-[#b7d9ba]' : 'border-[#e1ebe0] bg-white hover:border-[#98b99f]'}`}>
                <span className="block text-[10px] font-bold text-[#4c6c57]">{displayMonth(item.mes).slice(0,3)}</span>
                <span className={`mx-auto mt-2 block h-1.5 w-8 max-w-full rounded-full ${estilo}`} aria-hidden="true" />
                <span className="mt-1 block text-[10px] font-semibold text-[#657d6c]">{item.humedad === null ? '—' : `${formatoNumero(item.humedad, 0)} %`}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2ebe0] bg-[#f6f9f4] p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold text-forest"><CalendarDays size={15} aria-hidden="true" />{mesActivo.mes}</p>
            <p className="text-[11px] leading-relaxed text-[#607667]" aria-live="polite">{descripcionMes(mesActivo)}</p>
            {mesActivo.coincidencia && <p className="mt-1 text-[10px] font-bold text-[#ae593e]">Both exploratory thresholds are met this month.</p>}
          </div>
          <a href="#detalle-terreno" className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-forest px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#265c3c]">
            <MapPinned size={15} aria-hidden="true" /> Show month on map <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
        <div className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-[#7b8d80]">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>The amber bar only marks an explicit bare-soil label. “No overlap” does not mean no risk, and an unmarked month does not confirm vegetation cover. The series has no stated observation year.</p>
        </div>
      </div>

      <details className="panel group p-4 sm:p-5">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-bold text-forest [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2"><SearchCheck size={18} aria-hidden="true" /> Data quality and assessment limitations</span>
          <ChevronDown size={17} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid gap-3 border-t border-[#edf1e9] pt-4 text-[11px] leading-relaxed text-[#5f7967] md:grid-cols-2">
          <div className="flex items-start gap-2"><Droplets size={16} className="mt-0.5 shrink-0 text-[#4388b7]" aria-hidden="true" />SMAP measures surface moisture over a much larger area than a single field. It does not directly measure root-zone water available to crops.</div>
          <div className="flex items-start gap-2"><ThermometerSun size={16} className="mt-0.5 shrink-0 text-[#c0844e]" aria-hidden="true" />POWER provides regional-scale climate data. Monthly overlaps do not establish causality or effects on yield.</div>
          <div className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#47865b]" aria-hidden="true" />{analisis.mesesEvaluables}/12 months have both variables. {analisis.mesesNoEvaluables ? `${analisis.mesesNoEvaluables} month(s) cannot be evaluated.` : 'No monthly pairs are missing from this JSON.'}</div>
          <div className="flex items-start gap-2"><FlaskConical size={16} className="mt-0.5 shrink-0 text-[#9d7c49]" aria-hidden="true" />All values in this demo are synthetic. Field recommendations require real data and agronomic validation.</div>
        </div>
      </details>
    </section>
  );
}
