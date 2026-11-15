/**
 * Presentation-only English labels for the legacy NASA/USDA JSON contract.
 * IMPORTANT: never rewrite month identifiers (Enero...Diciembre), priority IDs,
 * source identifiers, or the Cobertura values used by assessment rules.
 * This keeps imported JSON and the agronomic logic backwards-compatible.
 */
export const MONTH_NAMES = Object.freeze({
  Enero: 'January', Febrero: 'February', Marzo: 'March', Abril: 'April',
  Mayo: 'May', Junio: 'June', Julio: 'July', Agosto: 'August',
  Septiembre: 'September', Octubre: 'October', Noviembre: 'November', Diciembre: 'December',
});

const KNOWN_TERMS = Object.freeze({
  'Bajo':'Low', 'Baja':'Low', 'Medio':'Medium', 'Media':'Medium', 'Alto':'High', 'Alta':'High',
  'Franco-arcilloso':'Clay loam', 'Franco-arenoso':'Sandy loam',
  'Franco-limoso':'Silt loam', 'Franco':'Loam',
  'Desnudo':'Bare soil', 'Cubierto':'Covered',
  'Algodón':'Cotton', 'Tomate de industria':'Processing tomato',
  'Maíz':'Corn', 'Cártamo':'Safflower', 'Trigo de invierno':'Winter wheat',
  'Trébol':'Clover', 'Garbanzo':'Chickpea', 'Alfalfa':'Alfalfa',
  'Monocultivo detectado':'Consecutive repetition detected',
});

export function displayMonth(value) {
  return MONTH_NAMES[value] || String(value ?? '');
}

export function displayTerm(value) {
  if (value == null || value === '') return 'No data';
  const str = String(value);
  if (Object.hasOwn(KNOWN_TERMS, str)) return KNOWN_TERMS[str];
  if (Object.hasOwn(MONTH_NAMES, str)) return MONTH_NAMES[str];
  // Translate known labels in source records without altering the original data.
  let result = str;
  for (const [spanish, english] of Object.entries(KNOWN_TERMS).sort((a,b)=>b[0].length-a[0].length)) {
    if (spanish.length >= 4) result = result.replaceAll(spanish, english);
  }
  return result;
}
