"use client";
import {useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {Button, Card, Input} from "./UI";
export default function PasswordRecovery({user, onDone}) {
 const [password,setPassword]=useState("");
 const [confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [saved,setSaved]=useState(false);
 async function save(e) {
  e.preventDefault();setError("");
  if(password!==confirmation){setError("Lösenorden matchar inte.");return;}
  if(password.length<8){setError("Använd minst 8 tecken.");return;}
  setBusy(true);
  try {const {error}=await supabase.auth.updateUser({password});if(error)throw error;setPassword("");setConfirmation("");setSaved(true);}
  catch(err){setError(err.message);}finally{setBusy(false);}
 }
 return <div className="auth-layout"><Card className="auth-card"><img className="auth-logo" src="/logo.png" alt="FC Kindmark"/><p className="eyebrow">DITT KONTO</p><h1>{saved?"Lösenordet är uppdaterat":"Välj ett nytt lösenord"}</h1>{saved?<><p className="muted">Ditt nya lösenord är sparat.</p><Button onClick={onDone}>Öppna portalen</Button></>:user?<form onSubmit={save}><p className="muted">Använd minst 8 tecken och välj ett lösenord du inte använder någon annanstans.</p><label className="field" htmlFor="new-password">Nytt lösenord<Input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label><label className="field" htmlFor="confirm-password">Bekräfta lösenord<Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>{error&&<p className="error-banner" role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy?"Sparar…":"Spara nytt lösenord"}</Button></form>:<><p className="error-banner" role="alert">Länken är ogiltig eller har gått ut. Begär en ny länk från inloggningssidan.</p><Button onClick={onDone}>Till inloggningen</Button></>}</Card></div>;
}
