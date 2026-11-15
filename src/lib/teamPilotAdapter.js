/**
 * Team-provided California pilot archive, kept separate from demo indicators and
 * P2 strategy outputs. This adapter is deliberately strict about identity/time.
 */
const IDS = Object.freeze({ fresno: 'fresno-01', bakersfield: 'bakersfield-02', davis: 'davis-03' });
const CROP_LABELS = Object.freeze({
  'Tomate': 'Tomato', 'Algodón': 'Cotton', 'Trigo': 'Wheat',
  'Cártamo': 'Safflower', 'Alfalfa': 'Alfalfa', 'Maíz': 'Corn', 'Descanso': 'Fallow',
});
const HISTORY_START = 2015;
const HISTORY_END = 2024;
const LAST_YEAR = HISTORY_END;
const expectedDate = (year, month) => `${year}-${String(month).padStart(2, '0')}`;
const validNum = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function cropEnglish(crop) { return CROP_LABELS[crop] ?? crop ?? 'Not recorded'; }

export function cropConditionEnglish(value) {
  if (typeof value !== 'string') return 'Not recorded';
  if (value.includes('Monocultivo')) return 'Repeated crop (team classification)';
  if (value.includes('Descanso')) return 'Fallow';
  if (value === 'Rotación') return 'Rotation (team classification)';
  return 'Not classified';
}

export function teamModelCategory(value) {
  const categories = {
    No_Recomendado: 'Not favored by team model',
    Aceptable: 'Acceptable in team model',
    Recomendado: 'Favored by team model',
  };
  return categories[value] ?? 'Unclassified team model output';
}

/** Extracts crop names literally present in a model's prose, without inferring yields. */
export function extractTeamCandidateCrops(text) {
  if (typeof text !== 'string') return [];
  return Object.entries(CROP_LABELS)
    .map(([raw, translated]) => ({ translated, offset: text.indexOf(raw) }))
    .filter(item => item.offset !== -1)
    .sort((a, b) => a.offset - b.offset)
    .map(item => item.translated);
}

function normalizeMonthly(row) {
  return {
    date: row.fecha,
    tempMaxC: validNum(row.temp_max_c),
    rainfallMm: validNum(row.lluvia_mm),
    wetnessPct: validNum(row.humedad_suelo_pct),
    crop: cropEnglish(row.cultivo_principal),
    cropCondition: cropConditionEnglish(row.estado_suelo),
  };
}

/** Reject a mismatched or incomplete site instead of leaking another pilot's data. */
export function normalizeTeamPayload(raw) {
  if (!raw || typeof raw !== 'object' || !raw.parcelas || Array.isArray(raw.parcelas)) {
    throw new Error('Expected object with parcelas dictionary.');
  }
  const byId = {};
  for (const [key, id] of Object.entries(IDS)) {
    const site = raw.parcelas[key];
    if (!site || site.id_original !== id || !Array.isArray(site.centro) || site.centro.length !== 2) {
      throw new Error(`Missing pilot ${key}.`);
    }
    const [lat, lon] = site.centro;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new Error(`${key}: invalid team coordinates.`);
    }
    const months2024 = site.historial_mensual_2024;
    const annual = site.resumen_anual_2015_2024;
    const complete = site.historial_completo_120_meses;
    if (!Array.isArray(months2024) || months2024.length !== 12 ||
        !Array.isArray(annual) || annual.length !== 10 ||
        !Array.isArray(complete) || complete.length !== 120) {
      throw new Error(`${key}: incomplete history.`);
    }
    if (months2024.some((m, i) => m.fecha !== expectedDate(LAST_YEAR, i + 1)) ||
        annual.some((m, i) => m.anio !== HISTORY_START + i) ||
        complete.some((m, i) => m.fecha !== expectedDate(HISTORY_START + Math.floor(i / 12), i % 12 + 1))) {
      throw new Error(`${key}: inconsistent or duplicated periods.`);
    }
    const fullMonths = complete.map(normalizeMonthly);
    const modelText = site.resultado_modelo?.cultivo_recomendado ?? '';
    byId[id] = {
      id,
      coordinates: { lat, lon },
      period: '2015–2024', baselineYear: LAST_YEAR,
      soil: {
        texture: site.propiedades_suelo?.textura ?? null,
        organicMatterPct: validNum(site.propiedades_suelo?.materia_organica_pct),
        waterCapacity: validNum(site.propiedades_suelo?.retencion_agua_awc),
        erodibilityK: validNum(site.propiedades_suelo?.factor_erosion_k),
        mukey: site.propiedades_suelo?.mukey ?? null,
      },
      currentCrop: cropEnglish(site.estado_actual_2024?.cultivo_actual),
      model: {
        score: validNum(site.resultado_modelo?.score_idoneidad),
        category: site.resultado_modelo?.categoria_difusa ?? null,
        suggestedText: modelText,
        candidateCrops: extractTeamCandidateCrops(modelText),
        // Exact names from the supplied fuzzy-model payload. Not percentages.
        rawInputs: Object.fromEntries(
          ['Disponibilidad_Hidrica', 'Estres_Termico', 'Salud_suelo', 'Historial_Monocultivo']
            .map(key => [key, validNum(site.inputs_fuzzy_normalizados?.[key])])
        ),
      },
      annual: annual.map(row => ({
        year: row.anio, crop: cropEnglish(row.cultivo),
        cropCondition: cropConditionEnglish(row.estado_suelo),
        averageMoisturePct: validNum(row.humedad_media_pct),
        maxTemperatureC: validNum(row.temp_max_c), modelScore: validNum(row.score_idoneidad),
      })),
      months2024: months2024.map(normalizeMonthly),
      fullMonths,
      notice: 'Team-supplied historical snapshot; dataset variables, model and prices have not been independently audited. Moisture is NOT independently validated as SMAP.',
    };
  }
  return byId;
}

/** Isolated selectors: no locale-dependent month names or demo state changes. */
export function teamYearDetails(teamSite, year) {
  const selected = Number(year);
  if (!teamSite || !Number.isInteger(selected) || selected < HISTORY_START || selected > HISTORY_END) return null;
  const annual = teamSite.annual.find(row => row.year === selected);
  const months = teamSite.fullMonths.filter(row => row.date.startsWith(`${selected}-`));
  if (!annual || months.length !== 12) return null;
  return { year: selected, annual, months };
}

export const TEAM_HISTORY_YEARS = Object.freeze(Array.from({ length: 10 }, (_, i) => HISTORY_END - i));
