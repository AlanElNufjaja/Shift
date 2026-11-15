import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MESES } from '../src/lib/diagnostics.js';

// Uso: npm run data:validate -- ./datos/parcelas_reales.json
const file = resolve(process.argv[2] ?? './src/data/parcelas.json');
let data;
try { data = JSON.parse(readFileSync(file, 'utf8')); }
catch (error) { console.error(`No se pudo abrir el archivo: ${file}\n${error.message}`); process.exit(1); }

const errs = [];
const ids = new Set();
if (!Array.isArray(data) || !data.length) errs.push('La raíz debe ser una lista no vacía de parcelas');
for (const [i, p] of (Array.isArray(data) ? data : []).entries()) {
  const prefix = `parcelas[${i}]`;
  if (typeof p?.id !== 'string' || !p.id.trim()) errs.push(`${prefix}: id obligatorio`);
  if (ids.has(p?.id)) errs.push(`${prefix}: id repetido ${p.id}`);
  ids.add(p?.id);
  if (typeof p?.nombre !== 'string' || !p.nombre.trim()) errs.push(`${prefix}: nombre obligatorio`);
  if (!Number.isFinite(p?.lat) || p.lat < -90 || p.lat > 90 || !Number.isFinite(p?.lon) || p.lon < -180 || p.lon > 180) errs.push(`${prefix}: lat/lon inválidos`);
  if (!p?.suelo_ssurgo || typeof p.suelo_ssurgo !== 'object') errs.push(`${prefix}: falta suelo_ssurgo`);
  if (!Array.isArray(p?.historial_cropscape)) errs.push(`${prefix}: historial_cropscape debe ser lista`);
  if (!Array.isArray(p?.clima_mensual)) { errs.push(`${prefix}: clima_mensual debe ser lista`); continue; }
  const months = new Set();
  p.clima_mensual.forEach((row, j) => {
    if (!MESES.includes(row?.mes)) errs.push(`${prefix}.clima_mensual[${j}]: mes no válido`);
    if (months.has(row?.mes)) errs.push(`${prefix}.clima_mensual: mes duplicado ${row?.mes}`);
    months.add(row?.mes);
    for (const key of ['temp_max_c', 'lluvia_mm', 'humedad_smap_pct']) {
      if (row?.[key] !== null && row?.[key] !== undefined && (typeof row[key] !== 'number' || !Number.isFinite(row[key]))) errs.push(`${prefix}.${row?.mes}.${key}: debe ser número o null`);
    }
  });
  if (months.size !== 12) console.warn(`${prefix}: hay ${months.size}/12 meses; la interfaz mostrará datos faltantes cuando corresponda`);
  if (!p?.datos_procedencia || p.datos_procedencia === 'demo_sintetica') console.warn(`${prefix}: procedencia demo o no declarada; NO presentar como dato real`);
}
if (errs.length) { console.error(`${errs.length} error(es):\n- ${errs.join('\n- ')}`); process.exit(1); }
console.log(`JSON compatible: ${data.length} parcelas (${file})`);
