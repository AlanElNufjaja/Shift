import { useEffect, useRef } from 'react';
import {
  ArrowUpRight, CheckCircle2, ChevronDown, CircleDollarSign, Database,
  Droplets, Leaf, MapPin, Mountain, Satellite, Sprout, X,
} from 'lucide-react';
import { useField } from '../context/FieldContext.jsx';
import { useGuidedFlow } from '../context/GuidedFlowContext.jsx';

const prioridades = [
  { id: 'agua', nombre: 'Save water', detalle: 'Optimize water resources', Icono: Droplets },
  { id: 'suelo', nombre: 'Improve soil health', detalle: 'Soil health and nitrogen', Icono: Sprout },
  { id: 'rentabilidad', nombre: 'Maximize profitability', detalle: 'Prioritize potential revenue', Icono: CircleDollarSign },
  { id: 'erosion', nombre: 'Reduce erosion', detalle: 'Avoid periods without cover', Icono: Mountain },
];

/** Panel persistente en escritorio; diálogo con foco controlado en pantallas pequeñas. */
export default function Sidebar({ abierto, onCerrar }) {
  const { parcelas, parcela, prioridad, seleccionarParcela, seleccionarPrioridad } = useField();
  const { paso, vista, irAPaso, irADatos } = useGuidedFlow();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const desktop = window.matchMedia('(min-width: 1200px)');
    if (desktop.matches) return undefined;

    const focoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('[data-sidebar-close]')?.focus();

    function manejarTeclado(evento) {
      if (evento.key === 'Escape') { evento.preventDefault(); onCerrar(); return; }
      if (evento.key !== 'Tab') return;
      const disponibles = [...(panelRef.current?.querySelectorAll('button:not(:disabled), a[href], select:not(:disabled)') ?? [])]
        .filter((elemento) => elemento.offsetParent !== null);
      if (!disponibles.length) return;
      const primero = disponibles[0];
      const ultimo = disponibles[disponibles.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }
    function cambiarPantalla(evento) { if (evento.matches) onCerrar(); }
    document.addEventListener('keydown', manejarTeclado);
    desktop.addEventListener('change', cambiarPantalla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', manejarTeclado);
      desktop.removeEventListener('change', cambiarPantalla);
      focoAnterior?.focus?.({ preventScroll: true });
    };
  }, [abierto, onCerrar]);

  return (
    <>
      {abierto && <button type="button" tabIndex={-1} aria-label="Close controls panel"
        onClick={onCerrar} className="fixed inset-0 z-[1080] bg-[#09180f]/60 backdrop-blur-[2px] min-[1200px]:hidden" />}

      <aside id="field-sidebar" ref={panelRef} aria-label="Field control panel"
        role={abierto ? 'dialog' : undefined} aria-modal={abierto ? 'true' : undefined}
        className={`field-sidebar fixed inset-y-0 left-0 z-[1100] flex w-[min(320px,calc(100vw-40px))] flex-col overflow-y-auto px-5 pb-6 pt-6 text-white shadow-2xl transition-transform duration-200 min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:h-screen min-[1200px]:w-[272px] min-[1200px]:translate-x-0 min-[1200px]:shadow-none ${abierto ? 'visible translate-x-0' : 'invisible -translate-x-full min-[1200px]:visible'}`}>
        <div className="mb-9 flex items-start justify-between gap-2">
          <a href="#resumen" onClick={onCerrar} className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Field Shift, go to overview">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-sage text-forest"><Leaf size={22} strokeWidth={2.2} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-[19px] font-extrabold leading-none tracking-[-0.055em]">FIELD<span className="text-sage"> SHIFT</span></span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-[#b6d4bd]">Agricultural intelligence</span>
            </span>
          </a>
          <button type="button" data-sidebar-close onClick={onCerrar} aria-label="Close panel"
            className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-lg text-[#d5e8d8] hover:bg-white/10 min-[1200px]:hidden">
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-7">
          <div className="mb-2.5 flex items-center justify-between">
            <label htmlFor="parcel-select" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b8d7c1]">Pilot field</label>
            <MapPin size={15} className="text-sage" aria-hidden="true" />
          </div>
          <div className="relative">
            <select id="parcel-select" value={parcela?.id ?? ''}
              onChange={(event) => { seleccionarParcela(event.target.value); onCerrar(); }}
              className="focus-ring w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/10 py-3.5 pl-3.5 pr-10 text-[13px] font-semibold text-white transition-colors hover:bg-white/15 [&>option]:bg-forest">
              {parcelas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#cce3cf]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[11px] text-[#b8cfbd]">California Central Valley · {parcelas.length} pilot locations</p>
        </div>

        <fieldset>
          <legend className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b8d7c1]">Your priority <span className="font-medium normal-case tracking-normal text-[#aec9b7]">· choose one</span></legend>
          <div className="space-y-2">
            {prioridades.map(({ id, nombre, detalle, Icono }) => {
              const activo = prioridad === id;
              return (
                <button key={id} type="button" aria-pressed={activo}
                  onClick={() => { seleccionarPrioridad(id); onCerrar(); }}
                  className={`focus-ring flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-150 ${activo ? 'border-sage bg-sage text-forest shadow-sm' : 'border-white/10 bg-white/[0.055] text-white hover:border-white/25 hover:bg-white/10'}`}>
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${activo ? 'bg-[#f0f8eb]' : 'bg-white/10'}`}><Icono size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-extrabold leading-snug">{nombre}</span>
                    <span className={`mt-1 block text-[10px] leading-snug ${activo ? 'text-[#486a51]' : 'text-[#c7dccb]'}`}>{detalle}</span>
                  </span>
                  {activo && <CheckCircle2 size={17} className="shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <nav className="mt-6 border-t border-white/15 pt-4" aria-label="Navigate the journey">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#b8d7c1]">Your journey</p>
          <div className="grid grid-cols-3 gap-1.5">
            {['My Field', 'Conditions', 'My Options'].map((titulo, i) => <button key={titulo} type="button"
              onClick={() => { irAPaso(i); onCerrar(); }} aria-current={vista === 'recorrido' && paso === i ? 'step' : undefined}
              className={`focus-ring rounded-lg px-1.5 py-2 text-[10px] font-bold ${vista === 'recorrido' && paso === i ? 'bg-sage text-forest' : 'bg-white/10 text-[#e2efe2] hover:bg-white/20'}`}>{i + 1}. {titulo}</button>)}
          </div>
          <button type="button" onClick={() => { irADatos('nasa'); onCerrar(); }}
            className={`focus-ring mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/20 text-[12px] font-bold hover:bg-white/10 ${vista === 'laboratorio' ? 'bg-white/15 text-sage' : 'text-white'}`}><Database size={16} aria-hidden="true" /> Data center</button>
        </nav>

        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-bold"><Satellite size={17} className="text-sage" aria-hidden="true"/> Data behind decisions</div>
            <p className="text-[11px] leading-[1.6] text-[#c1d9c5]">SMAP, soil and strategy data are demonstrations. You can query actual NASA POWER climate data in Data.</p>
            <a href="https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources" target="_blank" rel="noreferrer"
              className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-md text-[11px] font-bold text-sage hover:text-white">
              Challenge sources <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
          <div className="mt-5 flex justify-between text-[10px] text-[#b3cfba]"><span>NASA Space Apps 2026</span><span>Field Shift v3.2.1</span></div>
        </div>
      </aside>
    </>
  );
}
