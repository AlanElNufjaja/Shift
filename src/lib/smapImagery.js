/** NASA GIBS SMAP imagery metadata, not a numerical SMAP point API. */
export const GIBS_SMAP_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
export const SMAP_PRODUCTS = Object.freeze({
  day: {
    layer: 'SMAP_L3_Passive_Enhanced_Day_Soil_Moisture',
    label: 'Daytime pass',
    description: 'NASA SMAP L3 passive enhanced (day), 9 km imagery',
  },
  night: {
    layer: 'SMAP_L3_Passive_Enhanced_Night_Soil_Moisture',
    label: 'Nighttime pass',
    description: 'NASA SMAP L3 passive enhanced (night), 9 km imagery',
  },
});
export const SMAP_FIRST_DATE = '2015-03-31';
export const SMAP_DEMO_DATE = '2024-07-15';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar and mission-range validation; unavailable imagery is not filled or interpolated. */
export function validSmapDate(value, max = new Date().toISOString().slice(0, 10)) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false;
  return value >= SMAP_FIRST_DATE && value <= max;
}

export function smapLayerConfig(pass, date) {
  if (!SMAP_PRODUCTS[pass] || !validSmapDate(date)) throw new Error('Select a valid SMAP pass and date.');
  return {
    url: GIBS_SMAP_WMS,
    layers: SMAP_PRODUCTS[pass].layer,
    time: date,
    format: 'image/png',
    version: '1.1.1',
    transparent: true,
  };
}

export const SMAP_LIMITATIONS = Object.freeze([
  'A colorized map is an image, not a numeric soil-moisture reading at your field.',
  'SMAP L3 passive imagery is a satellite retrieval at roughly 9 km scale, not a soil probe.',
  'Blank areas can mean missing overpasses, masking, or service issues; do not infer zero moisture.',
  'Satellite imagery does not update demonstration soil-moisture charts or crop recommendations.',
]);
