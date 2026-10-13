"use client";
import ParentDashboard from "./parent/ParentDashboard";
// Shares event/reply rendering, but uses the player's own navigation and scoped records.
export default function PlayerDashboard({user,profile,onLogout}) {
  return <ParentDashboard user={user} profile={{...profile,role:"player"}} onLogout={onLogout}/>;
}
