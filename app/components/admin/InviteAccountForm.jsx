"use client";
import {useState} from "react";
import {inviteAccount} from "../../lib/invitations";
import {Button,Input} from "../UI";
export default function InviteAccountForm({kind,playerId,cardId,name,onSaved,initialEmail=""}) {
  const [email,setEmail]=useState(initialEmail),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function submit(event) {
    event.preventDefault();setBusy(true);setError("");setNotice("");
    try {const result=await inviteAccount({email,kind,player_id:playerId,card_id:cardId,name,resend:true});setNotice(result.message);await onSaved?.();setEmail("");}
    catch(error){setError(error.message);}finally{setBusy(false);}
  }
  return <form className="account-invite-form" onSubmit={submit}><label className="field">{kind==="player"?"Spelarens e-post":"E-postadress"}<Input type="email" required value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label><p className="muted">Nytt konto: välkomstmejl med lösenordslänk. Befintligt konto: kopplas direkt.</p>{error&&<p role="alert" className="error-banner">{error}</p>}{notice&&<p role="status">{notice}</p>}<Button type="submit" disabled={busy}>{busy?"Skickar…":"Bjud in och koppla konto"}</Button></form>;
}
