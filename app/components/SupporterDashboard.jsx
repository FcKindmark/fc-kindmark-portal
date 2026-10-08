"use client";
import {useEffect,useState} from "react";
import usePortalView from "../lib/usePortalView";
import {supabase} from "../lib/supabaseClient";
import ClubShell from "./ClubShell";
import SupporterPayments from "./SupporterPayments";
import MemberCards from "./MemberCards";
import ClubNews from "./ClubNews";
import {Card,Button,Empty} from "./UI";
import {resultLabel} from "../lib/matches";
export function SupporterFixtures({matches}) {
  return <section><h2>Klubbens matcher</h2>{!matches.length && <Empty message="Inga matcher att visa"/>}<div className="match-list">{matches.map(m=><Card key={m.id}><h3>FC Kindmark – {m.opponent}</h3><p>{m.date} · {m.time || "Tid ej angiven"} · {m.location || "Plats ej angiven"}</p><p className="match-score">{resultLabel(m)}</p></Card>)}</div></section>;
}
export default function SupporterDashboard({user,onLogout}) {
  const [active,setActive]=usePortalView("supporter",["overview","matches","news","membership","payments"],"overview",user.id);
  const [matches,setMatches]=useState([]),[error,setError]=useState("");
  useEffect(()=>{let cancelled=false;supabase.from("matches").select("id,opponent,date,time,location,club_score,opponent_score").order("date").then(r=>{if(!cancelled){setMatches(r.data||[]);setError(r.error?.message||"");}});return()=>{cancelled=true;};},[]);
  const tabs=[{id:"overview",label:"Hem"},{id:"matches",label:"Matcher"},{id:"news",label:"Klubbinformation"},{id:"membership",label:"Medlemskort"},{id:"payments",label:"Betalningar"}];
  return <ClubShell tabs={tabs} active={active} onChange={setActive} user={user} role="Stödmedlem" onLogout={onLogout}>{error && <p role="alert" className="error-banner">{error}</p>}{active==="overview" && <><div className="overview-hero"><p className="eyebrow">FC KINDMARK · STÖDMEDLEM</p><h1>En del av klubben.</h1><p>Tack för att du stödjer FC Kindmark. Här hittar du klubbens matcher, information och ditt personliga medlemskort.</p><div className="match-actions"><Button onClick={()=>setActive("membership")}>Öppna mitt medlemskort</Button><Button variant="secondary" onClick={()=>setActive("matches")}>Se matcher</Button></div></div><ClubNews/></>}{active==="matches" && <SupporterFixtures matches={matches}/>} {active==="news" && <ClubNews/>}{active==="membership" && <MemberCards/>}{active==="payments" && <SupporterPayments user={user}/>}</ClubShell>;
}
