import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCopy, ClipboardList, Database, Info, Scale, ShieldAlert } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { construirImpacto, construirProcedenciaDecision, crearFichaDecision } from '../../lib/decisionBrief.js';

const ESTADOS = {
  favorable: { texto: 'Favorable indicator', clase: 'bg-[#e9f5ea] text-[#2e7448]' },
  compensacion: { texto: 'Trade-off', clase: 'bg-[#fff1df] text-[#946123]' },
  igual: { texto: 'No change', clase: 'bg-[#eef2ed] text-[#586b5b]' },
  'sin-datos': { texto: 'Dato faltante', clase: 'bg-[#f3f0ed] text-[#827769]' },
};

/**
 * No califica científicamente las estrategias. Explica sus salidas y permite
 * copiar una ficha sin enviar datos a servidores adicionales.
 */
export default function DecisionBrief({ base, estrategia, prioridad, parcela, fuente, modoEjemplo, generacion, ajustes }) {
  const { evidenciaParcela } = useField();
  const power = usePower();
  const [estadoCopia, setEstadoCopia] = useState('');
  const impacto = useMemo(() => construirImpacto(base, estrategia, prioridad), [base, estrategia, prioridad]);
  const procedencia = construirProcedenciaDecision({ fuente, modoEjemplo, generacion,
    evidenciaParcela, power, ajustes });
  const ficha = crearFichaDecision({ parcela, prioridad, estrategia, impacto, procedencia });

  async function copiarFicha() {
    setEstadoCopia('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(ficha);
      setEstadoCopia('Brief copied. You may share it for review; it is not a certified report.');
    } catch {
      setEstadoCopia('Could not copy automatically. Export CSV or check browser permissions.');
    }
  }

  return <section aria-labelledby="ficha-decision-titulo" className="overflow-hidden rounded-[20px] border border-[#dbe8d8] bg-white shadow-[0_8px_24px_rgba(21,60,43,0.04)]">
    <div className="flex flex-wrap items-start justify-between gap-3 bg-[#153c2b] px-5 py-5 text-white sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#b9daa8]"><ClipboardList size={15}/> Field Shift / Decision explained</div>
        <h3 id="ficha-decision-titulo" className="text-[20px] font-extrabold tracking-tight">Why consider this strategy?</h3>
        <p className="mt-2 max-w-[730px] text-[12px] leading-relaxed text-[#d3e8d6]">{estrategia?.titulo || 'Select a strategy to continue'}. The interpretation updates with the field, priority and your simulation assumptions.</p>
      </div>
      <button type="button" onClick={copiarFicha} disabled={!estrategia || !base}
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#89bc97] bg-[#c1e3b6] px-4 text-[12px] font-extrabold text-[#153c2b] hover:bg-white disabled:opacity-50">
        <ClipboardCopy size={16} aria-hidden="true"/> Copy brief
      </button>
    </div>
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-start gap-3 rounded-xl bg-[#f1f7ef] p-4">
        <div className="rounded-lg bg-[#e0ecdc] p-2 text-[#38764c]"><Scale size={20} aria-hidden="true"/></div>
        <div>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#54815e]">Interpretation for your goal</h4>
          <p className="mt-1 text-[13px] font-semibold leading-relaxed text-[#214b32]" aria-live="polite">{impacto.conclusion}</p>
          <p className="mt-1 text-[11px] text-[#738776]">Arithmetic scenario comparison; it does not predict field outcomes.</p>
        </div>
      </div>
      <div>
        <h4 className="mb-3 text-[13px] font-extrabold text-[#244930]">Benefits, trade-offs and gaps vs. baseline</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {impacto.metricas.map((metrica) => <div key={metrica.campo} className="rounded-xl border border-[#e2ebe0] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[12px] font-extrabold text-[#31543c]">{metrica.titulo}</span>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${ESTADOS[metrica.sentido].clase}`}>{impacto.esBase ? 'Baseline' : ESTADOS[metrica.sentido].texto}</span>
            </div>
            <p className="mt-2 text-[12px] font-medium text-[#586d5f]">{metrica.cambio}</p>
          </div>)}
        </div>
        <p className="mt-2 text-[11px] text-[#718675]">Nitrogen is a potential contribution, not proven fertilizer savings; cover months do not quantify erosion, and gross revenue excludes costs.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#dce9d9] bg-[#fcfdfb] p-4">
          <h4 className="flex items-center gap-2 text-[13px] font-extrabold text-[#244930]"><Database size={17}/> Evidence & provenance</h4>
          <p className="mt-2 text-[12px] font-bold text-[#396c48]">{procedencia.origen}</p>
          {procedencia.ficticio && <p className="mt-1 rounded-lg bg-[#fff4e6] px-2.5 py-2 text-[11px] font-bold text-[#946123]">Fictional scenario: no scientifically verified recommendation.</p>}
          <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-[#687c6c]">
            <li>• {procedencia.p1}</li>
            <li>• {procedencia.nasa}</li>
            <li>• P2 declares: {procedencia.declaradas.join(', ') || 'no documented inputs'}</li>
            <li>• {procedencia.sensibilidad}</li>
          </ul>
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#f0f3ed] p-2.5 text-[11px] leading-relaxed text-[#6e7e70]"><Info size={15} className="mt-0.5 shrink-0"/>{procedencia.advertencia}</p>
        </div>
        <div className="rounded-xl border border-[#e9dfd2] bg-[#fffaf4] p-4">
          <h4 className="flex items-center gap-2 text-[13px] font-extrabold text-[#71512c]"><ShieldAlert size={17}/> Before making a decision</h4>
          <p className="mt-2 text-[11px] leading-relaxed text-[#806c56]">Questions for the grower and agronomist; they do not represent completed validation.</p>
          <ol className="mt-3 space-y-3 text-[12px] leading-relaxed text-[#6e604d]">
            <li className="flex gap-2"><span className="shrink-0 font-extrabold text-[#b18b52]">01</span><span>{impacto.pregunta}</span></li>
            <li className="flex gap-2"><span className="shrink-0 font-extrabold text-[#b18b52]">02</span><span>{estrategia?.validacion || 'Check data and local soil, crop and irrigation conditions.'}</span></li>
            <li className="flex gap-2"><span className="shrink-0 font-extrabold text-[#b18b52]">03</span><span>Are yield estimates, costs and market access realistic for this field?</span></li>
          </ol>
          <details className="mt-4 border-t border-[#eadbc9] pt-3"><summary className="cursor-pointer text-[11px] font-extrabold text-[#8a6336]">View stated uncertainty</summary><p className="mt-2 text-[11px] leading-relaxed text-[#806b52]">{estrategia?.incertidumbre || 'No uncertainty statement. Ask P2 to document limits and assumptions.'}</p></details>
        </div>
      </div>
      {estadoCopia && <p role="status" className="flex items-start gap-2 rounded-lg border border-[#dbe9d8] bg-[#f4f9f1] px-3 py-2 text-[11px] text-[#456e4d]"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/>{estadoCopia}</p>}
    </div>
  </section>;
}
