"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";
import ReplyStatus from "../ReplyStatus";
import PersonAvatar from "../PersonAvatar";
import { parseResult, resultLabel, matchVenue, matchInformation } from "../../lib/matches";

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
  const [calls, setCalls] = useState([]), [replies, setReplies] = useState([]),[callsReady,setCallsReady]=useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const loadCalls=useCallback(async()=> {
    const [c,r] = await Promise.all([supabase.from("club_match_calls").select("*"),supabase.from("club_match_replies").select("*")]);
    if (c.error || r.error) { setError(c.error?.message || r.error?.message); return; }
    setCalls(c.data || []); setReplies(r.data || []);setCallsReady(true);
  },[]);
  useEffect(()=>{loadCalls();const timer=setInterval(loadCalls,15000);window.addEventListener("focus",loadCalls);return()=>{clearInterval(timer);window.removeEventListener("focus",loadCalls);};},[data.matches,loadCalls]);
  function field(name,value) { setForm(f=>({...f,[name]:value})); }
  async function saveMatch(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const values={opponent:form.opponent.trim(),date:form.date,time:form.time || null,location:form.location.trim() || null,team_id:form.team_id,admin_comment:form.admin_comment.trim() || null,venue_type:form.venue_type||null};
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
    <div className="page-heading"><h2>Matcher</h2><Button onClick={()=>setForm({opponent:"",date:"",time:"",location:"",team_id:"",admin_comment:"",venue_type:""})}>+ Lägg till match</Button></div>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {form && <Card><form onSubmit={saveMatch} className="match-edit-form"><h3>{form.id ? "Redigera match" : "Ny match"}</h3>
      <label htmlFor="match-team">Lag</label><select id="match-team" required value={form.team_id} onChange={e=>field("team_id",e.target.value)}><option value="">Välj lag</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      {[['opponent','Motståndare','text'],['date','Datum','date'],['time','Tid (kan anges senare)','time'],['location','Plats','text']].map(([key,label,type])=><div key={key}><label htmlFor={`match-${key}`}>{label}</label><Input id={`match-${key}`} type={type} required={key==='opponent'||key==='date'} value={form[key]} onChange={e=>field(key,e.target.value)}/></div>)}
      <label htmlFor="match-venue">Hemma / borta</label><select id="match-venue" value={form.venue_type||""} onChange={e=>field("venue_type",e.target.value)}><option value="">Ej angivet</option><option value="hemma">Hemma</option><option value="borta">Borta</option></select>
      <label htmlFor="match-comment">Information till spelare och föräldrar</label><textarea id="match-comment" value={form.admin_comment} onChange={e=>field("admin_comment",e.target.value)}/>
      <div className="match-actions"><Button type="submit" disabled={busy}>Spara match</Button><Button variant="secondary" onClick={()=>setForm(null)}>Avbryt</Button></div>
    </form></Card>}
    {!matches.length && <Empty message="Inga matcher än"/>}
    <div className="match-list">{matches.map(m=>{
      const selected=calls.filter(c=>c.match_id===m.id), squad=players.filter(p=>p.team_id===m.team_id);
      const answered=replies.filter(r=>r.match_id===m.id && selected.some(c=>c.player_id===r.player_id));
      return <Card key={m.id} className="compact-match-card"><div className="page-heading"><div><h3 className="match-title"><span>FC Kindmark – {m.opponent}</span>{matchVenue(m)&&<small>{matchVenue(m)==="hemma"?"Hemma":"Borta"}</small>}</h3><p>{teams.find(t=>t.id===m.team_id)?.name || "Lag ej angivet"}</p><p>{m.date} · {m.time?.slice(0,5) || "Tid ej angiven"} · {m.location || "Plats ej angiven"}</p>{m.club_score!=null&&m.opponent_score!=null&&<p className="match-score">{resultLabel(m)}</p>}</div></div>
        {matchInformation(m.admin_comment)&&<p className="preserve-lines">{matchInformation(m.admin_comment)}</p>}
        <p>{selected.length} kallade · <span className="reply-count-yes">{answered.filter(r=>r.attending).length} kommer</span> · <span className="reply-count-no">{answered.filter(r=>!r.attending).length} kommer inte</span> · {selected.length-answered.length} väntar</p>
        <div className="match-actions compact-match-actions"><Button aria-label="Öppna resultat och kallelser" aria-expanded={expandedId===m.id} onClick={()=>setExpandedId(expandedId===m.id ? null : m.id)}>Kallelse / resultat</Button><Button variant="secondary" onClick={()=>setForm({...m,time:m.time||"",location:m.location||"",team_id:m.team_id||"",admin_comment:m.admin_comment||"",venue_type:matchVenue(m)})}>Redigera</Button><Button variant="danger" disabled={busy} onClick={()=>deleteMatch(m.id)}>Ta bort</Button></div>
        {expandedId===m.id&&!callsReady&&<p role="status">Läser kallelser…</p>}
        {expandedId===m.id && callsReady && <div className="match-management"><MatchResult match={m} onUpdate={onUpdate}/><MatchCallEditor key={m.id} match={m} squad={squad} calls={selected} replies={answered} busy={busy} canDelete={canDelete} onClear={playerId=>clearAnswer(m.id,playerId)} onSent={async()=>{await loadCalls();await onUpdate();}}/></div>}
      </Card>;
    })}</div>
  </section>;
}

function MatchCallEditor({match,squad,calls,replies,busy,canDelete,onClear,onSent}){
  const [selected,setSelected]=useState(()=>calls.map(c=>c.player_id));
  const [sending,setSending]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function send(event){
    event.preventDefault();setSending(true);setError("");setNotice("");
    try{
      const {data,error}=await supabase.rpc("club_send_match_call",{target:match.id,selected,note:""});
      if(error)throw error;
      setNotice(`Kallelse skickad till ${data.players} spelare. ${data.recipients} mottagare har fått ett meddelande i portalen.`);
      await onSent();
    }catch(e){setError(e.message);}finally{setSending(false);}
  }
  return <section><form onSubmit={send}><h4>Välj spelare att kalla</h4><p className="muted">Välj spelare och tryck på Skicka kallelse. Kallelsen visas under Matcher och Meddelanden i portalen. Befintliga svar behålls för spelare som är kvar i urvalet.</p>
    {!squad.length&&<p>Inga spelare i matchens lag.</p>}
    {squad.map(p=>{
      const called=calls.some(c=>c.player_id===p.id),reply=replies.find(r=>r.player_id===p.id);
      return <div className="match-call-row" key={p.id}><label className="match-call-label"><input type="checkbox" checked={selected.includes(p.id)} disabled={busy||sending} onChange={e=>{setNotice("");setSelected(prev=>e.target.checked?[...prev,p.id]:prev.filter(id=>id!==p.id));}}/><span className="person-name"><PersonAvatar playerId={p.id} name={p.name}/>{p.name}</span></label><ReplyStatus called={called} value={reply?.attending}/>{canDelete&&reply&&<Button variant="danger" disabled={busy||sending} onClick={()=>onClear(p.id)}>Ta bort svar</Button>}</div>;
    })}
    <Button type="submit" disabled={busy||sending||!selected.length}>{sending?"Skickar…":"Skicka kallelse"}</Button>
    {notice&&<p role="status" className="success-banner">{notice}</p>}{error&&<p role="alert" className="error-banner">{error}</p>}
  </form></section>;
}
