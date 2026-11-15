/**
 * Read-only evidence bridge for the team's 2024 fuzzy-model snapshot.
 * No model weights, calibrated scale, or crop-specific economic scenarios
 * were supplied. This module does NOT rerun, rank or validate the model.
 */
import { teamModelCategory, teamYearDetails } from './teamPilotAdapter.js';

export const TEAM_INPUTS = Object.freeze([
  { key: 'Disponibilidad_Hidrica', label: 'Water availability', note: 'Input value declared by the team; scale and calculation not documented.' },
  { key: 'Estres_Termico', label: 'Heat stress', note: 'Model input, not an observed temperature or probability.' },
  { key: 'Salud_suelo', label: 'Soil health', note: 'Model input, not a measured soil-quality percentage.' },
  { key: 'Historial_Monocultivo', label: 'Repeated-crop history', note: 'Team-reported index; it is not on the same scale as the other inputs.' },
]);

const isNumber = value => typeof value === 'number' && Number.isFinite(value);

export function buildTeamModelEvidence(site) {
  if (!site || !site.model || !site.coordinates || !Array.isArray(site.annual)) return null;
  const year = teamYearDetails(site, 2024);
  if (!year) return null;
  const model = site.model;
  const rawInputs = model.rawInputs ?? {};
  const inputs = TEAM_INPUTS.map(({key, label, note}) => ({
    key, label, note,
    value: isNumber(rawInputs[key]) ? rawInputs[key] : null,
  }));
  const annualScore = year.annual.modelScore;
  const snapshotScore = isNumber(model.score) ? model.score : null;
  const cropMatches = Boolean(site.currentCrop && year.annual.crop && site.currentCrop === year.annual.crop);
  const scoreMatches = snapshotScore !== null && isNumber(annualScore) && Math.abs(snapshotScore - annualScore) < 1e-9;
  const allInputsPresent = inputs.every(input => input.value !== null);
  const status = cropMatches && scoreMatches && allInputsPresent ? 'internally-consistent' : 'requires-review';
  return {
    year: 2024,
    score: snapshotScore,
    category: teamModelCategory(model.category),
    categoryCode: model.category ?? null,
    recordedCrop: year.annual.crop,
    candidates: Array.isArray(model.candidateCrops) ? model.candidateCrops : [],
    coordinates: site.coordinates,
    inputs,
    checks: [
      { label: '2024 crop matches the annual archive', passed: cropMatches },
      { label: 'Model score matches the 2024 annual archive', passed: scoreMatches },
      { label: 'Four model input values are present', passed: allInputsPresent },
    ],
    status,
    // Internal agreement is NOT independent verification of NASA/USDA provenance.
    audited: false,
    canDriveScenarioComparison: false,
    canApplyToGlobalFields: false,
  };
}
