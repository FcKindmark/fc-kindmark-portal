"use client";

import { useState, useEffect, useCallback } from "react";
import usePortalView from "../../lib/usePortalView";
import { supabase } from "../../lib/supabaseClient";
import { Card, Button } from "../UI";
import ClubShell from "../ClubShell";
import MemberCards from "../MemberCards";
import ClubNews from "../ClubNews";
import EventSchedule from "../EventSchedule";
import KallelserView from "./KallelserView";
import {familyInvitations,familyNotifications} from "../../lib/familyNotifications";
import {useStockholmToday} from "../../lib/useStockholmToday";
import {memberEventInfo} from "../../lib/schedule";
import MemberOverview from "./MemberOverview";
import PlayerRecords from "../PlayerRecords";
import ChildrenView from "./ChildrenView";
import TrainingsView from "./TrainingsView";
import MatchesView from "./MatchesView";
import PaymentsView from "./PaymentsView";
import MessagesView from "./MessagesView";

export default function ParentDashboard({ user, profile, onLogout, onBackToStaff, staffRole }) {
  const [activeTab, setActiveTab] = usePortalView("family", ["overview","calendar","membership","news","children","equipment","development","trainings","matches","calls","payments","messages"], "overview", user.id);
  const [data, setData] = useState({
    players: [],
    trainings: [],
    matches: [],
    payments: [],
    messages: [],
    teams: [],
    ownMemberIds: [],
  });
  const today=useStockholmToday();
  const [target,setTarget]=useState(null);
  useEffect(()=>{const q=new URLSearchParams(window.location.search);if(q.get("family")!=="calls"&&q.get("family")!=="messages")return;setTarget({kind:q.get("activity"),eventId:q.get("event"),messageId:q.get("message")});},[]);
  const [error, setError] = useState("");
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentInfo, setParentInfo] = useState(null);

  const loadData=useCallback(async({silent=false}={})=> {
    if(!silent)setLoading(true);
    setError("");
    try {
      const [playersRes, trainingsRes, matchesRes, paymentsRes, messagesRes, teamsRes, profileRes, accessRes, cardsRes, trainingCallsRes, trainingRepliesRes, matchCallsRes, matchRepliesRes, readsRes, targetsRes, coachInvitesRes] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("trainings").select("*"),
        supabase.from("matches").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("messages").select("*").order("created_at",{ascending:false}),
        supabase.from("teams").select("*"),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("club_player_access").select("player_id").eq("user_id",user.id),
        supabase.from("club_member_cards").select("id").eq("user_id",user.id),
        supabase.from("club_training_calls").select("*"),
        supabase.from("training_attendance").select("*"),
        supabase.from("club_match_calls").select("*"),
        supabase.from("club_match_replies").select("*"),
        supabase.from("club_message_reads").select("message_id"),
        supabase.rpc("club_message_targets"),
        supabase.rpc("club_coach_invitations"),
      ]);

      const failures = [playersRes, trainingsRes, matchesRes, paymentsRes, messagesRes, teamsRes, cardsRes, trainingCallsRes, trainingRepliesRes, matchCallsRes, matchRepliesRes, readsRes, targetsRes, coachInvitesRes].filter(r => r.error);
      if (failures.length) setError("Vissa uppgifter kunde inte läsas: " + failures.map(r => r.error.message).join(" · "));
      const {data:links,error:accessError}=accessRes;
      setAccess(links || []);
      if (accessError) setError("Spelarkopplingar kunde inte läsas: " + accessError.message);
      setData({
        players: playersRes.data || [],
        trainings: (trainingsRes.data||[]).map(t=>({...t,admin_comment:memberEventInfo(t.admin_comment)})),
        matches: (matchesRes.data||[]).map(m=>({...m,admin_comment:memberEventInfo(m.admin_comment)})),
        payments: paymentsRes.data || [],
        messages: (messagesRes.data||[]).filter(m=>m.recipient_email?.toLowerCase()===user.email?.toLowerCase()),
        trainingCalls:trainingCallsRes.data||[],trainingReplies:trainingRepliesRes.data||[],matchCalls:matchCallsRes.data||[],matchReplies:matchRepliesRes.data||[],messageReads:readsRes.data||[],messageTargets:targetsRes.data||[],
        teams: teamsRes.data || [],
        coachInvitations:(coachInvitesRes.data||[]).map(i=>({...i,answer:i.answer??undefined})),
        ownMemberIds: (cardsRes.data||[]).map(c=>c.id),
      });

      setParentInfo(profileRes.data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  },[user.id,user.email]);
  useEffect(()=>{loadData();const refresh=()=>loadData({silent:true});const timer=setInterval(refresh,30000);window.addEventListener("focus",refresh);return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);};},[loadData]);
  function navigate(tab,focus=null){setTarget(focus);setActiveTab(tab);const url=new URL(window.location.href);for(const key of ["event","activity","message"])url.searchParams.delete(key);if(focus?.eventId){url.searchParams.set("event",focus.eventId);url.searchParams.set("activity",focus.kind);}if(focus?.messageId)url.searchParams.set("message",focus.messageId);window.history.replaceState(window.history.state,"",url);loadData({silent:true});}
  const readMessage=useCallback(async(id)=>{const {error}=await supabase.rpc("club_read_message",{target:id});if(error){setError(error.message);return;}setData(prev=>({...prev,messageReads:[...(prev.messageReads||[]).filter(r=>r.message_id!==id),{message_id:id}]}));},[]);
  function openNotification(item){navigate(item.tab,{kind:item.kind,eventId:item.eventId,messageId:item.messageId});for(const id of item.messageIds||[])readMessage(id);}



  const mine = data.players.filter(p => access.some(a => a.player_id === String(p.id)) || [p.mother_email?.toLowerCase(),p.father_email?.toLowerCase()].includes(user.email?.toLowerCase()));
  const teamIds = new Set(mine.map(p => p.team_id).filter(Boolean));
  const invitations=[...familyInvitations(data,mine),...(data.coachInvitations||[])];
  const notificationState=familyNotifications(data,invitations,today);
  const tabs = [
    { id: "overview", label: "Hem" },
    { id: "calendar", label: "Kalender" },
    { id: "calls", label: "Kallelser", count:notificationState.pendingCount },
    { id: "membership", label: "Medlemskort" },
    { id: "news", label: "Klubbinformation" },
    { id: "equipment", label: "Utrustning" },
    { id: "development", label: "Utveckling" },
    { id: "children", label: profile?.role === "player" ? "Min profil" : "Barn", img: "/icons/mascot-head.png" },
    { id: "trainings", label: "Träningar", icon: "📅" },
    { id: "matches", label: "Matcher", icon: "⚽" },
    { id: "payments", label: "Betalningar", icon: "💳" },
    { id: "messages", label: "Meddelanden", count:notificationState.unreadCount, icon: "💬" },
  ];
  const memberData = {...data, teams:data.teams.filter(t=>teamIds.has(t.id)), trainings:data.trainings.filter(t=>teamIds.has(t.team_id)), matches:data.matches.filter(m=>teamIds.has(m.team_id))};
  return <ClubShell notifications={notificationState.notifications} onOpenNotification={openNotification} tabs={tabs} active={activeTab} onChange={navigate} user={user} role={profile?.role === "player" ? "Spelare" : "Förälder"} onLogout={onLogout}>
    <div className="page-heading"><p>{profile?.role==="player"?"Spelarportal · Min profil":"Föräldraportal · Mina barn"}</p><div className="button-group"><Button variant="secondary" disabled={loading} onClick={loadData}>Uppdatera</Button>{onBackToStaff&&<Button onClick={onBackToStaff}>{staffRole==="admin"?"Till administratörsportalen":staffRole==="coach"?"Till tränarportalen":"Till min portal"}</Button>}</div></div>
    {error && <p className="error-banner" role="alert">{error}<button onClick={loadData}>Försök igen</button></p>}
    {loading ? <p role="status">Läser in…</p> : <>
    {activeTab === "overview" && <MemberOverview self={profile?.role==="player"} data={memberData} players={mine} onNavigate={navigate}/>}
    {activeTab === "news" && <ClubNews/>}
    {activeTab === "membership" && <MemberCards/>}
    {activeTab === "calendar" && <EventSchedule data={memberData} member onNavigate={navigate}/>}
    {activeTab === "children" && <ChildrenView self={profile?.role==="player"} data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)}/>}
    {activeTab === "trainings" && <TrainingsView self={profile?.role==="player"} data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)} onRefresh={loadData}/>}
    {activeTab === "calls"&&<KallelserView invitations={invitations} today={today} target={target} onShowAll={()=>navigate("calls")} onRefresh={loadData}/>}
    {activeTab === "matches" && <MatchesView self={profile?.role==="player"} data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)} onRefresh={loadData}/>}
    {activeTab === "payments" && <PaymentsView self={profile?.role==="player"} data={data} ownMemberIds={data.ownMemberIds} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)}/>}
    {activeTab === "messages" && <MessagesView targetId={target?.messageId} onRead={readMessage} onOpenCall={t=>navigate("calls",{kind:t.event_kind,eventId:t.event_id})} data={data} userEmail={user.email} linkedPlayerIds={access.map(a => a.player_id)} onRefresh={loadData}/>}
    {activeTab === "equipment" && <PlayerRecords players={mine} kind="equipment" readOnly/>}
    {activeTab === "development" && <PlayerRecords players={mine} kind="development" readOnly/>}
    </>}
  </ClubShell>;
}
