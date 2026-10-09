"use client";
import AdminPlayerProfile from "./AdminPlayerProfile";
import PersonAvatar from "../PersonAvatar";
import { useState } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";
import {inviteAccount} from "../../lib/invitations";

export default function PlayersTab({ data, onUpdate, readOnly = false, initialShowAdd = false, onCloseAdd }) {
  const players = data?.players || [];
  const teams = data?.teams || [];
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
  const [membershipCategory,setMembershipCategory]=useState("new");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [showAdd, setShowAdd] = useState(initialShowAdd && !readOnly);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("Forward");
  const [number, setNumber] = useState("");
  const [teamId, setTeamId] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [notice,setNotice]=useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setMembershipCategory("new");
    setName("");
    setPosition("Forward");
    setNumber("");
    setBirthYear("");
    setGender("");
    setTeamId("");
    setMotherEmail("");
    setFatherEmail("");
    setShowAdd(false);
    onCloseAdd?.();
  }

  async function savePlayer() {
    if (!name.trim()) {
      alert("Fyll i spelarens namn");
      return;
    }

    if (birthYear && (!Number.isInteger(Number(birthYear)) || Number(birthYear) < 1900 || Number(birthYear) > new Date().getFullYear())) {
      alert("Ange ett giltigt födelseår");
      return;
    }
    setLoading(true);setNotice("");
    try {
      const playerData = {
        name: name.trim(),
        position,
        birth_year: birthYear ? Number(birthYear) : null,
        gender: gender || null,
        number: number === "" ? null : parseInt(number, 10),
        team_id: teamId || null,
        mother_email: motherEmail.trim() || null,
        father_email: fatherEmail.trim() || null,
      };

      const result=await supabase.from("players").insert({...playerData,membership_category:membershipCategory}).select("id").single();
      if(result.error)throw result.error;
      const newEmails=[...new Set([motherEmail,fatherEmail].map(e=>e.trim().toLowerCase()).filter(Boolean))];
      const failures=[];
      for(const email of newEmails) {
        try {await inviteAccount({email,kind:"parent",player_id:result.data.id});}
        catch(error){failures.push(`${email}: ${error.message}`);}
      }
      setNotice(failures.length?`Spelaren är sparad. Kontrollera välkomstmejlet: ${failures.join(" ")}`:newEmails.length?"Spelaren är sparad och föräldrakontona är inbjudna eller kopplade.":"Spelaren är sparad.");
      resetForm();
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Spelare</h2>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <select aria-label="Filtrera födelseår" value={yearFilter} onChange={e => setYearFilter(e.target.value)}><option value="">Alla födelseår</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <select aria-label="Filtrera kön" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}><option value="">Pojkar och flickor</option><option value="boy">Pojkar</option><option value="girl">Flickor</option></select>
        <select aria-label="Filtrera lag" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}><option value="">Alla lag</option><option value="unassigned">Ej lagfördelade</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <span>{filteredPlayers.length} spelare</span>
      </div>
      {notice && <p role="status">{notice}</p>}
      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card style={{ maxWidth: "900px", width: "95%" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>Lägg till ny spelare</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              {<label className="field">Medlemskategori<select value={membershipCategory} onChange={e=>setMembershipCategory(e.target.value)}><option value="new">Ny medlem</option><option value="full">Medlem</option></select></label>}
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Namn</label>
                <Input placeholder="Spelarens namn" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Tröjnummer</label>
                <Input type="number" placeholder="7" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Position</label>
                <select value={position} onChange={(e) => setPosition(e.target.value)} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", cursor: "pointer" }}>
                  <option>Forward</option>
                  <option>Midfielder</option>
                  <option>Defender</option>
                  <option>Goalkeeper</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Lag</label>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", cursor: "pointer" }}>
                  <option value="">Välj lag...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name} ({team.age_group})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="player-birth-year">Födelseår</label>
                <Input id="player-birth-year" type="number" min="1900" max={new Date().getFullYear()} value={birthYear} onChange={e => setBirthYear(e.target.value)} />
              </div>
              <div>
                <label htmlFor="player-gender">Pojke / flicka</label>
                <select id="player-gender" value={gender} onChange={e => setGender(e.target.value)}><option value="">Ej angivet</option><option value="boy">Pojke</option><option value="girl">Flicka</option></select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Mammas e-post</label>
                <Input type="email" placeholder="mamma@email.com" value={motherEmail} onChange={(e) => setMotherEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Pappas e-post</label>
                <Input type="email" placeholder="pappa@email.com" value={fatherEmail} onChange={(e) => setFatherEmail(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="primary" onClick={savePlayer} disabled={loading} style={{ flex: 1 }}>{loading ? "Sparar..." : "Lägg till spelare"}</Button>
              <Button variant="secondary" onClick={resetForm} style={{ flex: 1 }}>Avbryt</Button>
            </div>
          </Card>
        </div>
      )}

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
                <Button variant="secondary" onClick={()=>setProfilePlayer(player.id)}>Spelarprofil</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      {profilePlayer&&players.some(player=>player.id===profilePlayer)&&<AdminPlayerProfile key={profilePlayer} player={players.find(player=>player.id===profilePlayer)} teams={teams} accounts={data.profiles||[]} readOnly={readOnly} onUpdate={onUpdate} onClose={()=>setProfilePlayer(null)}/>}
    </>
  );
}
