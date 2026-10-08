"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {Button} from "./UI";
import ReplyStatus from "./ReplyStatus";
import PersonAvatar from "./PersonAvatar";
export default function CoachEventReplies({kind,eventId,userId,revision}){
 const [rows,setRows]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{const result=await supabase.rpc("club_event_coach_responses",{kind,target:eventId});if(result.error)setError(result.error.message);else{setRows(result.data||[]);setError("");}},[kind,eventId]);
 useEffect(()=>{refresh();const timer=setInterval(refresh,30000);return()=>clearInterval(timer);},[refresh,revision]);
 async function answer(value){setBusy(true);const result=await supabase.rpc("club_reply_coach_call",{kind,target:eventId,answer:value});if(result.error)setError(result.error.message);else{await refresh();window.dispatchEvent(new Event("club-coach-replied"));}setBusy(false);}
 return <section className="coach-event-replies"><h4>Tränare</h4>{error&&<p role="alert" className="error-banner">{error}</p>}{!rows.length?<p className="muted">Lagets tränare kallas automatiskt när kallelsen skickas.</p>:rows.map(row=><div className="coach-reply-row" key={row.coach_id}><span className="person-name"><PersonAvatar profileId={row.coach_id} name={row.name}/>{row.name}</span><ReplyStatus value={row.attending??undefined}/>{row.coach_id===userId&&<div className="invitation-answer-buttons"><Button variant="secondary" className={`reply-button-yes ${row.attending===true?"selected":""}`} aria-pressed={row.attending===true} disabled={busy} onClick={()=>answer(true)}>Kommer</Button><Button variant="secondary" className={`reply-button-no ${row.attending===false?"selected":""}`} aria-pressed={row.attending===false} disabled={busy} onClick={()=>answer(false)}>Kommer inte</Button></div>}</div>)}</section>;
}
