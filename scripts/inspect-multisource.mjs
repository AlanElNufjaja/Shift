#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { prepararEntregableP1, fuentesDisponibles } from '../src/lib/multiSourceIntake.js';
const base = JSON.parse(readFileSync(new URL('../src/data/parcelas.json', import.meta.url), 'utf8')); 

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run data:multisource -- ruta/al/parcelas_reales.json');
  process.exit(2);
}
try {
  const bytes = readFileSync(file);
  if (bytes.byteLength > 2 * 1024 * 1024) throw new Error('El archivo excede 2 MB');
  const json = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  const report = prepararEntregableP1(json, base.map((p) => p.id), Object.fromEntries(base.map((p) => [p.id, {lat:p.lat,lon:p.lon}])));
  console.log(`Fuentes elegibles: ${report.fuentes} · Parcelas: ${report.parcelas ?? 0}`);
  for (const [id, item] of Object.entries(report.porParcela)) console.log(`- ${id}: ${fuentesDisponibles(item).join(', ')}${item.modoEjemplo ? ' [FICTICIO]' : ''}`);
  for (const v of report.avisos) console.warn('AVISO:', v);
  for (const v of report.errores) console.error('ERROR:', v);
  if (!report.valido) process.exitCode = 1;
} catch (e) { console.error('Error al leer/validar:', e.message); process.exitCode = 1; }
