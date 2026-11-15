import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileSpreadsheet, Info, RefreshCw, TrendingUp } from 'lucide-react';
import { marketReport, marketStatus } from '../../lib/marketApi.js';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { buildMarketPriceHistory, groupComparableMarketQuotes, validateMarketCsv } from '../../lib/marketEvidence.js';

const TEMPLATE = 'commodity,quote_date,price,unit,market,grade,package,trade_basis,source_url,report_slug\n';

/** For advanced users: official AMS raw reports and user-transcribed price references.
 * Raw report rows may include differently structured prices, packaging, locations and grades.
 * This panel deliberately does not feed the P2 economic simulator.
 */
export default function MarketEvidencePanel() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');
  const [slug, setSlug] = useState('');
  const [report, setReport] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [importError, setImportError] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const requestRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    marketStatus(controller.signal).then(setConfig).catch(e => { if (!controller.signal.aborted) setConfigError(e.message); });
    return () => { controller.abort(); requestRef.current?.abort(); };
  }, []);

  async function loadReport() {
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    setReport(null); setLoading(true); setLookupError('');
    try { setReport(await marketReport(slug.trim(), controller.signal)); }
    catch (e) { if (!controller.signal.aborted) setLookupError(e.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    setImportError(''); setQuotes([]); setFileName(''); setSelectedHistoryId('');
    if (!file) return;
    if (file.size > 250_000) { setImportError('File must be at most 250 KB.'); event.target.value = ''; return; }
    try {
      const parsed = validateMarketCsv(await file.text());
      setQuotes(parsed); setFileName(file.name);
    } catch (e) { setImportError(e.message); }
    event.target.value = '';
  }

  const comparisons = groupComparableMarketQuotes(quotes);
  const histories = buildMarketPriceHistory(quotes);
  const selectedHistory = histories.find(h => h.id === selectedHistoryId) || histories.find(h => h.canChart) || histories[0];
  const ready = config?.configured === true;
  return <section className="space-y-5" aria-label="USDA Market News evidence">
    <div className="rounded-[22px] border border-[#dbe8d8] bg-white p-5 sm:p-7">
      <div className="mb-2 flex items-center gap-2 text-forest"><FileSpreadsheet size={23}/><h2 className="text-xl font-extrabold">USDA Market News · price evidence</h2></div>
      <p className="max-w-[790px] text-sm leading-relaxed text-[#607866]">
        Market reports contain commodity quotes, not guaranteed farm-gate revenue. Grades, packages, trade terms,
        dates and locations matter. This area is for scientific review; it does <strong>not</strong> change the farmer's scenarios.
      </p>
      <div className="mt-4 rounded-xl border border-[#f0dfc0] bg-[#fff8ec] p-4 text-sm text-[#815d2b]">
        <Info size={15} className="mr-2 inline" aria-hidden="true"/> Do not compare prices in different units or assume a market quote is your actual selling price. Raw AMS data and uploaded references have not been audited.
      </div>
    </div>

    <div className="rounded-[20px] border border-[#dbe8d8] bg-white p-5 sm:p-6">
      <h3 className="text-base font-extrabold text-forest">Official report lookup (local backend)</h3>
      <p className="mt-2 text-sm text-[#617867]">USDA MyMarketNews offers a free personal API key. Store it only in your backend terminal, never in React or a public .env file.</p>
      <div className="mt-3 text-xs text-[#63806a]">Connection: <strong>{configError ? 'Could not check backend' : !config ? 'Checking…' : ready ? 'Locally configured' : 'Not configured (optional)'}</strong></div>
      {configError && <p role="alert" className="mt-2 text-xs text-[#a56735]">{configError}</p>}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1 text-sm font-bold text-forest">Report slug ID
          <input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="e.g. 2194" maxLength={40}
            className="focus-ring mt-2 block min-h-11 w-full rounded-xl border border-[#d5e4d3] bg-white px-3 text-sm font-normal"/>
        </label>
        <button type="button" disabled={!ready || loading || !/^[A-Za-z0-9_-]{2,40}$/.test(slug.trim())} onClick={loadReport}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={15}/> {loading ? 'Loading…' : 'Load USDA report'}</button>
      </div>
      <a href="https://mymarketnews.ams.usda.gov/public_data" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-agri underline">Find a report and its slug ID <ExternalLink size={13}/></a>
      {lookupError && <p role="alert" className="mt-3 rounded-xl bg-[#fff2e8] p-3 text-sm text-[#9a6033]">{lookupError}</p>}
      {report && <div className="mt-4 space-y-2 rounded-xl bg-[#f2f7ef] p-4" aria-live="polite">
        <p className="text-sm font-bold text-forest">Official report {report.report_slug} · {report.total_rows_received} returned rows</p>
        <p className="text-xs text-[#607866]">Retrieved: {new Date(report.fetched_at).toLocaleString('en-US')} · Preview only (up to 6 records).</p>
        <details><summary className="cursor-pointer text-sm font-bold text-agri">Inspect raw report rows</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs">{JSON.stringify(report.preview, null, 2)}</pre>
        </details>
        <p className="text-xs text-[#617866]">{report.note}</p>
      </div>}
    </div>

    <div className="rounded-[20px] border border-[#dbe8d8] bg-white p-5 sm:p-6">
      <h3 className="text-base font-extrabold text-forest">Import reviewed price references (CSV)</h3>
      <p className="mt-2 text-sm text-[#617866]">Use a reviewed CSV with quotation date, price, unit, market, grade, package, trade basis, USDA report URL and slug. These are <strong>user-declared quotes</strong>, not API-certified values. The CSV stays in your browser session. Older seven-column CSV files still work, but cannot produce an audited trend without the missing commercial details.</p>
      <a className="mt-3 inline-flex text-xs font-bold text-agri underline" href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="field-shift-market-template.csv">Download blank CSV template</a>
      <label className="mt-4 block text-sm font-bold text-forest">Choose CSV (250 KB max)
        <input type="file" accept=".csv,text/csv" onChange={importFile}
          className="focus-ring mt-2 block w-full rounded-xl border border-[#d6e6d3] p-3 text-sm font-normal"/>
      </label>
      {importError && <p role="alert" className="mt-3 rounded-xl bg-[#fff2e8] p-3 text-sm text-[#95582b]">{importError}</p>}
      {!!quotes.length && <div className="mt-4 space-y-3" aria-live="polite">
        <p className="text-sm font-bold text-forest">{quotes.length} user-declared quote(s) in {fileName}</p>
        <p className="text-xs text-[#6b816d]">Groups include commodity, unit, market, grade, package and trade basis when supplied. No conversion to USD/acre or scenario recalculation.</p>
        {selectedHistory && <section className="rounded-[18px] border border-[#dce8da] bg-white p-4 sm:p-5" aria-label="Historical market price explorer">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-forest"><TrendingUp size={19}/><h4 className="font-extrabold">Historical quoted prices</h4></div>
            <label className="text-xs font-bold text-forest">Comparable quote group
              <select value={selectedHistory.id} onChange={e=>setSelectedHistoryId(e.target.value)}
                className="focus-ring ml-2 max-w-[320px] rounded-lg border border-[#d2e2d0] bg-white px-2 py-2 text-xs font-normal">
                {histories.map(h=><option key={h.id} value={h.id}>{h.commodity} · {h.market} · {h.unit}{h.grade ? ` · ${h.grade}` : ' (limited)'}</option>)}
              </select>
            </label>
          </div>
          <p className="text-sm font-bold text-forest">{selectedHistory.commodity} · {selectedHistory.market}</p>
          <p className="mt-1 text-xs text-[#607866]">{selectedHistory.unit}{selectedHistory.grade ? ` · ${selectedHistory.grade} · ${selectedHistory.package} · ${selectedHistory.trade_basis}` : ' · Grade/package/basis not declared'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f2f7ef] p-3">
              <p className="text-xs text-[#657f69]">Latest imported quotation · {selectedHistory.latest.quote_date}</p>
              <p className="mt-1 text-xl font-extrabold text-forest">{selectedHistory.latest.price.toLocaleString('en-US')} <span className="text-xs font-semibold">{selectedHistory.unit}</span></p>
            </div>
            <div className="rounded-xl bg-[#f2f7ef] p-3">
              <p className="text-xs text-[#657f69]">Change from first to latest quotation</p>
              {selectedHistory.canChart
                ? <p className="mt-1 text-xl font-extrabold text-forest">{selectedHistory.change >= 0 ? '+' : ''}{selectedHistory.change.toLocaleString('en-US',{maximumFractionDigits:3})} <span className="text-xs">{selectedHistory.unit} ({selectedHistory.changePct >= 0 ? '+' : ''}{selectedHistory.changePct.toFixed(1)}%)</span></p>
                : <p className="mt-1 text-sm font-semibold text-[#8c6334]">Not comparable yet</p>}
            </div>
          </div>
          {selectedHistory.canChart ? <div className="mt-5" role="img" aria-label={`Line chart of ${selectedHistory.commodity} prices from ${selectedHistory.oldest.quote_date} to ${selectedHistory.latest.quote_date}`}>
            <p className="mb-2 text-xs font-bold text-[#4d6c57]">Reported price by quotation date</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedHistory.points} margin={{top:12,right:18,bottom:12,left:5}}>
                  <CartesianGrid stroke="#e1e9df" strokeDasharray="3 3"/>
                  <XAxis dataKey="date" tick={{fontSize:10}} minTickGap={30}/>
                  <YAxis domain={['auto','auto']} tick={{fontSize:11}} width={65}/>
                  <Tooltip formatter={(v)=>[`${Number(v).toLocaleString('en-US')} ${selectedHistory.unit}`,'Quoted price']}/>
                  <Line type="linear" dataKey="price" stroke="#347B50" strokeWidth={2.5} dot={{r:4}} isAnimationActive={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div> : <p role="status" className="mt-4 rounded-xl border border-[#f0dfc0] bg-[#fff8ec] p-3 text-sm text-[#7a5a2c]">{selectedHistory.warning}</p>}
          <p className="mt-3 text-xs leading-relaxed text-[#617866]">Historical quotations from a user-provided transcription; not an automatic price feed, not farm-gate prices, and not evidence of future revenue. Official report contents must be checked before use.</p>
        </section>}
        {comparisons.map((group,i) => <div key={i} className="rounded-xl bg-[#f2f7ef] p-3">
          <p className="text-sm font-bold text-forest">{group[0].commodity} · {group[0].market} · {group[0].unit}{group[0].grade ? ` · ${group[0].grade} · ${group[0].package} · ${group[0].trade_basis}` : ' · Limited metadata'}</p>
          {group.map((q,j) => <div key={j} className="mt-2 flex flex-wrap justify-between gap-2 border-t border-[#dcebd9] pt-2 text-xs text-[#526f5b]">
            <span>{q.quote_date} · <strong>{q.price.toLocaleString('en-US')}</strong> {q.unit}</span>
            <a href={q.source_url} target="_blank" rel="noreferrer" className="font-bold text-agri underline">USDA report {q.report_slug} <ExternalLink size={12} className="inline"/></a>
          </div>)}
        </div>)}
      </div>}
    </div>
  </section>;
}
