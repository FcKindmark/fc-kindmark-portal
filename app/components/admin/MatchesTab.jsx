"use client";
import { useState, useEffect } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";
import { parseResult, resultLabel, replyLabel } from "../../lib/matches";

function MatchResult({ match, onUpdate }) {
  const [club, setClub] = useState(match.club_score ?? "");
  const [opponent, setOpponent] = useState(match.opponent_score ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const scores = parseResult(club, opponent);
      const status = scores.club_score != null ? "completed" : match.status === "completed" ? "upcoming" : match.status;
      const result = await supabase.from("matches").update({...scores,status}).eq("id",match.id).select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("Resultatet kunde inte sparas. Kontrollera behörigheten.");
      await onUpdate();
    } catch(e) { setError(e.message); }
    setSaving(false);
  }
  return <form onSubmit={save} className="match-result-form"><h4>Resultat</h4>
    <label htmlFor={`club-score-${match.id}`}>FC Kindmark</label><Input id={`club-score-${match.id}`} type="number" min="0" max="32767" step="1" value={club} onChange={e=>setClub(e.target.value)}/>
    <label htmlFor={`opponent-score-${match.id}`}>{match.opponent}</label><Input id={`opponent-score-${match.id}`} type="number" min="0" max="32767" step="1" value={opponent} onChange={e=>setOpponent(e.target.value)}/>
    <p className="muted">Lämna båda fälten tomma för att ta bort resultatet.</p>
    <Button type="submit" disabled={saving}>Spara resultat</Button>{error && <p role="alert">{error}</p>}
  </form>;
}

export default function MatchesTab({ data, onUpdate, canDelete=false }) {
  const matches = [...(data?.matches || [])].sort((a,b)=>a.date.localeCompare(b.date));
  const teams = data?.teams || [], players = data?.players || [];
  const [form, setForm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [calls, setCalls] = useState([]), [replies, setReplies] = useState([]);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function loadCalls() {
    const [c,r] = await Promise.all([supabase.from("club_match_calls").select("*"),supabase.from("club_match_replies").select("*")]);
    if (c.error || r.error) { setError(c.error?.message || r.error?.message); return; }
    setCalls(c.data || []); setReplies(r.data || []);
  }
  useEffect(()=>{loadCalls();},[data.matches]);
  function field(name,value) { setForm(f=>({...f,[name]:value})); }
  async function saveMatch(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values={opponent:form.opponent.trim(),date:form.date,time:form.time || null,location:form.location.trim() || null,team_id:form.team_id,admin_comment:form.admin_comment.trim() || null};
      if (!values.opponent || !values.date || !values.team_id) throw new Error("Ange lag, motståndare och datum.");
      const previous = matches.find(m=>m.id===form.id);
      if (previous && previous.team_id !== values.team_id && calls.some(c=>c.match_id===form.id)) throw new Error("Ta först bort matchens kallelser innan du byter lag.");
      const request=form.id ? supabase.from("matches").update(values).eq("id",form.id) : supabase.from("matches").insert({...values,status:"upcoming"});
      const result=await request.select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("Matchen kunde inte sparas.");
      setForm(null); await onUpdate();
    } catch(e) {setError(e.message);} setBusy(false);
  }
  async function callPlayer(match, player, selected) {
    setBusy(true); setError("");
    try {
      const result=selected ? await supabase.from("club_match_calls").insert({match_id:match.id,player_id:player.id}).select("player_id") : await supabase.from("club_match_calls").delete().eq("match_id",match.id).eq("player_id",player.id).select("player_id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("Kallelsen kunde inte ändras.");
      await loadCalls();
    } catch(e) {setError(e.message);} setBusy(false);
  }
  async function clearAnswer(matchId,playerId){
    if(!confirm("Ta bort detta svar på matchkallelsen? Kallelsen finns kvar."))return;
    setBusy(true);setError("");
    const r=await supabase.from("club_match_replies").delete().eq("match_id",matchId).eq("player_id",playerId).select("player_id");
    if(r.error || !r.data?.length)setError(r.error?.message || "Svaret kunde inte tas bort.");else await loadCalls();
    setBusy(false);
  }
  async function deleteMatch(id) {
    if (!confirm("Ta bort matchen och dess kallelser?")) return;
    setBusy(true); setError("");
    const result=await supabase.from("matches").delete().eq("id",id).select("id");
    if (result.error || !result.data?.length) setError(result.error?.message || "Matchen kunde inte tas bort.");
    else await onUpdate(); setBusy(false);
  }
  return <section>
    <div className="page-heading"><h2>Matcher</h2><Button onClick={()=>setForm({opponent:"",date:"",time:"",location:"",team_id:"",admin_comment:""})}>+ Lägg till match</Button></div>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {form && <Card><form onSubmit={saveMatch} className="match-edit-form"><h3>{form.id ? "Redigera match" : "Ny match"}</h3>
      <label htmlFor="match-team">Lag</label><select id="match-team" required value={form.team_id} onChange={e=>field("team_id",e.target.value)}><option value="">Välj lag</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      {[['opponent','Motståndare','text'],['date','Datum','date'],['time','Tid (kan anges senare)','time'],['location','Plats','text']].map(([key,label,type])=><div key={key}><label htmlFor={`match-${key}`}>{label}</label><Input id={`match-${key}`} type={type} required={key==='opponent'||key==='date'} value={form[key]} onChange={e=>field(key,e.target.value)}/></div>)}
      <label htmlFor="match-comment">Information till spelare och föräldrar</label><textarea id="match-comment" value={form.admin_comment} onChange={e=>field("admin_comment",e.target.value)}/>
      <div className="match-actions"><Button type="submit" disabled={busy}>Spara match</Button><Button variant="secondary" onClick={()=>setForm(null)}>Avbryt</Button></div>
    </form></Card>}
    {!matches.length && <Empty message="Inga matcher än"/>}
    <div className="match-list">{matches.map(m=>{
      const selected=calls.filter(c=>c.match_id===m.id), squad=players.filter(p=>p.team_id===m.team_id);
      const answered=replies.filter(r=>r.match_id===m.id && selected.some(c=>c.player_id===r.player_id));
      return <Card key={m.id}><div className="page-heading"><div><h3>FC Kindmark – {m.opponent}</h3><p>{teams.find(t=>t.id===m.team_id)?.name || "Lag ej angivet"}</p><p>{m.date} · {m.time || "Tid ej angiven"} · {m.location || "Plats ej angiven"}</p><p className="match-score">{resultLabel(m)}</p></div></div>
        <p className="preserve-lines">{m.admin_comment}</p>
        <p>{selected.length} kallade · {answered.filter(r=>r.attending).length} kommer · {answered.filter(r=>!r.attending).length} kan inte komma · {selected.length-answered.length} svar väntas</p>
        <div className="match-actions"><Button aria-expanded={expandedId===m.id} onClick={()=>setExpandedId(expandedId===m.id ? null : m.id)}>Öppna resultat och kallelser</Button><Button variant="secondary" onClick={()=>setForm({...m,time:m.time||"",location:m.location||"",team_id:m.team_id||"",admin_comment:m.admin_comment||""})}>Redigera</Button><Button variant="danger" disabled={busy} onClick={()=>deleteMatch(m.id)}>Ta bort</Button></div>
        {expandedId===m.id && <div className="match-management"><MatchResult match={m} onUpdate={onUpdate}/><section><h4>Välj spelare att kalla</h4><p className="muted">Markeringen sparas direkt i portalen. När en kallelse tas bort raderas även svaret. Inga mejl skickas här.</p>{!squad.length && <p>Inga spelare i matchens lag.</p>}{squad.map(p=>{const called=selected.some(c=>c.player_id===p.id),reply=answered.find(r=>r.player_id===p.id);return <div className="match-call-row" key={p.id}><label className="match-call-label"><input type="checkbox" checked={called} disabled={busy} onChange={e=>callPlayer(m,p,e.target.checked)}/><span>{p.name}</span><small>{called ? replyLabel(reply?.attending) : "Ej kallad"}</small></label>{canDelete && reply && <Button variant="danger" disabled={busy} onClick={()=>clearAnswer(m.id,p.id)}>Ta bort svar</Button>}</div>;})}</section></div>}
      </Card>;
    })}</div>
  </section>;
}
