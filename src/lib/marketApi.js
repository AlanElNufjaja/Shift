/** Read-only backend proxy. A personal USDA API key is never sent from the browser. */
export async function marketStatus(signal) {
  const r = await fetch('/api/market/status', { signal });
  if (!r.ok) throw new Error('Local market service status unavailable.');
  return r.json();
}

export async function marketReport(slug, signal) {
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(slug)) throw new Error('Enter a valid USDA report slug.');
  const r = await fetch(`/api/market/reports/${encodeURIComponent(slug)}`, { signal });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Market News request failed.');
  if (data.status !== 'retrieved' || data.report_slug !== slug || !Array.isArray(data.preview))
    throw new Error('Unexpected USDA market report response.');
  return data;
}
