"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import InviteAccountForm from "./InviteAccountForm";
import {Button} from "../UI";
export default function PlayerAccount({player,accounts,onUpdate,onClose}) {
 const [links,setLinks]=useState([]),[account,setAccount]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){const r=await supabase.from("club_player_access").select("user_id").eq("player_id",player.id);if(r.error)setError(r.error.message);else setLinks(r.data||[]);}
 useEffect(()=>{load();},[player.id]);
 async function save(target,enabled){
  setBusy(true);setError("");
  try {const {error}=await supabase.rpc("club_link_player_account",{target,player:player.id,enabled});if(error)throw error;await load();await onUpdate();onClose();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const linked=accounts.filter(a=>a.role==="player"&&links.some(l=>l.user_id===a.id));
 return <section className="player-actions-panel"><div className="page-heading"><h3>Spelarkonto · {player.name}</h3><Button disabled={busy} variant="secondary" onClick={onClose}>Stäng</Button></div>
 <p>Bjud in spelaren med en egen e-postadress eller välj ett befintligt konto här för tillgång till den egna profilen, kalendern, kallelserna och medlemskortet.</p>
 {error&&<p role="alert" className="error-banner">{error}</p>}
 <InviteAccountForm key={player.email||"player"} kind="player" playerId={player.id} name={player.name} initialEmail={player.email||""} onSaved={async()=>{await load();await onUpdate();}}/>
 <form onSubmit={e=>{e.preventDefault();save(account,true);}}><label className="field">Spelarens eget konto<select required disabled={busy} value={account} onChange={e=>setAccount(e.target.value)}><option value="">Välj registrerat konto</option>{accounts.filter(a=>!['coach','admin'].includes(a.role)&&!linked.some(l=>l.id===a.id)).map(a=><option value={a.id} key={a.id}>{a.full_name||a.email} · {a.email}</option>)}</select></label><Button type="submit" disabled={busy||!account}>Koppla spelarkonto</Button></form>
 {!linked.length&&<p>Inget spelarkonto kopplat ännu.</p>}{linked.map(a=><div className="attendance-row" key={a.id}><span>{a.full_name||a.email} · {a.email}</span><Button disabled={busy} variant="danger" onClick={()=>{if(confirm("Ta bort spelarens inloggningskoppling? Spelaren, föräldrakopplingarna och kontot finns kvar."))save(a.id,false);}}>Ta bort spelarkoppling</Button></div>)}
 </section>;
}
