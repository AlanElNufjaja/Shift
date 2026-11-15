import { useEffect, useState } from 'react';
import { ExternalLink, Leaf, Satellite } from 'lucide-react';
import AppShell from './components/layout/AppShell.jsx';
import JourneyHeader, { JourneyFooter } from './components/layout/JourneyHeader.jsx';
import FarmerLand from './components/overview/FarmerLand.jsx';
import FarmerSituation from './components/overview/FarmerSituation.jsx';
import FarmerChoices from './components/overview/FarmerChoices.jsx';
import ParcelOverview from './components/overview/ParcelOverview.jsx';
import MapView from './components/MapView.jsx';
import ParcelInfoPanel from './components/map/ParcelInfoPanel.jsx';
import DiagnosticCard from './components/DiagnosticCard.jsx';
import TerritorialInsights from './components/insights/TerritorialInsights.jsx';
import StrategyComparison from './components/StrategyComparison.jsx';
import DataWorkbench from './components/data/DataWorkbench.jsx';
import { PowerProvider } from './context/PowerContext.jsx';
import { SoilProvider } from './context/SoilContext.jsx';
import { CropProvider } from './context/CropContext.jsx';
import { SmapNumericProvider } from './context/SmapNumericContext.jsx';
import { GuidedFlowProvider, useGuidedFlow } from './context/GuidedFlowContext.jsx';
import { useField } from './context/FieldContext.jsx';
import { useStrategies } from './hooks/useStrategies.js';
import JudgeTour from './components/layout/JudgeTour.jsx';

/** Field Shift 3.1: motor existente, dos niveles de presentación. */
export default function App() {
  const { parcela, prioridad } = useField();
  return <PowerProvider key={`${parcela.id}:${parcela.lat}:${parcela.lon}`} parcela={parcela}>
    <SoilProvider key={`${parcela.id}:${parcela.lat}:${parcela.lon}`} parcela={parcela}><SmapNumericProvider key={`${parcela.id}:${parcela.lat}:${parcela.lon}`} field={parcela}><CropProvider key={`${parcela.lat}:${parcela.lon}`} parcela={parcela}><GuidedFlowProvider><AppContent parcela={parcela} prioridad={prioridad}/></GuidedFlowProvider></CropProvider></SmapNumericProvider></SoilProvider>
  </PowerProvider>;
}

function AppContent({ parcela, prioridad }) {
  const [tourOpen, setTourOpen] = useState(false);
  const [capaGeo, setCapaGeo] = useState('general');
  const [mesGeo, setMesGeo] = useState('Julio');
  const { vista, paso, tab } = useGuidedFlow();
  const [avanzadoVisitado, setAvanzadoVisitado] = useState(vista === 'laboratorio');
  useEffect(() => { if (vista === 'laboratorio') setAvanzadoVisitado(true); }, [vista]);
  const { estrategias, fuente, cargando, error, generacion, avisos, modoEjemplo } = useStrategies(parcela.id, prioridad);
  return <AppShell>
    <JourneyHeader onStartDemo={() => setTourOpen(true)}/>
    <JudgeTour open={tourOpen} onClose={() => setTourOpen(false)}/>

    {/* Paso 1: solo mapa + elección de parcela. Sin barras técnicas ni sidebar. */}
    <div id="etapa-1" hidden={vista !== 'recorrido' || paso !== 0} className="scroll-mt-24">
      <div id="resumen"><div id="mapa"><FarmerLand visible={vista === 'recorrido' && paso === 0}/></div></div>
    </div>
    {/* Paso 2: señales breves. Las gráficas completas se abren en avanzado. */}
    <div id="etapa-2" hidden={vista !== 'recorrido' || paso !== 1} className="scroll-mt-24">
      <div id="diagnostico"><div id="senales"><FarmerSituation/></div></div>
    </div>
    {/* Paso 3: prioridad y una alternativa, no tres comparadores gigantes. */}
    <div id="etapa-3" hidden={vista !== 'recorrido' || paso !== 2} className="scroll-mt-24">
      <FarmerChoices visible={vista === 'recorrido' && paso === 2} estrategias={estrategias} fuente={fuente} cargando={cargando} error={error} modoEjemplo={modoEjemplo}/>
    </div>
    {vista === 'recorrido' && <JourneyFooter/>}

    {/* Los módulos científicos no se desmontan al volver al asistente. */}
    {(avanzadoVisitado || vista === 'laboratorio') && <div hidden={vista !== 'laboratorio'}>
      <DataWorkbench parcela={parcela} estrategias={estrategias} fuente={fuente} cargando={cargando}
        error={error} generacion={generacion} modoEjemplo={modoEjemplo}
        terreno={<div className="space-y-5">
          {parcela.origen === 'custom' ? <div className="rounded-xl border border-[#e7dfcb] bg-[#fff8e9] p-4 text-sm text-[#805f31]">Global point: regional climate can be queried under NASA POWER. Soil, crop history and local economic estimates are not available for this location.</div> : <ParcelOverview parcela={parcela} prioridad={prioridad}/>}
          <section className="map-panel-grid grid items-stretch gap-4" aria-label="Field layers and properties">
            <MapView instance="advanced" visible={vista === 'laboratorio' && tab === 'terreno'} capa={capaGeo} onCapaChange={setCapaGeo} mes={mesGeo} onMesChange={setMesGeo}/>
            <ParcelInfoPanel parcela={parcela} capa={capaGeo} mes={mesGeo}/>
          </section>
        </div>}
        diagnostico={parcela.origen === 'custom' ? <div className="rounded-xl border bg-white p-6 text-sm text-[#5d7463]">The exploratory climate summary is shown in Field conditions. Detailed NASA climate data are available under the NASA POWER tab. Combined crop-stress signals require verified soil data.</div> : <div className="space-y-6">
          <TerritorialInsights parcela={parcela} prioridad={prioridad} mes={mesGeo}
            onExplorarMes={(nuevoMes) => { setMesGeo(nuevoMes); setCapaGeo('humedad'); }}/>
          <DiagnosticCard parcela={parcela}/>
        </div>}
        estrategiasDetalle={parcela.origen === 'custom' ? <div className="rounded-xl border bg-white p-6 text-sm text-[#5d7463]">No location-specific crop rotation model has been validated for arbitrary global coordinates. California demo scenarios are intentionally hidden.</div> : <StrategyComparison key={`${parcela.id}:${prioridad}`} parcela={parcela} estrategias={estrategias} fuente={fuente}
          cargando={cargando} error={error} prioridad={prioridad} generacion={generacion} avisos={avisos} modoEjemplo={modoEjemplo}/>} />
    </div>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pb-1 pt-5 text-xs text-[#718776]">
      <span className="flex items-center gap-2 font-bold text-[#376948]"><Leaf size={17} aria-hidden="true"/> Field Shift <span className="font-normal text-[#879a8a]">· NASA Space Apps 2026</span></span>
      <span>Fields and scenarios are demo data unless labeled otherwise · Field validation required</span>
      <a className="focus-ring inline-flex items-center gap-1 font-bold text-agri hover:underline" href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer"><Satellite size={15}/> NASA POWER <ExternalLink size={13}/></a>
    </footer>
  </AppShell>;
}
