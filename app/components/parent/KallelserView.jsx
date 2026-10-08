"use client";
import {useState} from "react";
import {Card,Button,Empty} from "../UI";
import PersonAvatar from "../PersonAvatar";
import ReplyStatus from "../ReplyStatus";
import {supabase} from "../../lib/supabaseClient";
import {dateLabel} from "../../lib/schedule";
import {matchVenue} from "../../lib/matches";
export default function KallelserView({invitations,today,target,onShowAll,onRefresh}){
 const [busy,setBusy]=useState(""),[error,setError]=useState("");
 const visible=invitations.filter(i=>target?.eventId?i.event.id===target.eventId&&i.kind===target.kind:i.event.date>=today);
 async function respond(item,value){
  setBusy(item.key);setError("");
  try{
   if(item.staff){const result=await supabase.rpc("club_reply_coach_call",{kind:item.kind,target:item.event.id,answer:value});if(result.error)throw result.error;await onRefresh({silent:true});window.dispatchEvent(new Event("club-coach-replied"));return;}
   const training=item.kind==="training";
   const values=training?{training_id:item.event.id,player_id:item.player.id,attended:value}:{match_id:item.event.id,player_id:item.player.id,attending:value};
   const result=await supabase.from(training?"training_attendance":"club_match_replies").upsert(values,{onConflict:training?"training_id,player_id":"match_id,player_id"}).select("player_id");
   if(result.error)throw result.error;if(!result.data?.length)throw new Error("Svaret kunde inte sparas.");
   await onRefresh({silent:true});
  }catch(e){setError(e.message);}finally{setBusy("");}
 }
 return <section><div className="page-heading"><div><h2>Kallelser</h2><p className="muted">Svara direkt på dina träningar och matcher.</p></div>{target?.eventId&&<Button variant="secondary" onClick={onShowAll}>Alla kallelser</Button>}</div>{error&&<p role="alert" className="error-banner">{error}</p>}
 {!visible.length?<Empty message={target?.eventId?"Kallelsen är inte längre tillgänglig.":"Inga kommande kallelser"}/>:<div className="match-list">{visible.map(item=>{
  const e=item.event,venue=matchVenue(e);
  return <Card key={item.key} className="compact-match-card"><h3 className="match-title"><span>{item.kind==="match"?`Match mot ${e.opponent}`:"Träning"}</span>{item.kind==="match"&&venue&&<small>{venue==="hemma"?"Hemma":"Borta"}</small>}</h3><p>{dateLabel(e.date,{weekday:"short",day:"numeric",month:"long"})} · {e.time?.slice(0,5)||"Tid ej angiven"}{e.end_time?`–${e.end_time.slice(0,5)}`:""} · {e.location||"Plats ej angiven"}</p><div className="invitation-person"><strong className="person-name"><PersonAvatar playerId={item.staff?undefined:item.player.id} profileId={item.staff?item.player.id:undefined} name={item.player.name}/>{item.player.name}</strong><ReplyStatus value={item.answer}/></div><div className="invitation-answer-buttons"><Button variant="secondary" className={`reply-button-yes ${item.answer===true?"selected":""}`} aria-pressed={item.answer===true} disabled={Boolean(busy)} onClick={()=>respond(item,true)}>Kommer</Button><Button variant="secondary" className={`reply-button-no ${item.answer===false?"selected":""}`} aria-pressed={item.answer===false} disabled={Boolean(busy)} onClick={()=>respond(item,false)}>Kommer inte</Button></div></Card>;
 })}</div>}
 </section>;
}
