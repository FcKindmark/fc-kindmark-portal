"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {inviteAccount} from "../../lib/invitations";
import {Button} from "../UI";
export default function ParentInvite({player,onClose,onSaved}){
 const dialog=useRef(null),[relation,setRelation]=useState("mother"),[name,setName]=useState(player.mother_name||""),[phone,setPhone]=useState(player.mother_phone||""),[email,setEmail]=useState(player.mother_email||""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{dialog.current?.showModal();},[]);
 function choose(value){setRelation(value);setName(player[value+"_name"]||"");setPhone(player[value+"_phone"]||"");setEmail(player[value+"_email"]||"");setNotice("");setError("");}
 async function submit(e){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   const values={[relation+"_name"]:name.trim(),[relation+"_phone"]:phone.trim()||null,[relation+"_email"]:email.trim().toLowerCase()};
   const saved=await supabase.from("players").update(values).eq("id",player.id).select("id");
   if(saved.error)throw saved.error;if(!saved.data?.length)throw new Error("Förälderns uppgifter kunde inte sparas.");
   const result=await inviteAccount({email:email.trim(),kind:"parent",player_id:player.id,name:name.trim(),resend:true});
   setNotice(result.message);await onSaved?.();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <dialog ref={dialog} className="member-details-dialog" aria-labelledby="parent-invite-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
 <div className="page-heading"><h2 id="parent-invite-title">Lägg till förälder · {player.name}</h2><Button variant="secondary" disabled={busy} onClick={onClose}>Stäng</Button></div>
 <form onSubmit={submit}><fieldset disabled={busy} className="player-profile-fields">
 <label className="field">Förälder<select value={relation} onChange={e=>choose(e.target.value)}><option value="mother">Mamma</option><option value="father">Pappa</option></select></label>
 <label className="field">Namn<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="field">Telefon<input type="tel" maxLength={25} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label className="field">E-post<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <p>Föräldern kopplas till barnet. Ett befintligt konto används om adressen redan finns.</p>
 <Button type="submit">{busy?"Bjuder in…":"Spara och bjud in"}</Button></fieldset></form>
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="error-banner">{error}</p>}
 </dialog>;
}
