"use client";
import {useCallback,useEffect,useState} from "react";
import {Button} from "./UI";
import {pushAvailability,applicationKey,pushRequest,disableDevicePush} from "../lib/push";
export default function PushSettings({userId,compact=false}) {
  const [state,setState]=useState("loading"),[key,setKey]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const refresh=useCallback(async()=>{
    const available=pushAvailability();if(available!=="supported"){setState(available);return;}
    try{
      const result=await pushRequest({action:"config"});setKey(result.publicKey);
      const registration=await navigator.serviceWorker.getRegistration("/");
      const subscription=await registration?.pushManager.getSubscription();
      setState(Notification.permission==="denied"?"denied":subscription&&result.endpoints.includes(subscription.endpoint)?"enabled":"off");
    }catch(e){setError(e.message);setState("off");}
  },[]);
  useEffect(()=>{refresh();},[refresh,userId]);
  async function enable(){
    setBusy(true);setError("");setMessage("");
    try{
      // iOS requires this request directly from the button gesture, before network awaits.
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){setState(permission==="denied"?"denied":"off");return;}
      const publicKey=key||(await pushRequest({action:"config"})).publicKey;
      await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
      const registration=await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(publicKey)});
      await pushRequest({action:"subscribe",subscription:subscription.toJSON()});setState("enabled");setMessage("Notifikationer är aktiverade på den här enheten.");
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function disable(){setBusy(true);setError("");try{await disableDevicePush();setState("off");setMessage("Notifikationer är avstängda på den här enheten.");}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function test(){setBusy(true);setError("");try{const registration=await navigator.serviceWorker.getRegistration("/");const subscription=await registration?.pushManager.getSubscription();await pushRequest({action:"test",endpoint:subscription?.endpoint});setMessage("Testnotifikationen har skickats till den här enheten.");}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(compact&&["enabled","loading","unsupported"].includes(state))return null;
  return <section className={compact?"push-settings push-settings-compact":"push-settings"} aria-label="Notifikationer">
    {!compact&&<h3>Notifikationer</h3>}
    {state==="install"?<p>På iPhone: öppna i Safari → Dela → Lägg till på hemskärmen. Öppna sedan appen och aktivera notifikationer i Min profil.</p>:state==="unsupported"?<p>Den här webbläsaren stöder inte push. Kallelser och meddelanden finns fortfarande i portalen.</p>:state==="denied"?<p>Notifikationer är blockerade. Tillåt dem i enhetens inställningar och öppna appen igen.</p>:state==="loading"?<p>Läser inställningar…</p>:<>
      {!compact&&<p>{state==="enabled"?"Aktiverat på den här enheten. Du får notifikationer om nya kallelser och meddelanden.":"Få kallelser och meddelanden även när appen är stängd."}</p>}
      <div className="button-group">{state==="enabled"?<><Button variant="secondary" disabled={busy} onClick={test}>Testa notifikation</Button><Button variant="secondary" disabled={busy} onClick={disable}>Stäng av</Button></>:<Button disabled={busy} onClick={enable}>{busy?"Aktiverar…":"Aktivera notifikationer"}</Button>}</div>
    </>}
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error-banner">{error}</p>}
  </section>;
}
