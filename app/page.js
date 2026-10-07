"use client";

import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import PortalChoice from "./components/PortalChoice";
import PasswordRecovery from "./components/PasswordRecovery";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/admin/AdminDashboard";
import ParentDashboard from "./components/parent/ParentDashboard";
import SupporterDashboard from "./components/SupporterDashboard";



export default function App() {
  const [user, setUser] = useState(null);
  const [portalMode,setPortalMode]=useState(null);
  const [profileReady,setProfileReady]=useState(false);
  const [profileError,setProfileError]=useState("");
  const [profileAttempt,setProfileAttempt]=useState(0);
  const [supporter, setSupporter] = useState(null);
  const [hasChildren,setHasChildren]=useState(false);
  const [profile, setProfile] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("recovery") === "1") setRecovering(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") setRecovering(true);
      if (_event === "SIGNED_OUT") { setRecovering(false); setSupporter(null); setPortalMode(null); }
      setUser(session?.user || null);
      setProfile(null);setProfileReady(false);
      setLoading(false);
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setPortalMode(null);
  }, [user?.id]);

  useEffect(() => {
    let active=true;
    setProfileReady(false);setProfileError("");
    if(!user)return;
    Promise.all([
      supabase.from("club_member_cards").select("id").eq("user_id",user.id).eq("membership_type","supporter").limit(1),
      supabase.from("profiles").select("*").eq("id",user.id).single(),
      supabase.from("club_player_access").select("player_id").eq("user_id",user.id).limit(1)
    ]).then(([membership,profileResult,links])=>{
      if(!active)return;
      if(profileResult.error||membership.error||links.error){setProfileError(profileResult.error?.message||membership.error?.message||links.error.message);return;}
      setHasChildren(Boolean(links.data?.length));setSupporter(Boolean(membership.data?.length));setProfile(profileResult.data);setProfileReady(true);
    }).catch(error=>{if(active)setProfileError(error.message);});
    return ()=>{active=false;};
  }, [user,profileAttempt]);

  async function checkAuth() {
    const {data}=await supabase.auth.getSession();
    setUser(data?.session?.user||null);setLoading(false);
  }

  function handleLogin(u) {setProfileReady(false);setUser(u);}

  async function logout() {
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

  const role = user?.app_metadata?.club_role === "admin" ? "admin" : profile?.role === "coach" ? "coach" : "parent";
  const isAdmin = ["admin", "coach"].includes(role);

  if (!isAdmin && supporter === null) return <p role="status">Läser medlemskap…</p>;
  if (!isAdmin && supporter && !hasChildren) return <SupporterDashboard user={user} onLogout={logout}/>;
  if(role==="coach"&&!portalMode)return <PortalChoice onSelect={setPortalMode} onLogout={logout}/>;
  return isAdmin && portalMode!=="parent" ? (
    <AdminDashboard user={user} profile={{...profile, role}} onLogout={logout} onOpenFamily={role==="coach"?()=>setPortalMode("parent"):undefined} />
  ) : (
    <ParentDashboard user={user} profile={{...profile, role: "parent"}} onLogout={logout} onBackToStaff={role==="coach"?()=>setPortalMode("coach"):undefined} staffRole={role} />
  );
}