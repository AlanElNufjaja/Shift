import { ArrowRight, Droplets, MapPin, Satellite, Sprout, ThermometerSun } from 'lucide-react';
import { diagnosticarParcela, formatoNumero, numeroSeguro, PRIORIDADES } from '../../lib/diagnostics.js';
import MetricCard from '../ui/MetricCard.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { resumirClimaPower } from '../../lib/powerDiagnostics.js';
import { useField } from '../../context/FieldContext.jsx';

/** Resumen contextual. No genera nuevas recomendaciones; las cifras dependen del JSON. */
export default function ParcelOverview({ parcela, prioridad }) {
  const power = usePower();
  const { evidenciaParcela } = useField();
  const ejemploP1 = !!evidenciaParcela?.modoEjemplo;
  const smapP1 = evidenciaParcela?.smap;
  const ssurgoP1 = evidenciaParcela?.ssurgo;
  const climaReal = resumirClimaPower(power);
  const diagnostico = diagnosticarParcela(parcela);
  const suelo = numeroSeguro(ssurgoP1 ? ssurgoP1.suelo.materia_organica_pct : parcela?.suelo_ssurgo?.materia_organica_pct);
  const hum = smapP1 ? smapP1.media : diagnostico.humedadMedia;
  const temp = diagnostico.tempMax;
  return (
    <section id="resumen-avanzado" className="scroll-mt-24 space-y-3.5 sm:space-y-4" aria-labelledby="parcel-overview-title">
      <div className="hero-gradient relative overflow-hidden rounded-[22px] px-5 py-5 text-white sm:px-7 sm:py-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-32 size-[325px] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute right-10 top-6 size-[170px] rounded-full border border-white/10" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#c2e6bb]">Agricultural intelligence · selected field</p>
            <h1 id="parcel-overview-title" className="text-[25px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[30px]">{parcela?.nombre ?? 'No field selected'}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#d2e7d1]"><MapPin size={14} aria-hidden="true" />{parcela?.origen === 'custom' ? `${parcela.lat.toFixed(4)}, ${parcela.lon.toFixed(4)} · Worldwide` : `${parcela?.ciudad ?? 'Central Valley'}, California`}</div>
            <p className="mt-2 max-w-[560px] text-[11px] leading-relaxed text-[#d0e3ce] sm:text-[12px]">Explore available climate and field information. On custom coordinates, crop recommendations remain unavailable until regional evidence is verified. Priority: <strong className="font-extrabold text-white">{PRIORIDADES[prioridad] ?? 'Not selected'}</strong>.</p>
          </div>
          <a href="#detalle-estrategias" className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sage px-4 py-2.5 text-[12px] font-extrabold text-forest shadow-sm transition-colors hover:bg-[#c8e9bb]">
            Compare strategies <ArrowRight size={17} aria-hidden="true" />
          </a>
          <a href="#datos" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-white/10">
            Check NASA data <Satellite size={16} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Field snapshot indicators">
        <MetricCard icono={Droplets} tono="agua" etiqueta="Average surface soil moisture" fuente={smapP1 ? `SMAP · ${ejemploP1 ? "SAMPLE" : "P1"} ${smapP1.anio}` : 'NASA SMAP · demo'}
          valor={hum === null ? 'No data' : `${formatoNumero(hum, 1)} %`} descripcion={smapP1 ? `Average of ${smapP1.disponibles} months; ${ejemploP1 ? "fictitious data" : "P1 not audited"}` : 'Average of 12 demo months; not equivalent to available irrigation water'} />
        <MetricCard icono={ThermometerSun} tono="calor" etiqueta="Maximum temperature" fuente={climaReal.disponible ? `NASA POWER · ${power.year}` : 'NASA POWER · demo'}
          valor={climaReal.disponible ? `${formatoNumero(climaReal.maxTemperatura, 1)} °C` : temp === null ? 'No data' : `${formatoNumero(temp, 1)} °C`}
          descripcion={climaReal.disponible ? `Maximum recorded in ${climaReal.nTemperatura}/12 months; regional data ${climaReal.completo ? 'complete' : 'partial'}` : 'Maximum of the DEMO monthly records'} />
        <MetricCard icono={Sprout} tono="suelo" etiqueta="Organic matter" fuente={ssurgoP1 ? ejemploP1 ? 'SSURGO · FICTIONAL EXAMPLE' : 'SSURGO · P1 (not audited)' : 'USDA SSURGO · demo'}
          valor={suelo === null ? 'No data' : `${formatoNumero(suelo, 1)} %`} descripcion={ssurgoP1 ? 'Representative map-unit property; pending validation' : 'Physical soil property (demo)'} />
      </div>
    </section>
  );
}
