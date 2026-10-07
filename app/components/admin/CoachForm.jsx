"use client";
import {useState} from "react";
import {Card,Button} from "../UI";
export default function CoachForm({profiles,teams,coach,assigned=[],busy,onSave,onClose}) {
  const [userId,setUserId]=useState(coach?.id||"");
  const [teamIds,setTeamIds]=useState(assigned);
  return <Card><form onSubmit={e=>{e.preventDefault();onSave(userId,teamIds);}}>
    <h2>{coach?"Ändra tränarens lag":"Lägg till tränare"}</h2>
    <p>Tränaren registrerar ett konto först. Välj kontot och de lag som tränaren ska ha tillgång till.</p>
    <label className="field">Tränarens konto<select required disabled={busy||Boolean(coach)} value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Välj registrerat konto</option>{profiles.filter(p=>p.role!=="admin").map(p=><option key={p.id} value={p.id}>{p.full_name||p.email} · {p.email}</option>)}</select></label>
    <fieldset disabled={busy}><legend>Lag med tränarbehörighet</legend>{teams.map(t=><label className="attendance-row" key={t.id}><span>{t.name}</span><input type="checkbox" checked={teamIds.includes(t.id)} onChange={e=>setTeamIds(prev=>e.target.checked?[...prev,t.id]:prev.filter(id=>id!==t.id))}/></label>)}</fieldset>
    <p>Kan skapa och ändra träningar, matcher, kallelser, närvaro och utvecklingsbedömningar för valda lag.</p>
    {!teams.length&&<p>Skapa ett lag innan du lägger till tränaren.</p>}
    <div className="button-group"><Button type="submit" disabled={busy||!userId||!teamIds.length}>{busy?"Sparar…":"Spara tränare"}</Button><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Avbryt</Button></div>
  </form></Card>;
}
