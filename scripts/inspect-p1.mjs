import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validarEntregableP1 } from '../src/lib/parcelDataIntake.js';

const file = resolve(process.argv[2] || './src/data/parcelas.json');
try {
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const result = validarEntregableP1(JSON.parse(raw));
  console.log(`Parcela(s): ${result.count} · estructura ${result.valido ? 'compatible' : 'inválida'}`);
  result.resumen.forEach((parcel) => console.log(`- ${parcel.nombre}: ${parcel.meses} meses · procedencia ${parcel.procedencia ? 'declarada' : 'ausente'}`));
  result.errores.forEach((err) => console.error(`ERROR: ${err}`));
  result.avisos.forEach((warn) => console.warn(`AVISO: ${warn}`));
  console.log('NOTA: estructura compatible ≠ datos verificados. No se modifica el tablero.');
  if (!result.valido) process.exitCode = 1;
} catch (err) {
  console.error(`No se pudo analizar ${file}: ${err.message}`);
  process.exitCode = 1;
}
