import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, ClipboardCopy, Cpu, Droplets, Info, Mountain, ShieldCheck, Sprout } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { formatoNumero, numeroSeguro, PRIORIDADES } from '../../lib/diagnostics.js';
import { resumirOpciones } from '../../lib/farmerSummary.js';
import { displayTerm } from '../../lib/displayEnglish.js';
import { runCosoNasaPrediction } from '../../lib/modelRunBridge.js';
import { useTeamPilotArchive } from '../../hooks/useTeamPilotArchive.js';
import TeamModelEvidence from '../global/TeamModelEvidence.jsx';
import ExportAssessment from '../report/ExportAssessment.jsx';

function fechaLocalISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

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
  cosonasa: 'CosoNASA Mamdani fuzzy inference system with 28 authored rules; exploratory output based on available NASA POWER and soil data.',
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
  const [fechaSiembra, setFechaSiembra] = useState(fechaLocalISO());
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
        plantingDate: fechaSiembra,
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
      prediccionCosoNasa?.status === 'ok'
        ? `CosoNASA Score: ${prediccionCosoNasa.fuzzy_evaluation.suitability_score}/100 (${displayTerm(prediccionCosoNasa.fuzzy_evaluation.category)}) · Validation: not independently validated`
        : `Source: ${FUENTES[fuente] || 'Unverified source'}${ejemplo ? ' FICTIONAL.' : ''}`,
      topCoso
        ? `Top Strategy: ${topCoso.name} (${topCoso.sequence.join(' -> ')})`
        : (estrategia ? `Highlighted option: ${displayTerm(estrategia.titulo)}` : 'There is no clear winner with the current data.'),
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
        <p className="mt-1 text-sm text-[#627b69]">Choose your priority, current crop and planting date, then run the 28-rule CosoNASA fuzzy model. Rainfall is estimated from NASA POWER 2015–2024 monthly climatology over each crop cycle, not a day-by-day forecast. Crop-cycle lengths are indicative assumptions and should be checked against the local variety and planting calendar.</p>
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

        <div className="mt-5 grid gap-3 rounded-xl border border-[#dfece0] bg-[#f7fbf6] p-4 sm:grid-cols-2 sm:items-end">
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
              <option value="Maíz">Corn</option>
              <option value="Trigo">Wheat</option>
              <option value="Algodón">Cotton</option>
              <option value="Alfalfa">Alfalfa</option>
              <option value="Tomate">Tomato</option>
              <option value="Cártamo">Safflower</option>
              <option value="Nuez">Walnut</option>
              <option value="Manzana">Apple</option>
              <option value="Descanso">Fallow / Bare soil</option>
            </select>
          </div>

          <div>
            <label htmlFor="planting-date-input" className="block text-xs font-bold text-forest">
              Planned planting date
            </label>
            <input
              id="planting-date-input"
              type="date"
              value={fechaSiembra}
              onChange={(e) => setFechaSiembra(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#c9decb] bg-white px-3 py-2 text-sm text-forest focus:outline-none focus:ring-2 focus:ring-[#347b50]"
            />
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
      {prediccionCosoNasa && prediccionCosoNasa.status !== 'ok' ? (
        <div className="rounded-[22px] border border-[#e5c99b] bg-white p-5 shadow-sm sm:p-7" role="status">
          <h3 className="text-base font-extrabold text-forest">CosoNASA could not generate a recommendation</h3>
          <p className="mt-2 text-sm text-[#865e2a]">{prediccionCosoNasa.message}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[#6b6253]">
            {(prediccionCosoNasa.missing_data || []).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-3 text-xs text-[#68806a]">The system will not replace missing observations with invented climate or soil values.</p>
        </div>
      ) : prediccionCosoNasa && (
        <div className="rounded-[22px] border border-[#b7d8bc] bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#2a7950]">
              {prediccionCosoNasa.location?.nombre_corto}
            </p>
            <span className="rounded-full bg-[#e3f3e6] px-3 py-1 text-xs font-extrabold text-[#1e6039]">
              Suitability Score: {prediccionCosoNasa.fuzzy_evaluation.suitability_score} / 100 ({prediccionCosoNasa.fuzzy_evaluation.category})
            </span>
          </div>

          {prediccionCosoNasa.model_reliability && (
            <div className="mt-4 rounded-xl border border-[#cbe2cf] bg-[#eef7ee] p-4">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1e6039]">
                <ShieldCheck size={16} className="text-[#2a7950]" />
                Model transparency
              </p>
              <p className="mt-2 text-xs text-[#37734d]">
                <strong>Architecture:</strong> {prediccionCosoNasa.model_reliability.architecture}
              </p>
              <p className="mt-1 text-xs text-[#865e2a]">
                <strong>Validation:</strong> {prediccionCosoNasa.model_reliability.validation_status}
              </p>
              <p className="mt-1 text-xs text-[#37734d]">
                <strong>Rule count:</strong> {prediccionCosoNasa.model_reliability.rule_count} (this is not a coverage or accuracy percentage).
              </p>
              <p className="mt-1 text-xs text-[#37734d]">
                <strong>Crop history:</strong> {prediccionCosoNasa.data_quality.crop_history_status}. {prediccionCosoNasa.data_quality.monoculture_input}
              </p>
            </div>
          )}

          <div className="mt-3 grid gap-2 rounded-xl bg-[#f4f9f4] p-3 text-xs text-[#4a6652] sm:grid-cols-2">
            <p><strong>Soil Source:</strong> {displayTerm(prediccionCosoNasa.soil_properties?.textura)} ({prediccionCosoNasa.soil_properties?.materia_organica_pct ?? 'N/A'}% OM · {prediccionCosoNasa.soil_properties?.fuente})</p>
            <p><strong>Local Groundwater:</strong> {prediccionCosoNasa.local_groundwater_usgs?.estacion_local_usgs}</p>
          </div>

          <h3 className="mt-5 text-lg font-extrabold text-forest">3 Compared Rotation Strategies</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#607965]">
            Expected rainfall is estimated separately for each crop cycle. The next crop starts when the previous cycle ends.
            Water demand is a crop-demand category, not the amount of rain expected.
          </p>
          <div className="mt-3 space-y-3">
            {prediccionCosoNasa.rotation_strategies.map((est, idx) => (
              <div
                key={est.id}
                className={`rounded-xl border p-4 ${idx === 0 ? 'border-[#347b50] bg-[#f2f9f1]' : 'border-[#e0e9df] bg-white'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-extrabold text-forest">{displayTerm(est.name)}</h4>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#2a7950] shadow-xs">
                    Score: {est.suitability_score} / 100
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-[#37734d]">
                  Sequence: {est.sequence.map(displayTerm).join(' → ')} · Crop water-demand profile: {(est.water_demand_profile || (est.rainfall_schedule || []).map(cycle => cycle.demanda_agua)).map(displayTerm).join(' → ')}
                </p>
                <div className="mt-3 rounded-lg border border-[#e3ece0] bg-white/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#63816a]">Expected rainfall across this rotation</p>
                    <div className="text-right">
                      <strong className="block text-sm text-[#285b3d]">
                        {est.rainfall_total_mm == null ? 'Incomplete data' : `${formatoNumero(est.rainfall_total_mm, 1)} mm total`}
                      </strong>
                      <span className="text-[10px] text-[#63816a]">
                        {est.rainfall_mm_per_30_days == null ? '' : `${formatoNumero(est.rainfall_mm_per_30_days, 1)} mm / 30 days`}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(est.rainfall_schedule || []).map((cycle, cycleIndex) => (
                      <div key={`${est.id}-rain-${cycleIndex}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1eb] pt-2 text-xs">
                        <div>
                          <strong className="text-[#365d40]">{cycleIndex + 1}. {displayTerm(cycle.cultivo)}</strong>
                          <span className="ml-2 text-[#829286]">{cycle.ciclo_dias} days · {cycle.fecha_inicio} to {cycle.fecha_fin}</span>
                          <p className="text-[10px] text-[#829286]">Crop water demand: {displayTerm(cycle.demanda_agua)}</p>
                        </div>
                        <strong className="text-[#285b3d]">
                          {cycle.lluvia_esperada_mm == null ? 'N/A' : `${formatoNumero(cycle.lluvia_esperada_mm, 1)} mm rain`}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-[#8a7960]">
                    {est.rainfall_schedule_complete
                      ? `Total expected precipitation over ${est.rotation_duration_days} consecutive days. The 30-day figure normalizes different rotation lengths for comparison; neither value represents crop water demand, effective rainfall or irrigation supply.`
                      : 'The rainfall total is unavailable because one or more months in this rotation lack climate data.'}
                  </p>
                </div>
                <p className="mt-2 text-sm text-[#516d59]">{displayTerm(est.rationale)}</p>
                <p className="mt-1 text-xs text-[#865e2a]"><strong>Local review needed:</strong> {displayTerm(est.risks)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 rounded-lg bg-[#fbf6eb] px-3 py-2 text-[10px] leading-relaxed text-[#806b4b]">
            Rainfall values use NASA POWER monthly climatological averages from 2015–2024, not a live weather forecast.
            They estimate total precipitation, not how much water the crop can actually use. Irrigation requirements also depend on
            evapotranspiration, soil storage, runoff and effective rainfall.
          </p>
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
              <p className="mt-2 text-sm leading-relaxed text-[#607965]">{displayTerm(estrategia.cultivos || 'Crops not specified.')}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Diferencia etiqueta="Water use" delta={resultado.agua} unidad="mm/cycle" invertir />
                <Diferencia etiqueta="Estimated gross revenue" delta={resultado.ingreso} unidad="USD/acre" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#516d59]">{displayTerm(resultado.recomendacion.descripcion)}. This does not include all farm costs or establish a real-world advantage.</p>
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