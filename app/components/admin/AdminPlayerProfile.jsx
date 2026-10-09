"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Button} from "../UI";
import PersonAvatar from "../PersonAvatar";
import PlayerPhoto from "./PlayerPhoto";
import PlayerActions from "./PlayerActions";
import PlayerAccount from "./PlayerAccount";
const sizes=['104','110','116','122','128','134','140','146','152','158','164','170','176','XXS','XS','S','M','L','XL','XXL','3XL'];
const positions={Forward:'Anfallare',Midfielder:'Mittfältare',Defender:'Försvarare',Goalkeeper:'Målvakt'};
function initial(player){return Object.fromEntries(['name','birth_year','gender','number','position','team_id','membership_category','email','mother_name','mother_phone','mother_email','father_name','father_phone','father_email'].map(key=>[key,player[key]??(key==='membership_category'?'new':'')]));}
export default function AdminPlayerProfile({player,teams=[],accounts=[],readOnly=false,onUpdate,onClose}){
 const dialog=useRef(null),[fields,setFields]=useState(()=>initial(player));
 const [loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[panel,setPanel]=useState('');
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{let active=true;supabase.from('club_player_profiles').select('*').eq('player_id',player.id).maybeSingle().then(({data,error})=>{
  if(!active)return;if(error){setError(error.message);setFailed(true);}else setFields(previous=>({...previous,mobile:data?.mobile||'',clothing_size:data?.clothing_size||'',shoe_size:data?.shoe_size??'',telegram_username:data?.telegram_username||''}));setLoading(false);
 }).catch(error=>{if(active){setError(error.message);setFailed(true);setLoading(false);}});return()=>{active=false;};},[player.id]);
 function change(key){return e=>{setFields(previous=>({...previous,[key]:e.target.value}));setNotice('');};}
 function input(key,label,type='text',options={}){return <label className="field">{label}<input type={type} value={fields[key]??''} onChange={change(key)} {...options}/></label>;}
 async function save(event){event.preventDefault();setBusy(true);setError('');setNotice('');try{
  const {error}=await supabase.rpc('club_admin_save_player_details',{target:player.id,details:fields});if(error)throw error;
  setNotice('Spelarprofilen är sparad.');await onUpdate();
 }catch(error){setError(error.message);}finally{setBusy(false);}}
 async function remove(){if(!confirm(`Ta bort ${player.name} permanent? Närvaro, kallelser, medlemskort och spelarens betalningsposter tas bort. Konton och bankbetalningar finns kvar.`))return;
  setBusy(true);setError('');try{const {data,error}=await supabase.rpc('club_delete_player',{target:player.id});if(error)throw error;if(!data)throw new Error('Spelaren kunde inte tas bort.');onClose();await onUpdate();}catch(error){setError(error.message);}finally{setBusy(false);}}
 const phone={inputMode:'tel',pattern:'\\+?[0-9 ()-]{5,25}',maxLength:25};
 return <dialog ref={dialog} className="member-details-dialog admin-player-profile" aria-labelledby="admin-player-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
  <div className="player-profile-heading"><h2>Spelarprofil</h2><Button variant="secondary" disabled={busy} onClick={onClose}>Stäng</Button></div>
  <div className="player-profile-hero"><PersonAvatar playerId={player.id} name={player.name}/><h2 id="admin-player-title">{player.name}</h2><p>{[teams.find(team=>team.id===player.team_id)?.name,player.number!=null?`Tröjnummer ${player.number}`:null].filter(Boolean).join(" · ")}</p></div>
  {error&&<p role="alert" className="error-banner">{error}</p>}{notice&&<p role="status" className="success-banner">{notice}</p>}
  {!readOnly&&<details className="player-profile-section"><summary>Profilbild</summary><PlayerPhoto player={player} onUpdate={onUpdate}/></details>}
  {loading?<p role="status">Läser profil…</p>:!failed&&<form onSubmit={save}>
   <fieldset disabled={readOnly||busy} className="player-profile-fields">
    <section className="player-profile-section"><h3>Spelare och lag</h3><div className="form-grid">
     {input('name','Namn','text',{required:true,maxLength:160})}{input('birth_year','Födelseår','number',{min:1900,max:new Date().getFullYear()})}
     <label className="field">Lag<select value={fields.team_id} onChange={change('team_id')}><option value="">Ej lagfördelad</option>{teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
     <label className="field">Pojke / flicka<select value={fields.gender} onChange={change('gender')}><option value="">Ej angivet</option><option value="boy">Pojke</option><option value="girl">Flicka</option></select></label>
     {input('number','Tröjnummer','number',{min:0,max:999})}
     <label className="field">Position<select value={fields.position} onChange={change('position')}><option value="">Ej angivet</option>{Object.entries(positions).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <label className="field">Medlemskategori<select value={fields.membership_category} onChange={change('membership_category')}><option value="new">Ny medlem</option><option value="full">Medlem</option></select></label>
    </div></section>
    <section className="player-profile-section"><h3>Spelarens kontakt och storlekar</h3><div className="form-grid">
     {input('mobile','Mobilnummer','tel',phone)}{input('email','E-post','email',{maxLength:254})}
     <label className="field">Klädstorlek<select value={fields.clothing_size} onChange={change('clothing_size')}><option value="">Välj storlek</option>{sizes.map(size=><option key={size}>{size}</option>)}</select></label>
     {input('shoe_size','Skostorlek','number',{min:15,max:55,step:0.5})}
     {input('telegram_username','Telegram-användarnamn (valfritt)','text',{maxLength:33,pattern:'@?[A-Za-z][A-Za-z0-9_]{4,31}',placeholder:'@användarnamn'})}
    </div></section>
    {['mother','father'].map((parent,index)=><section key={parent} className="player-profile-section"><h3>Förälder {index+1}{index===0?' · Mamma':' · Pappa'}</h3><div className="form-grid">
     {input(`${parent}_name`,'Namn','text',{maxLength:160})}{input(`${parent}_phone`,'Telefon','tel',phone)}{input(`${parent}_email`,'E-post','email',{maxLength:254})}
    </div></section>)}
    {!readOnly&&<div className="player-profile-save"><Button type="submit" disabled={busy}>{busy?'Sparar…':'Spara spelarprofil'}</Button></div>}
   </fieldset>
  </form>}
  {!readOnly&&<>
   <details className="player-profile-section" open={panel==='parent'} onToggle={e=>{if(e.currentTarget.open)setPanel('parent');else setPanel(previous=>previous==='parent'?'':previous);}}><summary>Föräldrarnas portalåtkomst</summary>{panel==='parent'&&<PlayerActions player={player} teams={teams} accounts={accounts} mode="parent" onClose={()=>setPanel('')} onUpdate={onUpdate}/>}</details>
   <details className="player-profile-section" open={panel==='player'} onToggle={e=>{if(e.currentTarget.open)setPanel('player');else setPanel(previous=>previous==='player'?'':previous);}}><summary>Spelarens portalåtkomst</summary>{panel==='player'&&<PlayerAccount player={player} accounts={accounts} onClose={()=>setPanel('')} onUpdate={onUpdate}/>}</details>
   <details className="player-profile-section player-profile-danger"><summary>Ta bort spelare</summary><p>Raderar spelaren permanent. För att bara ta bort spelaren från laget väljer du ”Ej lagfördelad” ovan.</p><Button variant="danger" disabled={busy} onClick={remove}>Ta bort spelare permanent</Button></details>
  </>}
 </dialog>;
}
