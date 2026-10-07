"use client";

import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import PasswordRecovery from "./components/PasswordRecovery";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/admin/AdminDashboard";
import ParentDashboard from "./components/parent/ParentDashboard";
import SupporterDashboard from "./components/SupporterDashboard";



export default function App() {
  const [user, setUser] = useState(null);
  const [supporter, setSupporter] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("recovery") === "1") setRecovering(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") setRecovering(true);
      if (_event === "SIGNED_OUT") { setRecovering(false); setSupporter(null); }
      setUser(session?.user || null);
      setProfile(null);
      setLoading(false);
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadProfile(user);
  }, [user]);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user;
    
    if (u) {
      setUser(u);
      await loadProfile(u);
    }
    setLoading(false);
  }

  async function loadProfile(userObj) {
    const membership = await supabase.from("club_member_cards").select("id").eq("user_id",userObj.id).eq("membership_type","supporter").limit(1);
    setSupporter(Boolean(membership.data?.length));
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userObj.id)
      .single();

    if (data) {
      setProfile(data);
    }
  }

  async function handleLogin(u) {
    setUser(u);
    await loadProfile(u);
  }

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

  const role = user?.app_metadata?.club_role === "admin" ? "admin" : profile?.role === "coach" ? "coach" : "parent";
  const isAdmin = ["admin", "coach"].includes(role);

  if (!isAdmin && supporter === null) return <p role="status">Läser medlemskap…</p>;
  if (!isAdmin && supporter) return <SupporterDashboard user={user} onLogout={logout}/>;
  return isAdmin ? (
    <AdminDashboard user={user} profile={{...profile, role}} onLogout={logout} />
  ) : (
    <ParentDashboard user={user} profile={{...profile, role}} onLogout={logout} />
  );
}