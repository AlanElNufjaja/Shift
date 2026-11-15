import { createContext, useContext, useMemo, useReducer } from 'react';
import parcelasDemo from '../data/parcelas.json';
import { makeCustomField } from '../lib/globalCoordinates.js';

const FieldContext = createContext(null);
const prioridades = ['agua', 'suelo', 'rentabilidad', 'erosion'];
const initialState = {
  parcelaId: parcelasDemo[0]?.id ?? null,
  customParcel: null,
  prioridad: 'agua',
  evidenciasP1: {},
  archivoP1: '',
  resultadosP2: {},
  archivoP2: '',
};

function fieldReducer(state, action) {
  switch (action.type) {
    case 'SELECCIONAR_PARCELA':
      return [...parcelasDemo, ...(state.customParcel ? [state.customParcel] : [])].some((item) => item.id === action.id)
        ? { ...state, parcelaId: action.id }
        : state;
    case 'SELECCIONAR_COORDENADAS':
      return { ...state, customParcel: makeCustomField(action.lat, action.lon), parcelaId: 'custom-coord' };
    case 'SELECCIONAR_PRIORIDAD':
      return prioridades.includes(action.prioridad)
        ? { ...state, prioridad: action.prioridad }
        : state;
    case 'ACTIVAR_EVIDENCIAS_P1':
      // Se activa un lote previamente validado. No modifica el JSON demo, ni
      // las coordenadas del mapa, ni la salida del motor de estrategias.
      return { ...state, evidenciasP1: action.porParcela, archivoP1: action.nombre };
    case 'ACTIVAR_RECOMENDACIONES_P2':
      return { ...state, resultadosP2: action.porClave, archivoP2: action.nombre };
    case 'DESCARTAR_RECOMENDACIONES_P2':
      return { ...state, resultadosP2: {}, archivoP2: '' };
    case 'DESCARTAR_EVIDENCIAS_P1':
      return { ...state, evidenciasP1: {}, archivoP1: '' };
    default:
      return state;
  }
}

export function FieldProvider({ children }) {
  const [state, dispatch] = useReducer(fieldReducer, initialState);
  const parcelas = useMemo(() => state.customParcel ? [...parcelasDemo, state.customParcel] : parcelasDemo, [state.customParcel]);
  const parcela = parcelas.find((item) => item.id === state.parcelaId) ?? parcelasDemo[0];
  const context = useMemo(() => ({
    parcelas,
    parcelasPiloto: parcelasDemo,
    seleccionarCoordenadas: (lat, lon) => dispatch({ type: 'SELECCIONAR_COORDENADAS', lat, lon }),
    parcela,
    prioridad: state.prioridad,
    evidenciasP1: state.evidenciasP1,
    evidenciaParcela: state.evidenciasP1[parcela?.id] ?? null,
    archivoP1: state.archivoP1,
    resultadosP2: state.resultadosP2,
    archivoP2: state.archivoP2,
    activarRecomendacionesP2: (porClave, nombre) => dispatch({ type: 'ACTIVAR_RECOMENDACIONES_P2', porClave, nombre }),
    descartarRecomendacionesP2: () => dispatch({ type: 'DESCARTAR_RECOMENDACIONES_P2' }),
    seleccionarParcela: (id) => dispatch({ type: 'SELECCIONAR_PARCELA', id }),
    seleccionarPrioridad: (prioridad) => dispatch({ type: 'SELECCIONAR_PRIORIDAD', prioridad }),
    activarEvidenciasP1: (porParcela, nombre) => dispatch({ type: 'ACTIVAR_EVIDENCIAS_P1', porParcela, nombre }),
    descartarEvidenciasP1: () => dispatch({ type: 'DESCARTAR_EVIDENCIAS_P1' }),
  }), [parcela, state.customParcel, state.prioridad, state.evidenciasP1, state.archivoP1, state.resultadosP2, state.archivoP2]);
  return <FieldContext.Provider value={context}>{children}</FieldContext.Provider>;
}

export function useField() {
  const value = useContext(FieldContext);
  if (!value) throw new Error('useField requiere FieldProvider');
  return value;
}
