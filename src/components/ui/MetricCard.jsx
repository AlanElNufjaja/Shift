const tonos = {
  agua: { icono: 'bg-[#e8f3fb] text-[#397eae]', valor: 'text-[#245474]' },
  calor: { icono: 'bg-[#fff0e1] text-[#bb7740]', valor: 'text-[#764b2f]' },
  suelo: { icono: 'bg-[#e9f3e6] text-[#347b50]', valor: 'text-forest' },
};

/** Tarjeta resumida: los valores siempre llegan ya formateados desde el dominio. */
export default function MetricCard({ icono: Icono, etiqueta, valor, descripcion, fuente, tono = 'suelo' }) {
  const estilos = tonos[tono] ?? tonos.suelo;
  return (
    <article className="panel flex min-w-0 items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl sm:size-12 ${estilos.icono}`}>
        <Icono size={23} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <h3 className="text-[11px] font-semibold text-[#637b68] sm:text-xs">{etiqueta}</h3>
          <span className="text-[9px] font-bold tracking-wide text-[#799281]">{fuente}</span>
        </div>
        <p className={`mt-0.5 text-[21px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[24px] ${estilos.valor}`}>{valor}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-[#849587] sm:text-[11px]">{descripcion}</p>
      </div>
    </article>
  );
}
