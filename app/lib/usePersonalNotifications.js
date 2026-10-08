"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "./supabaseClient";
import {stockholmToday} from "./schedule";
import {familyNotifications} from "./familyNotifications";
export default function usePersonalNotifications(user,enabled){
 const [items,setItems]=useState([]),[error,setError]=useState("");
 const refresh=useCallback(async()=>{
  if(!enabled)return;
  const [messages,reads,targets,coaches]=await Promise.all([
   supabase.from("messages").select("id,subject,recipient_email,created_at").ilike("recipient_email",user.email).order("created_at",{ascending:false}),
   supabase.from("club_message_reads").select("message_id").eq("user_id",user.id),
   supabase.rpc("club_message_targets"),
   supabase.rpc("club_coach_invitations"),
  ]);
  if(messages.error||reads.error||targets.error||coaches.error){setError("Notifikationerna kunde inte läsas. Försök igen.");return;}
  const own=(messages.data||[]).filter(m=>m.recipient_email?.toLowerCase()===user.email?.toLowerCase());
  setItems(familyNotifications({messages:own,messageReads:reads.data||[],messageTargets:targets.data||[]},(coaches.data||[]).map(i=>({...i,answer:i.answer??undefined})),stockholmToday()).notifications);setError("");
 },[enabled,user.id,user.email]);
 useEffect(()=>{setItems([]);if(!enabled)return;let active=true;const reload=()=>{if(active)refresh();};reload();const timer=setInterval(reload,30000);window.addEventListener("focus",reload);window.addEventListener("club-coach-replied",reload);return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",reload);window.removeEventListener("club-coach-replied",reload);};},[enabled,refresh]);
 function open(item){
  const url=new URL(window.location.href);
  for(const key of ["family","push","activity","event","message"])url.searchParams.delete(key);
  url.searchParams.set("family",item.tab);url.searchParams.set("push","1");
  if(item.eventId){url.searchParams.set("event",item.eventId);url.searchParams.set("activity",item.kind);}
  if(item.messageId)url.searchParams.set("message",item.messageId);
  window.location.assign(url.href);
 }
 return {items,error,refresh,open};
}
