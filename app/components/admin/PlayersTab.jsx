"use client";
import { useState } from "react";
import { Card, Input, Button, Empty, Badge } from "../UI";
import { supabase } from "../../lib/supabaseClient";
import {inviteAccount} from "../../lib/invitations";
import PlayerAccount from "./PlayerAccount";
import PlayerActions from "./PlayerActions";

export default function PlayersTab({ data, onUpdate, readOnly = false, initialShowAdd = false, onCloseAdd }) {
  const players = data?.players || [];
  const teams = data?.teams || [];
  const [action, setAction] = useState(null);
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
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("Forward");
  const [number, setNumber] = useState("");
  const [teamId, setTeamId] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [notice,setNotice]=useState("");
  const [loading, setLoading] = useState(false);

  function startEdit(player) {
    setEditingId(player.id);
    setName(player.name);
    setPosition(player.position || "Forward");
    setNumber(player.number ?? "");
    setBirthYear(player.birth_year ?? "");
    setGender(player.gender || "");
    setTeamId(player.team_id || "");
    setMotherEmail(player.mother_email || "");
    setFatherEmail(player.father_email || "");
    setShowAdd(true);
  }

  function resetForm() {
    setEditingId(null);
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

      const previous=players.find(p=>p.id===editingId);
      const result=editingId
        ? await supabase.from("players").update(playerData).eq("id",editingId).select("id").single()
        : await supabase.from("players").insert({...playerData,membership_category:membershipCategory}).select("id").single();
      if(result.error)throw result.error;
      const newEmails=[...new Set([motherEmail,fatherEmail].map(e=>e.trim().toLowerCase()).filter(Boolean))]
        .filter(email=>![previous?.mother_email,previous?.father_email].some(old=>old?.trim().toLowerCase()===email));
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

  async function removeFromTeam(player){
    if(!confirm(`Ta bort ${player.name} från laget? Spelaren och historiken finns kvar.`))return;
    setLoading(true);
    const r=await supabase.from("players").update({team_id:null}).eq("id",player.id).select("id");
    if(r.error || !r.data?.length)alert(r.error?.message || "Spelaren kunde inte tas bort från laget.");else await onUpdate();
    setLoading(false);
  }
  async function deletePlayer(id) {
    if (!confirm("Ta bort spelaren permanent? Även medlemskort, rabattkod, utrustning, bedömningar, närvaro, kallelser, kontokopplingar och spelarens betalningsposter tas bort. Kontona och genomförda bankbetalningar påverkas inte.")) return;

    setLoading(true);
    try {
      const { data: deleted, error } = await supabase.rpc("club_delete_player", {target:id});
      if (error) throw error;
      if (!deleted) throw new Error("Spelaren kunde inte tas bort.");
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
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>{editingId ? "Redigera spelare" : "Lägg till ny spelare"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              {!editingId && <label className="field">Medlemskategori<select value={membershipCategory} onChange={e=>setMembershipCategory(e.target.value)}><option value="new">Ny medlem</option><option value="full">Medlem</option></select></label>}
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
              <Button variant="primary" onClick={savePlayer} disabled={loading} style={{ flex: 1 }}>{loading ? "Sparar..." : editingId ? "Uppdatera" : "Lägg till spelare"}</Button>
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
              <div key={player.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--royal-blue)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <div>
                    <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>{player.number != null ? `#${player.number} ` : ""}{player.name}</h3>
                    <p style={{ color: "var(--text-light)", fontSize: "13px", marginBottom: "4px" }}>{[player.birth_year, player.gender === "boy" ? "Pojke" : player.gender === "girl" ? "Flicka" : null, teams.find(t => t.id === player.team_id)?.name || "Ej lagfördelad"].filter(Boolean).join(" · ")}</p>
                    {player.position && <p style={{ color: "var(--text-light)", fontSize: "13px" }}>{player.position}</p>}
                  </div>
                  {!readOnly && <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="secondary" onClick={() => startEdit(player)} style={{ padding: "8px 12px", fontSize: "12px" }}>Redigera</Button>
                    <Button variant="danger" onClick={() => deletePlayer(player.id)} disabled={loading} style={{ padding: "8px 12px", fontSize: "12px" }}>Ta bort spelare</Button>
                  </div>}
                </div>
                {!readOnly && <><div className="match-actions"><Button disabled={loading} variant="secondary" onClick={()=>setAction({id:player.id,mode:"parent"})}>Lägg till förälder</Button><Button disabled={loading} variant="secondary" onClick={()=>setAction({id:player.id,mode:"player"})}>Lägg till spelarkonto</Button><Button disabled={loading} variant="primary" onClick={()=>setAction({id:player.id,mode:"team"})}>Lägg till i lag</Button>{player.team_id && <Button disabled={loading} variant="danger" onClick={()=>removeFromTeam(player)}>Ta bort från lag</Button>}</div>{action?.id===player.id && (action.mode==="player"?<PlayerAccount key={player.id} player={player} accounts={data.profiles||[]} onClose={()=>setAction(null)} onUpdate={onUpdate}/>:<PlayerActions key={`${player.id}-${action.mode}`} player={player} teams={teams} accounts={data.profiles||[]} mode={action.mode} onClose={()=>setAction(null)} onUpdate={onUpdate}/>)}</>}
                {player.mother_email && <p style={{ color: "var(--text-light)", fontSize: "12px" }}>Mamma: {player.mother_email}</p>}
                {player.father_email && <p style={{ color: "var(--text-light)", fontSize: "12px" }}>Pappa: {player.father_email}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
