import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, Crosshair, Globe2, MapPin, LocateFixed } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { validateCoordinates } from '../../lib/globalCoordinates.js';
import MapView from '../MapView.jsx';

/** Step 1 — three ways to select a point. User-controlled, no hidden California fallback. */
export default function FarmerLand({ visible }) {
  const { parcelasPiloto, parcela, seleccionarParcela, seleccionarCoordenadas } = useField();
  const { irADatos } = useGuidedFlow();
  const [method,setMethod]=useState('pilot');
  const [lat,setLat]=useState('');
  const [lon,setLon]=useState('');
  const [error,setError]=useState('');
  const [pickOnMap,setPickOnMap]=useState(false);
  const validation=validateCoordinates(lat,lon);

  function useCoordinates() {
    if(!validation.valid){setError(validation.error);return;}
    seleccionarCoordenadas(validation.lat,validation.lon);
    setError('');setPickOnMap(false);
  }
  function pick(lat,lon){
    seleccionarCoordenadas(lat,lon);
    setLat(lat.toFixed(5));setLon(lon.toFixed(5));setError('');setPickOnMap(false);
  }
  function useDeviceLocation(){
    if(!navigator.geolocation){setError('This browser does not support device location. Enter coordinates instead.');return;}
    navigator.geolocation.getCurrentPosition(
      ({coords})=>pick(coords.latitude,coords.longitude),
      ()=>setError('Location permission was denied or unavailable. You can enter coordinates manually.'),
      {enableHighAccuracy:false,timeout:10000,maximumAge:300000},
    );
  }

  return <section className="space-y-4" aria-label="Choose a field">
    <div className="rounded-[20px] border border-border-soft bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-forest">Where is your field?</h2>
      <p className="mt-1 text-sm text-[#65806c]">Try a California pilot or enter any valid latitude and longitude.</p>
      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Location method">
        {[{id:'pilot',text:'Pilot fields',Icon:MapPin},{id:'coordinates',text:'Coordinates',Icon:Globe2},{id:'map',text:'Pick on map',Icon:Crosshair}].map(({id,text,Icon})=><button key={id} type="button" onClick={()=>{setMethod(id);setPickOnMap(id==='map');setError('');}} aria-pressed={method===id}
          className={`focus-ring flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold sm:gap-2 sm:text-sm ${method===id?'border-[#428454] bg-[#eaf4e7] text-forest':'border-[#dee9de] bg-white text-[#617b65] hover:bg-[#f4f8f2]'}`}><Icon size={17} aria-hidden="true"/>{text}</button>)}
      </div>
      {method==='pilot'&&<div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-label="Available California pilot fields">
        {parcelasPiloto.map(p=>{const active=parcela.id===p.id;return <button key={p.id} type="button" aria-pressed={active} onClick={()=>seleccionarParcela(p.id)}
          className={`focus-ring flex min-h-14 items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-bold ${active?'border-[#428454] bg-[#eaf4e7] text-forest':'border-border-soft text-[#597160]'}`}><span>{p.ciudad}</span>{active&&<CheckCircle2 size={19} className="text-[#2f774a]"/>}</button>;})}</div>}
      {method==='coordinates'&&<div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-forest">Latitude <span className="block text-xs font-normal text-[#6a806e]">−90 to 90</span><input type="text" inputMode="decimal" autoComplete="off" value={lat} onChange={e=>setLat(e.target.value)} placeholder="36.6000" className="focus-ring mt-2 w-full rounded-xl border border-[#dce8d9] px-4 py-3 text-base"/></label>
          <label className="text-sm font-bold text-forest">Longitude <span className="block text-xs font-normal text-[#6a806e]">−180 to 180</span><input type="text" inputMode="decimal" autoComplete="off" value={lon} onChange={e=>setLon(e.target.value)} placeholder="-120.1000" className="focus-ring mt-2 w-full rounded-xl border border-[#dce8d9] px-4 py-3 text-base"/></label>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={useCoordinates} disabled={!validation.valid} className="focus-ring min-h-11 rounded-xl bg-forest px-5 text-sm font-bold text-white disabled:opacity-40">Use these coordinates</button>
          <button type="button" onClick={useDeviceLocation} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold text-[#346647]"><LocateFixed size={16}/> Use my device location</button></div>
        <p className="text-xs text-[#6b836f]">The device location may not be your farm. No browser location is requested without your action.</p>
      </div>}
      {method==='map'&&<div className="mt-4 rounded-xl border border-[#d7e6d6] bg-[#eff7eb] p-3 text-sm text-[#416f4e]">{pickOnMap?'Click any point on the map below to select its coordinates.':'Point selected. Click “Pick on map” to choose another.'}</div>}
      {error&&<p role="alert" className="mt-3 rounded-xl bg-[#fff5e6] p-3 text-sm text-[#946531]">{error}</p>}
    </div>
    <MapView instance="farmer" simple visible={visible} pickOnMap={method==='map'&&pickOnMap} onPickLocation={pick}/>
    <div className="rounded-[20px] border border-border-soft bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        <div><p className="text-xs text-[#69806e]">Selected location</p>
          <p className="mt-1 text-base font-bold text-forest">{parcela.origen==='custom'?`${parcela.lat.toFixed(4)}, ${parcela.lon.toFixed(4)}`:parcela.nombre}</p>
          <p className="mt-1 text-xs text-[#6a806e]">{parcela.origen==='custom'?'Global climate exploration · No regional crop recommendations yet':'Illustrative California pilot · Demo indicators and team snapshot remain separate'}</p>
        </div>
        <button type="button" onClick={()=>irADatos(parcela.origen==='custom'?'nasa':'terreno')} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#326c47] hover:underline">View available data <ArrowUpRight size={16}/></button>
      </div>
    </div>
  </section>;
}
