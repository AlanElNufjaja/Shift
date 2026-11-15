import { screenObservedEvidence } from './observedEvidence.js';
import { resumirOpciones } from './farmerSummary.js';

/** The PDF is a traceable snapshot, not a medical/agronomic or financial forecast. */
export function createFieldReport({ field, priority, power, scenarios = [], scenarioSource = 'demo', fictionalP2 = false,
  archive = null, p1Evidence = null, p1Filename = '', p2Filename = '', soilLookup = null, cropLookup = null, smapNumeric = null, generatedAt = new Date().toISOString() }) {
  if (!field || !Number.isFinite(field.lat) || !Number.isFinite(field.lon)) {
    throw new Error('A selected location with valid coordinates is required.');
  }
  const observed = screenObservedEvidence({field, power, smap:smapNumeric, soil:soilLookup, crop:cropLookup});
  const custom = field.origen === 'custom';
  const chosen = custom ? null : resumirOpciones(scenarios, priority);
  const selected = chosen?.destacada ?? null;
  const powerReady = power?.status === 'success' && power?.datos;
  const sourceText = scenarioSource === 'demo' ? 'Fictional demonstration scenarios'
    : scenarioSource === 'p2-importado' ? `P2 file (${fictionalP2 ? 'fictional example' : 'not independently audited'})`
      : scenarioSource === 'backend' ? 'P2 service (not independently audited)' : 'Unknown scenario source';

  const sections = [
    { heading: 'LOCATION', lines: [
      `Field: ${custom ? 'User-selected coordinates' : field.nombre}`,
      `Coordinates: ${field.lat.toFixed(5)}, ${field.lon.toFixed(5)}`,
      `Scope: ${custom ? 'Global climate-only exploration' : 'California pilot field'}`,
      `Farmer priority: ${({agua:'Save water',suelo:'Protect soil health',rentabilidad:'Increase earnings',erosion:'Reduce erosion'})[priority] ?? priority}`,
    ] },
    { heading: 'DATA SOURCES AND FRESHNESS', lines: [
      powerReady ? `NASA POWER: queried for ${power.year}; ${power.datos?.serie?.filter(m => m.temperatura !== null)?.length ?? 0}/12 monthly temperature records (regional estimates).`
        : 'NASA POWER: no completed explicit monthly query in this view.',
      custom ? 'Pilot crop history: not applicable to these global coordinates.'
        : 'Pilot history: static team-supplied 2015-2024; not independently audited.',
      custom ? 'P1 import: pilot data cannot be applied to a global coordinate.'
        : p1Evidence ? `P1: imported from ${p1Filename || 'local file'}; metadata declared, not audited.`
          : 'P1: no separately imported source activated for this field.',
      soilLookup?.status === 'ready' ? `USDA SSURGO: point map unit ${soilLookup.data.soil.mapunit_key || 'unreported'} queried from official service; top-horizon mapped estimate, not a soil test.` : soilLookup?.status === 'partial' ? `USDA SSURGO: mapped unit ${soilLookup.data?.soil?.mapunit_key || 'unreported'} located, but detailed horizon attributes are temporarily unavailable; no values substituted.` : soilLookup?.status === 'unavailable' ? 'USDA SSURGO: requested; no mapped unit returned for these coordinates.' : soilLookup?.status === 'error' ? 'USDA SSURGO: lookup failed; no values substituted.' : 'USDA SSURGO: optional point lookup not requested in this assessment.',
      cropLookup?.status === 'ready' ? `USDA CDL: ${cropLookup.data.year} classified map pixel, ${cropLookup.data.classification.label || 'class code ' + cropLookup.data.classification.code}; not a verified field planting record.` : cropLookup?.status === 'unverified' ? 'USDA CDL: raster year could not be verified; classification was rejected.' : cropLookup?.status === 'outside_coverage' ? 'USDA CDL: location is outside approximate continental U.S. coverage.' : cropLookup?.status === 'error' ? 'USDA CDL: point lookup failed; no values substituted.' : cropLookup?.status === 'unavailable' ? 'USDA CDL: no classified pixel found for the selected location and year.' : 'USDA CDL: optional point lookup not requested in this assessment.',
      smapNumeric?.uploaded?.status === 'ready' ? `NASA SMAP: ${smapNumeric.uploaded.source.type === 'appeears-api' ? 'authenticated AppEEARS API task' : smapNumeric.uploaded.source.type === 'bundled-appeears' ? 'bundled Fresno 2024 AppEEARS export' : 'user-uploaded AppEEARS CSV'} (${smapNumeric.uploaded.source.dataset}), surface moisture ${smapNumeric.year}; ${smapNumeric.uploaded.valid_months}/12 months, m3/m3; quality flags not independently audited.` : smapNumeric?.status === 'ready' ? `NASA SMAP L4: surface moisture percentile rank queried for ${smapNumeric.year}; ${smapNumeric.data.valid_months}/12 valid months, ~9 km; not volumetric water %. GIBS L3 imagery is separate.` : 'NASA SMAP: optional L4 percentile query via POWER and L3 imagery via GIBS; no numerical query completed in this report.',
      'USDA Market News: optional local authenticated report review; no verified prices imported into the scenario model. Quoted prices must not be confused with farm-gate revenue.',
      `P2 executable model: unavailable; ${p2Filename ? 'P2 local file available for pilot review.' : 'archived outputs are read-only.'}`,
    ] },
    { heading: 'OBSERVATION SCREEN (DESCRIPTIVE ONLY)', lines: [
      `Screen year: ${observed.year ?? 'Not selected'}. Matched climate-moisture months: ${observed.matched_months}/12.`,
      observed.status === 'screened'
        ? `Relative warmer-and-drier months: ${observed.relative_overlap_months.join(', ') || 'none under the within-year median rule'}.`
        : `Screen not available: ${observed.reason}`,
      `USDA soil context: ${observed.source_status.soil}; CDL crop context: ${observed.source_status.crop}.`,
      'NASA POWER monthly max temperature and SMAP monthly mean moisture are not simultaneous field measurements.',
      'No simulated scenario, yield, irrigation recommendation or P2 model output was recalculated.',
    ] },
    { heading: 'ASSESSMENT AND CROP OPTIONS', lines: custom ? [
      'No global crop rotation advice is available: soil, crop history, pricing and a locally',
      'validated agronomic model are not connected for arbitrary coordinates.',
    ] : [
      `Scenario provenance: ${sourceText}.`,
      selected ? `Highlighted scenario: ${selected.titulo}` : 'Highlighted scenario: none (tie or insufficient comparable data).',
      selected ? `Crop plan as supplied: ${selected.cultivos || 'Not specified'}` : 'Compare all scenarios in the advanced view.',
      chosen?.agua?.absoluta != null ? `Water use difference vs. baseline: ${chosen.agua.absoluta} mm/cycle.` : 'Water difference: not available.',
      chosen?.ingreso?.absoluta != null ? `Gross revenue difference vs. baseline: ${chosen.ingreso.absoluta} USD/acre.` : 'Gross revenue difference: not available.',
      archive ? '2024 team fuzzy-model snapshot: static result; not recomputed or validated.' : '2024 team fuzzy-model snapshot: not loaded into this report.',
    ] },
    { heading: 'LIMITATIONS AND FIELD VALIDATION', lines: [
      'This assessment is exploratory and cannot confirm crop stress or farm profitability.',
      'Satellite/gridded observations do not replace field-scale measurements.',
      'Check irrigation supply, root-zone moisture, salinity, soil sampling, cropping constraints,',
      'local crop prices, yields and full production costs with a qualified agronomist.',
      'A new query does not make historic archives, simulation scenarios or imported files live.',
      `Report generated: ${generatedAt.slice(0, 19).replace('T', ' ')} UTC`,
    ] },
  ];
  return { title: 'Field Shift | Field Assessment Summary', sections, fieldId: field.id, generatedAt };
}
