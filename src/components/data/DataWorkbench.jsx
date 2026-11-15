import LiveCropPanel from '../crops/LiveCropPanel.jsx';
import { ArrowLeft, ChartNoAxesCombined, Database, FileJson, Layers3, Satellite, Sprout, Workflow, CircleDollarSign } from 'lucide-react';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import PowerDataPanel from './PowerDataPanel.jsx';
import DataIntakePanel from './DataIntakePanel.jsx';
import MultiSourceEvidencePanel from './MultiSourceEvidencePanel.jsx';
import EvidenceReviewPanel from './EvidenceReviewPanel.jsx';
import P2RecommendationPanel from '../strategy/P2RecommendationPanel.jsx';
import ErrorBoundary from '../ui/ErrorBoundary.jsx';
import TeamPilotPanel from '../global/TeamPilotPanel.jsx';
import ModelRunReviewPanel from '../strategy/ModelRunReviewPanel.jsx';
import DataFreshness from './DataFreshness.jsx';
import LiveSoilPanel from '../soil/LiveSoilPanel.jsx';
import SmapImageryPanel from './SmapImageryPanel.jsx';
import SmapNumericPanel from './SmapNumericPanel.jsx';
import ObservedEvidencePanel from './ObservedEvidencePanel.jsx';
import MarketEvidencePanel from './MarketEvidencePanel.jsx';

const TABS = [
  { id: 'terreno', titulo: 'Field & layers', Icono: Layers3 },
  { id: 'diagnostico', titulo: 'Assessment', Icono: ChartNoAxesCombined },
  { id: 'estrategias', titulo: 'Strategies', Icono: Sprout },
  { id: 'nasa', titulo: 'NASA POWER', Icono: Satellite },
  { id: 'smap', titulo: 'NASA SMAP', Icono: Satellite },
  { id: 'p1', titulo: 'P1 data', Icono: FileJson },
  { id: 'p2', titulo: 'P2 engine', Icono: Workflow },
  { id: 'market', titulo: 'Market News', Icono: CircleDollarSign },
];

/**
 * Nivel avanzado completo. Se mantiene montado aunque no sea visible para no
 * perder ajustes del simulador, consultas POWER ni formularios de importación.
 * El estado geográfico/agrícola vive en FieldContext y en los hooks existentes.
 */
export default function DataWorkbench({ parcela, estrategias, fuente, cargando, error, generacion, modoEjemplo, terreno, diagnostico, estrategiasDetalle }) {
  const { tab, vista, irADatos, irAPaso, paso } = useGuidedFlow();
  return <section id="laboratorio" className="space-y-5 scroll-mt-24" aria-label="Advanced data and tools">
    <div className="rounded-[22px] bg-forest px-5 py-6 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-[670px] items-start gap-3">
          <Database size={24} className="mt-1 shrink-0 text-sage" aria-hidden="true"/>
          <div>
            <h1 id="advanced-heading" tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">Data & details</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#d4e7d3]">Here you can explore full charts, map layers and NASA/USDA tools. These are optional; you do not need them to follow the simple assessment.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => irADatos('market')}
            aria-label="Open USDA Market News price references"
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#a9ceae] px-4 text-sm font-bold text-white hover:bg-white/10">
            <CircleDollarSign size={17} aria-hidden="true"/> Market prices
          </button>
          <button type="button" onClick={() => irAPaso(paso)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-sage px-4 text-sm font-bold text-forest"><ArrowLeft size={16} aria-hidden="true"/> Back to my assessment</button>
        </div>
      </div>
    </div>
    <p className="text-right text-xs text-[#6b816d]">Field Shift v4.5.2 Stable · Advanced tools</p>
    <DataFreshness scenarioSource={fuente}/>
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border-soft bg-white p-2 lg:grid-cols-4" role="group" aria-label="Advanced sections">
      {TABS.map(({ id, titulo, Icono }) => <button key={id} type="button" onClick={() => irADatos(id)} aria-pressed={tab === id}
        className={`focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-[12px] font-bold transition-colors ${tab === id ? 'bg-forest text-white' : 'text-[#5e7764] hover:bg-canvas'}`}><Icono size={16} aria-hidden="true"/>{titulo}</button>)}
    </div>
    <div id="detalle-terreno" hidden={tab !== 'terreno'} className="space-y-4">{terreno}<LiveSoilPanel/><LiveCropPanel/></div>
    <div id="detalle-diagnostico" hidden={tab !== 'diagnostico'} className="space-y-5"><ErrorBoundary resetKey={parcela.id} title="The observed evidence review could not be displayed."><ObservedEvidencePanel/></ErrorBoundary><ErrorBoundary resetKey={parcela.id} title="The detailed assessment could not be displayed.">{diagnostico}</ErrorBoundary></div>
    <div id="detalle-estrategias" hidden={tab !== 'estrategias'}>{estrategiasDetalle}</div>
    {/* Mantenerlos montados conserva año/consulta/adjuntos cuando se cambia de pestaña. */}
    <div hidden={tab !== 'nasa'}><ErrorBoundary resetKey={parcela.id} title="NASA POWER panel could not be displayed."><PowerDataPanel key={parcela.id} parcela={parcela}/></ErrorBoundary></div>
    <div id="detalle-smap" hidden={tab !== 'smap'}><ErrorBoundary resetKey={parcela.id} title="The NASA SMAP view could not be displayed."><div className="space-y-5"><SmapNumericPanel/><SmapImageryPanel active={tab === 'smap' && vista === 'laboratorio'}/></div></ErrorBoundary></div>
    <div hidden={tab !== 'p1'} className="space-y-6"><TeamPilotPanel/><DataIntakePanel/><EvidenceReviewPanel/><MultiSourceEvidencePanel/></div>
    <div id="detalle-market" hidden={tab !== 'market'} className="space-y-5"><ErrorBoundary resetKey="market" title="USDA Market News panel could not be displayed."><MarketEvidencePanel/></ErrorBoundary></div>
    <div hidden={tab !== 'p2'} className="space-y-6"><P2RecommendationPanel estrategias={estrategias} fuente={fuente} cargando={cargando} error={error} generacion={generacion} modoEjemplo={modoEjemplo}/><ErrorBoundary resetKey="p2-model-review" title="The model-run review could not be displayed."><ModelRunReviewPanel active={tab === 'p2'}/></ErrorBoundary></div>
  </section>;
}
