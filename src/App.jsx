import { useEffect, useState } from 'react';
import { ExternalLink, Github, Leaf, Satellite } from 'lucide-react';
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

export default function App() {
  const { parcela, prioridad } = useField();
  return (
    <PowerProvider key={`${parcela.id}:${parcela.lat}:${parcela.lon}`} parcela={parcela}>
      <SoilProvider key={`${parcela.id}:${parcela.lat}:${parcela.lon}`} parcela={parcela}>
        <SmapNumericProvider key={`${parcela.id}:${parcela.lat}:${parcela.lon}`} field={parcela}>
          <CropProvider key={`${parcela.lat}:${parcela.lon}`} parcela={parcela}>
            <GuidedFlowProvider>
              <AppContent parcela={parcela} prioridad={prioridad} />
            </GuidedFlowProvider>
          </CropProvider>
        </SmapNumericProvider>
      </SoilProvider>
    </PowerProvider>
  );
}

function AppContent({ parcela, prioridad }) {
  const [tourOpen, setTourOpen] = useState(false);
  const [capaGeo, setCapaGeo] = useState('general');
  const [mesGeo, setMesGeo] = useState('Julio');
  const { vista, paso, tab } = useGuidedFlow();
  const [avanzadoVisitado, setAvanzadoVisitado] = useState(vista === 'laboratorio');

  useEffect(() => {
    if (vista === 'laboratorio') setAvanzadoVisitado(true);
  }, [vista]);

  const { estrategias, fuente, cargando, error, generacion, avisos, modoEjemplo } = useStrategies(parcela.id, prioridad);

  return (
    <AppShell>
      <JourneyHeader onStartDemo={() => setTourOpen(true)} />
      <JudgeTour open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Step 1: Select Farm Location */}
      <div id="etapa-1" hidden={vista !== 'recorrido' || paso !== 0} className="scroll-mt-24">
        <div id="resumen">
          <div id="mapa">
            <FarmerLand visible={vista === 'recorrido' && paso === 0} />
          </div>
        </div>
      </div>

      {/* Step 2: Weather & Soil Summary */}
      <div id="etapa-2" hidden={vista !== 'recorrido' || paso !== 1} className="scroll-mt-24">
        <div id="diagnostico">
          <div id="senales">
            <FarmerSituation />
          </div>
        </div>
      </div>

      {/* Step 3: Crop Rotation Recommendations */}
      <div id="etapa-3" hidden={vista !== 'recorrido' || paso !== 2} className="scroll-mt-24">
        <FarmerChoices
          visible={vista === 'recorrido' && paso === 2}
          estrategias={estrategias}
          fuente={fuente}
          cargando={cargando}
          error={error}
          modoEjemplo={modoEjemplo}
        />
      </div>

      {vista === 'recorrido' && <JourneyFooter />}

      {/* More Information Panel */}
      {(avanzadoVisitado || vista === 'laboratorio') && (
        <div hidden={vista !== 'laboratorio'}>
          <DataWorkbench
            parcela={parcela}
            estrategias={estrategias}
            fuente={fuente}
            cargando={cargando}
            error={error}
            generacion={generacion}
            modoEjemplo={modoEjemplo}
            terreno={
              <div className="space-y-5">
                {parcela.origen === 'custom' ? (
                  <div className="rounded-xl border border-[#b7d8bc] bg-[#f2f9f1] p-4 text-sm text-[#1e6039]">
                    <strong>Selected Farm Location ({parcela.lat?.toFixed(3)}°, {parcela.lon?.toFixed(3)}°):</strong> NASA satellite weather records and the 25-rule CosoNASA recommendation engine are active for this land.
                  </div>
                ) : (
                  <ParcelOverview parcela={parcela} prioridad={prioridad} />
                )}
                <section className="map-panel-grid grid items-stretch gap-4" aria-label="Field layers and properties">
                  <MapView
                    instance="advanced"
                    visible={vista === 'laboratorio' && tab === 'terreno'}
                    capa={capaGeo}
                    onCapaChange={setCapaGeo}
                    mes={mesGeo}
                    onMesChange={setMesGeo}
                  />
                  <ParcelInfoPanel parcela={parcela} capa={capaGeo} mes={mesGeo} />
                </section>
              </div>
            }
            diagnostico={
              parcela.origen === 'custom' ? (
                <div className="rounded-xl border border-[#dfece0] bg-white p-6 text-sm text-[#4a6652]">
                  Your local weather summary is available in <strong>Step 2 (Field Conditions)</strong>, and full monthly NASA satellite records can be explored under the <strong>NASA POWER</strong> tab above.
                </div>
              ) : (
                <div className="space-y-6">
                  <TerritorialInsights
                    parcela={parcela}
                    prioridad={prioridad}
                    mes={mesGeo}
                    onExplorarMes={(nuevoMes) => {
                      setMesGeo(nuevoMes);
                      setCapaGeo('humedad');
                    }}
                  />
                  <DiagnosticCard parcela={parcela} />
                </div>
              )
            }
            estrategiasDetalle={
              <StrategyComparison
                key={`${parcela.id}:${prioridad}`}
                parcela={parcela}
                estrategias={estrategias}
                fuente={fuente}
                cargando={cargando}
                error={error}
                prioridad={prioridad}
                generacion={generacion}
                avisos={avisos}
                modoEjemplo={modoEjemplo}
              />
            }
          />
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pb-1 pt-5 text-xs text-[#718776]">
        <span className="flex items-center gap-2 font-bold text-[#376948]">
          <Leaf size={17} aria-hidden="true" /> Field Shift{' '}
          <span className="font-normal text-[#879a8a]">· NASA Space Apps 2026</span>
        </span>
        <span>Built to support farmers alongside local agricultural experience</span>
        <div className="flex flex-wrap items-center gap-4">
          <a
            className="focus-ring inline-flex items-center gap-1 font-bold text-agri hover:underline"
            href="https://github.com/AlanElNufjaja/Shift"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={15} /> GitHub <ExternalLink size={13} />
          </a>
          <a
            className="focus-ring inline-flex items-center gap-1 font-bold text-agri hover:underline"
            href="https://power.larc.nasa.gov/"
            target="_blank"
            rel="noreferrer"
          >
            <Satellite size={15} /> NASA POWER <ExternalLink size={13} />
          </a>
        </div>
      </footer>
    </AppShell>
  );
}