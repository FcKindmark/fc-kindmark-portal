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
import AddMemberChoice from "./AddMemberChoice";

export default function AdminDashboard({ user, profile, onLogout, onOpenFamily }) {
  const [memberAdd,setMemberAdd]=useState(null);
  const [showMemberChoice,setShowMemberChoice]=useState(false);
  function chooseMember(kind){
    setShowMemberChoice(false);
    setMemberAdd({kind,key:Date.now()});
    setActiveTab(kind === "player" ? "players" : kind === "coach" ? "users" : "membership");
  }
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
      const [playersRes, teamsRes, trainingsRes, matchesRes, paymentsRes, messagesRes, profilesRes, adminRes, cardsRes, coachTeamsRes] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("teams").select("*"),
        supabase.from("trainings").select("*"),
        supabase.from("matches").select("*"),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("payments").select("*"),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("messages").select("*"),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("profiles").select("*"),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        profile?.role === "coach" ? Promise.resolve({data: []}) : supabase.from("club_member_cards").select("*"),
        profile?.role === "coach" ? supabase.from("club_coach_teams").select("team_id").eq("user_id",user.id) : Promise.resolve({data: []}),
      ]);

      const failures = [playersRes, teamsRes, trainingsRes, matchesRes, paymentsRes, messagesRes, profilesRes, cardsRes, coachTeamsRes].filter(r => r.error);
      if (failures.length) setError("Vissa uppgifter kunde inte läsas: " + failures.map(r => r.error.message).join(" · "));
      const assigned=new Set((coachTeamsRes.data||[]).map(c=>c.team_id));
      const teamRows=(rows,key)=>profile?.role==="coach"?(rows||[]).filter(r=>assigned.has(r[key])):rows||[];
      setData({
        players: teamRows(playersRes.data,"team_id"),
        teams: teamRows(teamsRes.data,"id"),
        trainings: teamRows(trainingsRes.data,"team_id"),
        matches: teamRows(matchesRes.data,"team_id"),
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
  return <ClubShell tabs={allowedTabs} active={activeTab} onChange={tab=>{setMemberAdd(null);setActiveTab(tab);}} user={user} role={profile?.role === "coach" ? "Tränare" : "Admin"} onLogout={onLogout}>
    {onOpenFamily&&<div className="page-heading"><p>Du är i {profile?.role === "coach" ? "tränarportalen" : "administratörsportalen"}.</p><Button variant="secondary" onClick={onOpenFamily}>Föräldraportal · Mina barn</Button></div>}
    {activeTab === "overview" && profile?.role !== "coach" && <div className="page-heading"><Button onClick={()=>setShowMemberChoice(true)}>+ Lägg till medlem</Button></div>}
    {showMemberChoice && profile?.role !== "coach" && <AddMemberChoice onChoose={chooseMember} onClose={()=>setShowMemberChoice(false)}/>}
    {error && <p className="error-banner" role="alert">{error}<button onClick={loadData}>Försök igen</button></p>}
    {loading ? <p role="status">Läser in…</p> : <>
    {activeTab === "overview" && <OverviewTab data={data} onNavigate={setActiveTab} coach={profile?.role === "coach"}/>}
    {activeTab === "news" && <ClubNews admin/>}
    {activeTab === "membership" && <MemberCards key={memberAdd?.key || "members"} admin initialShowAdd={Boolean(memberAdd)} initialMembershipType={memberAdd?.kind} onCloseAdd={()=>setMemberAdd(null)} onUpdate={loadData}/>}
    {activeTab === "calendar" && <EventSchedule data={data} onNavigate={setActiveTab}/>}
    {activeTab === "attendance" && <AttendanceTab data={data} canDelete={profile?.role !== "coach"}/>}
    {activeTab === "equipment" && <PlayerRecords players={data.players} kind="equipment" canDelete={profile?.role !== "coach"}/>}
    {activeTab === "development" && <PlayerRecords players={data.players} kind="development" canDelete={profile?.role !== "coach"}/>}
    {activeTab === "players" && <PlayersTab key={memberAdd?.key || "players"} data={data} initialShowAdd={memberAdd?.kind === "player"} onCloseAdd={()=>setMemberAdd(null)} onUpdate={loadData} readOnly={profile?.role === "coach"}/>}
    {activeTab === "teams" && <TeamsTab data={data} onUpdate={loadData}/>}
    {activeTab === "trainings" && <TrainingsTab data={data} onUpdate={loadData} canDelete={profile?.role !== "coach"}/>}
    {activeTab === "matches" && <MatchesTab data={data} onUpdate={loadData} canDelete={profile?.role !== "coach"}/>}
    {activeTab === "payments" && <PaymentsTab data={data} onUpdate={loadData}/>}
    {activeTab === "messages" && <MessagesTab data={data} onUpdate={loadData}/>}
    {activeTab === "users" && <UsersTab key={memberAdd?.key || "users"} data={data} initialShowCoach={memberAdd?.kind === "coach"} onCloseAdd={()=>setMemberAdd(null)} currentUserId={user.id} onUpdate={loadData}/>}
    </>}
  </ClubShell>;
}
