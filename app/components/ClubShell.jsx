"use client";
export default function ClubShell({ tabs, active, onChange, user, role, onLogout, children }) {
  return <div className="club-shell"><aside className="club-sidebar">
    <div className="club-brand"><img src="/logo.png" alt="FC Kindmark"/><div><strong>FC KINDMARK</strong><span>Klubbportal · {role}</span></div></div>
    <nav aria-label="Klubbportal">{tabs.map(tab => <button key={tab.id} aria-current={active === tab.id ? "page" : undefined} className={active === tab.id ? "active" : ""} onClick={() => onChange(tab.id)}>{tab.label}</button>)}</nav>
    <footer><span>{user.email}</span><button onClick={onLogout}>Logga ut</button></footer>
  </aside><main className="club-content">{children}</main></div>;
}
