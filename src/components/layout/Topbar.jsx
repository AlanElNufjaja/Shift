import { ArrowLeft, Database, FlaskConical, Leaf, MapPin } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { PASOS } from '../../lib/flowNavigation.js';

/** Una única cabecera: marca, parcela activa y acceso a detalles. Sin doble navegación. */
export default function Topbar() {
  const { parcela, prioridad, evidenciaParcela, resultadosP2 } = useField();
  const { vista, paso, irADatos, irAPaso } = useGuidedFlow();
  const power = usePower();
  const p2 = resultadosP2[`${parcela.id}:${prioridad}`];
  const etiqueta = parcela.origen === 'custom' ? 'Global · climate only' : p2 ? (p2.modoEjemplo ? 'Fictional P2' : 'P2 · unverified')
    : evidenciaParcela ? (evidenciaParcela.modoEjemplo ? 'P1 sample' : 'P1 · unverified')
      : power.status === 'success' ? 'POWER + demo' : 'Demo data';
  return <header className="sticky top-0 z-[800] border-b border-border-soft bg-white/95 backdrop-blur-xl">
    <div className="mx-auto flex h-[68px] max-w-[1150px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-sage"><Leaf size={23} aria-hidden="true"/></span>
        <div className="min-w-0">
          <span className="block truncate text-[16px] font-extrabold leading-tight tracking-[-0.04em] text-forest sm:text-lg">Field Shift</span>
          <span className="flex items-center gap-1 text-xs text-[#688273]"><MapPin size={12} aria-hidden="true"/> {parcela?.origen === 'custom' ? `${parcela.lat.toFixed(3)}, ${parcela.lon.toFixed(3)}` : (parcela?.ciudad || 'Central Valley')} <span className="hidden sm:inline">· {vista === 'recorrido' ? PASOS[paso].nombre : 'Data & details'}</span></span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-[#f0dfc4] bg-[#fff7e9] px-3 py-1.5 text-[11px] font-bold text-[#91642a] sm:inline-flex" title="See each indicator’s source and limitations"><FlaskConical size={13} aria-hidden="true"/>{etiqueta}</span>
        {vista === 'recorrido' ?
          <button type="button" onClick={() => irADatos(paso === 0 ? 'terreno' : paso === 1 ? 'diagnostico' : 'estrategias')} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dce8d8] bg-white px-3 text-xs font-bold text-[#315e40] hover:bg-[#f1f7ef] sm:px-4"><Database size={17} aria-hidden="true"/> <span className="hidden min-[410px]:inline">View data & details</span><span className="min-[410px]:hidden">Details</span></button>
          : <button type="button" onClick={() => irAPaso(paso)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-3 text-xs font-bold text-white sm:px-4"><ArrowLeft size={16} aria-hidden="true"/> Back to my assessment</button>}
      </div>
    </div>
  </header>;
}
