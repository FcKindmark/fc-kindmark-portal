"use client";
import PersonAvatar from "../PersonAvatar";
import {useState,useEffect} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Card,Button} from "../UI";
import CoachForm from "./CoachForm";
export default function UsersTab({data,onUpdate,currentUserId,initialShowCoach=false,onCloseAdd}) {
  const [links,setLinks]=useState([]),[userId,setUserId]=useState(""),[playerId,setPlayerId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [coaches,setCoaches]=useState([]),[coachForm,setCoachForm]=useState(initialShowCoach?{}:null),[notice,setNotice]=useState("");
  useEffect(()=>{let active=true;supabase.from("club_coach_teams").select("*").then(({data,error})=>{if(active){setCoaches(data||[]);if(error)setError(error.message);}});return()=>{active=false;};},[]);
  async function saveCoach(target,teamIds){
    setBusy(true);setError("");setNotice("");
    try {
      const {error}=await supabase.rpc("club_assign_coach_teams",{target,team_ids:teamIds});
      if(error)throw error;
      setCoaches(prev=>[...prev.filter(c=>c.user_id!==target),...teamIds.map(team_id=>({user_id:target,team_id}))]);
      setCoachForm(null);onCloseAdd?.();setNotice(teamIds.length?"Tränaren sparades. Tränaren loggar ut och in för att öppna tränarvyn.":"Tränarbehörigheten är borttagen.");
      await onUpdate?.();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function removeCoach(id){if(confirm("Ta bort tränarbehörigheten för alla lag? Kontot och spelarkopplingarna finns kvar."))await saveCoach(id,[]);}
  useEffect(()=>{let active=true;supabase.from("club_player_access").select("*").then(({data,error})=>{if(active){setLinks(data||[]);if(error)setError(error.message);}});return()=>{active=false;};},[]);
  async function link(e){e.preventDefault();setBusy(true);setError("");const {data:rows,error}=await supabase.from("club_player_access").insert({user_id:userId,player_id:playerId}).select();if(error)setError(error.code==="23505"?"Spelaren är redan kopplad till kontot.":error.message);else if(!rows?.length)setError("Kopplingen sparades inte.");else setLinks(prev=>[...prev,...rows]);setBusy(false);}
  async function unlink(row){if(!confirm("Ta bort kontots koppling till spelaren?"))return;setBusy(true);setError("");const {data:removed,error}=await supabase.from("club_player_access").delete().eq("user_id",row.user_id).eq("player_id",row.player_id).select();if(error)setError(error.message);else if(!removed?.length)setError("Kopplingen kunde inte tas bort.");else setLinks(prev=>prev.filter(r=>!(r.user_id===row.user_id&&r.player_id===row.player_id)));setBusy(false);}
  return <><div className="page-heading"><div><h1>Användare</h1><p>Koppla konton till spelare och tränare till lag.</p></div></div>{notice&&<p role="status">{notice}</p>}{coachForm&&<CoachForm key={coachForm.id||"new"} profiles={data.profiles.filter(p=>p.id!==currentUserId)} teams={data.teams} coach={coachForm.id?coachForm:null} assigned={coaches.filter(c=>c.user_id===coachForm.id).map(c=>c.team_id)} busy={busy} onSave={saveCoach} onClose={()=>{setCoachForm(null);onCloseAdd?.();}}/>}<Card><h2>Tränare och lag</h2>{!coaches.length&&<p>Inga tränare tilldelade ännu.</p>}{[...new Set(coaches.map(c=>c.user_id))].map(id=>{const account=data.profiles.find(p=>p.id===id);return <div className="attendance-row" key={id}><div><strong className="person-name"><PersonAvatar profileId={id} name={account?.full_name||"Tränare"}/>{account?.full_name||account?.email||"Tränare"}</strong><p>{account?.email}</p><p>{coaches.filter(c=>c.user_id===id).map(c=>data.teams.find(t=>t.id===c.team_id)?.name||"Lag").join(", ")}</p></div><div className="button-group"><Button disabled={busy} variant="secondary" onClick={()=>setCoachForm(account||{id})}>Ändra lag</Button><Button disabled={busy} variant="danger" onClick={()=>removeCoach(id)}>Ta bort tränarbehörighet</Button></div></div>;})}</Card>{error&&<p role="alert" className="error-banner">{error}</p>}<Card><form onSubmit={link}><div className="form-grid"><label className="field">Konto<select required disabled={busy} value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Välj konto</option>{data.profiles.map(p=><option key={p.id} value={p.id}>{p.full_name||p.email} · {p.email}</option>)}</select></label><label className="field">Spelare<select required disabled={busy} value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">Välj spelare</option>{data.players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><Button type="submit" disabled={busy}>Koppla konto</Button></form></Card><Card><h2>Spelarkopplingar</h2>{!links.length&&<p>Inga konton kopplade ännu.</p>}{links.map(r=><div className="attendance-row" key={`${r.user_id}_${r.player_id}`}><div><strong>{data.players.find(p=>String(p.id)===r.player_id)?.name||"Okänd spelare"}</strong><p>{data.profiles.find(p=>p.id===r.user_id)?.email||"Registrerat konto"}</p></div><Button disabled={busy} variant="danger" onClick={()=>unlink(r)}>Ta bort koppling</Button></div>)}</Card></>;
}
