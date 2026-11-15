import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { requestCropPoint, CDL_YEARS } from '../lib/cropApi.js';

const CropContext=createContext(null);

export function CropProvider({parcela,children}) {
  const [year,setYear]=useState(2024);
  const [state,setState]=useState({status:'idle',data:null,error:''});
  const controllerRef=useRef(null);
  useEffect(()=>()=>controllerRef.current?.abort('navigation'),[]);
  const selectYear=useCallback((next)=>{
    const parsed=Number(next);
    if(!CDL_YEARS.includes(parsed))return;
    controllerRef.current?.abort('change-year');
    setYear(parsed);
    setState({status:'idle',data:null,error:''});
  },[]);
  const check=useCallback(async()=>{
    controllerRef.current?.abort('superseded');
    const controller=new AbortController();controllerRef.current=controller;
    setState({status:'loading',data:null,error:''});
    const timeout=setTimeout(()=>controller.abort('timeout'),25000);
    try {
      const data=await requestCropPoint({lat:parcela.lat,lon:parcela.lon,year,signal:controller.signal});
      if(!controller.signal.aborted)setState({status:data.status,data,error:''});
    } catch(err) {
      if(!controller.signal.aborted || controller.signal.reason==='timeout')
        setState({status:'error',data:null,error:controller.signal.reason==='timeout'?'The USDA crop lookup timed out.':err.message});
    } finally {clearTimeout(timeout);}
  },[parcela.lat,parcela.lon,year]);
  return <CropContext.Provider value={{...state,year,selectYear,check}}>{children}</CropContext.Provider>;
}
export function useCrop(){
  const c=useContext(CropContext);
  if(!c)throw new Error('useCrop must be used within CropProvider');
  return c;
}
