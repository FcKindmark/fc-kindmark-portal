"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, Button } from "../UI";
import PlayersTab from "./PlayersTab";
import TeamsTab from "./TeamsTab";
import TrainingsTab from "./TrainingsTab";
import MatchesTab from "./MatchesTab";
import PaymentsTab from "./PaymentsTab";
import MessagesTab from "./MessagesTab";
import UsersTab from "./UsersTab";
import ClubShell from "../ClubShell";
import MemberCards from "../MemberCards";
import ClubNews from "../ClubNews";
import OverviewTab from "./OverviewTab";
import EventSchedule from "../EventSchedule";
import AttendanceTab from "./AttendanceTab";
import PlayerRecords from "../PlayerRecords";

export default function AdminDashboard({ user, profile, onLogout }) {
  const [memberAdd,setMemberAdd]=useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    players: [],
    teams: [],
    trainings: [],
    matches: [],
    payments: [],
    messages: [],
    profiles: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [playersRes, teamsRes, trainingsRes, matchesRes, paymentsRes, messagesRes, profilesRes, adminRes, cardsRes] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("teams").select("*"),
        supabase.from("trainings").select("*"),
        supabase.from("matches").select("*"),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("payments").select("*"),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("messages").select("*"),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("profiles").select("*"),
        supabase.from("profiles").select("*").eq("email", user.email).single(),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("club_member_cards").select("*"),
      ]);

      const failures = [playersRes, teamsRes, trainingsRes, matchesRes, paymentsRes, messagesRes, profilesRes, cardsRes].filter(r => r.error);
      if (failures.length) setError("Vissa uppgifter kunde inte läsas: " + failures.map(r => r.error.message).join(" · "));
      setData({
        players: playersRes.data || [],
        teams: teamsRes.data || [],
        trainings: trainingsRes.data || [],
        matches: matchesRes.data || [],
        payments: paymentsRes.data || [],
        messages: messagesRes.data || [],
        profiles: profilesRes.data || [],
        memberCards: cardsRes.data || [],
      });

      setAdminInfo(adminRes.data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const tabs = [
    { id: "overview", label: "Översikt" },
    { id: "calendar", label: "Kalender" },
    { id: "membership", label: "Medlemmar" },
    { id: "news", label: "Klubbinformation" },
    { id: "attendance", label: "Närvaro" },
    { id: "equipment", label: "Utrustning" },
    { id: "development", label: "Utveckling" },
    { id: "players", label: "Spelare", img: "/icons/mascot.png" },
    { id: "teams", label: "Lag", icon: "⚽" },
    { id: "trainings", label: "Träningar", icon: "📅" },
    { id: "matches", label: "Matcher", icon: "🏆" },
    { id: "payments", label: "Betalningar", icon: "💳" },
    { id: "messages", label: "Meddelanden", icon: "💬" },
    { id: "users", label: "Användare", icon: "👥" },
  ];

  const allowedTabs = profile?.role === "coach" ? tabs.filter(t => ["overview","calendar","players","trainings","matches","attendance","development"].includes(t.id)) : tabs;
  return <ClubShell tabs={allowedTabs} active={activeTab} onChange={setActiveTab} user={user} role={profile?.role === "coach" ? "Tränare" : "Admin"} onLogout={onLogout}>
    {error && <p className="error-banner" role="alert">{error}<button onClick={loadData}>Försök igen</button></p>}
    {loading ? <p role="status">Läser in…</p> : <>
    {activeTab === "overview" && <OverviewTab data={data} onNavigate={setActiveTab} coach={profile?.role === "coach"}/>}
    {activeTab === "news" && <ClubNews admin/>}
    {activeTab === "membership" && <MemberCards admin initialShowAdd={memberAdd} onCloseAdd={()=>setMemberAdd(false)} onUpdate={loadData}/>}
    {activeTab === "calendar" && <EventSchedule data={data} onNavigate={setActiveTab}/>}
    {activeTab === "attendance" && <AttendanceTab data={data} canDelete={profile?.role !== "coach"}/>}
    {activeTab === "equipment" && <PlayerRecords players={data.players} kind="equipment" canDelete={profile?.role !== "coach"}/>}
    {activeTab === "development" && <PlayerRecords players={data.players} kind="development" canDelete={profile?.role !== "coach"}/>}
    {activeTab === "players" && <PlayersTab data={data} onUpdate={loadData} readOnly={profile?.role === "coach"}/>}
    {activeTab === "teams" && <TeamsTab data={data} onUpdate={loadData}/>}
    {activeTab === "trainings" && <TrainingsTab data={data} onUpdate={loadData} canDelete={profile?.role !== "coach"}/>}
    {activeTab === "matches" && <MatchesTab data={data} onUpdate={loadData} canDelete={profile?.role !== "coach"}/>}
    {activeTab === "payments" && <PaymentsTab data={data} onUpdate={loadData} onAddMember={()=>{setMemberAdd(true);setActiveTab("membership");}}/>}
    {activeTab === "messages" && <MessagesTab data={data} onUpdate={loadData}/>}
    {activeTab === "users" && <UsersTab data={data} onUpdate={loadData}/>}
    </>}
  </ClubShell>;
}
