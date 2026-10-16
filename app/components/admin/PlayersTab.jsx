"use client";
import PlayerAccount from "./PlayerAccount";
import AdminPlayerProfile from "./AdminPlayerProfile";
import PersonAvatar from "../PersonAvatar";
import { useState } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";
import {inviteAccount} from "../../lib/invitations";
import {canHavePlayerAccount} from "../../lib/memberProfiles.mjs";

export default function PlayersTab({ data, onUpdate, readOnly = false, onAddPlayer, onOpenMember }) {
  const players = data?.players || [];
  const teams = data?.teams || [];
  const [accountPlayer,setAccountPlayer]=useState(null);
  const [profilePlayer,setProfilePlayer]=useState(null);
  const [yearFilter, setYearFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const years = [...new Set(players.map(p => p.birth_year).filter(Boolean))].sort();
  const filteredPlayers = players.filter(p =>
    (!yearFilter || String(p.birth_year) === yearFilter) &&
    (!genderFilter || p.gender === genderFilter) &&
    (!teamFilter || (teamFilter === "unassigned" ? !p.team_id : p.team_id === teamFilter))
  ).sort((a, b) => (a.birth_year || 9999) - (b.birth_year || 9999) || a.name.localeCompare(b.name, "sv"));
  return (
    <>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {!readOnly&&onAddPlayer&&<Button onClick={onAddPlayer}>Ny spelare → Medlemmar</Button>}
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Spelare</h2>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <select aria-label="Filtrera födelseår" value={yearFilter} onChange={e => setYearFilter(e.target.value)}><option value="">Alla födelseår</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <select aria-label="Filtrera kön" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}><option value="">Pojkar och flickor</option><option value="boy">Pojkar</option><option value="girl">Flickor</option></select>
        <select aria-label="Filtrera lag" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}><option value="">Alla lag</option><option value="unassigned">Ej lagfördelade</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <span>{filteredPlayers.length} spelare</span>
      </div>
      {filteredPlayers.length === 0 ? (
        <Empty message="Inga spelare än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {filteredPlayers.map((player) => (
              <div key={player.id} className="player-list-row">
                <PersonAvatar playerId={player.id} name={player.name}/>
                <div className="player-list-identity">
                  <h3>{player.name}</h3>
                  <p>{[player.birth_year,teams.find(t=>t.id===player.team_id)?.name||"Ej lagfördelad"].filter(Boolean).join(" · ")}</p>
                </div>
                <Button variant="secondary" onClick={()=>setProfilePlayer(player.id)}>Spelarprofil</Button>{!readOnly&&<Button variant="secondary" onClick={()=>setAccountPlayer(player.id)}>Spelarinloggning</Button>}
              </div>
            ))}
          </div>
        </Card>
      )}
      {accountPlayer&&!readOnly&&players.some(p=>p.id===accountPlayer)&&<PlayerAccount key={accountPlayer} player={players.find(p=>p.id===accountPlayer)} accounts={data.profiles||[]} onUpdate={onUpdate} onClose={()=>setAccountPlayer(null)}/>}
      {profilePlayer&&players.some(player=>player.id===profilePlayer)&&<AdminPlayerProfile key={profilePlayer} player={players.find(player=>player.id===profilePlayer)} teams={teams} accounts={data.profiles||[]} onOpenMember={readOnly?undefined:onOpenMember} readOnly={readOnly} onUpdate={onUpdate} onClose={()=>setProfilePlayer(null)}/>}
    </>
  );
}

