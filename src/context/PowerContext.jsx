import { createContext, useContext, useMemo, useState } from 'react';
import { usePowerMonthly } from '../hooks/usePowerMonthly.js';

const PowerContext = createContext(null);

/**
 * Única consulta NASA POWER compartida por Datos, Resumen y Diagnóstico.
 * El proveedor se monta con key={parcela.id}: una parcela nueva no puede
 * heredar, ni siquiera durante un render, la serie de la parcela anterior.
 * El usuario debe solicitar explícitamente la consulta (no hay auto-fetch).
 */
export function PowerProvider({ parcela, children }) {
  const [year, setYear] = useState(2025);
  const power = usePowerMonthly(parcela, year);
  const value = useMemo(() => ({ ...power, year, setYear, parcelaId: parcela.id }), [power, year, parcela.id]);
  return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
}

export function usePower() {
  const value = useContext(PowerContext);
  if (!value) throw new Error('usePower requiere PowerProvider');
  return value;
}
