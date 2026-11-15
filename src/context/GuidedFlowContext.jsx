import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { limitarPaso, resolverAncla } from '../lib/flowNavigation.js';

const GuidedFlowContext = createContext(null);

/** Navegación centrada en el agricultor con validación de ubicación antes de avanzar. */
export function GuidedFlowProvider({ children }) {
  const [terrenoConfirmado, setTerrenoConfirmado] = useState(false);
  const [avisoPaso, setAvisoPaso] = useState('');

  const [ubicacion, setUbicacion] = useState(() => {
    const ruta = typeof window === 'undefined' ? null : resolverAncla(window.location.hash);
    return ruta?.vista === 'laboratorio'
      ? { vista: 'laboratorio', paso: 0, tab: ruta.tab }
      : { vista: 'recorrido', paso: 0, tab: 'nasa' };
  });
  const [destino, setDestino] = useState(null);

  const navegar = useCallback((ancla, { registrar = true, forzarConfirmacion = false } = {}) => {
    const ruta = resolverAncla(ancla);
    if (!ruta) return false;

    const yaConfirmado = terrenoConfirmado || forzarConfirmacion;

    // Bloquear salto a Paso 2 o Paso 3 si aún no ha seleccionado/confirmado su ubicación
    if (ruta.vista === 'recorrido' && ruta.paso > 0 && !yaConfirmado) {
      setAvisoPaso('Please select or confirm your farm location in Step 1 before continuing.');
      setUbicacion((actual) => ({ ...actual, vista: 'recorrido', paso: 0 }));
      return false;
    }

    setAvisoPaso('');
    setUbicacion((actual) => ({
      vista: ruta.vista,
      paso: ruta.vista === 'recorrido' ? ruta.paso : actual.paso,
      tab: ruta.vista === 'laboratorio' ? ruta.tab : actual.tab,
    }));
    setDestino(ruta.ancla);
    if (registrar && typeof window !== 'undefined' && window.location.hash !== `#${ruta.ancla}`) {
      window.history.pushState(null, '', `#${ruta.ancla}`);
    }
    return true;
  }, [terrenoConfirmado]);

  const confirmarTerreno = useCallback((irAlPaso2 = false) => {
    setTerrenoConfirmado(true);
    setAvisoPaso('');
    if (irAlPaso2) {
      navegar('etapa-2', { forzarConfirmacion: true });
    }
  }, [navegar]);

  const irAPaso = useCallback((paso, opciones = {}) => {
    return navegar(`etapa-${limitarPaso(paso) + 1}`, opciones);
  }, [navegar]);

  const irADatos = useCallback((tab = 'nasa') => {
    const anclas = {
      terreno: 'detalle-terreno',
      diagnostico: 'detalle-diagnostico',
      estrategias: 'detalle-estrategias',
      nasa: 'datos',
      smap: 'detalle-smap',
      p1: 'integracion',
      p2: 'motor-p2',
      market: 'detalle-market',
    };
    return navegar(anclas[tab] ?? 'datos');
  }, [navegar]);

  useEffect(() => {
    const sincronizar = () => {
      if (resolverAncla(window.location.hash)) navegar(window.location.hash, { registrar: false });
    };
    window.addEventListener('popstate', sincronizar);
    window.addEventListener('hashchange', sincronizar);
    return () => {
      window.removeEventListener('popstate', sincronizar);
      window.removeEventListener('hashchange', sincronizar);
    };
  }, [navegar]);

  useEffect(() => {
    if (!destino) return undefined;
    const fotograma = window.requestAnimationFrame(() => {
      const objetivo = document.getElementById(destino);
      const cabecera = document.getElementById(ubicacion.vista === 'laboratorio' ? 'advanced-heading' : 'journey-heading');
      (objetivo ?? cabecera)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
      cabecera?.focus({ preventScroll: true });
      setDestino(null);
    });
    return () => window.cancelAnimationFrame(fotograma);
  }, [destino, ubicacion]);

  return (
    <GuidedFlowContext.Provider
      value={{
        ...ubicacion,
        terrenoConfirmado,
        confirmarTerreno,
        avisoPaso,
        setAvisoPaso,
        navegar,
        irAPaso,
        irADatos,
      }}
    >
      {children}
    </GuidedFlowContext.Provider>
  );
}

export function useGuidedFlow() {
  const valor = useContext(GuidedFlowContext);
  if (!valor) throw new Error('useGuidedFlow must be used inside GuidedFlowProvider');
  return valor;
}