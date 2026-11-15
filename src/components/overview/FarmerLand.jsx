import { useState } from 'react';
import { ArrowRight, ArrowUpRight, CheckCircle2, Crosshair, Globe2, LocateFixed, MapPin, Search } from 'lucide-react';
import { useField } from '../../context/FieldContext.jsx';
import { useGuidedFlow } from '../../context/GuidedFlowContext.jsx';
import { validateCoordinates } from '../../lib/globalCoordinates.js';
import MapView from '../MapView.jsx';

export default function FarmerLand({ visible }) {
  const { parcelasPiloto, parcela, seleccionarParcela, seleccionarCoordenadas } = useField();
  const { irADatos, confirmarTerreno, terrenoConfirmado } = useGuidedFlow();
  const [method, setMethod] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [error, setError] = useState('');

  const validation = validateCoordinates(lat, lon);

  function selectPilot(id) {
    seleccionarParcela(id);
    confirmarTerreno(false);
    setError('');
  }

  function pick(newLat, newLon) {
    seleccionarCoordenadas(newLat, newLon);
    setLat(newLat.toFixed(4));
    setLon(newLon.toFixed(4));
    confirmarTerreno(false);
    setError('');
  }

  function useCoordinates() {
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    pick(validation.lat, validation.lon);
  }

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setError('Your browser does not support automatic GPS location. Please search your town or tap the map below.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => pick(coords.latitude, coords.longitude),
      () => setError('Location permission was denied. You can search your town by name or tap the map directly.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function handlePlaceSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(q)}`
      );
      const data = await resp.json();
      if (!data || data.length === 0) {
        setSearchResults([]);
        setError('No town or region found with that name. Try another nearby city or tap the map below.');
      } else {
        setSearchResults(data);
      }
    } catch {
      setError('Could not search places right now. You can tap any point on the map below.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="space-y-4" aria-label="Choose your farm location">
      <div className="rounded-[20px] border border-border-soft bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-forest">How would you like to find your farm?</h2>
            <p className="mt-0.5 text-sm text-[#58705d]">
              Search for your town, use your phone/computer GPS, tap the map directly, or try a sample farm.
            </p>
          </div>
          <button
            type="button"
            onClick={useDeviceLocation}
            className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#2f774a] bg-[#eaf5e8] px-3.5 py-2 text-xs font-extrabold text-[#1e6039] hover:bg-[#dcefd9]"
          >
            <LocateFixed size={16} /> Use My Current GPS
          </button>
        </div>

        {/* Pestañas de selección amigables */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Location method">
          {[
            { id: 'search', text: 'Search Town / City', Icon: Search },
            { id: 'map', text: 'Tap on Map', Icon: Crosshair },
            { id: 'pilot', text: 'Sample Farms', Icon: MapPin },
            { id: 'coordinates', text: 'Enter Lat / Lon', Icon: Globe2 },
          ].map(({ id, text, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMethod(id);
                setError('');
              }}
              aria-pressed={method === id}
              className={`focus-ring flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition sm:text-sm ${
                method === id
                  ? 'border-[#347b50] bg-[#eaf4e7] text-forest ring-1 ring-[#a6ceab]'
                  : 'border-[#dee9de] bg-white text-[#58705d] hover:bg-[#f4f8f2]'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{text}</span>
            </button>
          ))}
        </div>

        {/* Opción 1: Buscar por nombre de pueblo o ciudad */}
        {method === 'search' && (
          <div className="mt-4 space-y-3">
            <form onSubmit={handlePlaceSearch} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type your town, county, or valley (e.g., Fresno, Chihuahua, Obregon, Ames)..."
                className="focus-ring min-h-11 flex-1 rounded-xl border border-[#cde0cb] px-4 py-2.5 text-sm text-forest"
              />
              <button
                type="submit"
                disabled={searching}
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white hover:bg-[#275e41] disabled:opacity-50"
              >
                <Search size={16} />
                {searching ? 'Searching...' : 'Find Place'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2" role="region" aria-label="Matching places">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => {
                      pick(Number(item.lat), Number(item.lon));
                      setSearchResults([]);
                    }}
                    className="focus-ring flex items-center justify-between gap-2 rounded-xl border border-[#cfe3cd] bg-[#f6fbf5] px-3.5 py-2.5 text-left text-xs font-bold text-forest hover:bg-[#eaf5e8]"
                  >
                    <span className="line-clamp-2">{item.display_name}</span>
                    <span className="shrink-0 rounded-md bg-forest px-2 py-1 text-[11px] text-white">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Opción 2: Tocar directamente el mapa */}
        {method === 'map' && (
          <div className="mt-4 rounded-xl border border-[#b7d8bc] bg-[#eff7eb] p-3.5 text-sm font-semibold text-[#235d3a]">
            Tap anywhere on the interactive map below to place the pin on your land.
          </div>
        )}

        {/* Opción 3: Campos de muestra */}
        {method === 'pilot' && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-[#5d7563]">Pick a pre-loaded California farm to see how Field Shift works:</p>
            <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Sample pilot farms">
              {parcelasPiloto.map((p) => {
                const active = parcela.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectPilot(p.id)}
                    className={`focus-ring flex min-h-14 items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-bold ${
                      active ? 'border-[#428454] bg-[#eaf4e7] text-forest' : 'border-border-soft text-[#597160] hover:bg-[#f6faf5]'
                    }`}
                  >
                    <span>{p.ciudad}</span>
                    {active && <CheckCircle2 size={19} className="text-[#2f774a]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Opción 4: Coordenadas manuales */}
        {method === 'coordinates' && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-forest">
                Latitude <span className="block text-xs font-normal text-[#6a806e]">−90 to 90</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="36.6000"
                  className="focus-ring mt-1.5 w-full rounded-xl border border-[#dce8d9] px-4 py-2.5 text-base"
                />
              </label>
              <label className="text-sm font-bold text-forest">
                Longitude <span className="block text-xs font-normal text-[#6a806e]">−180 to 180</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="-120.1000"
                  className="focus-ring mt-1.5 w-full rounded-xl border border-[#dce8d9] px-4 py-2.5 text-base"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={useCoordinates}
              disabled={!validation.valid}
              className="focus-ring min-h-11 rounded-xl bg-forest px-5 text-sm font-bold text-white disabled:opacity-40"
            >
              Set This Location
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[#fff5e6] p-3 text-xs font-semibold text-[#946531]">
            {error}
          </p>
        )}
      </div>

      {/* El mapa siempre permite hacer clic directamente para elegir el punto */}
      <MapView instance="farmer" simple visible={visible} pickOnMap={true} onPickLocation={pick} />

      {/* Barra de confirmación clara */}
      <div className="rounded-[20px] border border-[#b7d8bc] bg-[#f3faf2] p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#2a7950]">
              {terrenoConfirmado ? '✓ Farm Location Selected' : 'Current Pin on Map'}
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-forest">
              {parcela.origen === 'custom'
                ? `Farm at ${parcela.lat.toFixed(4)}°, ${parcela.lon.toFixed(4)}°`
                : `${parcela.nombre} (${parcela.ciudad})`}
            </p>
            <p className="mt-0.5 text-xs text-[#4b6a53]">
              Click the button on the right to confirm this farm and check your local weather &amp; crop options.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => confirmarTerreno(true)}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-[#275e41]"
            >
              Confirm This Farm &amp; See Weather <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => irADatos(parcela.origen === 'custom' ? 'nasa' : 'terreno')}
              className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-xl border border-[#c8dec6] bg-white px-3.5 py-2 text-xs font-bold text-[#326c47] hover:bg-[#eaf4e7]"
            >
              More Information <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}