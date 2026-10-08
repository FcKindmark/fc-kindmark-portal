"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {Button} from "./UI";
async function request(action,extra={}){
 const {data,error}=await supabase.functions.invoke("club-telegram",{body:{action,...extra}});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw new Error(detail?.error||"Telegram kunde inte uppdateras. Försök igen.");}
 if(data?.error)throw new Error(data.error);return data;
}
export default function TelegramSettings({userId,isAdmin=false}){
 const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[link,setLink]=useState(""),[token,setToken]=useState("");
 const refresh=useCallback(async()=>{try{const next=await request("status");setStatus(next);if(next.connected)setLink("");}catch(e){setError(e.message);}},[]);
 useEffect(()=>{setStatus(null);setLink("");refresh();const focus=()=>refresh();window.addEventListener("focus",focus);const timer=setInterval(focus,15000);return()=>{clearInterval(timer);window.removeEventListener("focus",focus);};},[userId,refresh]);
 async function run(action){setBusy(true);setError("");try{const result=await request(action,action==="setup"?{token}:{});if(action==="connect")setLink(result.url);if(action==="disconnect")setLink("");if(action==="setup")setToken("");await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="telegram-settings" aria-labelledby="telegram-title">
  <h3 id="telegram-title">Telegram</h3>
  <p>{status?.connected?"Kopplat · Du får nya kallelser och meddelanden i Telegram.":status?.ready?"Få kallelser i Telegram och svara Kommer eller Kommer inte direkt.":"Telegram aktiveras snart av föreningen."}</p>
  {status?.ready&&<Button variant="secondary" disabled={busy} onClick={()=>run(status.connected?"disconnect":"connect")}>{status.connected?"Koppla bort Telegram":"Koppla Telegram"}</Button>}
  {link&&<p><a href={link} target="_blank" rel="noopener noreferrer" className="club-button primary" style={{display:"inline-flex",textDecoration:"none"}}>Öppna Telegram och tryck Start</a><small style={{display:"block",marginTop:8}}>Länken gäller i 10 minuter. Dela den inte med andra.</small></p>}
  {isAdmin&&<details><summary>Aktivera föreningens Telegram-bot</summary><p>Skapa en bot hos BotFather. Ange bot-token här för att aktivera anslutningen.</p>{status?.bot&&<p>Bot: @{status.bot} · {status.ready?"Aktiv":"Behöver aktiveras"}</p>}
    <form onSubmit={e=>{e.preventDefault();run("setup");}}><label className="field">Bot-token<input type="password" autoComplete="off" value={token} disabled={busy} onChange={e=>setToken(e.target.value)} required maxLength={120}/></label><Button type="submit" disabled={busy||!token.trim()}>{busy?"Aktiverar…":"Aktivera bot"}</Button></form>
  </details>}
  {error&&<p className="error-banner" role="alert">{error}</p>}
 </section>;
}
