import { useEffect, useMemo, useState } from 'react';
import { Archive, ChartNoAxesCombined, Database, MapPin, ShieldAlert, Sprout } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useField } from '../../context/FieldContext.jsx';
import { teamYearDetails, TEAM_HISTORY_YEARS } from '../../lib/teamPilotAdapter.js';
import { useTeamPilotArchive } from '../../hooks/useTeamPilotArchive.js';
import TeamModelEvidence from './TeamModelEvidence.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const OVERLAY_SITE = {
  'fresno-01': 'fresno', 'bakersfield-02': 'bakersfield', 'davis-03': 'davis',
};
const format = (value, decimals = 1) => value === null || value === undefined
  ? 'Not available' : new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);

/**
 * Auditable, read-only team-history workspace.
 * Deliberately separate from demo diagnostic flags and P2 recommendations.
 */
export default function TeamPilotPanel() {
  const { parcela } = useField();
  const dataset = useTeamPilotArchive();
  const [year, setYear] = useState(2024);
  useEffect(() => { setYear(2024); }, [parcela.id]);

  const current = dataset.byId[parcela.id];
  const view = useMemo(() => teamYearDetails(current, year), [current, year]);
  const chartRows = useMemo(() => view?.months.map((row, i) => ({
    label: MONTHS[i], wetness: row.wetnessPct, temperature: row.tempMaxC,
  })) ?? [], [view]);
  const siteSlug = OVERLAY_SITE[parcela.id];

  return <section className="panel space-y-5 p-4 sm:p-6" aria-label="Team historical dataset">
    <header className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-forest"><Archive size={21} className="text-agri"/> Team history · 2015–2024</h2>
        <span className="rounded-full bg-[#fff5e4] px-3 py-1 text-xs font-bold text-[#956625]">Team-supplied · Not audited</span>
      </div>
      <p className="text-sm leading-relaxed text-[#63806d]">Explore historical records for the California pilot fields. These values do not replace the fictional diagnostic or automatically change the three strategy scenarios.</p>
    </header>

    {dataset.status === 'loading' && <p role="status" className="text-sm">Loading the team history…</p>}
    {dataset.status === 'error' && <p role="alert" className="rounded-xl bg-[#fff4e4] p-3 text-sm text-[#885e2d]">Could not load the team archive: {dataset.error}</p>}
    {dataset.status === 'ready' && !current && <p className="rounded-xl border border-[#eadcbf] bg-[#fff9eb] p-4 text-sm text-[#805c2b]">The team archive covers only Fresno, Bakersfield and Davis, at their team-provided coordinates. No regional history or model score is available for this global point.</p>}

    {current && view && <>
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#dfebdd] bg-[#f3f8f1] p-3 sm:p-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#62806b]">Team pilot location</p>
          <p className="flex items-center gap-1 text-sm font-bold text-forest"><MapPin size={15} className="shrink-0"/> {current.coordinates.lat.toFixed(4)}, {current.coordinates.lon.toFixed(4)}</p>
          <p className="text-xs text-[#63806d]">The team archive point differs from the illustrative map pin. Records are never joined by proximity.</p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold text-forest" htmlFor="team-history-year">
          Historical year
          <select id="team-history-year" value={year} onChange={event => setYear(Number(event.target.value))} className="focus-ring min-h-11 rounded-xl border border-[#bfd6c1] bg-white px-4 text-sm font-semibold text-forest">
            {TEAM_HISTORY_YEARS.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
        <TeamMetric label="Main crop" value={view.annual.crop} sub="Team annual record"/>
        <TeamMetric label="Mean wetness indicator" value={view.annual.averageMoisturePct === null ? '—' : `${format(view.annual.averageMoisturePct)} %`} sub="Not validated as SMAP"/>
        <TeamMetric label="Highest monthly T max" value={view.annual.maxTemperatureC === null ? '—' : `${format(view.annual.maxTemperatureC)} °C`} sub="Team climate series"/>
        <TeamMetric label="Team model score" value={view.annual.modelScore === null ? '—' : format(view.annual.modelScore, 2)} sub="Scale and method unverified"/>
      </div>

      <div className="space-y-3 rounded-xl border border-[#dfebdd] p-3 sm:p-4">
        <div className="flex items-center gap-2"><ChartNoAxesCombined size={18} className="text-[#367e50]"/><h3 className="text-base font-extrabold text-forest">Monthly conditions · {view.year}</h3></div>
        <p className="text-xs leading-relaxed text-[#63806d]">Two independent axes: the team's wetness indicator (%) and reported monthly maximum temperature (°C). Do not interpret this indicator as a verified SMAP retrieval or root-zone water.</p>
        <div className="h-[275px] w-full" role="img" aria-label={`Monthly team wetness and temperature comparison for ${parcela.ciudad ?? 'selected pilot'}, ${view.year}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#e5eee3" strokeDasharray="3 4"/>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#526b57' }}/>
              <YAxis yAxisId="wet" orientation="left" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%"/>
              <YAxis yAxisId="temp" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit="°"/>
              <Tooltip formatter={(value, name) => [typeof value === 'number' ? format(value) : 'Unavailable', name]} />
              <Legend wrapperStyle={{ fontSize: '12px' }}/>
              <Line type="monotone" dataKey="wetness" name="Wetness indicator (%)" yAxisId="wet" stroke="#347b50" strokeWidth={3} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="temperature" name="Maximum temperature (°C)" yAxisId="temp" stroke="#c78542" strokeWidth={3} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <details className="rounded-xl border border-[#dfebdd] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-forest">View all 10 years of crop history</summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {current.annual.map(row => <div key={row.year} className={`rounded-xl border p-3 ${row.year === year ? 'border-[#7fb28a] bg-[#eff7eb]' : 'border-[#e0eadc]'}`}>
            <p className="text-xs font-bold text-[#62806b]">{row.year}</p>
            <p className="text-sm font-bold text-forest">{row.crop}</p>
            <p className="mt-1 text-[11px] text-[#718774]">{row.cropCondition}</p>
          </div>)}
        </div>
      </details>

      <TeamModelEvidence site={current}/>

      {siteSlug && <details className="rounded-xl border border-[#dfebdd] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-forest">View team-supplied illustrative images</summary>
        <p className="mt-2 text-xs leading-relaxed text-[#63806d]">These PNGs have no verified geographic transform or satellite-product provenance. They are illustrative textures, not spatially located data layers.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[['score','Model score texture'],['smap','Wetness texture (unverified)'],['ssurgo','Soil texture (unverified)']].map(([suffix, title]) =>
            <figure key={suffix} className="overflow-hidden rounded-xl border border-[#dfe9dc] bg-white">
              <img loading="lazy" alt={`Illustrative ${title.toLowerCase()} for ${siteSlug}`} className="h-28 w-full object-cover" src={`/data/overlay_${suffix}_${siteSlug}.png`}/>
              <figcaption className="p-2 text-xs font-medium text-[#5f7765]">{title}</figcaption>
            </figure>)}
        </div>
      </details>}

      <p className="flex items-start gap-2 rounded-xl bg-[#fff8e9] p-3 text-xs leading-relaxed text-[#805d31]"><ShieldAlert size={18} className="shrink-0"/>{current.notice} Neither 2015–2024 history nor the model output is applied to the global-coordinate climate explorer or to the legacy scenario simulator.</p>
      <p className="flex items-start gap-2 text-xs text-[#648071]"><Database size={15} className="shrink-0"/>Source file: team-pilot-2015-2024.json · Team-provided REAL archive · No independent validation performed.</p>
    </>}
  </section>;
}

function TeamMetric({ label, value, sub }) {
  return <div className="rounded-xl border border-[#dfebdd] bg-white p-4">
    <p className="text-xs font-medium text-[#6b816d]">{label}</p>
    <p className="mt-1 break-words text-lg font-extrabold leading-tight text-forest">{value}</p>
    <p className="mt-1 text-[11px] text-[#728775]">{sub}</p>
  </div>;
}
