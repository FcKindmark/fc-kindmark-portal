"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, Button } from "../UI";
import { downloadAttendance } from "../../lib/attendance";
import { trainingPeriod } from "../../lib/schedule";
import { useStockholmToday } from "../../lib/useStockholmToday";
export default function AttendanceTab({ data, canDelete=false, canExport=false }) {
  const [trainingId,setTrainingId] = useState("");
  const [showPast,setShowPast] = useState(false);
  const today = useStockholmToday();
  const visibleTrainings = trainingPeriod(data.trainings,showPast,today);
  const [records,setRecords] = useState([]); const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const [from,setFrom] = useState(""); const [to,setTo] = useState("");
  useEffect(() => { let active=true; supabase.from("club_attendance").select("*").then(({data,error}) => { if(active){setError(error ? "Närvaroregistret kunde inte läsas: " + error.message : "");setRecords(data || []);} }); return () => {active=false;}; },[]);
  const training=visibleTrainings.find(t => String(t.id) === trainingId);
  const players=data.players.filter(p => p.team_id === training?.team_id);
  async function mark(playerId,present) {
    setBusy(true);setError("");
    const {data:rows,error}=await supabase.from("club_attendance").upsert({training_id:trainingId,player_id:String(playerId),present,recorded_at:new Date().toISOString()},{onConflict:"training_id,player_id"}).select();
    if(error)setError(error.message);else if(!rows?.length)setError("Ingen närvaro sparades. Kontrollera behörigheten.");else setRecords(prev=>[...prev.filter(r=>!(r.training_id===trainingId && r.player_id===String(playerId))),...rows]);
    setBusy(false);
  }
  async function remove(playerId){
    if(!confirm("Ta bort denna närvaroregistrering? Spelaren blir ej registrerad för träningen."))return;
    setBusy(true);setError("");
    const result=await supabase.from("club_attendance").delete().eq("training_id",trainingId).eq("player_id",String(playerId)).select("player_id");
    if(result.error || !result.data?.length)setError(result.error?.message || "Registreringen kunde inte tas bort.");
    else setRecords(prev=>prev.filter(r=>!(r.training_id===trainingId && r.player_id===String(playerId))));
    setBusy(false);
  }
  return <><div className="page-heading"><div><p className="eyebrow">TRÄNARENS REGISTRERING</p><h1>Närvaro</h1><p>Registrera vilka som deltog. Föräldrarnas svar finns under Träningar.</p></div></div>
  {error && <p role="alert" className="error-banner">{error}</p>}
  <div className="button-group" role="group" aria-label="Träningsperiod" style={{ marginBottom: "20px" }}>
    <Button variant={showPast?"secondary":"primary"} aria-pressed={!showPast} disabled={busy} onClick={()=>{setShowPast(false);setTrainingId("");}}>Kommande träningar</Button>
    <Button variant={showPast?"primary":"secondary"} aria-pressed={showPast} disabled={busy} onClick={()=>{setShowPast(true);setTrainingId("");}}>Tidigare träningar</Button>
  </div>
  {showPast && <p className="muted" style={{ marginBottom: "16px" }}>Välj en tidigare träning för att komplettera eller rätta närvaron.</p>}
  <Card><label className="field">Träning<select value={training?trainingId:""} disabled={busy} onChange={e=>setTrainingId(e.target.value)}><option value="">Välj träning</option>{visibleTrainings.map(t=><option key={t.id} value={t.id}>{t.date} {t.time?.slice(0,5)} · {t.location}</option>)}</select></label>
  {!visibleTrainings.length && <p className="muted">{showPast?"Inga tidigare träningar":"Inga kommande träningar"}</p>}
  {players.map(p=>{const row=records.find(r=>r.training_id===trainingId && r.player_id===String(p.id));return <div className="attendance-row" key={p.id}><div><strong>{p.name}</strong><p className="muted">{row ? row.present ? "Närvarande" : "Frånvarande" : "Ej registrerad"}</p></div><div className="button-group"><Button disabled={busy} variant={row?.present===true?"primary":"secondary"} onClick={()=>mark(p.id,true)}>Närvarande</Button><Button disabled={busy} variant={row?.present===false?"danger":"secondary"} onClick={()=>mark(p.id,false)}>Frånvarande</Button>{canDelete && row && <Button disabled={busy} variant="danger" onClick={()=>remove(p.id)}>Ta bort registrering</Button>}</div></div>;})}
  {training && !players.length && <p>Inga spelare är kopplade till laget.</p>}</Card>
  {canExport && <Card><h2>Exportera närvarounderlag</h2><p>CSV med registrerad närvaro. Kontrollera underlaget innan rapportering.</p><div className="button-group"><label className="field">Från<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="field">Till<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><Button disabled={!!error || !!(from && to && from>to)} onClick={()=>downloadAttendance(data.trainings,records,data.players,from,to || undefined)}>Ladda ner CSV</Button></div></Card>}</>;
}
