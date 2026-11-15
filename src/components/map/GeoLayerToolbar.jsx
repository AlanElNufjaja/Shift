import { displayMonth } from '../../lib/displayEnglish.js';
import { CalendarDays, Droplets, Layers3, Mountain, Sprout, ThermometerSun } from 'lucide-react';
import { CAPAS, MESES } from '../../lib/geoLayers.js';

const ICONOS = {
  general: Layers3, humedad: Droplets, temperatura: ThermometerSun,
  erosion: Mountain, sueloDesnudo: Sprout,
};

/** Selector de capas puntuales, sin confundir un atributo por punto con una imagen raster. */
export default function GeoLayerToolbar({ capa, onCapaChange, mes, onMesChange }) {
  const activa = CAPAS.find((item) => item.id === capa) ?? CAPAS[0];
  return (
    <div className="space-y-3 border-y border-[#e7eee5] bg-[#fbfcfa] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-extrabold text-forest">Explore indicators</p>
          <p className="mt-0.5 text-[10px] text-muted">Point-based layers from the available JSON</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#9A642D]">
          <span className="size-1.5 rounded-full bg-[#CF9755]" aria-hidden="true" /> Demo data
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1" role="group" aria-label="Map indicator">
        <div className="flex w-max min-w-full gap-1.5">
          {CAPAS.map((item) => {
            const Icono = ICONOS[item.id];
            const marcado = item.id === capa;
            return (
              <button key={item.id} type="button" aria-pressed={marcado} title={item.descripcion}
                onClick={() => onCapaChange(item.id)}
                className={`focus-ring inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors ${marcado ? 'border-forest bg-forest text-white shadow-sm' : 'border-[#dde8dc] bg-white text-[#526f5c] hover:bg-[#f1f7ef]'}`}>
                <Icono size={15} aria-hidden="true" />{item.label}
              </button>
            );
          })}
        </div>
      </div>
      {activa.temporal && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#ecf5e9] px-3 py-2">
          <CalendarDays size={16} className="text-agri" aria-hidden="true" />
          <label htmlFor="geo-month" className="text-[11px] font-extrabold text-forest">Series month:</label>
          <select id="geo-month" value={mes} onChange={(evento) => onMesChange(evento.target.value)}
            className="focus-ring min-h-9 rounded-md border border-[#d6e5d2] bg-white px-2 text-[12px] font-bold text-forest">
            {MESES.map((nombre) => <option key={nombre} value={nombre}>{displayMonth(nombre)}</option>)}
          </select>
          <span className="text-[10px] text-[#64826a]">Unspecified year · synthetic sample</span>
        </div>
      )}
    </div>
  );
}
