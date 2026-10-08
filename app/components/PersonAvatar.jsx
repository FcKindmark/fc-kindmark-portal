"use client";
import {createContext,useContext,useEffect,useState} from "react";
import {supabase} from "../lib/supabaseClient";
const Portraits=createContext({});
export function PortraitProvider({userId,children}){
  const [portraits,setPortraits]=useState({});
  useEffect(()=>{
    let active=true,version=0;
    setPortraits({});
    async function refresh(){
      const current=++version;
      try{
        const {data,error}=await supabase.rpc("club_visible_portraits");
        if(error||!active||current!==version)return;
        const paths=[...new Set((data||[]).map(row=>row.path))];
        if(!paths.length){setPortraits({});return;}
        const signed=await supabase.storage.from("club-profile-photos").createSignedUrls(paths,3600);
        if(!active||current!==version||signed.error)return;
        const urls=new Map((signed.data||[]).map(row=>[row.path,row.signedUrl]));
        setPortraits(Object.fromEntries(data.map(row=>[`${row.kind}:${row.person_id}`,urls.get(row.path)||""])));
      }catch{/* Keep initials when a portrait cannot be loaded. */}
    }
    refresh();const timer=setInterval(refresh,3000000);
    window.addEventListener("focus",refresh);window.addEventListener("club-profile-saved",refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("club-profile-saved",refresh);};
  },[userId]);
  return <Portraits.Provider value={portraits}>{children}</Portraits.Provider>;
}
export default function PersonAvatar({playerId,profileId,name=""}){
  const portraits=useContext(Portraits),url=portraits[`${playerId?"player":"profile"}:${playerId||profileId}`];
  const [failed,setFailed]=useState("");
  const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"?";
  return <span className="person-avatar" aria-hidden="true">{url&&failed!==url?<img src={url} alt="" width="36" height="36" loading="lazy" onError={()=>setFailed(url)}/>:initials}</span>;
}
