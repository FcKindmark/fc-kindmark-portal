"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Button} from "../UI";
export default function PlayerPaymentCorrection({payment,players,onClose,onSaved}){
 const dialog=useRef(null),[target,setTarget]=useState(""),[equipment,setEquipment]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{const node=dialog.current;if(node&&!node.open)node.showModal();},[]);
 async function save(e){
  e.preventDefault();setBusy(true);setError("");
  const {data,error}=await supabase.rpc("club_correct_player_payment",{p_original:payment.id,p_source:payment.player_id,p_target:target,p_move_equipment:equipment});
  if(error||!data){setError(error?.message||"Rättelsen kunde inte sparas.");setBusy(false);return;}
  await onSaved();onClose();
 }
 return <dialog ref={dialog} className="member-details-dialog" aria-labelledby="correct-player-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
 <h2 id="correct-player-title">Rätta spelare för inbetalning</h2>
 <p>Från: <strong>{payment.player_name}</strong></p>
 <p>Gäller en bokförd bankinbetalning på 850 SEK: medlemsavgift 50 SEK och träningskläder 800 SEK. Den gamla verifikationen bevaras med en motverifikation. Samma bankinbetalning kopplas till rätt spelare. Den tidigare spelarens medlemsavgift blir obetald.</p>
 <form onSubmit={save}><label className="field">Rätt spelare<select required disabled={busy} value={target} onChange={e=>setTarget(e.target.value)}><option value="">Välj spelare</option>{players.filter(p=>p.id!==payment.player_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label><input type="checkbox" checked={equipment} disabled={busy} onChange={e=>setEquipment(e.target.checked)}/> Flytta även registrerad utrustning till rätt spelare</label>
 {error&&<p role="alert" className="error-banner">{error}</p>}
 <div className="button-group"><Button type="submit" disabled={busy||!target}>{busy?"Rättar…":"Genomför rättelse · 850 SEK"}</Button><Button variant="secondary" disabled={busy} onClick={onClose}>Avbryt</Button></div></form></dialog>;
}
