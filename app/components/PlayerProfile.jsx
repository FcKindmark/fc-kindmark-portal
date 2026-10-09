"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {Button} from "./UI";
import PersonAvatar from "./PersonAvatar";
const sizes=['104','110','116','122','128','134','140','146','152','158','164','170','176','XXS','XS','S','M','L','XL','XXL','3XL'];
export default function PlayerProfile({player,onClose,readOnly=false}){
 const dialog=useRef(null);
 const [mobile,setMobile]=useState(''),[size,setSize]=useState(''),[shoe,setShoe]=useState(''),[telegram,setTelegram]=useState('');
 const [loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{let active=true;supabase.from('club_player_profiles').select('*').eq('player_id',player.id).maybeSingle().then(({data,error})=>{
  if(!active)return;if(error){setError(error.message);setLoadFailed(true);}else{setMobile(data?.mobile||'');setSize(data?.clothing_size||'');setShoe(data?.shoe_size??'');setTelegram(data?.telegram_username||'');}setLoading(false);
 });return()=>{active=false;};},[player.id]);
 async function save(e){e.preventDefault();setBusy(true);setError('');setNotice('');try{
  const {error}=await supabase.rpc('club_save_player_profile',{target:player.id,p_mobile:mobile.trim(),p_clothing_size:size,p_shoe_size:shoe===''?null:Number(shoe),p_telegram_username:telegram.trim()});
  if(error)throw error;setNotice('Spelarprofilen är sparad.');
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <dialog ref={dialog} className="member-details-dialog profile-dialog" onCancel={e=>{if(busy)e.preventDefault();else onClose();}} aria-labelledby="player-profile-title">
  <div className="page-heading"><h2 id="player-profile-title">Spelarprofil</h2><Button variant="secondary" disabled={busy} onClick={onClose}>Stäng</Button></div>
  <div className="player-profile-hero"><PersonAvatar playerId={player.id} name={player.name}/><h3>{player.name}</h3><p>{[player.number!=null?`Tröjnummer ${player.number}`:null,player.position].filter(Boolean).join(' · ')}</p></div>
  {loading?<p>Läser profil…</p>:loadFailed?null:<form onSubmit={save}><fieldset disabled={readOnly||busy||!!error&&loading} className="player-profile-fields">
    <label className="field">Mobilnummer<input type="tel" autoComplete="tel" inputMode="tel" pattern="\+?[0-9 ()-]{5,25}" maxLength={25} value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="+46…"/></label>
    <label className="field">Klädstorlek<select value={size} onChange={e=>setSize(e.target.value)}><option value="">Välj storlek</option>{sizes.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="field">Skostorlek<input type="number" min="15" max="55" step="0.5" value={shoe} onChange={e=>setShoe(e.target.value)}/></label>
    <label className="field">Telegram-användarnamn (valfritt)<input maxLength={33} value={telegram} onChange={e=>setTelegram(e.target.value)} placeholder="@användarnamn" pattern="@?[A-Za-z][A-Za-z0-9_]{4,31}"/></label>
    {!readOnly&&<Button type="submit" disabled={busy}>{busy?'Sparar…':'Spara spelarprofil'}</Button>}
  </fieldset></form>}
  {error&&<p role="alert" className="error-banner">{error}</p>}{notice&&<p role="status" className="economy-notice">{notice}</p>}
 </dialog>;
}
