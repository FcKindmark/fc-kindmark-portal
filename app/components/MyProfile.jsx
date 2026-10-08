"use client";
import {useEffect,useRef,useState} from "react";
import {supabase} from "../lib/supabaseClient";
import {Button} from "./UI";
const bucket="club-profile-photos";
import {preparePhoto} from "../lib/photos";
export default function MyProfile({user,profile,photo,onClose,onSaved}){
  const dialog=useRef(null),gallery=useRef(null),camera=useRef(null);
  const [name,setName]=useState(profile?.full_name||""),[newPhoto,setNewPhoto]=useState(null),[preview,setPreview]=useState(photo||""),[removePhoto,setRemovePhoto]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{if(!newPhoto)return;const url=URL.createObjectURL(newPhoto);setPreview(url);return()=>URL.revokeObjectURL(url);},[newPhoto]);
  async function choosePhoto(e){const file=e.target.files?.[0];e.target.value="";if(!file)return;setBusy(true);setError("");try{setNewPhoto(await preparePhoto(file));setRemovePhoto(false);}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function save(e){
    e.preventDefault();setBusy(true);setError("");let uploaded;
    try{
      let path=removePhoto?null:profile?.avatar_path||null;
      if(newPhoto){uploaded=`${user.id}/${crypto.randomUUID()}.jpg`;const {error}=await supabase.storage.from(bucket).upload(uploaded,newPhoto,{contentType:"image/jpeg",upsert:false});if(error)throw error;path=uploaded;}
      const {data,error}=await supabase.from("profiles").update({full_name:name.trim(),avatar_path:path}).eq("id",user.id).select("id,full_name,avatar_path").single();
      if(error)throw error;if(!data)throw new Error("Profilen kunde inte sparas.");
      if(profile?.avatar_path&&profile.avatar_path!==path)await supabase.storage.from(bucket).remove([profile.avatar_path]);
      await onSaved(data);onClose();
    }catch(e){if(uploaded)await supabase.storage.from(bucket).remove([uploaded]);setError(e.message);}finally{setBusy(false);}
  }
  return <dialog ref={dialog} className="member-details-dialog profile-dialog" onCancel={e=>{if(busy)e.preventDefault();else onClose();}} aria-labelledby="profile-title">
    <div className="page-heading"><h2 id="profile-title">Min profil</h2><Button variant="secondary" disabled={busy} onClick={onClose}>Stäng</Button></div>
    <form onSubmit={save}>
      <div className="profile-photo">{preview&&!removePhoto?<img src={preview} alt="Din profilbild"/>:<span aria-label="Ingen profilbild">{(name||user.email||"?").slice(0,1).toUpperCase()}</span>}</div>
      <input ref={gallery} type="file" accept="image/*" hidden onChange={choosePhoto}/><input ref={camera} type="file" accept="image/*" capture="user" hidden onChange={choosePhoto}/>
      <div className="button-group"><Button variant="secondary" disabled={busy} onClick={()=>gallery.current.click()}>Välj foto</Button><Button variant="secondary" disabled={busy} onClick={()=>camera.current.click()}>Ta foto</Button>{(preview||profile?.avatar_path)&&!removePhoto&&<Button variant="secondary" disabled={busy} onClick={()=>{setNewPhoto(null);setRemovePhoto(true);setPreview("");}}>Ta bort bild</Button>}</div>
      <label className="field">Namn<input required maxLength={100} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
      <label className="field">E-post<input value={user.email||""} disabled readOnly/></label>
      {error&&<p role="alert" className="error-banner">{error}</p>}
      <Button type="submit" disabled={busy||!name.trim()}>{busy?"Sparar…":"Spara profil"}</Button>
    </form>
  </dialog>;
}
