/** Minimal dependency-free text PDF generator. All user strings are normalized to printable ASCII. */
const safe = (value) => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u2010-\u2015]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[^\x20-\x7E]/g, '?');

const quote = (str) => safe(str).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');

function wrapLine(text, limit = 93) {
  const words = safe(text).trim().split(/\s+/).filter(Boolean);
  const result = [];
  let line = '';
  for (const word of words) {
    if ((line ? line.length + 1 : 0) + word.length > limit && line) {
      result.push(line); line = '';
    }
    if (word.length > limit) {
      if (line) result.push(line);
      for (let i = 0; i < word.length; i += limit) result.push(word.slice(i, i + limit));
      line = '';
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) result.push(line);
  return result.length ? result : [''];
}

export function buildPdf(report) {
  if (!report || !Array.isArray(report.sections)) throw new Error('Invalid report');
  const rows = [];
  for (const section of report.sections) {
    rows.push({ text: section.heading, heading: true });
    for (const text of section.lines ?? []) {
      for (const line of wrapLine(text)) rows.push({ text: line, heading: false });
    }
    rows.push({ text: '', heading: false });
  }
  const chunks = [];
  const pageRows = 42;
  for (let i = 0; i < rows.length; i += pageRows) chunks.push(rows.slice(i, i + pageRows));
  if (!chunks.length) chunks.push([]);

  const objects = [];
  const add = (v) => { objects.push(v); return objects.length; };
  const root = add('');
  const pagesObj = add('');
  const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const kids = [];
  for (let i = 0; i < chunks.length; i++) {
    const pageId = add(''); kids.push(`${pageId} 0 R`);
    const ops = [
      '0.08 0.24 0.17 rg', '48 738 516 5 re f',
      `BT /F2 17 Tf 0.08 0.24 0.17 rg 48 710 Td (${quote(report.title || 'Field Shift Report')}) Tj ET`,
      'BT /F1 9 Tf 0.36 0.42 0.37 rg 48 689 Td (NASA Space Apps | Research prototype) Tj ET',
    ];
    let y = 655;
    for (const row of chunks[i]) {
      if (row.heading) {
        ops.push(`BT /F2 10 Tf 0.12 0.36 0.22 rg 48 ${y} Td (${quote(row.text)}) Tj ET`);
        y -= 17;
      } else {
        if (row.text) ops.push(`BT /F1 9 Tf 0.20 0.26 0.22 rg 48 ${y} Td (${quote(row.text)}) Tj ET`);
        y -= 13;
      }
    }
    ops.push(`BT /F1 8 Tf 0.40 0.46 0.42 rg 48 38 Td (Field Shift | Page ${i + 1} of ${chunks.length}) Tj ET`);
    const stream = ops.join('\n') + '\n';
    const contentsId = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    objects[pageId - 1] = `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentsId} 0 R >>`;
  }
  objects[root - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(output.length);
    output += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { output += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${root} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(output);
}

export function downloadPdf(report, filename = 'field-shift-assessment.pdf') {
  const bytes = buildPdf(report);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
