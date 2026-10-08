"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {useStockholmToday} from "../lib/useStockholmToday";
import KallelserView from "./parent/KallelserView";
export default function CoachKallelser(){
 const [items,setItems]=useState([]),[error,setError]=useState("");const today=useStockholmToday();
 const refresh=useCallback(async()=>{const result=await supabase.rpc("club_coach_invitations");if(result.error)setError(result.error.message);else{setItems((result.data||[]).map(i=>({...i,answer:i.answer??undefined})));setError("");}},[]);
 useEffect(()=>{refresh();const timer=setInterval(refresh,30000);window.addEventListener("focus",refresh);return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);};},[refresh]);
 return <>{error&&<p role="alert" className="error-banner">{error}</p>}<KallelserView invitations={items} today={today} onRefresh={refresh}/></>;
}
