"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, Button } from "../UI";
import ClubShell from "../ClubShell";
import MemberCards from "../MemberCards";
import ClubNews from "../ClubNews";
import EventSchedule from "../EventSchedule";
import MemberOverview from "./MemberOverview";
import PlayerRecords from "../PlayerRecords";
import ChildrenView from "./ChildrenView";
import TrainingsView from "./TrainingsView";
import MatchesView from "./MatchesView";
import PaymentsView from "./PaymentsView";
import MessagesView from "./MessagesView";

export default function ParentDashboard({ user, profile, onLogout, onBackToStaff, staffRole }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    players: [],
    trainings: [],
    matches: [],
    payments: [],
    messages: [],
    teams: [],
    ownMemberIds: [],
  });
  const [error, setError] = useState("");
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentInfo, setParentInfo] = useState(null);

  useEffect(() => {
    loadData();
    const refresh=()=>loadData();
    window.addEventListener("focus",refresh);
    return ()=>window.removeEventListener("focus",refresh);
  }, [user.id]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [playersRes, trainingsRes, matchesRes, paymentsRes, messagesRes, teamsRes, profileRes, accessRes, cardsRes] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("trainings").select("*"),
        supabase.from("matches").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("messages").select("*").eq("recipient_email", user.email),
        supabase.from("teams").select("*"),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("club_player_access").select("player_id").eq("user_id",user.id),
        supabase.from("club_member_cards").select("id").eq("user_id",user.id),
      ]);

      const failures = [playersRes, trainingsRes, matchesRes, paymentsRes, messagesRes, teamsRes, cardsRes].filter(r => r.error);
      if (failures.length) setError("Vissa uppgifter kunde inte läsas: " + failures.map(r => r.error.message).join(" · "));
      const {data:links,error:accessError}=accessRes;
      setAccess(links || []);
      if (accessError) setError("Spelarkopplingar kunde inte läsas: " + accessError.message);
      setData({
        players: playersRes.data || [],
        trainings: trainingsRes.data || [],
        matches: matchesRes.data || [],
        payments: paymentsRes.data || [],
        messages: messagesRes.data || [],
        teams: teamsRes.data || [],
        ownMemberIds: (cardsRes.data||[]).map(c=>c.id),
      });

      setParentInfo(profileRes.data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const tabs = [
    { id: "overview", label: "Hem" },
    { id: "calendar", label: "Kalender" },
    { id: "membership", label: "Medlemskort" },
    { id: "news", label: "Klubbinformation" },
    { id: "equipment", label: "Utrustning" },
    { id: "development", label: "Utveckling" },
    { id: "children", label: profile?.role === "player" ? "Min profil" : "Barn", img: "/icons/mascot-head.png" },
    { id: "trainings", label: "Träningar", icon: "📅" },
    { id: "matches", label: "Matcher", icon: "⚽" },
    { id: "payments", label: "Betalningar", icon: "💳" },
    { id: "messages", label: "Meddelanden", icon: "💬" },
  ];

  const mine = data.players.filter(p => access.some(a => a.player_id === String(p.id)) || [p.mother_email?.toLowerCase(),p.father_email?.toLowerCase()].includes(user.email?.toLowerCase()));
  const teamIds = new Set(mine.map(p => p.team_id).filter(Boolean));
  const memberData = {...data, teams:data.teams.filter(t=>teamIds.has(t.id)), trainings:data.trainings.filter(t=>teamIds.has(t.team_id)), matches:data.matches.filter(m=>teamIds.has(m.team_id))};
  return <ClubShell tabs={tabs} active={activeTab} onChange={setActiveTab} user={user} role={profile?.role === "player" ? "Spelare" : "Förälder"} onLogout={onLogout}>
    <div className="page-heading"><p>Föräldraportal · Mina barn</p><div className="button-group"><Button variant="secondary" disabled={loading} onClick={loadData}>Uppdatera</Button>{onBackToStaff&&<Button onClick={onBackToStaff}>{staffRole==="admin"?"Till administratörsportalen":"Till tränarportalen"}</Button>}</div></div>
    {error && <p className="error-banner" role="alert">{error}<button onClick={loadData}>Försök igen</button></p>}
    {loading ? <p role="status">Läser in…</p> : <>
    {activeTab === "overview" && <MemberOverview data={memberData} players={mine} onNavigate={setActiveTab}/>}
    {activeTab === "news" && <ClubNews/>}
    {activeTab === "membership" && <MemberCards/>}
    {activeTab === "calendar" && <EventSchedule data={memberData} member onNavigate={setActiveTab}/>}
    {activeTab === "children" && <ChildrenView data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)}/>}
    {activeTab === "trainings" && <TrainingsView data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)} onRefresh={loadData}/>}
    {activeTab === "matches" && <MatchesView data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)} onRefresh={loadData}/>}
    {activeTab === "payments" && <PaymentsView data={data} ownMemberIds={data.ownMemberIds} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)}/>}
    {activeTab === "messages" && <MessagesView data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)} onRefresh={loadData}/>}
    {activeTab === "equipment" && <PlayerRecords players={mine} kind="equipment" readOnly/>}
    {activeTab === "development" && <PlayerRecords players={mine} kind="development" readOnly/>}
    </>}
  </ClubShell>;
}
