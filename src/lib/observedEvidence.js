/**
 * Field Shift 4.3 — conservative cross-source evidence screening.
 * This is a descriptive screen, NOT a validated crop-stress model or a P2 run.
 * It consumes only explicitly requested NASA POWER data and numeric SMAP
 * AppEEARS point samples. It NEVER substitutes the demo soil-moisture series.
 *
 * The temperature parameter T2M_MAX is a monthly maximum; SMAP values are
 * monthly averages of surface (not root-zone) moisture. A common month does
 * not establish contemporaneous heat + moisture stress.
 */
export const MIN_MATCHED_MONTHS = 8; // coverage gate, not an agronomic threshold
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PRODUCTS = new Set(['SPL4SMGP','SPL3SMP_E']);
const SOURCE_TYPES = new Set(['uploaded-csv','appeears-api','bundled-appeears']);
const close = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= 0.00001;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const median = values => {
  const sorted = [...values].sort((a,b)=>a-b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m-1]+sorted[m])/2;
};
const isLocated = (data,field) => close(data?.location?.lat,field?.lat) && close(data?.location?.lon,field?.lon);

/** Compatible with source contexts; no network calls or side effects. */
export function screenObservedEvidence({ field, power, smap, soil, crop }) {
  if (!field || !finite(field.lat) || !finite(field.lon)) throw new Error('A valid field must be selected.');
  const year = smap?.year ?? null;
  const point = `${field.lat}:${field.lon}:${year}`;
  const powerReady = !!(power?.status === 'success' && power.year === year &&
    power.parcelaId === field.id && power.key === point &&
    power.datos?.year === year && Array.isArray(power.datos?.serie) && power.datos.serie.length === 12);
  const s = smap?.uploaded;
  const smapReady = !!(s?.status === 'ready' && SOURCE_TYPES.has(s.source?.type) &&
    PRODUCTS.has(s.source?.dataset) && s.source?.unit === 'm³/m³' &&
    s.period?.year === year && isLocated(s,field) && Array.isArray(s.months) && s.months.length === 12);
  const soilReady = soil?.status === 'ready' && isLocated(soil.data,field) &&
    soil.data?.provenance?.provider === 'USDA NRCS Soil Data Access (SSURGO)';
  const cropReady = crop?.status === 'ready' && isLocated(crop.data,field) &&
    crop.data?.provenance?.provider === 'USDA NASS Cropland Data Layer (CDL)' &&
    crop.data?.classification?.year_verified === true;
  const soilStatus = soilReady ? 'mapped' : soil?.status === 'partial' && isLocated(soil.data,field) ? 'partial' : 'not_used';
  const cropStatus = cropReady ? 'pixel_classified' : 'not_used';
  const months = MONTHS.map((label,index) => {
    const period = `${year}-${String(index+1).padStart(2,'0')}`;
    const p = powerReady ? power.datos.serie[index] : null;
    const m = smapReady ? s.months[index] : null;
    const temp = p?.periodo === period && finite(p.temperatura) && p.temperatura > -100 && p.temperatura < 80 ? p.temperatura : null;
    const moisture = m?.date === period && Number.isInteger(m.sample_count) && m.sample_count > 0 &&
      finite(m.surface_volumetric) && m.surface_volumetric >= 0 && m.surface_volumetric <= 0.8 ? m.surface_volumetric : null;
    return { period, label, temperature_c:temp, moisture_m3m3:moisture, paired:temp !== null && moisture !== null, relative_overlap:false };
  });
  const paired = months.filter(m=>m.paired);
  const enough = paired.length >= MIN_MATCHED_MONTHS;
  const medianTemperature = enough ? median(paired.map(m=>m.temperature_c)) : null;
  const medianMoisture = enough ? median(paired.map(m=>m.moisture_m3m3)) : null;
  if (enough) months.forEach(m=>{
    m.relative_overlap = m.paired && m.temperature_c > medianTemperature && m.moisture_m3m3 < medianMoisture;
  });
  const overlap = enough ? months.filter(m=>m.relative_overlap).map(m=>m.label) : [];
  const reason = !smapReady ? (smap?.uploaded ? 'The numeric SMAP sample does not match the selected coordinates, year, product or units.' : 'Load an AppEEARS numeric SMAP point sample for this field and year.')
    : !powerReady ? 'Query NASA POWER for the same field and year as the loaded SMAP sample.'
    : !enough ? `Only ${paired.length} matching monthly pairs were available; at least ${MIN_MATCHED_MONTHS} are needed for this descriptive screen.`
    : 'Months are compared with the medians of the matching months in this year, not calibrated crop-stress thresholds.';
  return {
    status: !smapReady || !powerReady ? 'waiting' : enough ? 'screened' : 'insufficient',
    field_id:field.id, lat:field.lat, lon:field.lon, year,
    matched_months:paired.length, minimum_months:MIN_MATCHED_MONTHS,
    relative_overlap_months:overlap, median_temperature_c:medianTemperature,
    median_moisture_m3m3:medianMoisture, months,
    source_status:{ power:powerReady?'queried':'not_eligible',
      smap:smapReady ? (s.source.type==='appeears-api'?'appeears_task':s.source.type==='bundled-appeears'?'bundled_appeears':'user_supplied_csv') : 'not_eligible',
      soil:soilStatus, crop:cropStatus },
    soil_context:soilReady?{mapunit:soil.data.soil?.mapunit_key ?? null}:null,
    crop_context:cropReady?{year:crop.data.year, label:crop.data.classification?.label ?? null}:null,
    reason,
    limitations:[
      'Descriptive within-year comparison only; not an irrigation recommendation or validated crop-stress alert.',
      'NASA POWER monthly maximum air temperature and SMAP monthly mean surface moisture are different temporal aggregates.',
      'SMAP gridded moisture is not root-zone moisture and is not a field probe; CSV quality flags have not been independently reviewed.',
      'USDA SSURGO map units and CDL crop pixels are contextual and do not validate crops, yields or soil conditions at field scale.',
      'Results do not change P2 scenarios, market prices, the demo signals or the agronomic model.',
    ],
  };
}
