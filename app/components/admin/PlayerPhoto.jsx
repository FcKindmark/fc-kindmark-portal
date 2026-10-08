"use client";
import {useRef,useState} from "react";
import {supabase} from "../../lib/supabaseClient";
import {preparePhoto} from "../../lib/photos";
import {Button} from "../UI";
export default function PlayerPhoto({player,onUpdate}){
  const gallery=useRef(null),camera=useRef(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(file){
    setBusy(true);setError("");let uploaded,stored=false;
    try{
      let path=null;
      if(file){const photo=await preparePhoto(file);uploaded=`players/${player.id}/${crypto.randomUUID()}.jpg`;
        const result=await supabase.storage.from("club-profile-photos").upload(uploaded,photo,{contentType:"image/jpeg",upsert:false});if(result.error)throw result.error;path=uploaded;}
      const result=await supabase.from("players").update({avatar_path:path}).eq("id",player.id).select("id");
      if(result.error)throw result.error;if(!result.data?.length)throw new Error("Bilden kunde inte sparas. Endast administratörer kan ändra spelarens bild.");
      stored=true;
      if(player.avatar_path)await supabase.storage.from("club-profile-photos").remove([player.avatar_path]);
      window.dispatchEvent(new Event("club-profile-saved"));await onUpdate();
    }catch(e){if(uploaded&&!stored)await supabase.storage.from("club-profile-photos").remove([uploaded]);setError(e.message);}finally{setBusy(false);}
  }
  function choose(event){const file=event.target.files?.[0];event.target.value="";if(file)save(file);}
  return <div className="player-photo-controls"><input ref={gallery} type="file" accept="image/*" hidden onChange={choose}/><input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={choose}/><div className="button-group"><Button variant="secondary" disabled={busy} onClick={()=>gallery.current.click()}>{busy?"Sparar bild…":player.avatar_path?"Ändra bild":"Lägg till bild"}</Button><Button variant="secondary" disabled={busy} onClick={()=>camera.current.click()}>Ta foto</Button>{player.avatar_path&&<Button variant="secondary" disabled={busy} onClick={()=>{if(confirm("Ta bort spelarens bild?"))save(null);}}>Ta bort bild</Button>}</div>{error&&<p role="alert">{error}</p>}</div>;
}
