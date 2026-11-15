import { displayMonth, displayTerm } from '../lib/displayEnglish.js';
import { useMemo } from 'react';
import {
  AlertTriangle, CalendarDays, CloudRain, Droplets, Info,
  Layers3, Leaf, ThermometerSun,
} from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { detectarMonocultivo, diagnosticarParcela, formatoNumero, serieMensual } from '../lib/diagnostics.js';
import PowerDiagnosticSummary from './data/PowerDiagnosticSummary.jsx';
import { usePower } from '../context/PowerContext.jsx';
import { resumirClimaPower } from '../lib/powerDiagnostics.js';
import { useField } from '../context/FieldContext.jsx';

function Indicador({ icono: Icono, etiqueta, valor, secundario, fuente, tono = 'verde' }) {
  const paletas = {
    verde: 'bg-[#e6f3e7] text-[#37835c]',
    azul: 'bg-[#e9f0fb] text-[#4d80c0]',
    coral: 'bg-[#fff0e7] text-[#cb7a48]',
    ambar: 'bg-[#fff6e2] text-[#b88430]',
  };
  return (
    <div className="rounded-2xl border border-[#e8eee8] bg-white p-4 transition-shadow hover:shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className={`flex size-10 items-center justify-center rounded-xl ${paletas[tono]}`}><Icono size={19} /></span>
        <span className="text-[10px] font-semibold tracking-wide text-[#91a097]">{fuente}</span>
      </div>
      <div className="mb-1 text-[11px] font-semibold text-[#64786b]">{etiqueta}</div>
      <div className="text-[24px] font-extrabold leading-tight tracking-[-0.05em] text-[#193b29]">{valor}</div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#87958d]">{secundario}</p>
    </div>
  );
}

function ClimateTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-xl border border-[#e0e9e2] bg-white p-3 text-[11px] shadow-xl">
      <p className="mb-2 font-extrabold text-[#203b2b]">{displayMonth(item.mes)}</p>
      <p className="text-[#3f8f73]">SMAP soil moisture: <strong>{item.humedad ?? '—'}{item.humedad === null ? '' : '%'}</strong></p>
      <p className="mt-1 text-[#d28a48]">Max. temperature: <strong>{item.temperatura ?? '—'}{item.temperatura === null ? '' : ' °C'}</strong></p>
      {item.sueloDesnudo && <p className="mt-2 font-semibold text-[#c45b5e]">● Month labeled as bare soil</p>}
    </div>
  );
}

export default function DiagnosticCard({ parcela }) {
  const power = usePower();
  const { evidenciaParcela } = useField();
  const ejemploP1 = !!evidenciaParcela?.modoEjemplo;
  const smapP1 = evidenciaParcela?.smap;
  const ssurgoP1 = evidenciaParcela?.ssurgo;
  const cropP1 = evidenciaParcela?.cropscape;
  const climaReal = resumirClimaPower(power);
  const diagnostico = useMemo(() => diagnosticarParcela(parcela), [parcela]);
  const datosGrafica = useMemo(() => serieMensual(parcela), [parcela]);
  const monocultivo = detectarMonocultivo(cropP1 ? cropP1.historial : parcela?.historial_cropscape);
  const suelo = ssurgoP1 ? ssurgoP1.suelo : parcela?.suelo_ssurgo ?? {};

  return (
    <section id="diagnostico-avanzado" className="scroll-mt-24 space-y-5" aria-labelledby="diagnostic-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">01 / Field conditions</div>
          <h2 id="diagnostic-title" className="section-title">Current assessment</h2>
        </div>
        <span className="text-[11px] font-medium text-[#7b8c80]">NASA POWER · NASA SMAP · USDA</span>
      </div>
      <PowerDiagnosticSummary />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador icono={ThermometerSun} etiqueta="Maximum temperature" fuente={climaReal.disponible ? `NASA POWER · ${power.year}` : 'NASA POWER · DEMO'}
          valor={climaReal.disponible ? `${formatoNumero(climaReal.maxTemperatura, 1)}°C` : diagnostico.tempMax === null ? '—' : `${formatoNumero(diagnostico.tempMax, 1)}°C`}
          secundario={climaReal.disponible ? `Maximum available value · ${climaReal.nTemperatura}/12 regional months` : `${diagnostico.heladas} months with frost risk (demo)`} tono="coral" />
        <Indicador icono={Droplets} etiqueta="Average soil moisture" fuente={smapP1 ? `NASA SMAP · ${ejemploP1 ? "SAMPLE" : "P1"} (${smapP1.anio})` : 'NASA SMAP · DEMO'}
          valor={(smapP1 ? smapP1.media : diagnostico.humedadMedia) === null ? '—' : `${formatoNumero(smapP1 ? smapP1.media : diagnostico.humedadMedia, 1)}%`}
          secundario={smapP1 ? `Average ${smapP1.disponibles}/12 months · ${ejemploP1 ? "fictional data" : "P1 source, not audited"}; separate combined chart remains demo` : 'Surface volumetric moisture, DEMO monthly average'} tono="azul" />
        <Indicador icono={Layers3} etiqueta="Organic matter" fuente={ssurgoP1 ? ejemploP1 ? 'SSURGO · FICTIONAL EXAMPLE' : 'SSURGO · P1 · unverified' : 'USDA SSURGO · DEMO'}
          valor={suelo.materia_organica_pct == null ? '—' : `${formatoNumero(suelo.materia_organica_pct, 1)}%`}
          secundario={`${displayTerm(suelo.textura)} · erosion ${displayTerm(suelo.riesgo_erosion).toLowerCase()}`} />
        <Indicador icono={Leaf} etiqueta="Crop history" fuente={cropP1 ? ejemploP1 ? 'CropScape · FICTIONAL EXAMPLE' : 'CropScape · P1 · unverified' : 'USDA CropScape · DEMO'}
          valor={monocultivo ? 'Repeated crop' : 'Diversified'}
          secundario={cropP1 ? `P1 classifications: ${cropP1.registros.length} years; pending validation` : monocultivo ? 'Crop repeated in consecutive years (demo)' : 'No consecutive repetition detected (demo)'}
          tono={monocultivo ? 'ambar' : 'verde'} />
      </div>

      <div className="panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">Comportamiento estacional</div>
            <h3 className="text-[16px] font-extrabold tracking-[-0.03em] text-[#173b29]">DEMO monthly series: soil moisture vs. heat</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#819085]">DEMONSTRATION monthly series (not updated with live POWER) · two separate axes</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-[#65796e]">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#398d76]" />Moisture (%)</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[#e5a05a]" />Max. temp. (°C)</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#f1a1a2]" />Bare soil</span>
          </div>
        </div>
        <div className="mt-6 h-[285px] w-full min-w-0" role="img" aria-label="Demo chart of 12 months of surface soil moisture and maximum temperature; red bars indicate bare soil. Does not include the live NASA POWER query.">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datosGrafica} margin={{ top: 8, right: 0, bottom: 0, left: -17 }} barCategoryGap="20%">
              <CartesianGrid stroke="#e9efea" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="abreviatura" tickLine={false} axisLine={false} tick={{ fill: '#8b9c90', fontSize: 10 }} dy={9} />
              <YAxis yAxisId="humedad" domain={[0, 45]} tickLine={false} axisLine={false} tick={{ fill: '#8b9c90', fontSize: 10 }} ticks={[0, 15, 30, 45]} tickFormatter={(valor) => `${valor}%`} />
              <YAxis yAxisId="temp" orientation="right" domain={[0, 50]} tickLine={false} axisLine={false} tick={{ fill: '#b19a82', fontSize: 10 }} ticks={[0, 15, 30, 45]} tickFormatter={(valor) => `${valor}°`} />
              <Tooltip content={<ClimateTooltip />} cursor={{ fill: '#f1f6ee', opacity: 0.45 }} />
              <Bar yAxisId="humedad" dataKey="sueloDesnudoMarker" fill="#f19b9e" fillOpacity={0.35} barSize={19} isAnimationActive={false} legendType="none" />
              <Line yAxisId="humedad" type="monotone" dataKey="humedad" stroke="#368e76" strokeWidth={3} connectNulls={false} dot={{ r: 3, strokeWidth: 0, fill: '#368e76' }} activeDot={{ r: 5 }} isAnimationActive={false} />
              <Line yAxisId="temp" type="monotone" dataKey="temperatura" stroke="#e3a15a" strokeWidth={3} connectNulls={false} dot={{ r: 3, strokeWidth: 0, fill: '#e3a15a' }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-5 grid gap-3 border-t border-[#edf1ec] pt-4 md:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-xl bg-[#fff8f3] p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#d78e5e]" />
            <p className="text-[11px] leading-relaxed text-[#926e52]">
              <strong className="text-[#9a643e]">{diagnostico.mesesCriticos.length} critical months in DEMO data:</strong> soil moisture below 15% and maximum temperature above 35°C, using the team’s exploratory thresholds.
            </p>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl bg-[#f2f7f1] p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-[#438962]" />
            <p className="text-[11px] leading-relaxed text-[#667f6c]">SMAP covers a much larger area than an individual field. This combined chart uses DEMO values only; P1 data can be viewed separately under “P1-provided observations”.</p>
          </div>
        </div>
      </div>

      <div className="panel p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2"><CalendarDays size={16} className="text-[#538b60]" /><h3 className="text-[13px] font-extrabold text-[#23422e]">{cropP1 ? ejemploP1 ? "FICTIONAL test history" : "P1 crop classifications (not audited)" : "Recorded crop history (sample)"}</h3></div>
        <div className="flex flex-wrap gap-2">
          {(cropP1 ? cropP1.historial : parcela?.historial_cropscape ?? []).map((registro, index) => (
            <span key={`${registro}-${index}`} className="rounded-lg border border-[#e7ede6] bg-[#f8faf7] px-3 py-2 text-[11px] font-semibold text-[#6b806f]">{registro}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
