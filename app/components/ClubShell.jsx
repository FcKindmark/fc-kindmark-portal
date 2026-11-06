"use client";
import { useState, useEffect, useCallback } from "react";
import {supabase} from "../lib/supabaseClient";
import {PortraitProvider} from "./PersonAvatar";
import NotificationBell from "./NotificationBell";
import PushSettings from "./PushSettings";
import MyProfile from "./MyProfile";
import usePersonalNotifications from "../lib/usePersonalNotifications";
const person = "M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0";
const iconPaths = {
  overview: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  news: "M4 4h13a1 1 0 0 1 1 1v15H6a2 2 0 0 1-2-2zM18 8h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4",
  calendar: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4",
  trainings: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2",
  matches: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3",
  teams: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z",
  players: person, children: person, profile: person,
  attendance: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M8 12.5l3 3 5-6",
  development: "M3 17l6-6 4 4 8-8M15 7h6v6",
  programs: "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h6",
  equipment: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  calls: "M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0",
  membership: "M5.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6",
  applications: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4",
  users: "M4 15a4 4 0 1 0 8 0a4 4 0 1 0-8 0M11 12l9-9M16 7l3 3",
  payments: "M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18M7 15h4",
  economy: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  messages: "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 7l9 6 9-6"
};
const gold="#c79a1f",blue="#3b82c4",green="#3d9a63",purple="#8b5fbf",orange="#d9822b",teal="#1f9aa8";
const iconColors = {overview:gold,news:gold,profile:purple,calendar:blue,trainings:blue,matches:blue,teams:green,players:green,children:green,attendance:green,development:green,programs:green,equipment:green,calls:green,membership:purple,applications:purple,users:purple,payments:orange,economy:orange,messages:teal};
function NavIcon({id}) {
  return <svg style={{color:iconColors[id]||"#8a909c"}} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={iconPaths[id]||"M12 8v8M8 12h8"}/></svg>;
}
export default function ClubShell({ tabs, active, onChange, user, role, onLogout, children, notifications, onOpenNotification }) {
  const personalNotifications=usePersonalNotifications(user,role!=="Admin"&&notifications===undefined);
  const notificationItems=notifications??personalNotifications.items;
  const openNotification=onOpenNotification||personalNotifications.open;
  const [expanded, setExpanded] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
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
    {label:"START",ids:["overview","news"]},
    {label:"KALENDER",ids:["calendar","trainings","matches"]},
    {label:"LAG & SPELARE",ids:["teams","players","attendance","development","programs","equipment","calls"]},
    {label:"MEDLEMMAR",ids:["membership","applications","users"]},
    {label:"EKONOMI",ids:["payments","economy"]},
    {label:"KOMMUNIKATION",ids:["messages"]}
  ] : role==="Tränare" ? [
    {label:"ÖVERSIKT",ids:["overview","calendar","calls"]},
    {label:"LAG & AKTIVITETER",ids:["players","trainings","matches","attendance","development"]}
  ] : [{label:"DIN KLUBB",ids:tabs.map(t=>t.id)}];
  const groupedTabs = navGroups.map(group=>({...group,tabs:group.ids.map(id=>tabs.find(t=>t.id===id)).filter(Boolean)})).filter(group=>group.tabs.length);
  const extraTabs = tabs.filter(tab=>!navGroups.some(group=>group.ids.includes(tab.id)));
  if(extraTabs.length)groupedTabs.push({label:"ÖVRIGT",tabs:extraTabs});
  const collapsible = role === "Admin";
  const activeGroupLabel = groupedTabs.find(group => group.tabs.some(tab => tab.id === active))?.label;
  const shownGroupLabel = openGroup ?? activeGroupLabel;
  useEffect(() => { setOpenGroup(null); }, [active]);
  function navigate(id) { onChange(id); setExpanded(false); }
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:"instant"});},[active]);
  return <PortraitProvider key={user.id} userId={user.id}><div className={`club-shell${role === "Admin" ? " admin-portal" : ""}`}><aside className="club-sidebar">
    <div className="club-brand"><img src="/logo.png" alt="FC Kindmark"/><div><strong>FC KINDMARK</strong><span>Medlemsportal</span></div></div>
    <nav aria-label="Klubbportal">{groupedTabs.map(group=>{const open=!collapsible||shownGroupLabel===group.label;return <div key={group.label}>{collapsible?<button type="button" className="sidebar-caption sidebar-group-toggle" aria-expanded={open} onClick={()=>setOpenGroup(open?"":group.label)}><span>{group.label}</span><span aria-hidden="true">{open?"▾":"▸"}</span></button>:<div className="sidebar-caption">{group.label}</div>}{open&&group.tabs.map(tab=><button key={tab.id} aria-current={active===tab.id?"page":undefined} className={active===tab.id?"active":""} onClick={()=>navigate(tab.id)}><span className="nav-symbol" aria-hidden="true"><NavIcon id={tab.id}/></span>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}</div>})}</nav>
    <footer><div className="account-block"><span className="account-avatar" aria-hidden="true">{photo?<img src={photo} alt=""/>:(account?.full_name||user.email)?.slice(0,1).toUpperCase()}</span><div><strong>{account?.full_name||role}</strong><span>{user.email}</span></div></div>{role!=="Spelare"&&<button onClick={openProfile}>Min profil</button>}<button onClick={onLogout}>Logga ut</button></footer>
  </aside><div className="club-workspace"><header className="workspace-header"><span className="workspace-page-title">{tabs.find(t => t.id === active)?.label}</span><div className="profile-header-actions">{role!=="Admin"&&role!=="Spelare"&&<NotificationBell items={notificationItems} onOpen={openNotification} onSettings={openProfile} error={notifications===undefined?personalNotifications.error:""} onRetry={personalNotifications.refresh}/>}{role!=="Spelare"&&<button className="profile-link" onClick={openProfile}>Min profil</button>}<span className="role-pill">{role}</span></div></header><main className="club-content">{role!=="Admin"&&role!=="Spelare"&&<PushSettings key={user.id} userId={user.id} compact/>}{children}</main></div>
  <nav className={`mobile-nav${role==="Spelare"?" player-mobile-nav":""}`} aria-label="Snabbnavigering">{primary.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => navigate(tab.id)} aria-label={tab.label}><span aria-hidden="true"><NavIcon id={tab.id}/></span><span className="mobile-nav-label">{tab.id==="messages"?"Medd.":tab.label}</span>{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}{<button aria-expanded={expanded} aria-controls="mobile-more" onClick={() => setExpanded(!expanded)}><span aria-hidden="true">☰</span>Mer</button>}</nav>
  {expanded && <div className="mobile-more" id="mobile-more"><div className="page-heading"><h2>Alla sidor</h2><button className="club-button secondary" onClick={() => setExpanded(false)}>Stäng</button></div>{secondary.map(tab => <button key={tab.id} onClick={() => navigate(tab.id)}>{tab.label}{tab.count>0&&<span className="nav-count">{tab.count}</span>}</button>)}<button onClick={openProfile}>Min profil</button><button onClick={onLogout}>Logga ut</button></div>}
  {showProfile&&(account?<MyProfile showNotifications={role!=="Admin"} user={user} profile={account} photo={photo} onClose={()=>setShowProfile(false)} onSaved={()=>{loadProfile();window.dispatchEvent(new Event("club-profile-saved"));}}/>:<div className="club-modal"><div className="club-card" role="alert"><p>{profileError||"Läser profil…"}</p><button onClick={loadProfile}>Försök igen</button><button onClick={()=>setShowProfile(false)}>Stäng</button></div></div>)}
  </div></PortraitProvider>;
}
