"use client";
import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Button} from "../UI";
import InviteAccountForm from "./InviteAccountForm";
export default function MemberParentAccess({card,players=[],accounts=[],onSaved}){
 const [links,setLinks]=useState([]),[child,setChild]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const account=accounts.find(a=>a.id===card.user_id);
 async function load(){if(!card.user_id){setLinks([]);return;}const r=await supabase.from("club_player_access").select("player_id").eq("user_id",card.user_id);if(r.error)setError(r.error.message);else setLinks(r.data||[]);}
 useEffect(()=>{let active=true;setLinks([]);setError("");if(card.user_id)supabase.from("club_player_access").select("player_id").eq("user_id",card.user_id).then(r=>{if(active){setLinks(r.data||[]);setError(r.error?.message||"");}});return()=>{active=false;};},[card.user_id]);
 async function link(e){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await supabase.rpc("club_link_parent_member",{target:card.user_id,child,member_card_id:card.id});if(r.error)throw r.error;setChild("");await load();await onSaved?.();setNotice("Föräldern är kopplad. Medlemskapet är oförändrat.");}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function unlink(id){if(!confirm("Ta bort kopplingen till barnet? Medlemskapet finns kvar."))return;setBusy(true);setError("");try{const r=await supabase.from("club_player_access").delete().eq("user_id",card.user_id).eq("player_id",id).select("player_id");if(r.error)throw r.error;if(!r.data?.length)throw new Error("Kopplingen kunde inte tas bort.");await load();await onSaved?.();setNotice("Barnkopplingen är borttagen. Medlemskapet finns kvar.");}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(account?.role==="player")return <p>Detta är ett spelarkonto. Föräldraåtkomst kräver ett separat föräldrakonto.</p>;
 return <section className="player-profile-section"><h3>Förälder till barn</h3><p>En medlem eller stödmedlem kan också vara förälder. Koppla barnet här; medlemskort och medlemstyp behålls.</p>
 {error&&<p className="error-banner" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <form onSubmit={link}><label className="field">Barn / spelare<select required disabled={busy} value={child} onChange={e=>{setChild(e.target.value);setNotice("");}}><option value="">Välj barn</option>{players.filter(p=>!links.some(l=>l.player_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.name}{p.birth_year?` · ${p.birth_year}`:""}</option>)}</select></label>{card.user_id&&<Button type="submit" disabled={busy||!child}>{busy?"Kopplar…":"Lägg till som förälder"}</Button>}</form>
 {!card.user_id&&(child?<InviteAccountForm key={child} kind="parent" cardId={card.id} playerId={child} name={card.name} onSaved={onSaved}/>:<p>Välj ett barn. Sedan kan du bjuda in föräldern med e-post eller välja ett registrerat konto ovan.</p>)}
 {card.user_id&&(!links.length?<p>Inga barn kopplade ännu.</p>:links.map(l=><div className="attendance-row" key={l.player_id}><span>{players.find(p=>p.id===l.player_id)?.name||"Kopplad spelare"}</span><Button variant="secondary" disabled={busy} onClick={()=>unlink(l.player_id)}>Ta bort barnkoppling</Button></div>))}
 </section>;
}
