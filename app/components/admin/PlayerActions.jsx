"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Button} from "../UI";

export default function PlayerActions({player,teams,accounts,mode,onClose,onUpdate}) {
  const [links,setLinks]=useState([]),[account,setAccount]=useState(""),[team,setTeam]=useState(player.team_id||""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function loadLinks(){const r=await supabase.from("club_player_access").select("user_id,player_id").eq("player_id",player.id);if(r.error)setError(r.error.message);else setLinks(r.data||[]);}
  useEffect(()=>{if(mode==="parent")loadLinks();},[player.id,mode]);
  async function addParent(e){
    e.preventDefault();if(!account)return;setBusy(true);setError("");
    const r=await supabase.from("club_player_access").insert({player_id:player.id,user_id:account}).select("user_id");
    if(r.error || !r.data?.length)setError(r.error?.code==="23505" ? "Kontot är redan kopplat till spelaren." : r.error?.message || "Föräldern kunde inte kopplas.");else{setAccount("");await loadLinks();}
    setBusy(false);
  }
  async function removeParent(link){
    if(!confirm("Ta bort förälderns koppling till denna spelare? Kontot finns kvar."))return;setBusy(true);setError("");
    const r=await supabase.from("club_player_access").delete().eq("user_id",link.user_id).eq("player_id",player.id).select("user_id");
    if(r.error || !r.data?.length)setError(r.error?.message || "Kopplingen kunde inte tas bort.");else await loadLinks();setBusy(false);
  }
  async function saveTeam(e){
    e.preventDefault();if(!team)return;setBusy(true);setError("");
    const r=await supabase.from("players").update({team_id:team}).eq("id",player.id).select("id");
    if(r.error || !r.data?.length)setError(r.error?.message || "Laget kunde inte sparas.");else{await onUpdate();onClose();}setBusy(false);
  }
  return <section className="player-actions-panel"><div className="page-heading"><h4>{mode==="parent" ? "Föräldrar" : "Lägg till i lag"} · {player.name}</h4><Button variant="secondary" disabled={busy} onClick={onClose}>Stäng</Button></div>{error && <p role="alert">{error}</p>}{mode==="parent" ? <>
    <p>Välj förälderns registrerade konto. Kopplingen ger tillgång till spelarens kalender, kallelser och medlemskort.</p>
    <form onSubmit={addParent} className="match-edit-form"><label htmlFor={`parent-account-${player.id}`}>Förälderns konto</label><select id={`parent-account-${player.id}`} required value={account} onChange={e=>setAccount(e.target.value)}><option value="">Välj konto</option>{accounts.filter(a=>!links.some(l=>l.user_id===a.id)).map(a=><option key={a.id} value={a.id}>{a.full_name || a.email} · {a.email}</option>)}</select><Button type="submit" disabled={busy || !account}>Lägg till förälder</Button></form>
    {!links.length && <p className="muted">Inga föräldrakonton kopplade.</p>}{links.map(l=>{const a=accounts.find(a=>a.id===l.user_id);return <div className="attendance-row" key={l.user_id}><span>{a?.full_name || a?.email || "Registrerat konto"}{a?.full_name && a?.email ? ` · ${a.email}` : ""}</span><Button disabled={busy} variant="danger" onClick={()=>removeParent(l)}>Ta bort koppling</Button></div>;})}
  </> : <form onSubmit={saveTeam} className="match-edit-form"><label htmlFor={`player-team-${player.id}`}>Lag</label><select id={`player-team-${player.id}`} required value={team} onChange={e=>setTeam(e.target.value)}><option value="">Välj lag</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><Button type="submit" disabled={busy || !team}>Spara lag</Button></form>}</section>;
}
