import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { requestSoilPoint } from '../lib/soilApi.js';

const SoilContext = createContext(null);

/** One soil request per field, on demand. Never merges SSURGO into demo diagnoses. */
export function SoilProvider({parcela, children}) {
  const [state,setState] = useState({status:'idle',data:null,error:''});
  const activeRequest = useRef(null);
  useEffect(() => () => activeRequest.current?.abort('navigation'), []);
  const check = useCallback(async () => {
    activeRequest.current?.abort('superseded');
    const controller = new AbortController();
    activeRequest.current = controller;
    setState({status:'loading',data:null,error:''});
    const timeout = setTimeout(() => controller.abort('timeout'), 30000);
    try {
      const data = await requestSoilPoint({lat:parcela.lat,lon:parcela.lon,signal:controller.signal});
      if(!controller.signal.aborted) setState({status:data.status,data,error:''});
    } catch(e) {
      if(!controller.signal.aborted || controller.signal.reason === 'timeout') {
        setState({status:'error',data:null,error:controller.signal.reason==='timeout'?'The soil lookup timed out. Try again later.':e.message});
      }
    } finally {
      clearTimeout(timeout);
    }
  },[parcela.lat,parcela.lon]);
  return <SoilContext.Provider value={{...state,check}}>{children}</SoilContext.Provider>;
}
export function useSoil() {
  const result = useContext(SoilContext);
  if (!result) throw new Error('useSoil must be used within SoilProvider');
  return result;
}
