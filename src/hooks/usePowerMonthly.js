import { useCallback, useEffect, useRef, useState } from 'react';
import { requestPowerMonthly } from '../lib/powerApi.js';

/** Evita repetir solicitudes por parcela/año durante la misma sesión de la SPA. */
const cache = new Map();
const BASE = import.meta.env.VITE_POWER_API_BASE?.trim() || '/nasa-power';

export function usePowerMonthly(parcela, year) {
  const [estado, setEstado] = useState({ status: 'idle', datos: null, mensaje: '', consultedAt: null, key: null });
  const currentKey = `${parcela?.lat}:${parcela?.lon}:${year}`;
  const requestRef = useRef(null);

  useEffect(() => {
    // Si cambia la ubicación o el año, no se pueden presentar valores anteriores como actuales.
    requestRef.current?.abort();
    setEstado({ status: 'idle', datos: null, mensaje: '', consultedAt: null, key: null });
    return () => requestRef.current?.abort();
  }, [parcela?.id, year]);

  const consultar = useCallback(async ({ refresh = false } = {}) => {
    const lat = parcela?.lat;
    const lon = parcela?.lon;
    const key = `${lat}:${lon}:${year}`;
    if (!refresh && cache.has(key)) {
      setEstado({ ...cache.get(key), mensaje: 'Response retrieved from this session’s cache.' });
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setEstado({ status: 'loading', datos: null, mensaje: '', consultedAt: null, key });
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 14000);
    try {
      const datos = await requestPowerMonthly({ lat, lon, year, signal: controller.signal, base: BASE });
      if (!controller.signal.aborted) {
        const result = { status: 'success', datos, consultedAt: new Date().toISOString(), mensaje: '', key };
        cache.set(key, result);
        setEstado(result);
      }
    } catch (err) {
      if (timedOut) {
        setEstado({ status: 'error', datos: null, consultedAt: null, mensaje: 'NASA POWER timed out. The rest of the dashboard remains available in demo mode.', key });
      } else if (!controller.signal.aborted) {
        setEstado({ status: 'error', datos: null, consultedAt: null, mensaje: `Could not query NASA POWER: ${err.message}. Demo data remain unchanged.`, key });
      }
    } finally {
      clearTimeout(timeout);
    }
  }, [parcela?.lat, parcela?.lon, year]);

  // No exponer ni un solo render del año anterior si cambia el selector.
  return { ...(estado.key === currentKey ? estado : { status: 'idle', datos: null, mensaje: '', consultedAt: null }), consultar };
}
