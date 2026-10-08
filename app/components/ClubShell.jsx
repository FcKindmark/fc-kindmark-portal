"use client";
import { useState, useEffect, useCallback } from "react";
import {supabase} from "../lib/supabaseClient";
import {PortraitProvider} from "./PersonAvatar";
import NotificationBell from "./NotificationBell";
import MyProfile from "./MyProfile";
const symbols = { calls:"✓", membership: "◈", news: "☷", overview: "◫", calendar: "▦", attendance: "✓", equipment: "◇", development: "↗", players: "♙", children: "♙", teams: "⚑", trainings: "▦", matches: "⚽", payments: "▤", economy: "◎", messages: "✉", users: "♧" };
export default function ClubShell({ tabs, active, onChange, user, role, onLogout, children, notifications, onOpenNotification }) {
  const [expanded, setExpanded] = useState(false);
  const [showProfile,setShowProfile]=useState(false),[account,setAccount]=useState(null),[photo,setPhoto]=useState(""),[profileError,setProfileError]=useState("");
  const loadProfile=useCallback(async()=>{
    const {data,error}=await supabase.from("profiles").select("id,full_name,avatar_path").eq("id",user.id).single();
    if(error){setProfileError(error.message);return;}setAccount(data);setProfileError("");
    if(data.avatar_path){const result=await supabase.storage.from("club-profile-photos").createSignedUrl(data.avatar_path,3600);setPhoto(result.data?.signedUrl||"");}else setPhoto("");
  },[user.id]);
  useEffect(()=>{loadProfile();window.addEventListener("focus",loadProfile);return()=>window.removeEventListener("focus",loadProfile);},[loadProfile]);
  async function openProfile(){setExpanded(false);if(!account)await loadProfile();setShowProfile(true);}
  const primary = (role === "Stödmedlem" ? ["overview","matches","news","membership"] : (tabs.some(t=>t.id==="calls")?["overview","calendar","calls","matches","children","messages"]:["overview", "calendar", "matches", "children", "players", "messages"])).map(id => tabs.find(t => t.id === id)).filter(Boolean);
  function navigate(id) { onChange(id); setExpanded(false); }
  return <PortraitProvider key={user.id} userId={user.id}><div className="club-shell"><aside className="club-sidebar">
    <div className="club-brand"><img src="/logo.png" alt="FC Kindmark"/><div><strong>FC KINDMARK</strong><span>Medlemsportal</span></div></div>
    <div className="sidebar-caption">DIN KLUBB</div>
    <nav aria-label="Klubbportal">{tabs.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} className={active === tab.id ? "active" : ""} onClick={() => navigate(tab.id)}><span className="nav-symbol" aria-hidden="true">{symbols[tab.id] || "•"}</span>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}</nav>
    <footer><div className="account-block"><span className="account-avatar" aria-hidden="true">{photo?<img src={photo} alt=""/>:(account?.full_name||user.email)?.slice(0,1).toUpperCase()}</span><div><strong>{account?.full_name||role}</strong><span>{user.email}</span></div></div><button onClick={openProfile}>Min profil</button><button onClick={onLogout}>Logga ut</button></footer>
  </aside><div className="club-workspace"><header className="workspace-header"><span>FC Kindmark <span className="header-divider">/</span> {tabs.find(t => t.id === active)?.label}</span><div className="profile-header-actions">{notifications&&<NotificationBell items={notifications} onOpen={onOpenNotification}/>}<button className="profile-link" onClick={openProfile}>Min profil</button><span className="role-pill">{role}</span></div></header><main className="club-content">{children}</main></div>
  <nav className="mobile-nav" aria-label="Snabbnavigering">{primary.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => navigate(tab.id)}><span aria-hidden="true">{symbols[tab.id]}</span>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}<button aria-expanded={expanded} aria-controls="mobile-more" onClick={() => setExpanded(!expanded)}><span aria-hidden="true">☰</span>Mer</button></nav>
  {expanded && <div className="mobile-more" id="mobile-more"><div className="page-heading"><h2>Alla sidor</h2><button className="club-button secondary" onClick={() => setExpanded(false)}>Stäng</button></div>{tabs.map(tab => <button key={tab.id} onClick={() => navigate(tab.id)}>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}<button onClick={openProfile}>Min profil</button><button onClick={onLogout}>Logga ut</button></div>}
  {showProfile&&(account?<MyProfile user={user} profile={account} photo={photo} onClose={()=>setShowProfile(false)} onSaved={()=>{loadProfile();window.dispatchEvent(new Event("club-profile-saved"));}}/>:<div className="club-modal"><div className="club-card" role="alert"><p>{profileError||"Läser profil…"}</p><button onClick={loadProfile}>Försök igen</button><button onClick={()=>setShowProfile(false)}>Stäng</button></div></div>)}
  </div></PortraitProvider>;
}
