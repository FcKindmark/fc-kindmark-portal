"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {stockholmToday} from "../lib/schedule";
import {Button} from "./UI";
export default function PlayerMeasurements({playerId,readOnly=false,canDelete=false}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [form,setForm]=useState(()=>({measured_on:stockholmToday(),measurement:"",value:"",unit:"",notes:""}));
 useEffect(()=>{let active=true;setLoading(true);setError("");supabase.from("club_player_measurements").select("*").eq("player_id",playerId).order("measured_on",{ascending:false}).order("created_at",{ascending:false}).then(r=>{if(active){setRows(r.data||[]);setError(r.error?.message||"");setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[playerId]);
 async function save(e){e.preventDefault();setBusy(true);setError("");try{
  const value=Number(form.value);if(form.value===""||!Number.isFinite(value)||value<0||value>1000000)throw new Error("Ange ett giltigt mätvärde.");
  const r=await supabase.from("club_player_measurements").insert({player_id:playerId,measured_on:form.measured_on,measurement:form.measurement.trim(),value,unit:form.unit.trim(),notes:form.notes.trim()}).select().single();if(r.error)throw r.error;
  setRows(previous=>[r.data,...previous].sort((a,b)=>b.measured_on.localeCompare(a.measured_on)||b.created_at.localeCompare(a.created_at)));setForm(previous=>({...previous,value:"",notes:""}));
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(id){if(!confirm("Ta bort denna mätning permanent?"))return;setBusy(true);setError("");const r=await supabase.from("club_player_measurements").delete().eq("id",id).eq("player_id",playerId).select("id");if(r.error||!r.data?.length)setError(r.error?.message||"Mätningen kunde inte tas bort.");else setRows(previous=>previous.filter(row=>row.id!==id));setBusy(false);}
 const field=(key,label,type="text",extra={})=><label className="field">{label}<input type={type} required value={form[key]} onChange={e=>setForm(previous=>({...previous,[key]:e.target.value}))} {...extra}/></label>;
 return <section aria-label="Spelarens mätningar"><h3>Mätningar</h3><p>Datum, värde och enhet sparas i spelarens profil. Samma historik visas för klubben och spelaren.</p>
 {!readOnly&&<form onSubmit={save}><fieldset disabled={busy}><div className="form-grid">{field("measured_on","Datum","date")}{field("measurement","Vad mäts?","text",{maxLength:120,placeholder:"Exempel: 10 m sprint, längd, vikt"})}{field("value","Värde","number",{min:0,max:1000000,step:"any"})}{field("unit","Enhet","text",{maxLength:24,placeholder:"s, cm, kg, antal…"})}<label className="field">Kommentar (valfritt)<textarea maxLength={2000} value={form.notes} onChange={e=>setForm(previous=>({...previous,notes:e.target.value}))}/></label></div><Button type="submit" disabled={busy}>{busy?"Sparar…":"Spara mätning"}</Button></fieldset></form>}
 {error&&<p role="alert" className="error-banner">{error}</p>}{loading?<p role="status">Läser mätningar…</p>:!rows.length?<p>Inga mätningar registrerade ännu.</p>:<div>{rows.map(row=><article className="record" key={row.id}><p>{row.measured_on}</p><strong>{row.measurement}: {row.value} {row.unit}</strong>{row.notes&&<p className="preserve-lines">{row.notes}</p>}{canDelete&&!readOnly&&<Button variant="danger" disabled={busy} onClick={()=>remove(row.id)}>Ta bort mätning</Button>}</article>)}</div>}
 </section>;
}
