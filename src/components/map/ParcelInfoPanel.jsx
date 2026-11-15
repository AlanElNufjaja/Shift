import { displayMonth, displayTerm } from '../../lib/displayEnglish.js';
import { CAPAS, datoGeografico } from '../../lib/geoLayers.js';
import { ArrowRight, Droplets, FlaskConical, Layers3, MapPin, Mountain, Sprout } from 'lucide-react';
import { formatoNumero, numeroSeguro } from '../../lib/diagnostics.js';
import { useField } from '../../context/FieldContext.jsx';

const sinDato = (valor) => valor === null || valor === undefined || valor === '' ? 'No data' : String(valor);

function Propiedad({ Icono, titulo, valor, tono = 'verde' }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl border border-[#e9f0e6] bg-[#f8faf6] p-3">
      <span className={`flex size-8 items-center justify-center rounded-lg ${tono === 'ambar' ? 'bg-[#fff1df] text-[#a87331]' : tono === 'azul' ? 'bg-[#e5f1f8] text-[#3a7ba2]' : 'bg-[#e9f2e6] text-[#347b50]'}`}>
        <Icono size={17} aria-hidden="true" />
      </span>
      <span className="text-[10px] font-medium text-[#718676]">{titulo}</span>
      <strong className="break-words text-[12px] font-extrabold leading-tight text-forest">{valor}</strong>
    </div>
  );
}

/** Ficha permanente, no es un popup ni almacena selección propia. */
export default function ParcelInfoPanel({ parcela, capa = 'general', mes = 'Julio' }) {
  const { evidenciaParcela } = useField();
  const sueloP1 = evidenciaParcela?.ssurgo;
  const suelo = sueloP1 ? sueloP1.suelo : parcela?.suelo_ssurgo ?? {};
  const capaElegida = CAPAS.find((item) => item.id === capa) ?? CAPAS[0];
  const datoElegido = datoGeografico(parcela, capa, mes);
  const materia = numeroSeguro(suelo.materia_organica_pct);
  const coordenadas = Number.isFinite(parcela?.lat) && Number.isFinite(parcela?.lon)
    ? `${parcela.lat.toFixed(4)}, ${parcela.lon.toFixed(4)}` : 'No data';
  return (
    <aside className="panel flex h-full min-w-0 flex-col p-4 sm:p-5" aria-labelledby="parcel-info-title" aria-live="polite" aria-atomic="true">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Field information</p>
          <h3 id="parcel-info-title" className="text-[17px] font-extrabold leading-tight tracking-[-0.035em] text-forest">{parcela?.nombre ?? 'No field selected'}</h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-[#778e7d]"><MapPin size={13} aria-hidden="true" />{parcela?.origen === 'custom' ? 'Custom coordinates · Worldwide' : `${parcela?.ciudad ?? 'Central Valley'}, California`}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e7f2e3] text-[#347b50]"><Sprout size={19} aria-hidden="true" /></span>
      </div>
      <div className="mb-3 rounded-xl border border-[#e8eee6] px-3 py-2.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8a9d8c]">Map coordinates (point location)</span>
        <span className="mt-0.5 block font-mono text-[11px] font-semibold text-[#47634f]">{coordenadas}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Propiedad Icono={Layers3} titulo="Texture" valor={displayTerm(suelo.textura)} />
        <Propiedad Icono={Droplets} titulo="Water retention" valor={displayTerm(suelo.retencion_agua)} tono="azul" />
        <Propiedad Icono={Mountain} titulo="Erosion risk" valor={displayTerm(suelo.riesgo_erosion)} tono="ambar" />
        <Propiedad Icono={Sprout} titulo="Organic matter" valor={materia === null ? 'No data' : `${formatoNumero(materia, 1)} %`} />
      </div>
      {capa !== 'general' && (
        <div className="mt-3 rounded-xl border border-[#dfeadf] bg-[#f5faf3] p-3" aria-live="polite">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6d9076]">Selected layer reading</p>
          <p className="mt-1 text-[12px] font-bold text-forest">{capaElegida.label}{capaElegida.temporal ? ` · ${displayMonth(mes)}` : ''}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded-full border border-white shadow-sm" style={{ background: datoElegido.color }} aria-hidden="true" />
            <strong className="text-lg font-extrabold text-forest">{datoElegido.etiqueta}</strong>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#66806c]">{datoElegido.detalle ?? 'No indicator data for this location and month.'}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-[#7C937E]">{capaElegida.fuente}. Example data without field validation.</p>
        </div>
      )}
      <div className="mt-3 rounded-xl bg-[#fff6e9] px-3 py-2.5 text-[10px] leading-[1.5] text-[#8d672f]">
        <div className="flex items-center gap-1.5 font-extrabold"><FlaskConical size={13} aria-hidden="true" /> {parcela?.origen === 'custom' ? 'No soil source connected for this location' : sueloP1 ? (evidenciaParcela.modoEjemplo ? "FICTIONAL soil sample" : "P1 soil, declared · not audited") : "Demo soil"}</div>
        <p className="mt-0.5">{parcela?.origen === 'custom' ? 'Only climate data are available for global coordinates in this release.' : sueloP1 ? "Demo map coordinates; imported soil properties have not been field-validated." : "Illustrative coordinates and properties; require field verification."}</p>
      </div>
      <a href="#detalle-diagnostico" className="focus-ring mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-forest px-3 py-2 text-center text-[11px] font-bold text-white transition-colors hover:bg-[#255d3f]">
        View full assessment <ArrowRight size={15} aria-hidden="true" />
      </a>
    </aside>
  );
}
