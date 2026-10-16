"use client";
import {useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Button,Card} from "../UI";
export function playerUsername(name){return String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,".").replace(/^\.+|\.+$/g,"").slice(0,32);}
export default function BulkPlayerLogins({players,onUpdate}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[results,setResults]=useState([]);
 const rows=players.filter(p=>p.birth_date).map(p=>({...p,username:playerUsername(p.name)}));
 async function createAll(){
  setBusy(true);setResults([]);
  try{
   for(const p of rows){
    const password=p.birth_date.replaceAll("-","");
    try{
     const {data,error}=await supabase.functions.invoke("club-player-login",{body:{player_id:p.id,username:p.username,password,action:"create"}});
     let message=data?.message;
     if(error){let detail;try{detail=await error.context?.json();}catch{}message=detail?.error||error.message;}
     setResults(prev=>[...prev,{id:p.id,name:p.name,username:p.username,ok:!error&&!data?.error,message:data?.error||message}]);
    }catch(e){setResults(prev=>[...prev,{id:p.id,name:p.name,ok:false,message:e.message}]);}
   }
   await onUpdate?.();
  }finally{setBusy(false);}
 }
 return <Card><Button variant="secondary" disabled={busy} onClick={()=>setOpen(!open)}>Skapa spelarinloggningar för valt urval</Button>
 {open&&<><h3>Spelarkonton utan e-post</h3><p>{rows.length} spelare med fullständigt födelsedatum. {players.length-rows.length} saknar datum och hoppas över.</p><p>Användarnamn: namn med punkter. Första lösenord: födelsedatum i formatet ÅÅÅÅMMDD, exakt 8 siffror. Lämna uppgifterna direkt till varje spelare eller vårdnadshavare. Befintliga konton skrivs inte över.</p>
 <ul>{rows.map(p=><li key={p.id}>{p.name} · {p.username}</li>)}</ul>
 <Button disabled={busy||!rows.length} onClick={createAll}>{busy?"Skapar konton…":"Skapa "+rows.length+" spelarkonton"}</Button>
 {results.length>0&&<div role="status">{results.map(r=><p key={r.id}><strong>{r.name}:</strong> {r.ok?"Klart · "+r.username:r.message}</p>)}</div>}</>}
 </Card>;
}
