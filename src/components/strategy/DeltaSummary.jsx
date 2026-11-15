import { ArrowDownRight, ArrowUpRight, Droplets, Info, Sprout, TrendingUp } from 'lucide-react';
import { diferenciaVsBase, contarMesesDesnudos } from '../../lib/strategySimulator.js';
import { formatoDinero, formatoNumero } from '../../lib/diagnostics.js';

const medidas = [
  { campo: 'agua_mm', titulo: 'Water use', unidad: 'mm/cycle', icono: Droplets, sentidoBueno: -1 },
  { campo: 'nitrogeno_kg_acre', titulo: 'Potential nitrogen contribution', unidad: 'kg/acre', icono: Sprout, sentidoBueno: 1 },
  { campo: 'ingreso_usd_acre', titulo: 'Gross revenue', unidad: 'USD/acre', icono: TrendingUp, sentidoBueno: 1 },
];

function TarjetaDelta({ item, base, seleccionada }) {
  const delta = diferenciaVsBase(base, seleccionada, item.campo);
  const Icono = item.icono;
  const favorable = delta && delta.absoluta !== 0 && Math.sign(delta.absoluta) === item.sentidoBueno;
  const desfavorable = delta && delta.absoluta !== 0 && !favorable;
  const tono = favorable ? 'text-[#287348]' : desfavorable ? 'text-[#b46743]' : 'text-[#617868]';
  const cifra = delta === null ? 'No data' : `${delta.absoluta > 0 ? '+' : delta.absoluta < 0 ? '−' : ''}${item.campo === 'ingreso_usd_acre' ? formatoDinero(Math.abs(delta.absoluta)) : formatoNumero(Math.abs(delta.absoluta), item.campo === 'agua_mm' ? 1 : 0)}`;
  return (
    <div className="rounded-2xl border border-[#dfebe0] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#758979]"><Icono size={16} aria-hidden="true" />{item.titulo}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <strong className={`text-[22px] font-extrabold tracking-tight tabular-nums ${tono}`}>{cifra}</strong>
        {delta?.absoluta > 0 ? <ArrowUpRight size={18} className={tono} aria-hidden="true" /> : delta?.absoluta < 0 ? <ArrowDownRight size={18} className={tono} aria-hidden="true" /> : null}
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#829584]">
        {delta === null ? 'Missing value; change cannot be calculated' : `${item.unidad} · ${delta.porcentaje === null ? 'Percentage change unavailable' : `${delta.porcentaje > 0 ? '+' : ''}${formatoNumero(delta.porcentaje, 1)} % vs. baseline`}`}
      </p>
    </div>
  );
}

export default function DeltaSummary({ base, seleccionada }) {
  if (!base || !seleccionada) return (
    <div className="rounded-xl border border-[#e4eae1] bg-white p-5 text-[13px] text-[#6d8272]">Not enough strategies to compare.</div>
  );
  const cBase = contarMesesDesnudos(base.cobertura_mensual);
  const cActual = contarMesesDesnudos(seleccionada.cobertura_mensual);
  return (
    <section className="rounded-[20px] border border-[#dfe9df] bg-[#f7faf5] p-4 sm:p-5" aria-labelledby="impacto-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Direct comparison</p>
          <h3 id="impacto-title" aria-live="polite" className="text-[17px] font-extrabold text-forest">{seleccionada.id === 'baseline' ? 'Reference baseline' : `${seleccionada.titulo} vs. current rotation`}</h3>
          <p className="mt-1 text-[12px] text-[#728678]">Differences are calculated using the same assumptions for both options.</p>
        </div>
        <span className="rounded-full bg-[#e4f0e0] px-3 py-1.5 text-[10px] font-extrabold text-[#376946]">Δ vs. baseline</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {medidas.map((item) => <TarjetaDelta key={item.campo} item={item} base={base} seleccionada={seleccionada} />)}
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-3 text-[11px] leading-relaxed text-[#728576]">
        <Info size={15} className="mt-0.5 shrink-0 text-[#538461]" aria-hidden="true" />
        <p>Months with bare soil: <strong>{cActual === null ? 'no data' : cActual}</strong> in the selected option vs. <strong>{cBase === null ? 'no data' : cBase}</strong> in the baseline.
          Cover is a scenario assumption; fewer bare-soil months <strong>does not mean a quantified reduction in erosion</strong>.
          The shown nitrogen contribution does not equal fertilizer saved.</p>
      </div>
    </section>
  );
}
