import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, WMSTileLayer, useMap } from 'react-leaflet';
import { CalendarDays, Droplets, ExternalLink, Info, Layers3, Satellite, TriangleAlert } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { GIBS_SMAP_WMS, SMAP_DEMO_DATE, SMAP_FIRST_DATE, SMAP_LIMITATIONS, SMAP_PRODUCTS, smapLayerConfig, validSmapDate } from '../../lib/smapImagery.js';

function FocusSelectedLocation({lat, lon, active}) {
  const map = useMap();
  useEffect(() => { if (!active) return undefined; const id = window.requestAnimationFrame(() => { map.invalidateSize(); map.setView([lat, lon], 8, { animate: false }); }); return () => window.cancelAnimationFrame(id); }, [map, lat, lon, active]);
  return null;
}

/** NASA's actual WMS raster overlay; pixel values must NOT be inferred from image colors. */
export default function SmapImageryPanel({ active = true }) {
  const { parcela } = useField();
  const [date, setDate] = useState(SMAP_DEMO_DATE);
  const [pass, setPass] = useState('day');
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(0.76);
  const [loadStatus, setLoadStatus] = useState('waiting');
  const lat = parcela?.lat;
  const lon = parcela?.lon;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lon);
  const valid = validSmapDate(date);
  const layer = useMemo(() => valid ? smapLayerConfig(pass, date) : null, [pass, date, valid]);
  useEffect(() => { setLoadStatus(visible ? 'loading' : 'waiting'); }, [date, pass, visible, lat, lon]);

  return <section className="space-y-4 rounded-[20px] border border-[#d7e7d5] bg-white p-4 sm:p-6" aria-labelledby="smap-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-[680px]">
        <p className="eyebrow mb-1">NASA GIBS · Satellite imagery</p>
        <h2 id="smap-heading" className="section-title flex items-center gap-2"><Satellite size={20} className="text-agri"/> SMAP soil-moisture imagery</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#58725f]">Explore a real NASA SMAP satellite image for your selected location and date. This is a visual layer, <strong>not a numerical point measurement</strong>.</p>
      </div>
      <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d7e7d5] px-3 text-xs font-bold text-agri hover:bg-canvas">NASA Worldview <ExternalLink size={14}/></a>
    </div>
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="grid gap-1.5 text-xs font-bold text-forest">
        <span className="flex items-center gap-1"><CalendarDays size={14}/> Observation date</span>
        <input aria-label="SMAP observation date" type="date" min={SMAP_FIRST_DATE} max={new Date().toISOString().slice(0,10)} value={date} onChange={e => setDate(e.target.value)} className="focus-ring min-h-11 rounded-xl border border-[#d5e5d3] px-3 text-sm"/>
      </label>
      <label className="grid gap-1.5 text-xs font-bold text-forest">
        <span className="flex items-center gap-1"><Layers3 size={14}/> Satellite pass</span>
        <select aria-label="SMAP satellite pass" value={pass} onChange={e=>setPass(e.target.value)} className="focus-ring min-h-11 rounded-xl border border-[#d5e5d3] bg-white px-3 text-sm">
          {Object.entries(SMAP_PRODUCTS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-forest"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)} className="size-4 accent-green-700"/> Show overlay</label>
    </div>
    {!valid && <p role="alert" className="rounded-xl bg-[#fff4e8] p-3 text-sm text-[#985e29]">Choose a valid date from March 31, 2015 to today.</p>}
    {hasPoint && <div className="relative overflow-hidden rounded-xl border border-[#d9e5d6]">
      <MapContainer key={`smap-map-${parcela.id}`} center={[lat, lon]} zoom={8} scrollWheelZoom={false} className="h-[310px] w-full sm:h-[420px]" zoomControl>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
        {active && visible && layer && <WMSTileLayer key={`${pass}:${date}`} url={GIBS_SMAP_WMS} layers={layer.layers}
          format={layer.format} transparent={layer.transparent} version={layer.version} time={layer.time} opacity={opacity}
          attribution='Imagery: NASA EOSDIS GIBS · SMAP L3' eventHandlers={{loading:()=>setLoadStatus('loading'), load:()=>setLoadStatus('loaded'), tileerror:()=>setLoadStatus('error')}}/>}
        <CircleMarker center={[lat,lon]} radius={8} pathOptions={{color:"#ffffff",weight:3,fillColor:"#194a32",fillOpacity:1}}/>
        <FocusSelectedLocation lat={lat} lon={lon} active={active}/>
      </MapContainer>
      <span className="pointer-events-none absolute left-3 top-3 z-[450] rounded-lg bg-white/95 px-3 py-1.5 text-[11px] font-bold text-forest shadow-sm">SMAP L3 · 9 km satellite view</span>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-3 text-xs font-semibold text-forest">Overlay opacity <input type="range" aria-label="SMAP overlay opacity" min="0.2" max="1" step="0.1" value={opacity} onChange={e=>setOpacity(Number(e.target.value))} className="accent-green-700" disabled={!visible}/></label>
      <span aria-live="polite" className="text-xs text-[#657d67]">{!visible ? 'Satellite overlay hidden.' : !valid ? 'Invalid date.' : loadStatus === 'error' ? 'NASA imagery tiles could not be loaded for this request.' : loadStatus === 'loaded' ? 'Map imagery loaded; individual pixel coverage is not guaranteed.' : 'Loading NASA imagery…'}</span>
    </div>
    {loadStatus === 'error' && visible && <p className="flex items-start gap-2 rounded-xl bg-[#fff5e8] p-3 text-sm text-[#8e6533]" role="alert"><TriangleAlert size={17} className="mt-0.5 shrink-0"/> GIBS did not load the imagery. Check your connection or try another date. No data were substituted.</p>}
    <div className="rounded-xl border border-[#dfebe0] bg-[#f6faf4] p-3 text-xs leading-relaxed text-[#55725b]">
      <p className="flex items-center gap-2 font-bold text-forest"><Droplets size={16}/> Satellite interpretation limits</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">{SMAP_LIMITATIONS.map(s=><li key={s}>{s}</li>)}</ul>
      <p className="mt-2 flex items-start gap-1.5"><Info size={15} className="mt-0.5 shrink-0"/> NASA GIBS WMS · {SMAP_PRODUCTS[pass].description}. Date: {date}. This view does not modify the assessment, PDF, or economic scenarios.</p>
    </div>
  </section>;
}
