import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { ArrowUpRight, MapPinned, Scan } from 'lucide-react';
import { useField } from '../context/FieldContext.jsx';
import { datoGeografico } from '../lib/geoLayers.js';
import GeoLayerToolbar from './map/GeoLayerToolbar.jsx';
import GeoLegend from './map/GeoLegend.jsx';
import GeoComparison from './map/GeoComparison.jsx';

function crearPin(activo) {
  // HTML estático: no interpolar cadenas de datos externos en iconos HTML de Leaflet.
  return L.divIcon({
    className: 'field-pin-wrapper',
    html: `<span class="field-pin${activo ? ' field-pin--active' : ''}"><span class="field-pin-dot"></span></span>`,
    iconSize: [40, 48], iconAnchor: [20, 43], popupAnchor: [0, -36],
  });
}

function CoordinatePicker({enabled, onPick}) {
  useMapEvents({ click(e) { if (enabled && onPick) onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function ControlVista({ parcelas, parcelaId, reinicios, visible }) {
  const mapa = useMap();
  const actual = parcelas.find(p=>p.id===parcelaId);
  const positionKey = `${parcelaId}:${actual?.lat}:${actual?.lon}`;
  const ultimaSeleccion = useRef(positionKey);

  // Leaflet necesita recalcular dimensiones al volver a una etapa antes oculta.
  useEffect(() => {
    if (!visible) return undefined;
    const id = window.requestAnimationFrame(() => mapa.invalidateSize({ pan: false }));
    return () => window.cancelAnimationFrame(id);
  }, [mapa, visible]);

  // Reset de vista no cambia selección ni capa.
  useEffect(() => {
    const puntos = parcelas.filter((p) => p.origen !== 'custom' && Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (puntos.length) {
      if (actual?.origen === 'custom' && reinicios === 0) { mapa.setView([actual.lat, actual.lon], 8, { animate: false }); return; }
      mapa.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lon])), {
        padding: [50, 50], maxZoom: 8, animate: false,
      });
    }
  }, [mapa, reinicios]);

  useEffect(() => {
    if (ultimaSeleccion.current === positionKey) return;
    ultimaSeleccion.current = positionKey;
    const elegida = parcelas.find((p) => p.id === parcelaId);
    if (elegida && Number.isFinite(elegida.lat) && Number.isFinite(elegida.lon)) {
      const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reducirMovimiento) mapa.setView([elegida.lat, elegida.lon], 8, { animate: false });
      else mapa.flyTo([elegida.lat, elegida.lon], 8, { duration: 0.65 });
    }
  }, [mapa, parcelaId, parcelas, positionKey]);
  return null;
}

/**
 * Visualización puntual de indicadores, NO superficies continuas ni huellas satelitales.
 * El halo es un CircleMarker de píxeles, no un círculo en metros.
 */
export default function MapView({ visible = true, capa = 'general', onCapaChange, mes = 'Julio', onMesChange, simple = false, instance = 'main', pickOnMap = false, onPickLocation }) {
  const { parcelas, parcela, seleccionarParcela } = useField();
  const [reinicios, setReinicios] = useState(0);
  const pinActivo = useMemo(() => crearPin(true), []);
  const pinInactivo = useMemo(() => crearPin(false), []);
  const ubicaciones = parcelas.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const pilotsCount = parcelas.filter(p=>p.origen !== 'custom').length;

  return (
    <section className="panel min-w-0 overflow-hidden" aria-labelledby={`${instance}-map-title`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div>
          {!simple && <p className="eyebrow mb-1">Geospatial explorer</p>}
          <h2 id={`${instance}-map-title`} className="section-title">{simple ? "Find your field" : "Field map"}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5e9] px-3 py-1.5 text-[10px] font-extrabold text-[#3c704b]">
          <span className="size-1.5 rounded-full bg-[#559865]" />{pilotsCount} pilot locations{parcela?.origen === 'custom' ? ' + global point' : ''}
        </span>
      </div>

      {!simple && <GeoLayerToolbar capa={capa} onCapaChange={onCapaChange} mes={mes} onMesChange={onMesChange} />}

      <div className="relative mx-3 mt-3 overflow-hidden rounded-[14px] border border-[#dae7d9] sm:mx-4">
        <MapContainer center={[37.0, -120.0]} zoom={7} scrollWheelZoom={false}
          zoomControl={false} className="h-[340px] w-full sm:h-[420px] min-[1200px]:h-[460px]" preferCanvas={false}>
          {/* Teselas OSM: fuente gratuita, sujeta a la política del servidor público. */}
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
          <ZoomControl position="bottomright" />
          <CoordinatePicker enabled={simple && pickOnMap} onPick={onPickLocation} />
          <ControlVista parcelas={parcelas} parcelaId={parcela?.id} reinicios={reinicios} visible={visible} />
          {!simple && capa !== 'general' && ubicaciones.filter(p=>p.origen !== 'custom').map((p) => {
            const dato = datoGeografico(p, capa, mes);
            return (
              <CircleMarker key={`halo-${p.id}`} center={[p.lat, p.lon]} radius={26}
                interactive={false} pathOptions={{
                  color: dato.color, fillColor: dato.color, fillOpacity: 0.36,
                  opacity: 0.9, weight: 3,
                }} />
            );
          })}
          {ubicaciones.map((p) => {
            const dato = p.origen==='custom' ? null : datoGeografico(p, capa, mes);
            return (
              <Marker key={p.id} position={[p.lat, p.lon]} keyboard
                icon={p.id === parcela?.id ? pinActivo : pinInactivo}
                eventHandlers={{ click: () => (simple && pickOnMap && onPickLocation ? onPickLocation(p.lat,p.lon) : seleccionarParcela(p.id)) }}>
                {!simple && capa !== 'general' && dato && (
                  <Tooltip permanent direction="top" offset={[0, -24]} opacity={1} className="field-value-tooltip">
                    {dato.etiqueta}
                  </Tooltip>
                )}
                <Popup>
                  <div className="min-w-[168px]">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#628571]">{p.origen==='custom'?'Custom location':'Pilot field'}</p>
                    <strong className="text-[13px] text-[#173a28]">{p.nombre}</strong>
                    <p className="my-1 text-[11px] text-slate-500">{p.origen==='custom'?'Worldwide coordinates':`${p.ciudad ?? 'Central Valley'}, California`}</p>
                    {!simple && capa !== 'general' && dato && <p className="my-1 text-[12px] font-extrabold text-[#386d4d]">{dato.etiqueta}</p>}
                    <a href={simple ? "#etapa-2" : "#detalle-diagnostico"} onClick={() => seleccionarParcela(p.id)}
                      className="inline-flex items-center gap-1 rounded-md py-1 text-[11px] font-extrabold text-[#287d52] hover:underline">
                      {p.origen==='custom'?'View climate':'View assessment'} <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        <div className="pointer-events-none absolute left-3 top-3 z-[450] flex items-center gap-2 rounded-lg border border-white/75 bg-white/95 px-3 py-2 shadow-sm">
          <MapPinned size={14} className="text-[#397f55]" aria-hidden="true" />
          <span className="text-[10px] font-bold text-[#2e4c38]"><span className="hidden sm:inline">{parcela?.origen==='custom'?'Worldwide explorer':'Central Valley · California'}</span><span className="sm:hidden">{parcela?.origen==='custom'?'Worldwide':'Central Valley'}</span></span>
        </div>
        <button type="button" onClick={() => setReinicios((n) => n + 1)}
          className="focus-ring absolute right-3 top-3 z-[450] inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d8e6d5] bg-white px-3 py-2 text-[10px] font-extrabold text-forest shadow-sm hover:bg-[#f0f7ed]"
          title="Reset view to California pilot fields" aria-label="Show all pilot fields on the map">
          <Scan size={14} aria-hidden="true" /> Show pilots
        </button>
      </div>
      {!simple && <><div className="mx-3 mt-3 sm:mx-4"><GeoLegend capa={capa} /></div>
      <GeoComparison parcelas={parcelas.filter(p=>p.origen !== 'custom')} parcelaId={parcela?.id} capa={capa} mes={mes} onSeleccionar={seleccionarParcela} /></>}
      <div className="flex items-start gap-2 px-4 py-3 text-[12px] leading-relaxed text-[#6f856e] sm:px-5">
        <span className="mt-1 size-2 shrink-0 rounded-full bg-agri" aria-hidden="true" />
        <p>{simple ? pickOnMap ? 'Click the map to select global coordinates. This does not establish a field boundary.' : 'Pilot points are illustrative. Custom locations provide climate-only exploration; no soil or crop history is inferred.' : <>Choose a pin or location to compare. Halos and labels represent <strong>point-based example data</strong>, not measured surfaces or parcel boundaries. Map tiles require an internet connection.</>}</p>
      </div>
    </section>
  );
}
