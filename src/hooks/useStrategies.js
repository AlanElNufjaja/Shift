import { useEffect, useState } from 'react';
import estrategiasDemo from '../data/estrategias_demo.json';
import { useField } from '../context/FieldContext.jsx';
import { validarRespuestaP2 } from '../lib/recommendationIntake.js';

const BASE_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '') || '';

/**
 * Prioridad de fuentes: archivo P2 activado explícitamente > API P2 > demo.
 * El endpoint histórico recibe SOLO { parcela_id, prioridad }; no se envían
 * archivos de P1 ni datos personales a un servidor sin consentimiento.
 * Un resultado del backend NO equivale a recomendación auditada.
 */
export function useStrategies(parcelaId, prioridad) {
  const { resultadosP2 } = useField();
  const clave = `${parcelaId}:${prioridad}`;
  const activado = resultadosP2[clave] ?? null;
  const locales = estrategiasDemo[parcelaId] ?? [];
  const [remoto, setRemoto] = useState({ clave: null, estrategias: [], fuente: 'demo',
    cargando: false, error: '', generacion: null, avisos: [] });

  useEffect(() => {
    if (parcelaId === 'custom-coord' || activado || !BASE_URL) return undefined;
    const controller = new AbortController();
    let expiro = false;
    const temporizador = setTimeout(() => { expiro = true; controller.abort(); }, 12000);
    setRemoto({ clave, estrategias: [], fuente: 'demo', cargando: true, error: '', generacion: null, avisos: [] });
    (async () => {
      try {
        const respuesta = await fetch(`${BASE_URL}/recomendar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parcela_id: parcelaId, prioridad }), signal: controller.signal,
        });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();
        const verificada = validarRespuestaP2(datos);
        if (!verificada.valido) throw new Error(`Respuesta incompatible: ${verificada.errores.join('; ')}`);
        if (!controller.signal.aborted) setRemoto({ clave, estrategias: verificada.estrategias,
          fuente: 'backend', cargando: false, error: '', generacion: verificada.generacion,
          avisos: verificada.avisos });
      } catch (err) {
        if (expiro || !controller.signal.aborted) setRemoto({ clave, estrategias: [], fuente: 'demo',
          cargando: false, generacion: null, avisos: [],
          error: expiro ? 'P2 engine took over 12 seconds. Showing demo strategies.' : `Could not use P2 (${err.message}). Showing demo strategies.` });
      } finally { clearTimeout(temporizador); }
    })();
    return () => { clearTimeout(temporizador); controller.abort(); };
  }, [clave, activado, parcelaId, prioridad]);

  // No California demo or P2 scenario may be attributed to arbitrary coordinates.
  if (parcelaId === 'custom-coord') return { estrategias: [], fuente: 'global-unavailable', cargando: false, error: '', generacion: null, avisos: [], modoEjemplo: false };
  if (activado) return { estrategias: activado.estrategias, fuente: 'p2-importado',
    cargando: false, error: '', generacion: activado.generacion, avisos: [], modoEjemplo: activado.modoEjemplo };
  if (!BASE_URL) return { estrategias: locales, fuente: 'demo', cargando: false,
    error: '', generacion: null, avisos: [], modoEjemplo: true };
  // Evita incluso un fotograma con resultados P2 de otra parcela/prioridad.
  if (remoto.clave !== clave) return { estrategias: locales, fuente: 'demo',
    cargando: true, error: '', generacion: null, avisos: [], modoEjemplo: true };
  return { ...remoto, estrategias: remoto.fuente === 'backend' ? remoto.estrategias : locales,
    modoEjemplo: remoto.fuente !== 'backend' };
}
