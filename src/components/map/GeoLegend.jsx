import { Info } from 'lucide-react';
import { descripcionLeyenda } from '../../lib/geoLayers.js';

export default function GeoLegend({ capa }) {
  const leyenda = descripcionLeyenda(capa);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#dfe9dc] bg-[#f8fbf7] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4" aria-label="Map legend">
      <div className="min-w-0 space-y-1.5">
        <span className="text-[11px] font-extrabold text-forest">{leyenda.titulo}</span>
        {leyenda.tipo === 'gradiente' && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] text-[#64806d]">{leyenda.min}</span>
            <span className={`h-2 w-24 rounded-full ${capa === 'humedad' ? 'geo-gradient-moisture' : 'geo-gradient-temp'}`} aria-hidden="true" />
            <span className="shrink-0 text-[10px] text-[#64806d]">{leyenda.max}</span>
          </div>
        )}
        {leyenda.tipo === 'categorias' && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {leyenda.items.map((item) => <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] text-[#58735e]"><span className="size-2.5 rounded-full" style={{ background: item.color }} /> {item.label}</span>)}
          </div>
        )}
      </div>
      <p className="flex max-w-[350px] gap-1.5 text-[10px] leading-relaxed text-[#7D8F7B]"><Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{leyenda.nota}</p>
    </div>
  );
}
