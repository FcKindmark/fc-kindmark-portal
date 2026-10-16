"use client";
import {useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {Button} from "../UI";
import {playerUsername} from "./BulkPlayerLogins";
export default function ManagedPlayerLogin({player,onSaved}){
 const [showPassword,setShowPassword]=useState(false);
 const [username,setUsername]=useState(()=>playerUsername(player.name)),[password,setPassword]=useState(()=>/^\d{4}-\d{2}-\d{2}$/.test(player.birth_date||"")?player.birth_date.replaceAll("-",""):""),[action,setAction]=useState("create"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function save(e){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  try{
   const {data,error}=await supabase.functions.invoke("club-player-login",{body:{player_id:player.id,username,password,action}});
   if(error){let detail;try{detail=await error.context?.json();}catch{}throw new Error(detail?.error||error.message);}
   if(data?.error)throw new Error(data.error);
   setMessage(data.message+" Användarnamn: "+data.username);setPassword("");await onSaved?.();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section><h3>Spelarinloggning utan e-post</h3><p>Skapa ett eget konto för {player.name}, även för yngre spelare. Kontot visar spelarens profil och lag. Förälderns konto påverkas inte.</p>
 <form onSubmit={save}><div className="form-grid">
 <label className="field">Åtgärd<select disabled={busy} value={action} onChange={e=>{setAction(e.target.value);setMessage("");}}><option value="create">Skapa spelarkonto</option><option value="reset">Sätt nytt lösenord</option></select></label>
 <label className="field">Användarnamn<input required autoCapitalize="none" autoCorrect="off" autoComplete="off" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}" minLength={3} maxLength={32} value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/></label>
 <label className="field">Lösenord · minst 8 tecken<input required type={showPassword?"text":"password"} autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label></div>
 <Button variant="secondary" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"Dölj lösenord":"Visa lösenord"}</Button>
 {player.birth_date?<p className="muted">Förifyllt med födelsedatum, ÅÅÅÅMMDD. Du kan ändra lösenordet före skapandet.</p>:<p className="muted">Fullständigt födelsedatum saknas i spelarprofilen. Lägg till det i Spelarprofil eller ange ett eget lösenord med minst 8 tecken.</p>}
 <p>Lämna användarnamn och lösenord direkt till spelaren eller vårdnadshavaren. Spelaren loggar in på portal.fckindmark.se och kan lägga appen på hemskärmen.</p>
 <Button type="submit" disabled={busy}>{busy?"Sparar…":action==="create"?"Skapa spelarkonto":"Spara nytt lösenord"}</Button></form>
 {error&&<p role="alert" className="error-banner">{error}</p>}{message&&<p role="status" className="success-banner">{message}</p>}
 </section>;
}
