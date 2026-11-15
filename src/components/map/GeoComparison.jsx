import { displayMonth } from '../../lib/displayEnglish.js';
import { ArrowUpRight, Check } from 'lucide-react';
import { datoGeografico } from '../../lib/geoLayers.js';

/** Comparación compacta de los tres registros, no interpolación espacial. */
export default function GeoComparison({ parcelas, parcelaId, capa, mes, onSeleccionar }) {
  if (capa === 'general') return null;
  return (
    <div className="px-4 pb-3 pt-2 sm:px-5" aria-label="Pilot point comparison">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#768d78]">Compare locations · {mes && ['humedad', 'temperatura', 'sueloDesnudo'].includes(capa) ? displayMonth(mes) : 'Soil'}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {parcelas.map((parcela) => {
          const dato = datoGeografico(parcela, capa, mes);
          const activo = parcela.id === parcelaId;
          return (
            <button key={parcela.id} type="button" onClick={() => onSeleccionar(parcela.id)}
              aria-pressed={activo}
              className={`focus-ring flex min-h-[70px] min-w-0 items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition-colors ${activo ? 'border-[#87b58b] bg-[#eff7eb]' : 'border-[#e3ebe2] bg-white hover:bg-[#f6faf5]'}`}>
              <span className="min-w-0 space-y-1">
                <span className="block truncate text-[11px] font-extrabold text-forest">{parcela.ciudad}</span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#547260]"><span className="size-2.5 shrink-0 rounded-full border border-white shadow-sm" style={{ background: dato.color }} />{dato.etiqueta}</span>
              </span>
              {activo ? <Check size={15} className="shrink-0 text-[#32744D]" aria-label="Active" /> : <ArrowUpRight size={15} className="shrink-0 text-[#90A292]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
