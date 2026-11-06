"use client";
import { useState, useEffect, useCallback } from "react";
import {supabase} from "../lib/supabaseClient";
import {PortraitProvider} from "./PersonAvatar";
import NotificationBell from "./NotificationBell";
import PushSettings from "./PushSettings";
import MyProfile from "./MyProfile";
import usePersonalNotifications from "../lib/usePersonalNotifications";
const symbols = {applications:"✎", programs:"☰", profile:"♙", calls:"✓", membership: "◈", news: "☷", overview: "◫", calendar: "▦", attendance: "✓", equipment: "◇", development: "↗", players: "♙", children: "♙", teams: "⚑", trainings: "▦", matches: "⚽", payments: "▤", economy: "◎", messages: "✉", users: "♧" };
export default function ClubShell({ tabs, active, onChange, user, role, onLogout, children, notifications, onOpenNotification }) {
  const personalNotifications=usePersonalNotifications(user,role!=="Admin"&&notifications===undefined);
  const notificationItems=notifications??personalNotifications.items;
  const openNotification=onOpenNotification||personalNotifications.open;
  const [expanded, setExpanded] = useState(false);
  const [showProfile,setShowProfile]=useState(false),[account,setAccount]=useState(null),[photo,setPhoto]=useState(""),[profileError,setProfileError]=useState("");
  const loadProfile=useCallback(async()=>{
    const {data,error}=await supabase.from("profiles").select("id,role,full_name,avatar_path,mobile").eq("id",user.id).single();
    if(error){setProfileError(error.message);return;}setAccount(data);setProfileError("");
    if(data.avatar_path){const result=await supabase.storage.from("club-profile-photos").createSignedUrl(data.avatar_path,3600);setPhoto(result.data?.signedUrl||"");}else setPhoto("");
  },[user.id]);
  useEffect(()=>{loadProfile();window.addEventListener("focus",loadProfile);return()=>window.removeEventListener("focus",loadProfile);},[loadProfile]);
  async function openProfile(){setExpanded(false);if(!account)await loadProfile();setShowProfile(true);}

  useEffect(()=>{
    let locked=false,scrollY=0,bodyStyles=null,rootOverflow="";
    const keys=["position","top","left","right","width","overflow"];
    function unlock(){
      if(!locked)return;
      keys.forEach(key=>{document.body.style[key]=bodyStyles[key];});
      document.documentElement.style.overflow=rootOverflow;
      locked=false;window.scrollTo({top:scrollY,left:0,behavior:"instant"});
    }
    function sync(){
      const open=Boolean(document.querySelector('dialog[open],.club-modal,.mobile-more'));
      if(open&&!locked){
        scrollY=window.scrollY;bodyStyles=Object.fromEntries(keys.map(key=>[key,document.body.style[key]]));
        rootOverflow=document.documentElement.style.overflow;
        Object.assign(document.body.style,{position:"fixed",top:`-${scrollY}px`,left:"0",right:"0",width:"100%",overflow:"hidden"});
        document.documentElement.style.overflow="hidden";locked=true;
      }else if(!open)unlock();
    }
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["open","class"]});
    sync();return()=>{observer.disconnect();unlock();};
  },[]);

  const mobileIds = role==="Spelare" ? ["profile","calendar","calls","matches","messages"] : role==="Tränare" ? ["overview","calendar","calls","trainings","matches"] : role==="Admin" ? ["overview","calendar","membership","teams","economy"] : role==="Stödmedlem" ? ["overview","matches","news","membership"] : ["overview","calendar","calls","matches","children","messages"];
  const primary = mobileIds.map(id=>tabs.find(t=>t.id===id)).filter(Boolean);
  const secondary = tabs.filter(tab=>!primary.some(item=>item.id===tab.id));
  const navGroups = role==="Admin" ? [
    {label:"START",ids:["overview","calendar","news"]},
    {label:"MEDLEMMAR & LAG",ids:["applications","membership","players","teams","users"]},
    {label:"SPORT",ids:["trainings","matches","attendance","development","programs","equipment","calls"]},
    {label:"EKONOMI & KOMMUNIKATION",ids:["payments","economy","messages"]}
  ] : role==="Tränare" ? [
    {label:"ÖVERSIKT",ids:["overview","calendar","calls"]},
    {label:"LAG & AKTIVITETER",ids:["players","trainings","matches","attendance","development"]}
  ] : [{label:"DIN KLUBB",ids:tabs.map(t=>t.id)}];
  const groupedTabs = navGroups.map(group=>({...group,tabs:group.ids.map(id=>tabs.find(t=>t.id===id)).filter(Boolean)})).filter(group=>group.tabs.length);
  const extraTabs = tabs.filter(tab=>!navGroups.some(group=>group.ids.includes(tab.id)));
  if(extraTabs.length)groupedTabs.push({label:"ÖVRIGT",tabs:extraTabs});
  function navigate(id) { onChange(id); setExpanded(false); }
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});},[active]);
  return <PortraitProvider key={user.id} userId={user.id}><div className={`club-shell${role === "Admin" ? " admin-portal" : ""}`}><aside className="club-sidebar">
    <div className="club-brand"><img src="/logo.png" alt="FC Kindmark"/><div><strong>FC KINDMARK</strong><span>Medlemsportal</span></div></div>
    <nav aria-label="Klubbportal">{groupedTabs.map(group=><div key={group.label}><div className="sidebar-caption">{group.label}</div>{group.tabs.map(tab=><button key={tab.id} aria-current={active===tab.id?"page":undefined} className={active===tab.id?"active":""} onClick={()=>navigate(tab.id)}><span className="nav-symbol" aria-hidden="true">{symbols[tab.id]||"•"}</span>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}</div>)}</nav>
    <footer><div className="account-block"><span className="account-avatar" aria-hidden="true">{photo?<img src={photo} alt=""/>:(account?.full_name||user.email)?.slice(0,1).toUpperCase()}</span><div><strong>{account?.full_name||role}</strong><span>{user.email}</span></div></div>{role!=="Spelare"&&<button onClick={openProfile}>Min profil</button>}<button onClick={onLogout}>Logga ut</button></footer>
  </aside><div className="club-workspace"><header className="workspace-header"><span className="workspace-page-title">{tabs.find(t => t.id === active)?.label}</span><div className="profile-header-actions">{role!=="Admin"&&role!=="Spelare"&&<NotificationBell items={notificationItems} onOpen={openNotification} onSettings={openProfile} error={notifications===undefined?personalNotifications.error:""} onRetry={personalNotifications.refresh}/>}{role!=="Spelare"&&<button className="profile-link" onClick={openProfile}>Min profil</button>}<span className="role-pill">{role}</span></div></header><main className="club-content">{role!=="Admin"&&role!=="Spelare"&&<PushSettings key={user.id} userId={user.id} compact/>}{children}</main></div>
  <nav className={`mobile-nav${role==="Spelare"?" player-mobile-nav":""}`} aria-label="Snabbnavigering">{primary.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => navigate(tab.id)} aria-label={tab.label}><span aria-hidden="true">{symbols[tab.id]}</span><span className="mobile-nav-label">{tab.id==="messages"?"Medd.":tab.label}</span>{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}{<button aria-expanded={expanded} aria-controls="mobile-more" onClick={() => setExpanded(!expanded)}><span aria-hidden="true">☰</span>Mer</button>}</nav>
  {expanded && <div className="mobile-more" id="mobile-more"><div className="mobile-more-head"><h2>Alla sidor</h2><button className="mobile-more-close" onClick={() => setExpanded(false)} aria-label="Stäng menyn">×</button></div>{groupedTabs.map(group=>({...group,tabs:group.tabs.filter(tab=>secondary.some(item=>item.id===tab.id))})).filter(group=>group.tabs.length).map(group=><div key={group.label} className="mobile-more-group">{groupedTabs.length>1&&<div className="sidebar-caption">{group.label}</div>}{group.tabs.map(tab => <button key={tab.id} aria-current={active===tab.id?"page":undefined} onClick={() => navigate(tab.id)}><span className="nav-symbol" aria-hidden="true">{symbols[tab.id]||"•"}</span>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}</div>)}<div className="mobile-more-group"><div className="sidebar-caption">KONTO</div><button onClick={openProfile}><span className="nav-symbol" aria-hidden="true">♙</span>Min profil</button><button onClick={onLogout}><span className="nav-symbol" aria-hidden="true">⎋</span>Logga ut</button></div></div>}
  {showProfile&&(account?<MyProfile showNotifications={role!=="Admin"} user={user} profile={account} photo={photo} onClose={()=>setShowProfile(false)} onSaved={()=>{loadProfile();window.dispatchEvent(new Event("club-profile-saved"));}}/>:<div className="club-modal"><div className="club-card" role="alert"><p>{profileError||"Läser profil…"}</p><button onClick={loadProfile}>Försök igen</button><button onClick={()=>setShowProfile(false)}>Stäng</button></div></div>)}
  </div></PortraitProvider>;
}
