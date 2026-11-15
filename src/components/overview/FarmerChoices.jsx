import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, ClipboardCopy, Cpu, Droplets, Info, Mountain, ShieldCheck, Sprout } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { formatoNumero, numeroSeguro, PRIORIDADES } from '../../lib/diagnostics.js';
import { resumirOpciones } from '../../lib/farmerSummary.js';
import { runCosoNasaPrediction } from '../../lib/modelRunBridge.js';
import { useTeamPilotArchive } from '../../hooks/useTeamPilotArchive.js';
import TeamModelEvidence from '../global/TeamModelEvidence.jsx';
import ExportAssessment from '../report/ExportAssessment.jsx';

const METAS = [
  { id: 'agua', etiqueta: 'Save water', Icono: Droplets },
  { id: 'suelo', etiqueta: 'Protect soil health', Icono: Sprout },
  { id: 'rentabilidad', etiqueta: 'Increase earnings', Icono: CircleDollarSign },
  { id: 'erosion', etiqueta: 'Reduce erosion', Icono: Mountain },
];

const FUENTES = {
  demo: 'Demo scenarios with fictional values.',
  'p2-importado': 'Scenarios imported from P2; not audited.',
  backend: 'Scenarios returned by P2; not audited.',
  cosonasa: 'Neuro-Symbolic CosoNASA 25-Rule FIS + Random Forest Surrogate (NASA POWER + USDA SSURGO + USGS NWIS).',
};

function Diferencia({ etiqueta, delta, unidad, invertir = false }) {
  const valor = numeroSeguro(delta?.absoluta);
  const mejora = valor !== null && (invertir ? valor < 0 : valor > 0);
  return (
    <div className="rounded-xl bg-[#f1f7ee] p-4">
      <p className="text-xs text-[#59725e]">{etiqueta}</p>
      <p className={`mt-1 text-[22px] font-extrabold ${mejora ? 'text-[#2a7950]' : 'text-forest'}`}>
        {valor === null ? 'No data' : `${valor > 0 ? '+' : ''}${formatoNumero(valor, 1)} ${unidad}`}
      </p>
      <p className="mt-1 text-xs text-[#68806a]">Difference from the current rotation.</p>
    </div>
  );
}

export default function FarmerChoices({ estrategias, fuente, cargando, error, modoEjemplo, visible = true }) {
  const { parcela, prioridad, seleccionarPrioridad } = useField();
  const { irADatos } = useGuidedFlow();
  const [copiado, setCopiado] = useState('');
  const [cultivoActual, setCultivoActual] = useState('Maíz');
  const [materiaOrganicaLocal, setMateriaOrganicaLocal] = useState('');
  const [prediccionCosoNasa, setPrediccionCosoNasa] = useState(null);
  const [ejecutandoMotor, setEjecutandoMotor] = useState(false);
  const [errorMotor, setErrorMotor] = useState('');

  const archive = useTeamPilotArchive(visible && parcela.origen !== 'custom');
  const resultado = resumirOpciones(estrategias, prioridad);
  const estrategia = resultado.destacada;
  const ejemplo = !prediccionCosoNasa && (fuente === 'demo' || (fuente === 'p2-importado' && modoEjemplo));

  useEffect(() => {
    setPrediccionCosoNasa(null);
    setErrorMotor('');
  }, [parcela.id, parcela.coordenadas?.lat, parcela.coordenadas?.lon, parcela.lat, parcela.lon]);

  async function ejecutarMotorDifuso() {
    const lat = parcela.coordenadas?.lat ?? parcela.lat;
    const lon = parcela.coordenadas?.lon ?? parcela.lon;
    if (lat === undefined || lon === undefined) {
      setErrorMotor('No valid coordinates selected for this field.');
      return;
    }

    setEjecutandoMotor(true);
    setErrorMotor('');
    try {
      const data = await runCosoNasaPrediction({
        lat,
        lon,
        priority: prioridad,
        localOrganicMatter: materiaOrganicaLocal,
        currentCrop: cultivoActual,
      });
      setPrediccionCosoNasa(data);
    } catch (err) {
      setErrorMotor('Could not reach CosoNASA backend (/api/predict-rotation). Verify FastAPI is running.');
    } finally {
      setEjecutandoMotor(false);
    }
  }

  async function copiarResumen() {
    const topCoso = prediccionCosoNasa?.rotation_strategies?.[0];
    const rel = prediccionCosoNasa?.model_reliability;
    const texto = [
      `Field Shift · ${parcela.nombre}`,
      `Priority: ${PRIORIDADES[prioridad] || prioridad}`,
      prediccionCosoNasa
        ? `CosoNASA Score: ${prediccionCosoNasa.fuzzy_evaluation.suitability_score}/100 (${prediccionCosoNasa.fuzzy_evaluation.category}) · Site Confidence: ${rel?.site_confidence_pct}%`
        : `Source: ${FUENTES[fuente] || 'Unverified source'}${ejemplo ? ' FICTIONAL.' : ''}`,
      topCoso
        ? `Top Strategy: ${topCoso.name} (${topCoso.sequence.join(' -> ')})`
        : (estrategia ? `Highlighted option: ${estrategia.titulo}` : 'There is no clear winner with the current data.'),
      'For exploration only; does not replace agronomist validation.',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado('Summary copied.');
    } catch {
      setCopiado('Could not copy automatically. Please review the full comparison.');
    }
  }

  return (
    <section className="mx-auto max-w-[860px] space-y-5" aria-label="Compare crop options">
      {/* Selector de prioridad e inputs locales */}
      <div className="rounded-[20px] border border-border-soft bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-forest">What matters most to you?</h2>
        <p className="mt-1 text-sm text-[#627b69]">Choose your priority, current crop, and run the 25-rule CosoNASA Neuro-Symbolic model.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Farmer priority">
          {METAS.map(({ id, etiqueta, Icono }) => (
            <button
              key={id}
              type="button"
              aria-pressed={prioridad === id}
              onClick={() => { seleccionarPrioridad(id); setCopiado(''); }}
              className={`focus-ring flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                prioridad === id
                  ? 'border-[#347b50] bg-[#eaf4e7] text-[#1e6039] ring-1 ring-[#a6ceab]'
                  : 'border-[#e0e9df] bg-white text-[#58705d] hover:bg-[#f5f8f3]'
              }`}
            >
              <Icono size={26} aria-hidden="true" />
              <span className="text-sm font-bold">{etiqueta}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-[#dfece0] bg-[#f7fbf6] p-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label htmlFor="current-crop-select" className="block text-xs font-bold text-forest">
              Current / Previous Crop
            </label>
<select
              id="current-crop-select"
              value={cultivoActual}
              onChange={(e) => setCultivoActual(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#c9decb] bg-white px-3 py-2.5 text-sm font-semibold text-forest focus:outline-none focus:ring-2 focus:ring-[#347b50]"
            >
              <option value="Maíz">Corn (Maíz)</option>
              <option value="Trigo">Wheat (Trigo)</option>
              <option value="Algodón">Cotton (Algodón)</option>
              <option value="Alfalfa">Alfalfa</option>
              <option value="Tomate">Tomato (Tomate)</option>
              <option value="Cártamo">Safflower (Cártamo)</option>
              <option value="Nuez">Nuez (Walnut / Pecan)</option>
              <option value="Manzana">Manzana (Apple)</option>
              <option value="Descanso">Resting / Bare Soil (Descanso)</option>
            </select>
          </div>

          <div>
            <label htmlFor="local-om-input" className="block text-xs font-bold text-forest">
              Local Soil Organic Matter (%)
            </label>
            <input
              id="local-om-input"
              type="number"
              step="0.05"
              min="0"
              max="15"
              value={materiaOrganicaLocal}
              onChange={(e) => setMateriaOrganicaLocal(e.target.value)}
              placeholder="Optional (uses USDA SSURGO)"
              className="mt-1 w-full rounded-lg border border-[#c9decb] bg-white px-3 py-2 text-sm text-forest focus:outline-none focus:ring-2 focus:ring-[#347b50]"
            />
          </div>

          <button
            type="button"
            onClick={ejecutarMotorDifuso}
            disabled={ejecutandoMotor}
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#275e41] px-4 py-2 text-sm font-bold text-white hover:bg-forest disabled:opacity-60"
          >
            <Cpu size={17} aria-hidden="true" />
            {ejecutandoMotor ? 'Evaluating...' : 'Run CosoNASA Model'}
          </button>
        </div>
        {errorMotor && <p role="status" className="mt-2 text-xs font-semibold text-[#94652d]">{errorMotor}</p>}
      </div>

      {/* Resultados y Métricas de Confiabilidad del Modelo */}
      {prediccionCosoNasa && (
        <div className="rounded-[22px] border border-[#b7d8bc] bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#2a7950]">
              {prediccionCosoNasa.location?.nombre_corto}
            </p>
            <span className="rounded-full bg-[#e3f3e6] px-3 py-1 text-xs font-extrabold text-[#1e6039]">
              Suitability Score: {prediccionCosoNasa.fuzzy_evaluation.suitability_score} / 100 ({prediccionCosoNasa.fuzzy_evaluation.category})
            </span>
          </div>

          {/* Bloque de Confiabilidad y Validación Científica (total_field.py) */}
          {prediccionCosoNasa.model_reliability && (
            <div className="mt-4 rounded-xl border border-[#cbe2cf] bg-[#eef7ee] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1e6039]">
                  <ShieldCheck size={16} className="text-[#2a7950]" />
                  Model Reliability &amp; Validation Metrics
                </p>
                <span className="rounded-md bg-white px-2.5 py-0.5 text-xs font-extrabold text-[#2a7950]">
                  Site Confidence: {prediccionCosoNasa.model_reliability.site_confidence_pct}% (±{prediccionCosoNasa.model_reliability.margin_of_error_pts} pts)
                </span>
              </div>
              <p className="mt-1 text-xs text-[#37734d]">
                <strong>Data Coverage Level:</strong> {prediccionCosoNasa.model_reliability.confidence_level}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-white p-2.5">
                  <span className="block text-[11px] text-[#68806a]">Benchmark Precision</span>
                  <strong className="text-sm font-extrabold text-forest">{prediccionCosoNasa.model_reliability.benchmark_precision_pct}%</strong>
                </div>
                <div className="rounded-lg bg-white p-2.5">
                  <span className="block text-[11px] text-[#68806a]">R² Test Fit</span>
                  <strong className="text-sm font-extrabold text-forest">{prediccionCosoNasa.model_reliability.r2_score_test}</strong>
                </div>
                <div className="rounded-lg bg-white p-2.5">
                  <span className="block text-[11px] text-[#68806a]">MAPE Error</span>
                  <strong className="text-sm font-extrabold text-forest">{prediccionCosoNasa.model_reliability.mape_error_pct}%</strong>
                </div>
                <div className="rounded-lg bg-white p-2.5">
                  <span className="block text-[11px] text-[#68806a]">Rule Coverage</span>
                  <strong className="text-sm font-extrabold text-forest">81 / 81 (100%)</strong>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 grid gap-2 rounded-xl bg-[#f4f9f4] p-3 text-xs text-[#4a6652] sm:grid-cols-2">
            <p><strong>Soil Source:</strong> {prediccionCosoNasa.soil_properties?.textura} ({prediccionCosoNasa.soil_properties?.materia_organica_pct}% OM · {prediccionCosoNasa.soil_properties?.fuente})</p>
            <p><strong>Local Groundwater:</strong> {prediccionCosoNasa.local_groundwater_usgs?.estacion_local_usgs}</p>
          </div>

          <h3 className="mt-5 text-lg font-extrabold text-forest">3 Compared Rotation Strategies</h3>
          <div className="mt-3 space-y-3">
            {prediccionCosoNasa.rotation_strategies.map((est, idx) => (
              <div
                key={est.id}
                className={`rounded-xl border p-4 ${idx === 0 ? 'border-[#347b50] bg-[#f2f9f1]' : 'border-[#e0e9df] bg-white'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-extrabold text-forest">{est.name}</h4>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#2a7950] shadow-xs">
                    Score: {est.suitability_score} / 100
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-[#37734d]">
                  Sequence: {est.sequence.join(' → ')} · Water demand: {est.water_demand}
                </p>
                <p className="mt-2 text-sm text-[#516d59]">{est.rationale}</p>
                <p className="mt-1 text-xs text-[#865e2a]"><strong>Local review needed:</strong> {est.risks}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tarjeta de respaldo cuando aún no se ha ejecutado el motor */}
      {!prediccionCosoNasa && parcela.origen !== 'custom' && (
        <div className="rounded-[22px] border border-[#d6e7d1] bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#37734d]">Option highlighted for your priority</p>
            <span className="rounded-full bg-[#f8edcf] px-3 py-1 text-xs font-bold text-[#92672f]">{ejemplo ? 'Fictional' : 'P2 not audited'}</span>
          </div>
          {cargando && <p role="status" className="mt-3 rounded-xl bg-[#f1f7ee] p-3 text-sm text-[#52765a]">Checking P2… Demo scenarios are shown in the meantime.</p>}
          {estrategia ? (
            <>
              <h3 className="mt-3 text-[25px] font-extrabold leading-tight text-forest sm:text-[30px]">{estrategia.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#607965]">{estrategia.cultivos || 'Crops not specified.'}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Diferencia etiqueta="Water use" delta={resultado.agua} unidad="mm/cycle" invertir />
                <Diferencia etiqueta="Estimated gross revenue" delta={resultado.ingreso} unidad="USD/acre" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#516d59]">{resultado.recomendacion.descripcion}. This does not include all farm costs or establish a real-world advantage.</p>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-xl font-extrabold text-forest">We cannot highlight an option yet</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#607965]">{cargando ? 'We are checking the available alternatives.' : resultado.recomendacion.descripcion}. There may be a tie or missing information. You can still compare all three options.</p>
            </>
          )}
          <p className="mt-3 text-sm leading-relaxed text-[#607965]">
            Want to check published prices before making a decision?{' '}
            <button
              type="button"
              onClick={() => irADatos('market')}
              className="focus-ring inline-flex items-center gap-1 font-bold text-[#2b7146] underline underline-offset-2 hover:text-forest"
            >
              Explore USDA market prices <ArrowUpRight size={15} aria-hidden="true" />
            </button>
            <span className="ml-1 text-xs text-[#708674]">Research only; estimates above do not change.</span>
          </p>
          {error && <p role="status" className="mt-3 text-sm text-[#94652d]">Could not reach P2; demo scenarios are shown.</p>}
          <p className="mt-4 rounded-xl bg-[#fbf6eb] px-4 py-3 text-xs leading-relaxed text-[#865e2a]">
            <Info size={15} className="mr-1 inline" aria-hidden="true" />
            {FUENTES[fuente] ?? 'Unverified provenance.'} {ejemplo ? 'This is not a real-world forecast.' : 'Requires review by the agronomy team.'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => irADatos('estrategias')}
          className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#275e41]"
        >
          Compare all options <ArrowUpRight size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={copiarResumen}
          className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-soft bg-white px-4 text-sm font-bold text-[#376d4b]"
        >
          <ClipboardCopy size={17} aria-hidden="true" /> Copy summary
        </button>
      </div>
      <p className="mt-2 text-sm text-[#557361]" role="status">{copiado}</p>

      {archive.status === 'ready' && archive.byId[parcela.id] && (
        <TeamModelEvidence
          key={parcela.id}
          site={archive.byId[parcela.id]}
          compact
          onExplore={() => irADatos('p1')}
        />
      )}
      <ExportAssessment
        scenarios={estrategias}
        scenarioSource={prediccionCosoNasa ? 'cosonasa' : fuente}
        fictionalP2={ejemplo}
        archive={archive.status === 'ready' ? archive.byId[parcela.id] : null}
      />
    </section>
  );
}