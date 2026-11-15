import LiveCropPanel from '../crops/LiveCropPanel.jsx';
import { ArrowUpRight, CheckCircle2, Cpu, Droplets, Info, Layers3, Sprout, ThermometerSun, TriangleAlert } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import GlobalClimateSummary from '../global/GlobalClimateSummary.jsx';
import LiveSoilPanel from '../soil/LiveSoilPanel.jsx';
import teamSummary from '../../data/team-pilot-summary.json';
import { cropEnglish } from '../../lib/teamPilotAdapter.js';
import { resumirSituacion } from '../../lib/farmerSummary.js';
import { EvidenceQuickAccess } from '../data/ObservedEvidencePanel.jsx';

const ICONOS = { coincidencia: ThermometerSun, cobertura: Layers3, rotacion: Sprout, erosion: Droplets };
function Tono({ estado }) {
  if (estado === 'insuficiente') return <span className="inline-flex items-center gap-1 text-xs font-bold text-[#956d33]"><Info size={14}/> Incomplete data</span>;
  if (estado === 'atencion' || estado === 'revisar') return <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9d6830]"><TriangleAlert size={14}/> Worth checking</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-bold text-[#37784f]"><CheckCircle2 size={14}/> No signal under this rule</span>;
}

export default function FarmerSituation() {
  const { parcela, prioridad } = useField();
  const { irADatos } = useGuidedFlow();
  const power = usePower();
  const resultado = resumirSituacion(parcela, prioridad);
  const archive = teamSummary[parcela.id];

  if (parcela.origen === 'custom') return (
    <div className="mx-auto max-w-[820px] space-y-4">
      <GlobalClimateSummary key={`${parcela.lat}:${parcela.lon}`} parcel={parcela}/>
      <div className="flex items-start gap-3 rounded-[18px] border border-[#b7d8bc] bg-[#f2f9f1] p-4 text-sm text-[#1e6039]">
        <Cpu size={20} className="mt-0.5 shrink-0 text-[#2a7950]" aria-hidden="true" />
        <div>
          <p className="font-bold">CosoNASA Mamdani Fuzzy Model Ready for Global Evaluation</p>
          <p className="mt-1 text-xs leading-relaxed text-[#37734d]">
            Live NASA POWER climate data is connected for ({Number(parcela.lat).toFixed(4)}, {Number(parcela.lon).toFixed(4)}). Proceed to <strong>My Options</strong> (Step 3) to run the fuzzy suitability model and compare 3 rotation strategies with optional local soil data.
          </p>
        </div>
      </div>
      <LiveSoilPanel compact/>
      <LiveCropPanel/>
      <EvidenceQuickAccess/>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#dfebdd] bg-white px-4 py-4 sm:px-5">
        <div>
          <p className="text-sm font-bold text-forest">NASA SMAP satellite imagery</p>
          <p className="mt-1 text-xs text-[#617d68]">View an optional ~9 km satellite layer and request independent numerical SMAP L4 percentiles in Advanced details.</p>
        </div>
        <button type="button" onClick={() => irADatos('smap')} className="focus-ring min-h-11 rounded-xl border border-[#c9dfca] px-4 text-sm font-bold text-[#326c47]">
          View NASA image <ArrowUpRight size={16}/>
        </button>
      </div>
    </div>
  );

  return <section className="mx-auto max-w-[820px] space-y-4" aria-label="Plain-language signal summary">
    <div className="rounded-[20px] border border-[#d8e7d5] bg-[#edf5e9] p-5 sm:p-6">
      <p className="text-sm font-bold text-[#366d48]">In {parcela.ciudad ?? 'this field'}</p>
      <h2 className="mt-2 text-xl font-extrabold leading-snug text-forest sm:text-2xl">{resultado.senalesParaRevisar > 0
        ? `The example shows ${resultado.senalesParaRevisar} ${resultado.senalesParaRevisar === 1 ? 'signal' : 'signals'} worth reviewing.`
        : resultado.senalesSinDatos > 0 ? 'More data is needed to complete this review.' : 'No noteworthy signals appear under the rules used.'}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#57705d]">These are preliminary indicators, not field diagnoses. You can review the records and rules at any time.</p>
    </div>
    <div className="space-y-3">
      {resultado.principales.map((senal) => {
        const Icono = ICONOS[senal.id] || Info;
        return <article key={senal.id} className="flex items-start gap-4 rounded-[18px] border border-border-soft bg-white p-4 shadow-sm sm:p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef5eb] text-[#397a50]"><Icono size={22} aria-hidden="true"/></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-forest">{senal.titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#5b7563]">{senal.textoCorto}</p>
            <div className="mt-2"><Tono estado={senal.estado}/></div>
          </div>
        </article>;
      })}
    </div>
    {archive && <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#dfebdd] bg-white px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-forest">10 years of team crop history</p>
        <p className="mt-1 text-xs leading-relaxed text-[#617d68]">2015–2024 · Last recorded crop: {cropEnglish(archive.latestCrop)} · Team-supplied, not audited.</p>
      </div>
      <button type="button" onClick={() => irADatos('p1')} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#c9dfca] px-4 text-sm font-bold text-[#326c47] hover:bg-[#eef7eb]">Explore history <ArrowUpRight size={16}/></button>
    </div>}
    <LiveSoilPanel compact/>
    <LiveCropPanel/>
    <EvidenceQuickAccess/>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#dfebdd] bg-white px-4 py-4 sm:px-5">
      <div className="max-w-[550px]"><p className="flex items-center gap-2 text-sm font-bold text-forest"><Droplets size={17} className="text-agri"/> NASA SMAP satellite imagery</p>
        <p className="mt-1 text-xs leading-relaxed text-[#617d68]">Optional L3 satellite imagery by date and L4 numerical moisture percentiles (about 9 km). Neither is a field sensor; example charts remain separate.</p></div>
      <button type="button" onClick={() => irADatos('smap')} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#c9dfca] px-4 text-sm font-bold text-[#326c47] hover:bg-[#eef7eb]">View NASA image <ArrowUpRight size={16}/></button>
    </div>
    {power.status === 'success' && <p className="rounded-xl border border-[#d4e6d4] bg-white px-4 py-3 text-sm text-[#4b7058]">NASA POWER {power.year} was queried for this field, but these signals still use example data. Real climate data is not automatically combined with fictional SMAP data.</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-xs text-[#799080]"><Info size={14} className="mr-1 inline" aria-hidden="true"/>Signals based on the demonstration JSON.</p>
      <button type="button" onClick={() => irADatos('diagnostico')} className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#326c47] hover:underline">How do we know? <ArrowUpRight size={16}/></button>
    </div>
  </section>;
}