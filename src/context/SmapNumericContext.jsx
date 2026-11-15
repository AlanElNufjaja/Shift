import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { requestSmapNumerical } from '../lib/smapNumericApi.js';
const SmapNumericContext = createContext(null);

/** Separately queried satellite/model percentile, never mixed into demo risk rules. */
export function SmapNumericProvider({field, children}) {
  const [year, setYearInternal] = useState(2024);
  const [state, setState] = useState({status:'idle', data:null, error:''});
  const [uploaded, setUploaded] = useState(null);
  const controllerRef = useRef(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  function setYear(next) {
    controllerRef.current?.abort();
    setYearInternal(next);
    setState({status:'idle',data:null,error:''});
    setUploaded(null);
  }
  async function query() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({status:'loading', data:null, error:''});
    const timeout = setTimeout(() => controller.abort('timeout'), 35000);
    try {
      const result = await requestSmapNumerical({lat:field.lat, lon:field.lon, year, signal:controller.signal});
      if (!controller.signal.aborted) setState({status:result.status,data:result,error:''});
    } catch(error) {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') {
        setState({status:'error', data:null, error:controller.signal.reason==='timeout'?'The SMAP query timed out. Please retry.':error.message});
      }
    } finally { clearTimeout(timeout); }
  }
  return <SmapNumericContext.Provider value={{...state, uploaded, importSample:setUploaded, clearSample:()=>setUploaded(null), year, setYear, query, fieldId:field.id}}>{children}</SmapNumericContext.Provider>;
}
export function useSmapNumeric() {
  const result = useContext(SmapNumericContext);
  if (!result) throw new Error('useSmapNumeric must be within SmapNumericProvider');
  return result;
}
