import { useState } from 'react';
import { CloudSun, Cpu, Info, RefreshCw, ThermometerSun, CloudRain } from 'lucide-react';
import { useGlobalField } from '../../hooks/useGlobalField.js';

export default function GlobalClimateSummary({ parcel }) {
  const [year, setYear] = useState(2024);
  const result = useGlobalField(parcel, year);
  const climate = result.data?.climate;
  const validT = climate?.months?.filter(m => m.temperature_max_c !== null) ?? [];
  const hottest = validT.length ? Math.max(...validT.map(m => m.temperature_max_c)) : null;
  const nRain = climate?.available_precipitation_months ?? 0;

  return (
    <section className="mx-auto max-w-[820px] space-y-4" aria-label="Global field climate">
      <div className="rounded-[20px] border border-[#d7e7d2] bg-[#edf5e9] p-5 sm:p-6">
        <p className="text-sm font-bold text-[#376d48]">
          Global location · {parcel.lat.toFixed(4)}, {parcel.lon.toFixed(4)}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-forest">Climate overview for {year}</h2>
        <p className="mt-2 text-sm text-[#56725c]">
          NASA POWER provides historical monthly regional estimates, not instantaneous field weather.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Climate year">
          {[2023, 2024, 2025].map(y => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              aria-pressed={year === y}
              className={`focus-ring min-h-10 rounded-lg border px-4 text-sm font-bold ${
                year === y ? 'border-forest bg-forest text-white' : 'border-[#cadfc8] bg-white text-forest'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {result.status === 'loading' && (
        <p role="status" className="rounded-xl bg-white p-5 text-sm">
          Checking NASA POWER through the local climate service…
        </p>
      )}

      {result.status === 'error' && (
        <div role="alert" className="rounded-xl border border-[#ebd9b5] bg-[#fff7e9] p-5 text-sm text-[#82602e]">
          <p className="font-semibold">Climate service is not available. No values were invented.</p>
          <p className="mt-1">
            {result.error} · Start the Python backend, or use Data &amp; details → NASA POWER to make a direct request.
          </p>
          <button
            type="button"
            onClick={result.refresh}
            className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 font-bold"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {result.status === 'success' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-white p-5">
              <ThermometerSun size={24} className="text-[#c58c42]" />
              <p className="mt-3 text-sm text-[#688073]">Highest monthly maximum-temperature estimate</p>
              <strong className="text-2xl text-forest">
                {hottest === null ? 'Not available' : `${hottest.toFixed(1)} °C`}
              </strong>
              <p className="text-xs text-[#688073]">{climate.available_temperature_months}/12 months available</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <CloudRain size={24} className="text-[#3d86a5]" />
              <p className="mt-3 text-sm text-[#688073]">Precipitation data</p>
              <strong className="text-2xl text-forest">{nRain}/12 months</strong>
              <p className="text-xs text-[#688073]">Values in mm/day · monthly average rate, not total rainfall</p>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="flex items-center gap-2 font-bold text-forest">
              <CloudSun size={18} /> Monthly records · {year}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {climate.months.map(m => (
                <div key={m.date} className="rounded-lg bg-[#f3f8f1] p-2 text-center">
                  <p className="text-xs font-semibold text-[#618069]">
                    {new Date(`${m.date}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
                  </p>
                  <p className="text-sm font-bold text-forest">
                    {m.temperature_max_c === null ? '—' : `${m.temperature_max_c.toFixed(1)}°`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-[#b7d8bc] bg-[#f2f9f1] p-4 text-sm text-[#1e6039]">
        <p className="flex items-center gap-2 font-bold">
          <Cpu size={18} className="text-[#2a7950]" /> CosoNASA Fuzzy Inference Ready
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#37734d]">
          NASA POWER climate observations are connected for these coordinates. Proceed to <strong>My Options</strong> (Step 3) to run the live CosoNASA Mamdani model and compare 3 rotation strategies with optional local soil data.
        </p>
      </div>

      <p className="flex items-center gap-2 text-xs text-[#688073]">
        <Info size={15} /> Sources: NASA POWER monthly climate; USDA SSURGO / USGS NWIS in U.S. or local farmer soil input globally.
      </p>
    </section>
  );
}