import { ArrowLeft, ArrowRight, Check, PlayCircle } from 'lucide-react';
import { PASOS } from '../../lib/flowNavigation.js';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';

const TEXTO = [
  { pregunta: 'Which field would you like to explore?', ayuda: 'Select a California pilot, enter coordinates worldwide, or choose a point on the map.' },
  { pregunta: 'What is happening on your field?', ayuda: 'Here are the most important signals supported by the available data.' },
  { pregunta: 'What are your options?', ayuda: 'Choose what matters most to you and compare options without getting lost in numbers.' },
];

export default function JourneyHeader({ onStartDemo }) {
  const { vista, paso, irAPaso } = useGuidedFlow();
  if (vista !== 'recorrido') return null;
  return <section className="space-y-5" aria-label="Farmer’s guided journey">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-[#5a7560]">Step {paso + 1} of 3</span>
      <button type="button" onClick={() => { irAPaso(0); onStartDemo?.(); }} className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#ccdfca] bg-white px-3 text-xs font-bold text-[#2f6947] hover:bg-[#edf6e9]"><PlayCircle size={16} aria-hidden="true"/> Judge demo</button>
    </div>
    <nav className="grid grid-cols-3 gap-2" aria-label="Assessment steps">
      {PASOS.map((item, index) => <button key={item.id} type="button" aria-current={paso === index ? 'step' : undefined} onClick={() => irAPaso(index)}
        className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold transition-colors sm:text-sm ${paso === index ? 'border-forest bg-forest text-white' : index < paso ? 'border-[#cfe5c9] bg-[#e9f4e6] text-[#2d6a43]' : 'border-[#e0ebe0] bg-white text-[#5b7561]'}`}>
        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${paso === index ? 'bg-sage text-forest' : 'bg-white/75 text-[#56735d]'}`}>{index < paso ? <Check size={14}/> : index+1}</span>
        <span>{item.nombre}</span>
      </button>)}
    </nav>
    <div>
      <h1 id="journey-heading" tabIndex={-1} className="text-[28px] font-extrabold leading-tight tracking-[-0.045em] text-forest outline-none sm:text-[36px]">{TEXTO[paso].pregunta}</h1>
      <p className="mt-2 max-w-[700px] text-[15px] leading-relaxed text-[#607965]">{TEXTO[paso].ayuda}</p>
    </div>
  </section>;
}

/** Una sola acción principal por etapa; avanzar no depende de registros simulados. */
export function JourneyFooter() {
  const { paso, irAPaso } = useGuidedFlow();
  const siguientes = ['Assess this field', 'See my options', 'Return to my field'];
  return <nav className="flex items-center justify-between gap-3 border-t border-[#deeadb] pt-5" aria-label="Continue assessment">
    {paso > 0 ? <button type="button" onClick={() => irAPaso(paso - 1)} className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-soft bg-white px-5 text-sm font-bold text-forest"><ArrowLeft size={17} aria-hidden="true"/> Back</button> : <span />}
    {paso === 2 ? <button type="button" onClick={() => irAPaso(0)} className="focus-ring min-h-11 rounded-xl px-4 text-sm font-semibold text-[#4b7754] hover:bg-[#edf5e9]">Start over</button>
      : <button type="button" onClick={() => irAPaso(paso + 1)} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#285d40] sm:px-7">{siguientes[paso]} <ArrowRight size={17} aria-hidden="true"/></button>}
  </nav>;
}
