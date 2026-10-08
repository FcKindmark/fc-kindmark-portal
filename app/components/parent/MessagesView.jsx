"use client";
import {useEffect,useState} from "react";
import {Card,Empty,Button} from "../UI";
import {supabase} from "../../lib/supabaseClient";
export default function MessagesView({data,onRefresh,onRead,onOpenCall,targetId}){
 const messages=data?.messages||[],read=new Set((data.messageReads||[]).map(r=>r.message_id));
 const [opened,setOpened]=useState(targetId||null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(targetId){setOpened(targetId);onRead(targetId);}},[targetId,onRead]);
 function open(message){setOpened(message.id);if(!read.has(message.id))onRead(message.id);}
 async function remove(id){if(!confirm("Ta bort meddelandet?"))return;setBusy(true);setError("");try{const {error}=await supabase.from("messages").delete().eq("id",id);if(error)throw error;await onRefresh({silent:true});}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section><h2>Meddelanden</h2>{error&&<p className="error-banner" role="alert">{error}</p>}{!messages.length?<Empty message="Inga meddelanden än"/>:<div className="match-list">{messages.map(msg=>{
  const target=(data.messageTargets||[]).find(t=>t.message_id===msg.id);
  return <Card key={msg.id} className={read.has(msg.id)?"":"unread-message"}><button className="message-open" aria-expanded={opened===msg.id} onClick={()=>open(msg)}><strong>{msg.subject}</strong>{!read.has(msg.id)&&<span className="reply-status reply-waiting">Nytt</span>}</button>{msg.team_name&&<p className="muted">{msg.team_name}</p>}{opened===msg.id&&<><p className="preserve-lines">{msg.content}</p><div className="button-group">{target&&<Button onClick={()=>onOpenCall(target)}>Öppna kallelse</Button>}<Button variant="secondary" disabled={busy} onClick={()=>remove(msg.id)}>Ta bort</Button></div></>}</Card>;
 })}</div>}</section>;
}
