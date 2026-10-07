"use client";
import { useState } from "react";
const symbols = { overview: "◫", calendar: "▦", attendance: "✓", equipment: "◇", development: "↗", players: "♙", children: "♙", teams: "⚑", trainings: "▦", matches: "⚽", payments: "▤", messages: "✉", users: "♧" };
export default function ClubShell({ tabs, active, onChange, user, role, onLogout, children }) {
  const [expanded, setExpanded] = useState(false);
  const primary = ["overview", "calendar", "children", "players", "messages"].map(id => tabs.find(t => t.id === id)).filter(Boolean);
  function navigate(id) { onChange(id); setExpanded(false); }
  return <div className="club-shell"><aside className="club-sidebar">
    <div className="club-brand"><img src="/logo.png" alt="FC Kindmark"/><div><strong>FC KINDMARK</strong><span>Medlemsportal</span></div></div>
    <div className="sidebar-caption">DIN KLUBB</div>
    <nav aria-label="Klubbportal">{tabs.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} className={active === tab.id ? "active" : ""} onClick={() => navigate(tab.id)}><span className="nav-symbol" aria-hidden="true">{symbols[tab.id] || "•"}</span>{tab.label}</button>)}</nav>
    <footer><div className="account-block"><span className="account-avatar" aria-hidden="true">{user.email?.slice(0,1).toUpperCase()}</span><div><strong>{role}</strong><span>{user.email}</span></div></div><button onClick={onLogout}>Logga ut</button></footer>
  </aside><div className="club-workspace"><header className="workspace-header"><span>FC Kindmark <span className="header-divider">/</span> {tabs.find(t => t.id === active)?.label}</span><span className="role-pill">{role}</span></header><main className="club-content">{children}</main></div>
  <nav className="mobile-nav" aria-label="Snabbnavigering">{primary.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} onClick={() => navigate(tab.id)}><span aria-hidden="true">{symbols[tab.id]}</span>{tab.label}</button>)}<button aria-expanded={expanded} aria-controls="mobile-more" onClick={() => setExpanded(!expanded)}><span aria-hidden="true">☰</span>Mer</button></nav>
  {expanded && <div className="mobile-more" id="mobile-more"><div className="page-heading"><h2>Alla sidor</h2><button className="club-button secondary" onClick={() => setExpanded(false)}>Stäng</button></div>{tabs.map(tab => <button key={tab.id} onClick={() => navigate(tab.id)}>{tab.label}</button>)}<button onClick={onLogout}>Logga ut</button></div>}
  </div>;
}
