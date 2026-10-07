"use client";
import { Card, Button } from "../UI";
export default function OverviewTab({ data, onNavigate }) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date());
  const upcoming = data.trainings.filter(t => t.date >= today).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0,5);
  return <><div className="page-heading"><div><p className="eyebrow">FC KINDMARK · {today}</p><h1>Klubböversikt</h1></div><Button onClick={() => onNavigate("trainings")}>Hantera träningar</Button></div>
  <div className="stats-grid">{[["Spelare",data.players.length],["Lag",data.teams.length],["Träningar",data.trainings.length],["Matcher",data.matches.length]].map(([label,value]) => <Card key={label}><p>{label}</p><strong className="stat-value">{value}</strong></Card>)}</div>
  <div className="overview-grid"><Card><h2>Kommande träningar</h2>{upcoming.length ? upcoming.map(t => <button className="schedule-row" key={t.id} onClick={() => onNavigate("trainings")}><strong>{t.date} · {t.time?.slice(0,5)}</strong><span>{data.teams.find(team => team.id === t.team_id)?.name || "Lag"} · {t.location}</span></button>) : <p className="muted">Inga kommande träningar registrerade.</p>}</Card>
  <Card><h2>Lagens spelare</h2>{data.teams.map(team => <div className="schedule-row" key={team.id}><strong>{team.name}</strong><span>{data.players.filter(p => p.team_id === team.id).length} spelare</span></div>)}<Button variant="secondary" onClick={() => onNavigate("players")}>Öppna spelarregistret</Button></Card></div></>;
}
