import { useCrop } from '../../context/CropContext.jsx';
import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { useSoil } from '../../context/SoilContext.jsx';
import { useSmapNumeric } from '../../context/SmapNumericContext.jsx';
import { createFieldReport } from '../../lib/fieldReport.js';
import { downloadPdf } from '../../lib/simplePdf.js';

export default function ExportAssessment({ scenarios, scenarioSource, fictionalP2, archive }) {
  const { parcela, prioridad, evidenciaParcela, archivoP1, archivoP2 } = useField();
  const power = usePower();
  const soil = useSoil();
  const crop = useCrop();
  const smap = useSmapNumeric();
  const [error, setError] = useState('');
  function exportPdf() {
    try {
      const report = createFieldReport({
        field: parcela, priority: prioridad, power, scenarios,
        scenarioSource, fictionalP2, archive,
        p1Evidence: evidenciaParcela, p1Filename: archivoP1, p2Filename: archivoP2, soilLookup:soil, cropLookup:crop, smapNumeric:smap,
      });
      const name = (parcela.id || 'field').replace(/[^a-zA-Z0-9_-]/g, '-');
      downloadPdf(report, `field-shift-${name}-assessment.pdf`);
      setError('');
    } catch {
      setError('The report could not be generated. Your assessment remains available.');
    }
  }
  return <div className="rounded-[18px] border border-[#dce9d8] bg-white p-4 sm:p-5" aria-label="Downloadable assessment summary">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef6e9] text-agri"><FileText size={20}/></span>
        <div>
          <h3 className="text-sm font-extrabold text-forest">Take your assessment with you</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#647d69]">An English PDF with the field, source status, scenario limits and field-check checklist.</p>
        </div>
      </div>
      <button type="button" onClick={exportPdf} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbdcca] bg-[#f3faf0] px-4 text-sm font-bold text-[#24633e] hover:bg-[#e6f4e1]"><Download size={17}/> Download PDF</button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-[#9b6b33]">{error}</p>}
    <p className="mt-2 text-[11px] text-[#708573]">Report is generated in your browser. It does not claim all datasets are live or verified.</p>
  </div>;
}
