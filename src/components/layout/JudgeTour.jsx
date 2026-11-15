import { ArrowLeft, ArrowRight, CheckCircle2, Globe2, Info, MapPin, X } from 'lucide-react';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { useField } from '../../context/FieldContext.jsx';

const steps = [
  {
    title: '1. Locate a field',
    question: 'Can the farmer find their field?',
    text: 'Try Fresno for the full California pilot story, or type coordinates for a climate-only worldwide example. Map pins and manual coordinates stay synchronized.',
    evidence: 'Pilot coordinates are illustrative; no arbitrary location inherits California crop data.',
  },
  {
    title: '2. Understand conditions',
    question: 'What evidence is available?',
    text: 'The short signals use labeled demo data. NASA POWER queries historical climate on request; the optional USDA soil check returns a mapped soil unit when covered.',
    evidence: 'Official point and climate products are regional estimates, not measurements made on a farm.',
  },
  {
    title: '3. Compare choices',
    question: 'Which trade-offs matter?',
    text: 'Pick a farmer priority and inspect changes against the baseline. The crop rotations and business estimates are still fictional or unverified P2 outputs.',
    evidence: 'Download the source-labeled PDF and discuss what an agronomist must validate.',
  },
];

/** Optional presentation overlay; never edits data except an explicit sample-field selection. */
export default function JudgeTour({ open, onClose }) {
  const { vista, paso, irAPaso, irADatos } = useGuidedFlow();
  const { parcela, seleccionarParcela } = useField();
  if (!open || vista !== 'recorrido') return null;
  const item = steps[paso];
  return <aside className="rounded-[20px] border border-[#bcd8bd] bg-[#edf6e9] p-4 sm:p-5" role="region" aria-label="Optional judge walkthrough">
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-[#34764a]"><CheckCircle2 size={17}/> Optional 3-step judge walkthrough</span>
      <button type="button" onClick={onClose} aria-label="Close judge walkthrough" className="focus-ring grid size-9 place-items-center rounded-lg bg-white text-[#47704f]"><X size={18}/></button>
    </div>
    <h2 className="mt-2 text-base font-extrabold text-forest">{item.title} — {item.question}</h2>
    <p className="mt-1 max-w-[800px] text-sm leading-relaxed text-[#4a7054]">{item.text}</p>
    <p className="mt-3 flex max-w-[850px] items-start gap-2 rounded-lg bg-white/75 p-3 text-xs leading-relaxed text-[#607c63]"><Info size={16} className="shrink-0"/>{item.evidence}</p>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {paso===0 && <button type="button" onClick={()=>seleccionarParcela('fresno-01')} disabled={parcela.id==='fresno-01'} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#bbd9b8] bg-white px-3 text-xs font-bold text-forest disabled:opacity-60"><MapPin size={16}/> {parcela.id==='fresno-01'?'Fresno pilot selected':'Load Fresno pilot'}</button>}
      {paso===1 && <button type="button" onClick={()=>irADatos(parcela.origen==='custom'?'nasa':'p1')} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#bbd9b8] bg-white px-3 text-xs font-bold text-forest"><Globe2 size={16}/> Open source evidence</button>}
      {paso===2 && <button type="button" onClick={()=>irADatos('estrategias')} className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#bbd9b8] bg-white px-3 text-xs font-bold text-forest">Explore full comparison</button>}
      {paso>0&&<button type="button" onClick={()=>irAPaso(paso-1)} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#bbd9b8] bg-white px-3 text-xs font-bold text-forest"><ArrowLeft size={16}/> Previous</button>}
      {paso<2?<button type="button" onClick={()=>irAPaso(paso+1)} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-lg bg-forest px-4 text-xs font-bold text-white">Next demo step <ArrowRight size={16}/></button>
        :<button type="button" onClick={onClose} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-lg bg-forest px-4 text-xs font-bold text-white">Finish walkthrough <CheckCircle2 size={16}/></button>}
      <span className="ml-auto text-xs font-semibold text-[#5d805e]">{paso+1} / 3</span>
    </div>
  </aside>;
}
