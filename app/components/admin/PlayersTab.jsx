"use client";
import { useState } from "react";
import { Card, Input, Button, Empty, Badge } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function PlayersTab({ data, onUpdate, readOnly = false }) {
  const players = data?.players || [];
  const teams = data?.teams || [];
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("Forward");
  const [number, setNumber] = useState("");
  const [teamId, setTeamId] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function startEdit(player) {
    setEditingId(player.id);
    setName(player.name);
    setPosition(player.position || "Forward");
    setNumber(player.number);
    setTeamId(player.team_id || "");
    setMotherEmail(player.mother_email || "");
    setFatherEmail(player.father_email || "");
    setShowAdd(true);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPosition("Forward");
    setNumber("");
    setTeamId("");
    setMotherEmail("");
    setFatherEmail("");
    setShowAdd(false);
  }

  async function savePlayer() {
    if (!name.trim()) {
      alert("Fyll i spelarens namn");
      return;
    }

    setLoading(true);
    try {
      const playerData = {
        name: name.trim(),
        position,
        number: number === "" ? null : parseInt(number, 10),
        team_id: teamId || null,
        mother_email: motherEmail.trim() || null,
        father_email: fatherEmail.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("players")
          .update(playerData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("players").insert(playerData);
        if (error) throw error;
      }

      resetForm();
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  async function deletePlayer(id) {
    if (!confirm("Är du säker på att du vill ta bort denna spelare?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
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
        {!readOnly && <Button variant="primary" onClick={() => { resetForm(); setShowAdd(true); }}>+ Lägg till spelare</Button>}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card style={{ maxWidth: "900px", width: "95%" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>{editingId ? "Redigera spelare" : "Lägg till ny spelare"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
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

      {players.length === 0 ? (
        <Empty message="Inga spelare än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {players.map((player) => (
              <div key={player.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--royal-blue)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <div>
                    <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>#{player.number} {player.name}</h3>
                    <p style={{ color: "var(--text-light)", fontSize: "13px", marginBottom: "4px" }}>{player.position}</p>
                  </div>
                  {!readOnly && <div style={{ display: "flex", gap: "8px" }}>
                    <Button variant="secondary" onClick={() => startEdit(player)} style={{ padding: "8px 12px", fontSize: "12px" }}>Redigera</Button>
                    <Button variant="danger" onClick={() => deletePlayer(player.id)} disabled={loading} style={{ padding: "8px 12px", fontSize: "12px" }}>Ta bort</Button>
                  </div>}
                </div>
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
