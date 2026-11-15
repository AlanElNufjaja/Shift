import { useCrop } from '../../context/CropContext.jsx';
import { Database, Info } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { usePower } from '../../context/PowerContext.jsx';
import { useSoil } from '../../context/SoilContext.jsx';
import { useSmapNumeric } from '../../context/SmapNumericContext.jsx';

/** Honest source inventory: reports connection and provenance, never an invented 'live' status. */
export default function DataFreshness({ scenarioSource = 'demo' }) {
  const { parcela, evidenciaParcela, archivoP1, archivoP2 } = useField();
  const power = usePower();
  const soil = useSoil();
  const crop = useCrop();
  const smap = useSmapNumeric();
  const isGlobal = parcela.origen === 'custom';
  return <details className="rounded-[18px] border border-[#dce9d9] bg-white p-4 sm:p-5" aria-label="Current and historical data status">
    <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-forest">
      <span className="flex items-center gap-2"><Database size={18} className="text-agri"/> Which data are current?</span>
      <span className="text-xs font-normal text-[#68816d]">View source status</span>
    </summary>
    <p className="mt-3 text-sm text-[#56725b]">A successful NASA query is not the same as live satellite soil moisture or an updated agronomic model.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {[
        ['NASA POWER', power.status === 'success' ? `Monthly data queried for ${power.year}; regional estimate, not instantaneous weather.` : 'Official API available on request; not queried for this view.'],
        ['Team archive', isGlobal ? 'Not available for arbitrary global coordinates.' : 'Static team records for 2015–2024; not independently audited.'],
        ['USDA SSURGO point mapping', soil.status === 'ready' ? 'Official USDA point lookup completed for the selected coordinates. Not a field sample or a soil-health diagnosis.' : soil.status === 'partial' ? 'USDA found a mapped soil unit, but detailed attributes were unavailable. Only the map-unit identity is shown.' : soil.status === 'unavailable' ? 'USDA returned no mapped soil unit for these coordinates.' : soil.status === 'error' ? 'USDA check failed; no values were substituted.' : 'Optional USDA NRCS point lookup; not queried yet. Available primarily for the United States.'],
        ['USDA CDL crop-map pixel', crop.status === 'ready' ? `USDA ${crop.data.year} single-pixel classification received (${crop.data.classification.label || 'code ' + crop.data.classification.code}). Not a verified field crop.` : crop.status === 'outside_coverage' ? 'Outside approximate continental U.S. coverage.' : crop.status === 'unverified' ? 'Source year not verified; pixel classification rejected.' : crop.status === 'unavailable' ? 'No CDL map pixel classified at this point/year.' : crop.status === 'error' ? 'Optional CDL service request failed; no data substituted.' : 'Optional CDL single-pixel lookup has not been requested for this point/year.'],
        ['NASA SMAP', smap.uploaded?.status === 'ready' ? `${smap.uploaded.source?.type === 'appeears-api' ? 'Authenticated NASA AppEEARS task' : smap.uploaded.source?.type === 'bundled-appeears' ? 'Bundled NASA AppEEARS Fresno 2024 export' : 'User-imported AppEEARS CSV'} for ${smap.year} (${smap.uploaded.valid_months}/12 months), m³/m³; quality flags not independently reviewed. No crop options changed.` : smap.status === 'ready' ? `Official NASA POWER SMAP L4 surface-moisture percentiles queried for ${smap.year}; percentile is NOT volumetric water %. No crop-risk calculation changes.` : smap.status === 'unavailable' ? 'A numerical SMAP request was made, but the official source reported no usable data. GIBS L3 imagery remains optional.' : smap.status === 'error' ? 'SMAP numeric request failed; no fallback values were invented. GIBS L3 imagery remains optional.' : 'Optional NASA SMAP L4 numerical percentile query via POWER; separate GIBS L3 imagery by date. Not queried for this assessment.'],
        ['Imported P1 history', isGlobal ? 'No verified crop history for arbitrary global coordinates.' : evidenciaParcela ? `P1 local file: ${archivoP1 || 'imported'}, not audited; not a live feed.` : 'Pilot history is archived; optional P1 imports remain separate from official CDL point lookups.'],
        ['P2 scenarios', `${scenarioSource === 'demo' ? 'Fictional scenario values.' : 'P2 scenarios not independently audited.'} ${archivoP2 ? 'P2 import available.' : 'Original fuzzy model not executable.'}`],
        ['USDA AMS Market News', 'Official reports can be reviewed in the optional Market News tab with a free personal API key. Quotes and user-transcribed CSV files are never applied to the scenario estimates.'],
      ].map(([label, desc]) => <div key={label} className="rounded-xl bg-[#f5f8f3] p-3">
        <p className="text-xs font-bold text-[#2e6743]">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#617966]">{desc}</p>
      </div>)}
    </div>
    <p className="mt-3 flex items-start gap-2 text-xs text-[#687d6b]"><Info size={15} className="shrink-0"/> Historical, imported, simulated and API-observed data remain distinguishable.</p>
  </details>;
}
