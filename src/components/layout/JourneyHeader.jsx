import { AlertCircle, ArrowLeft, ArrowRight, Check, Lock, PlayCircle } from 'lucide-react';
import { PASOS } from '../../lib/flowNavigation.js';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';

const TEXTO = [
  {
    pregunta: 'Where is your farm located?',
    ayuda: 'Search for your town, use your current GPS location, click any point on the map, or pick a sample farm below.',
  },
  {
    pregunta: 'How are the weather and soil on your land?',
    ayuda: 'Here is a simple summary of temperature, rainfall, and soil conditions for your selected field.',
  },
  {
    pregunta: 'Which 3-year crop rotation fits your goal?',
    ayuda: 'Pick your main priority and what you planted last to see 3 clear crop rotation plans.',
  },
];

export default function JourneyHeader({ onStartDemo }) {
  const { vista, paso, irAPaso, terrenoConfirmado, avisoPaso } = useGuidedFlow();
  if (vista !== 'recorrido') return null;

  return (
    <section className="space-y-5" aria-label="Farmer’s guided journey">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#5a7560]">
          Step {paso + 1} of 3 {terrenoConfirmado ? '· Farm location confirmed' : '· Select your location first'}
        </span>
        <button
          type="button"
          onClick={() => {
            irAPaso(0);
            onStartDemo?.();
          }}
          className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#ccdfca] bg-white px-3 text-xs font-bold text-[#2f6947] hover:bg-[#edf6e9]"
        >
          <PlayCircle size={16} aria-hidden="true" /> Quick Tour
        </button>
      </div>

      <nav className="grid grid-cols-3 gap-2" aria-label="Assessment steps">
        {PASOS.map((item, index) => {
          const bloqueado = index > 0 && !terrenoConfirmado;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={paso === index ? 'step' : undefined}
              aria-disabled={bloqueado}
              onClick={() => irAPaso(index)}
              className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 py-2 text-xs font-bold transition-colors sm:text-sm ${
                paso === index
                  ? 'border-forest bg-forest text-white'
                  : bloqueado
                    ? 'cursor-not-allowed border-[#e4ebe3] bg-[#f4f7f3] text-[#8aa08e] opacity-75'
                    : index < paso
                      ? 'border-[#cfe5c9] bg-[#e9f4e6] text-[#2d6a43]'
                      : 'border-[#e0ebe0] bg-white text-[#5b7561] hover:bg-[#f4f9f3]'
              }`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                  paso === index
                    ? 'bg-sage text-forest'
                    : bloqueado
                      ? 'bg-[#e6ede5] text-[#7f9683]'
                      : 'bg-white/75 text-[#56735d]'
                }`}
              >
                {bloqueado ? <Lock size={12} /> : index < paso ? <Check size={14} /> : index + 1}
              </span>
              <span>{item.nombre}</span>
            </button>
          );
        })}
      </nav>

      {avisoPaso && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-[#f0cfa0] bg-[#fff8eb] px-4 py-3 text-xs font-bold text-[#8a5717]"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{avisoPaso}</span>
        </div>
      )}

      <div>
        <h1
          id="journey-heading"
          tabIndex={-1}
          className="text-[28px] font-extrabold leading-tight tracking-[-0.045em] text-forest outline-none sm:text-[36px]"
        >
          {TEXTO[paso].pregunta}
        </h1>
        <p className="mt-2 max-w-[700px] text-[15px] leading-relaxed text-[#607965]">{TEXTO[paso].ayuda}</p>
      </div>
    </section>
  );
}

export function JourneyFooter() {
  const { paso, irAPaso, confirmarTerreno } = useGuidedFlow();
  const siguientes = ['Confirm This Farm & Continue', 'See My Crop Options', 'Change Farm Location'];

  function avanzar() {
    if (paso === 0) {
      confirmarTerreno(true);
    } else {
      irAPaso(paso + 1);
    }
  }

  return (
    <nav className="flex items-center justify-between gap-3 border-t border-[#deeadb] pt-5" aria-label="Continue assessment">
      {paso > 0 ? (
        <button
          type="button"
          onClick={() => irAPaso(paso - 1)}
          className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-soft bg-white px-5 text-sm font-bold text-forest"
        >
          <ArrowLeft size={17} aria-hidden="true" /> Back
        </button>
      ) : (
        <span />
      )}
      {paso === 2 ? (
        <button
          type="button"
          onClick={() => irAPaso(0)}
          className="focus-ring min-h-11 rounded-xl px-4 text-sm font-semibold text-[#4b7754] hover:bg-[#edf5e9]"
        >
          Start over
        </button>
      ) : (
        <button
          type="button"
          onClick={avanzar}
          className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#285d40] sm:px-7"
        >
          {siguientes[paso]} <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
    </nav>
  );
}