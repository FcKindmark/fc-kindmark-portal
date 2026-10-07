"use client";
import { useState, useEffect } from "react";
import { Card, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";
import {dateLabel,memberEventInfo} from "../../lib/schedule";
import { resultLabel, replyLabel } from "../../lib/matches";

export default function MatchesView({data,userEmail,linkedPlayerIds=[],onRefresh,self=false}) {
  const mine=(data?.players || []).filter(p=>linkedPlayerIds.includes(String(p.id)) || [p.mother_email?.toLowerCase(),p.father_email?.toLowerCase()].filter(Boolean).includes(userEmail?.toLowerCase()));
  const teamIds=new Set(mine.map(p=>p.team_id).filter(Boolean));
  const matches=(data?.matches || []).filter(m=>teamIds.has(m.team_id)).sort((a,b)=>a.date.localeCompare(b.date));
  const [calls,setCalls]=useState([]),[replies,setReplies]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function load() {
    setLoading(true);
    const [c,r]=await Promise.all([supabase.from("club_match_calls").select("*"),supabase.from("club_match_replies").select("*")]);
    if(c.error || r.error) setError(c.error?.message || r.error?.message);
    else {setCalls(c.data || []);setReplies(r.data || []);setError("");}
    setLoading(false);
  }
  useEffect(()=>{load();},[data.matches]);
  async function respond(matchId,playerId,attending) {
    setBusy(true);setError("");
    const result=await supabase.from("club_match_replies").upsert({match_id:matchId,player_id:playerId,attending},{onConflict:"match_id,player_id"}).select("player_id");
    if(result.error || !result.data?.length) setError(result.error?.message || "Svaret kunde inte sparas.");
    else {await load(); if(onRefresh) await onRefresh();}
    setBusy(false);
  }
  async function clearReply(matchId,playerId){
    if(!confirm("Ta bort ditt svar? Kallelsen finns kvar och får status svar väntas."))return;
    setBusy(true);setError("");
    const r=await supabase.from("club_match_replies").delete().eq("match_id",matchId).eq("player_id",playerId).select("player_id");
    if(r.error || !r.data?.length)setError(r.error?.message || "Svaret kunde inte tas bort.");else await load();
    setBusy(false);
  }
  return <section><h2>Matcher och kallelser</h2>{error && <p className="error-banner" role="alert">{error}<button onClick={load}>Försök igen</button></p>}{loading && <p role="status">Läser kallelser…</p>}{!matches.length && <Empty message={self?"Inga matcher för dig ännu":"Inga matcher för dina barn ännu"}/>}<div className="match-list">{matches.map(m=>{
    const children=mine.filter(p=>p.team_id===m.team_id);
    return <Card key={m.id}><h3>FC Kindmark – {m.opponent}</h3><p>{dateLabel(m.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · {m.time?.slice(0,5) || "Tid ej angiven"} · {m.location || "Plats ej angiven"}</p><p className="match-score">{resultLabel(m)}</p>{memberEventInfo(m.admin_comment)&&<p className="preserve-lines">{memberEventInfo(m.admin_comment)}</p>}{!loading && children.map(p=>{
      const called=calls.some(c=>c.match_id===m.id && c.player_id===p.id), reply=replies.find(r=>r.match_id===m.id && r.player_id===p.id);
      return <div key={p.id} className="match-child-call"><strong>{p.name}</strong><p>{called ? `Kallad · ${replyLabel(reply?.attending)}` : "Ingen kallelse för denna match"}</p>{called && <div className="match-actions"><Button disabled={busy} aria-pressed={reply?.attending===true} variant={reply?.attending===true ? "primary" : "secondary"} onClick={()=>respond(m.id,p.id,true)}>Kommer</Button><Button disabled={busy} aria-pressed={reply?.attending===false} variant={reply?.attending===false ? "primary" : "secondary"} onClick={()=>respond(m.id,p.id,false)}>Kan inte komma</Button>{reply && <Button disabled={busy} variant="danger" onClick={()=>clearReply(m.id,p.id)}>Ta bort svar</Button>}</div>}</div>;
    })}</Card>;
  })}</div></section>;
}
