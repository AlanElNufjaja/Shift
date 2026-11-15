import { RotateCcw, SlidersHorizontal, Info } from 'lucide-react';
import { AJUSTES_INICIALES, LIMITES_AJUSTES } from '../../lib/strategySimulator.js';

function Control({ id, titulo, descripcion, valor, onChange, minimo, maximo, unidad = '%' }) {
  const prefijo = valor > 0 ? '+' : '';
  return (
    <div className="rounded-2xl border border-[#dfebdd] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="block text-[13px] font-extrabold text-[#214b32]">{titulo}</label>
          <p className="mt-1 text-[11px] leading-relaxed text-[#768b79]">{descripcion}</p>
        </div>
        <output htmlFor={id} className="shrink-0 rounded-xl bg-[#eaf3e8] px-3 py-2 text-[15px] font-extrabold tabular-nums text-[#285e40]">
          {prefijo}{valor}{unidad}
        </output>
      </div>
      <input id={id} type="range" min={minimo} max={maximo} step="5" value={valor}
        onChange={(evento) => onChange(Number(evento.target.value))}
        className="mt-5 w-full cursor-pointer accent-[#347b50]"
        aria-valuetext={`${valor > 0 ? 'more' : valor < 0 ? 'less' : 'no change'} ${Math.abs(valor)} percent`} />
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-[#8a9d8b]">
        <span>{minimo}%</span><span>0%</span><span>+{maximo}%</span>
      </div>
    </div>
  );
}

export default function ScenarioControls({ ajustes, onChange, onRestaurar, fuente }) {
  const alterado = ajustes.precioPct !== 0 || ajustes.aguaPct !== 0;
  return (
    <section className="rounded-[20px] border border-[#dfe9dc] bg-[#f3f7f0] p-4 sm:p-5" aria-labelledby="sensibilidad-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ddeddb] text-[#347b50]">
            <SlidersHorizontal size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow mb-1">Explore assumptions</p>
            <h3 id="sensibilidad-title" className="text-[17px] font-extrabold tracking-tight text-forest">Sensitivity simulator</h3>
            <p className="mt-1 max-w-[640px] text-[12px] leading-relaxed text-[#6f8472]">
              Adjust two assumptions <strong>proportionally and identically</strong> across all three strategies.
              This does not change crop rotations, nitrogen estimates, or generate new farm predictions.
            </p>
          </div>
        </div>
        <button type="button" onClick={onRestaurar} disabled={!alterado}
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfe1cb] bg-white px-3.5 text-[12px] font-extrabold text-[#396c47] hover:bg-[#edf5ea] disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCcw size={15} aria-hidden="true" /> Reset
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Control id="precio-hipotesis" titulo="Sales price change" descripcion="Hypothetical factor applied to each option’s gross revenue."
          minimo={LIMITES_AJUSTES.precioPct[0]} maximo={LIMITES_AJUSTES.precioPct[1]}
          valor={ajustes.precioPct} onChange={(precioPct) => onChange({ ...ajustes, precioPct })} />
        <Control id="agua-hipotesis" titulo="Water demand change" descripcion="Hypothetical factor applied to each option’s mm per cycle."
          minimo={LIMITES_AJUSTES.aguaPct[0]} maximo={LIMITES_AJUSTES.aguaPct[1]}
          valor={ajustes.aguaPct} onChange={(aguaPct) => onChange({ ...ajustes, aguaPct })} />
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#dce7d8] bg-white/70 px-3 py-2.5 text-[11px] leading-relaxed text-[#718372]">
        <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[#5b9468]" />
        <span>Source of starting values: {fuente === 'backend' ? 'P2 API (not audited)' : fuente === 'p2-importado' ? 'P2 file (not audited)' : 'Synthetic demo JSON'}.
          Sliders calculate <strong>local mathematical scenarios, not NASA/USDA forecasts</strong>.
          Revenue is gross and excludes production costs.</span>
      </div>
    </section>
  );
}

export { AJUSTES_INICIALES };
