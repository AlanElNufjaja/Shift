/**
 * Field Shift 4.5.2 — P2 model-run audit bridge & CosoNASA live execution bridge.
 */
import { buildTeamModelEvidence, TEAM_INPUTS } from './teamModelEvidence.js';

export const MODEL_RUN_MAX_BYTES = 256 * 1024;
export const MODEL_RUN_SCHEMA = 'field-shift.model-run.v1';
export const MODEL_RUN_YEAR = 2024;
export const PILOT_IDS = Object.freeze(['fresno-01', 'bakersfield-02', 'davis-03']);
const CATEGORIES = Object.freeze(['No_Recomendado', 'Aceptable', 'Recomendado']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const close = (a, b, tolerance = 1e-6) => finite(a) && finite(b) && Math.abs(a - b) <= tolerance;
const validTimestamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && !Number.isNaN(Date.parse(value));
const cleanString = value => typeof value === 'string' ? value.trim() : '';

function compareRow(row, teamSite) {
  const archived = buildTeamModelEvidence(teamSite);
  if (!archived) return null;
  const inputs = TEAM_INPUTS.map(({ key, label }) => {
    const actual = row.inputs[key];
    const baseline = archived.inputs.find(i => i.key === key)?.value;
    return { key, label, current: actual, archived: baseline, same: close(actual, baseline) };
  });
  const candidatesBaseline = archived.candidates;
  const sameCandidates = row.candidate_crops.length === candidatesBaseline.length && row.candidate_crops.every((crop, i) => crop === candidatesBaseline[i]);
  const comparisons = [
    { label: 'Model score', same: close(row.score, archived.score), actual: row.score, archived: archived.score },
    { label: 'Classification', same: row.category === archived.categoryCode, actual: row.category, archived: archived.categoryCode },
    { label: 'Recorded crop', same: row.recorded_crop === archived.recordedCrop, actual: row.recorded_crop, archived: archived.recordedCrop },
    { label: 'Candidate crops (ordered)', same: sameCandidates, actual: row.candidate_crops.join(', '), archived: candidatesBaseline.join(', ') },
  ];
  return {
    field_id: row.field_id,
    crop: archived.recordedCrop,
    currentScore: row.score,
    archiveScore: archived.score,
    scoreDifference: row.score - archived.score,
    category: row.category,
    inputChecks: inputs,
    checks: comparisons,
    sameAsArchive: comparisons.every(c => c.same) && inputs.every(i => i.same),
    audited: false,
  };
}

export function validateModelRun(payload, teamArchive) {
  const errors = [];
  const warnings = [];
  const comparisons = [];
  const base = { valid: false, errors, warnings, comparisons, covered: [], archiveMatchCount: 0, metadata: null, fictional: false };
  if (!isObject(payload)) return { ...base, errors: ['Expected a JSON object.'] };
  if (payload.schema_version !== MODEL_RUN_SCHEMA) errors.push(`schema_version must be ${MODEL_RUN_SCHEMA}.`);
  if (!['model-run', 'snapshot-replay'].includes(payload.kind)) errors.push('kind must be model-run or snapshot-replay.');
  if (typeof payload.fictional !== 'boolean') errors.push('fictional must be an explicit boolean.');
  if (!isObject(payload.metadata)) errors.push('metadata is required.');
  else {
    for (const key of ['model_id', 'version', 'method']) {
      if (!cleanString(payload.metadata[key])) errors.push(`metadata.${key} is required.`);
    }
    if (!validTimestamp(payload.metadata.executed_at)) errors.push('metadata.executed_at must be an ISO-8601 timestamp with timezone.');
    if (payload.kind === 'model-run' && !cleanString(payload.metadata.code_reference)) {
      warnings.push('No code_reference supplied; formula and model version cannot be reproduced from this file.');
    }
    if (!Array.isArray(payload.metadata.input_sources) || !payload.metadata.input_sources.length) {
      warnings.push('No input_sources listed; NASA/USDA provenance is not established.');
    } else if (payload.metadata.input_sources.some(s => !isObject(s) || !cleanString(s.source) || !cleanString(s.period))) {
      errors.push('Each input_sources entry requires source and period.');
    }
  }
  if (!Array.isArray(payload.results) || payload.results.length < 1 || payload.results.length > 3) {
    errors.push('results must contain 1–3 pilot fields.');
  } else {
    const seen = new Set();
    for (const [i, row] of payload.results.entries()) {
      const path = `results[${i}]`;
      if (!isObject(row)) { errors.push(`${path} must be an object.`); continue; }
      if (!PILOT_IDS.includes(row.field_id)) errors.push(`${path}.field_id is not a known California pilot.`);
      if (seen.has(row.field_id)) errors.push(`${path}.field_id is duplicated.`);
      seen.add(row.field_id);
      if (row.year !== MODEL_RUN_YEAR) errors.push(`${path}.year must be ${MODEL_RUN_YEAR}.`);
      if (!isObject(row.coordinates) || !finite(row.coordinates.lat) || !finite(row.coordinates.lon)) {
        errors.push(`${path}.coordinates must contain finite lat and lon.`);
      } else {
        const expected = teamArchive?.[row.field_id]?.coordinates;
        if (!expected || !close(row.coordinates.lat, expected.lat, 0.0001) || !close(row.coordinates.lon, expected.lon, 0.0001)) {
          errors.push(`${path}.coordinates do not match the team pilot archive. Do not assign another field's output.`);
        }
      }
      if (!finite(row.score) || Math.abs(row.score) > 1e6) errors.push(`${path}.score must be a finite reported number.`);
      if (!CATEGORIES.includes(row.category)) errors.push(`${path}.category is not one of the recorded team-model categories.`);
      if (!cleanString(row.recorded_crop)) errors.push(`${path}.recorded_crop is required (English crop name).`);
      if (!Array.isArray(row.candidate_crops) || row.candidate_crops.length > 15 || row.candidate_crops.some(s => !cleanString(s))) {
        errors.push(`${path}.candidate_crops must be an array of up to 15 non-empty crop names.`);
      }
      if (!isObject(row.inputs) || TEAM_INPUTS.some(({ key }) => !finite(row.inputs[key]))) {
        errors.push(`${path}.inputs must contain four finite model inputs.`);
      }
    }
  }
  if (errors.length) return { ...base, fictional: payload.fictional === true, metadata: payload.metadata ?? null };
  if (!teamArchive || Object.keys(teamArchive).length !== 3) {
    return { ...base, errors: ['The 2015–2024 California team archive is not loaded; comparison is blocked.'], metadata: payload.metadata };
  }
  for (const row of payload.results) {
    const compared = compareRow(row, teamArchive[row.field_id]);
    if (!compared) errors.push(`${row.field_id}: team archive snapshot is incomplete.`);
    else comparisons.push(compared);
  }
  if (errors.length) return { ...base, metadata: payload.metadata };
  if (payload.kind === 'snapshot-replay') warnings.push('Snapshot replay: these values may be copied from the archive; this does NOT demonstrate that the fuzzy model was executed.');
  if (payload.fictional) warnings.push('FICTIONAL sample for testing the import and comparison flow only.');
  if (comparisons.some(r => !r.sameAsArchive)) warnings.push('Some reported values differ from the 2024 archive. Differences are NOT automatically errors, model improvements or proof of validity.');
  if (payload.results.length !== 3) warnings.push(`Only ${payload.results.length} of 3 pilot fields are covered.`);
  warnings.push('Matching the archive is an internal consistency check, not proof of reproducibility, prediction quality or scientific validation.');
  return {
    valid: true, errors, warnings, comparisons, covered: payload.results.map(r => r.field_id),
    archiveMatchCount: comparisons.filter(r => r.sameAsArchive).length,
    metadata: payload.metadata, kind: payload.kind, fictional: payload.fictional
  };
}

/** Ejecuta el motor difuso CosoNASA Mamdani en el backend para cualquier coordenada. */
export async function runCosoNasaPrediction({ lat, lon, priority = 'balanced', localOrganicMatter = null }) {
  const priorityMap = {
    agua: 'water',
    rentabilidad: 'profit',
    suelo: 'balanced',
    erosion: 'balanced',
  };

  const response = await fetch('/api/predict-rotation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: Number(lat),
      lon: Number(lon),
      prioridad: priorityMap[priority] || priority,
      materia_organica_local: localOrganicMatter !== null && localOrganicMatter !== '' ? Number(localOrganicMatter) : null,
    }),
  });

  if (!response.ok) {
    throw new Error(`CosoNASA Engine Error (${response.status})`);
  }

  return await response.json();
}