import { useCallback, useEffect, useState } from 'react';
import { requestGlobalField } from '../lib/globalApi.js';
export function useGlobalField(parcel, year=2024) {
  const key = parcel?.origen === 'custom' ? `${parcel.lat}:${parcel.lon}:${year}` : null;
  const [state,setState]=useState({key:null,status:'idle',data:null,error:''});
  const [retry,setRetry]=useState(0);
  const refresh=useCallback(()=>setRetry(n=>n+1),[]);
  useEffect(()=>{
    if (!key) return undefined;
    const abort=new AbortController();
    setState({key,status:'loading',data:null,error:''});
    const timeout=setTimeout(()=>abort.abort(),20000);
    requestGlobalField({lat:parcel.lat,lon:parcel.lon,year,signal:abort.signal})
      .then(data=>{if(!abort.signal.aborted)setState({key,status:'success',data,error:''});})
      .catch(error=>{if(!abort.signal.aborted)setState({key,status:'error',data:null,error:error.message});
        else if(abort.signal.reason !== 'navigation') setState(s=>s.key===key?{...s,status:'error',error:'Climate request timed out. Please try again.'}:s);})
      .finally(()=>clearTimeout(timeout));
    return ()=>{clearTimeout(timeout);abort.abort('navigation');};
  },[key,retry]);
  if(!key || state.key!==key)return {status:key?'loading':'idle',data:null,error:'',refresh};
  return {...state,refresh};
}
