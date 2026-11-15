/** Market reference CSV intake. It does NOT change strategy prices, revenue or rankings.
 *  Expected column names are a curated handoff, not raw MyMarketNews table fields.
 */
const HEADER = ['commodity', 'quote_date', 'price', 'unit', 'market', 'source_url', 'report_slug'];
// Extended format is required for a scientifically defensible time-series comparison.
const EXTENDED_HEADER = ['commodity', 'quote_date', 'price', 'unit', 'market', 'grade', 'package', 'trade_basis', 'source_url', 'report_slug'];
const AMS_LINK = /^https:\/\/(?:mymarketnews\.ams\.usda\.gov|marsapi\.ams\.usda\.gov)(?:\/|$)/i;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseMarketCsv(text) {
  if (typeof text !== 'string' || text.length > 250_000) throw new Error('CSV is too large (250 KB maximum).');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quotation mark.');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

export function validateMarketCsv(text) {
  const rows = parseMarketCsv(text);
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one quote.');
  if (rows.length > 201) throw new Error('CSV supports at most 200 quotations.');
  const fields = rows[0].map(s => s.trim().replace(/^\uFEFF/, '').toLowerCase());
  const extended = fields.length === EXTENDED_HEADER.length && fields.every((f,i) => f === EXTENDED_HEADER[i]);
  const legacy = fields.length === HEADER.length && fields.every((f,i) => f === HEADER[i]);
  if (!extended && !legacy)
    throw new Error('Expected columns: ' + EXTENDED_HEADER.join(', ') + ' (or legacy seven-column format).');
  const today = new Date().toISOString().slice(0, 10);
  return rows.slice(1).map((r, i) => {
    if (r.length !== fields.length) throw new Error(`Row ${i + 2}: incorrect column count.`);
    const values = r.map(x => x.trim());
    const [commodity, quote_date, priceText, unit, market] = values;
    const [grade, package_type, trade_basis] = extended ? values.slice(5, 8) : [null, null, null];
    const [source_url, report_slug] = extended ? values.slice(8) : values.slice(5);
    if (!commodity || commodity.length > 90 || !market || market.length > 140)
      throw new Error(`Row ${i + 2}: commodity and market are required.`);
    const m = DATE.exec(quote_date);
    if (!m || new Date(`${quote_date}T00:00:00Z`).toISOString().slice(0,10) !== quote_date || quote_date > today)
      throw new Error(`Row ${i + 2}: invalid quotation date.`);
    // Never silently convert volume, grade or package into a universal $/ton quote.
    if (!/^USD\/[\w -]{1,45}$/i.test(unit))
      throw new Error(`Row ${i + 2}: unit must be explicit, such as USD/lb or USD/short_ton.`);
    const price = Number(priceText);
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(priceText) || !Number.isFinite(price) || price <= 0 || price > 1e9)
      throw new Error(`Row ${i + 2}: price must be positive and finite.`);
    if (extended && [grade, package_type, trade_basis].some(v => !v || v.length > 90))
      throw new Error(`Row ${i + 2}: grade, package and trade basis are required for comparable historical quotes.`);
    if (!AMS_LINK.test(source_url))
      throw new Error(`Row ${i + 2}: source URL must be on an official USDA AMS domain.`);
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(report_slug))
      throw new Error(`Row ${i + 2}: invalid report slug.`);
    return { commodity, quote_date, price, unit, market, grade, package: package_type,
      trade_basis, source_url, report_slug, comparison_level: extended ? 'detailed' : 'limited',
      status: 'user-transcribed, not audited' };
  });
}

export function groupComparableMarketQuotes(quotes) {
  const groups = new Map();
  for (const q of quotes) {
    const k = [q.comparison_level === 'detailed' ? 'detailed' : 'limited',
      q.commodity, q.unit, q.market, q.grade || '', q.package || '', q.trade_basis || '']
      .map(v => String(v).trim().toLowerCase()).join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(q);
  }
  return [...groups.values()].map(rows => rows.slice().sort((a,b) => b.quote_date.localeCompare(a.quote_date)));
}


/** Return a conservative timeline. Never join dots or calculate a price change unless
 * grade, package and trade basis match, and there is just one quote on each date.
 * The seven-column legacy import remains readable but is not trend-ready.
 */
export function buildMarketPriceHistory(quotes) {
  return groupComparableMarketQuotes(quotes).map((rows, index) => {
    const chronological = rows.slice().sort((a,b) => a.quote_date.localeCompare(b.quote_date));
    const oldest = chronological[0];
    const latest = chronological[chronological.length - 1];
    const uniqueDates = new Set(chronological.map(q => q.quote_date));
    const repeatedDates = uniqueDates.size !== chronological.length;
    const detailed = chronological.every(q => q.comparison_level === 'detailed' &&
      q.grade && q.package && q.trade_basis);
    const canChart = detailed && chronological.length >= 2 && !repeatedDates;
    return {
      id: String(index),
      commodity: latest.commodity, unit: latest.unit, market: latest.market,
      grade: latest.grade, package: latest.package, trade_basis: latest.trade_basis,
      latest, oldest, count: chronological.length, repeatedDates, detailed, canChart,
      points: chronological.map(q => ({ date: q.quote_date, price: q.price, source_url: q.source_url, report_slug: q.report_slug })),
      change: canChart ? latest.price - oldest.price : null,
      changePct: canChart && oldest.price > 0 ? (latest.price / oldest.price - 1) * 100 : null,
      warning: !detailed ? 'Grade, package and trade basis were not supplied; a defensible price trend cannot be drawn.'
        : repeatedDates ? 'There are multiple quotations for the same date; select a single grade/package/quote series before drawing a trend.'
        : chronological.length < 2 ? 'At least two quotation dates are needed for a price trend.' : null,
    };
  });
}
