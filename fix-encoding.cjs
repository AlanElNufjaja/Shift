/**
 * Corrige textos guardados como UTF-16 o UTF-8 con BOM (p. ej., desde PowerShell 5.1).
 * Ejecutar en la raíz del proyecto: node fix-encoding.cjs
 * No modifica archivos que ya son UTF-8 válido sin BOM.
 */
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const ROOT = __dirname;
const ALLOWED = new Set(['.json', '.js', '.jsx', '.cjs', '.mjs', '.css', '.html', '.md', '.ts', '.tsx', '.txt', '.env', '.example']);
const IGNORED = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
let fixed = 0;
let inspected = 0;

function utf16beToString(bytes) {
  const swapped = Buffer.from(bytes);
  for (let i = 0; i + 1 < swapped.length; i += 2) {
    const tmp = swapped[i]; swapped[i] = swapped[i + 1]; swapped[i + 1] = tmp;
  }
  return swapped.toString('utf16le');
}

function inspectFile(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length === 0) return;
  let value;
  let reason;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    value = bytes.subarray(2).toString('utf16le');
    reason = 'UTF-16 LE';
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    value = utf16beToString(bytes.subarray(2));
    reason = 'UTF-16 BE';
  } else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    value = bytes.subarray(3).toString('utf8');
    reason = 'UTF-8 con BOM';
  } else {
    // No modificar archivos que ya son UTF-8 sin BOM.
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { console.warn('Codificación no reconocida (sin cambios):', path.relative(ROOT, file)); }
    return;
  }
  value = value.replace(/^\uFEFF/, '');
  if (path.extname(file) === '.json') JSON.parse(value); // evitar guardar JSON inválido
  fs.writeFileSync(file, value, 'utf8');
  fixed += 1;
  console.log('Corregido:', path.relative(ROOT, file), `(${reason} -> UTF-8)`);
}

function walk(folder) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!IGNORED.has(item.name)) walk(path.join(folder, item.name));
    } else if (item.isFile() && ALLOWED.has(path.extname(item.name))) {
      inspected += 1;
      inspectFile(path.join(folder, item.name));
    }
  }
}

try {
  walk(ROOT);
  console.log(`Revisados: ${inspected}. Corregidos: ${fixed}.`);
} catch (error) {
  console.error('No se pudo corregir un archivo:', error.message);
  process.exitCode = 1;
}
