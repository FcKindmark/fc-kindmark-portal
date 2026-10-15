"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import {hasFamilyAccess} from "./lib/familyAccess.mjs";
import {sessionIdentity} from "./lib/sessionIdentity";
import {portalModeKey,validPortalMode} from "./lib/portalMode";
import {disableDevicePush} from "./lib/push";
import PortalChoice from "./components/PortalChoice";
import PasswordRecovery from "./components/PasswordRecovery";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/admin/AdminDashboard";
import ParentDashboard from "./components/parent/ParentDashboard";
import SupporterDashboard from "./components/SupporterDashboard";
import PlayerDashboard from "./components/PlayerDashboard";



export default function App() {
  const [user, setUser] = useState(null);
  const [portalMode,setPortalMode]=useState(null);
  const [profileReady,setProfileReady]=useState(false);
  const [profileError,setProfileError]=useState("");
  const [profileAttempt,setProfileAttempt]=useState(0);
  const [supporter, setSupporter] = useState(null);
  const [ownMember,setOwnMember]=useState(false);
  const [hasChildren,setHasChildren]=useState(false);
  const [profile, setProfile] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationRoute,setNotificationRoute]=useState(false);
  const identity = useRef("");

  useEffect(() => {
    const incoming=new URLSearchParams(window.location.search);setNotificationRoute(incoming.get("push")==="1"&&["calls","messages"].includes(incoming.get("family")));
    if (["recovery", "invite"].some(key => new URLSearchParams(window.location.search).get(key) === "1")) setRecovering(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") setRecovering(true);
      if (_event === "SIGNED_OUT") { setRecovering(false); setSupporter(null); setOwnMember(false); setPortalMode(null); }
      const next = session?.user || null;
      const nextIdentity = sessionIdentity(next);
      if (identity.current !== nextIdentity) {
        identity.current = nextIdentity;
        setProfile(null);setProfileReady(false);
      }
      setUser(next);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id || profile?.role !== "coach" || user?.app_metadata?.club_role === "admin") {
      setPortalMode(null);
      return;
    }
    try {const query=new URLSearchParams(window.location.search);setPortalMode(query.has("family")?"parent":validPortalMode(window.sessionStorage.getItem(portalModeKey(user.id))));}
    catch {setPortalMode(null);}
  }, [user?.id,profile?.role,user?.app_metadata?.club_role]);

  function choosePortal(value) {
    const mode = validPortalMode(value);
    if (!mode || !user?.id || profile?.role !== "coach") return;
    try {window.sessionStorage.setItem(portalModeKey(user.id),mode);} catch {}
    const url=new URL(window.location.href);if(mode==="coach")for(const key of ["family","event","activity","message"])url.searchParams.delete(key);window.history.replaceState(window.history.state,"",url);
    setPortalMode(mode);
  }

  useEffect(() => {
    let active=true;
    setProfileReady(false);setProfileError("");
    if(!user)return;
    Promise.all([
      supabase.from("club_member_cards").select("id,membership_type").eq("user_id",user.id),
      supabase.from("profiles").select("*").eq("id",user.id).single(),
      supabase.from("club_player_access").select("player_id").eq("user_id",user.id).limit(1),
      supabase.from("players").select("id,mother_email,father_email")
    ]).then(([membership,profileResult,links,children])=>{
      if(!active)return;
      if(profileResult.error||membership.error||links.error||children.error){setProfileError(profileResult.error?.message||membership.error?.message||links.error?.message||children.error.message);return;}
      setHasChildren(hasFamilyAccess(links.data,children.data,user.email));setSupporter(Boolean(membership.data?.some(card=>card.membership_type==="supporter")));setOwnMember(Boolean(membership.data?.some(card=>card.membership_type!=="supporter")));setProfile(profileResult.data);setProfileReady(true);
    }).catch(error=>{if(active)setProfileError(error.message);});
    return ()=>{active=false;};
  }, [user?.id,user?.app_metadata?.club_role,profileAttempt]);

  function handleLogin(u) {
    if (identity.current !== sessionIdentity(u)) { identity.current = sessionIdentity(u); setProfileReady(false); }
    setUser(u);
  }

  async function logout() {
    try { await disableDevicePush(); } catch { /* An expired browser subscription is removed by the delivery worker. */ }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--beige)", color: "var(--text-dark)" }}>
        Läser in...
      </div>
    );
  }

  if (recovering) {
    return <PasswordRecovery user={user} onDone={()=>{setRecovering(false);window.history.replaceState(null,"",window.location.pathname);}}/>;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if(profileError)return <main className="club-card"><p role="alert">Kunde inte läsa kontot: {profileError}</p><button onClick={()=>setProfileAttempt(n=>n+1)}>Försök igen</button><button onClick={logout}>Logga ut</button></main>;
  if(!profileReady)return <p role="status">Läser konto…</p>;

  const role = user?.app_metadata?.club_role === "admin" ? "admin" : profile?.role === "coach" ? "coach" : profile?.role === "player" ? "player" : "parent";
  const isAdmin = ["admin", "coach"].includes(role);

  if (!isAdmin && supporter === null) return <p role="status">Läser medlemskap…</p>;
  if(role==="player")return <PlayerDashboard key={user.id+"-player"} user={user} profile={profile} onLogout={logout}/>;
  if(notificationRoute && (role==="admin" || supporter&&!hasChildren))return <ParentDashboard key={user.id} user={user} profile={{...profile,role:"parent"}} onLogout={logout} staffRole={role} onBackToStaff={()=>{const url=new URL(window.location.href);for(const key of ["push","family","event","activity","message"])url.searchParams.delete(key);window.history.replaceState(window.history.state,"",url);setNotificationRoute(false);}}/>;
  if (!isAdmin && role!=="player" && supporter && !hasChildren) return <SupporterDashboard key={user.id+"-supporter"} user={user} onLogout={logout}/>;
  if (!isAdmin && role!=="player" && ownMember && !hasChildren) return <SupporterDashboard key={user.id+"-member"} memberOnly user={user} onLogout={logout}/>;
  if(role==="coach"&&!portalMode)return <PortalChoice onSelect={choosePortal} onLogout={logout}/>;
  return isAdmin && portalMode!=="parent" ? (
    <AdminDashboard key={user.id} user={user} profile={{...profile, role}} onLogout={logout} onOpenFamily={role==="coach"?()=>choosePortal("parent"):undefined} />
  ) : (
    <ParentDashboard key={user.id} user={user} profile={{...profile, role: role==="player"?"player":"parent"}} onLogout={logout} onBackToStaff={role==="coach"?()=>choosePortal("coach"):undefined} staffRole={role} />
  );
}

