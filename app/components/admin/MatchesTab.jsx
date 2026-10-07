"use client";
import { useState, useEffect } from "react";
import { Card, Input, Button, Empty, Badge } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function MatchesTab({ data, onUpdate }) {
  const matches = data?.matches || [];
  const teams = data?.teams || [];
  const players = data?.players || [];
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [teamId, setTeamId] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    loadAttendance();
  }, [matches]);

  async function loadAttendance() {
    try {
      const matchIds = matches.map((m) => m.id);
      if (matchIds.length === 0) return;

      const { data: attendanceData } = await supabase
        .from("match_attendance")
        .select("*")
        .in("match_id", matchIds);

      const map = {};
      attendanceData?.forEach((record) => {
        map[`${record.match_id}_${record.player_id}`] = record.played;
      });
      setAttendance(map);
    } catch (err) {
      console.error("Load attendance error:", err);
    }
  }

  function startEdit(match) {
    setEditingId(match.id);
    setOpponent(match.opponent);
    setDate(match.date);
    setTime(match.time);
    setLocation(match.location);
    setTeamId(match.team_id);
    setAdminComment(match.admin_comment || "");
    setShowAdd(true);
  }

  function resetForm() {
    setEditingId(null);
    setOpponent("");
    setDate("");
    setTime("");
    setLocation("");
    setTeamId("");
    setAdminComment("");
    setShowAdd(false);
  }

  async function saveMatch() {
    if (!opponent.trim() || !date.trim() || !time.trim() || !teamId) {
      alert("Fyll i alla fält och välj ett lag");
      return;
    }
    setLoading(true);

    try {
      const teamName = teams.find((t) => t.id === teamId)?.name || "Laget";

      if (editingId) {
        const { error } = await supabase
          .from("matches")
          .update({ opponent: opponent.trim(), date, time, location: location.trim(), team_id: teamId, admin_comment: adminComment.trim() || null })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .insert({ opponent: opponent.trim(), date, time, location: location.trim(), status: "upcoming", team_id: teamId, admin_comment: adminComment.trim() || null })
          .select();

        if (matchError) throw matchError;

        const matchId = matchData[0].id;
        const teamPlayers = players.filter((p) => p.team_id === teamId);

        if (teamPlayers.length > 0) {
          const attendanceRecords = teamPlayers.map((player) => ({
            match_id: matchId,
            player_id: player.id,
            played: false,
          }));

          const { error: attendanceError } = await supabase
            .from("match_attendance")
            .insert(attendanceRecords);

          if (attendanceError) throw attendanceError;
        }
      }

      resetForm();
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  async function deleteMatch(id) {
    if (!confirm("Är du säker på att du vill ta bort denna match?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("matches").delete().eq("id", id);
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
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Matcher</h2>
        <Button variant="primary" onClick={() => { resetForm(); setShowAdd(true); }}>+ Lägg till match</Button>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card style={{ maxWidth: "500px", width: "90%" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>{editingId ? "Redigera match" : "Lägg till match"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
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
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Motståndare</label>
                <Input placeholder="Lagnamn" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Datum</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Tid</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Plats</label>
                <Input placeholder="Stadion" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Notering från admin</label>
                <textarea placeholder="T.ex. Kom i tid 30 min före..." value={adminComment} onChange={(e) => setAdminComment(e.target.value)} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", fontFamily: "inherit", minHeight: "80px", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Button variant="primary" onClick={saveMatch} disabled={loading} style={{ flex: 1 }}>{loading ? "Sparar..." : editingId ? "Uppdatera" : "Lägg till"}</Button>
                <Button variant="secondary" onClick={resetForm} style={{ flex: 1 }}>Avbryt</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {matches.length === 0 ? (
        <Empty message="Inga matcher än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {matches.map((m) => {
              const teamPlayers = players.filter((p) => p.team_id === m.team_id);
              const sparlarCount = teamPlayers.filter((p) => attendance[`${m.id}_${p.id}`] === true).length;
              const sparlarIntCount = teamPlayers.filter((p) => attendance[`${m.id}_${p.id}`] === false).length;

              return (
                <div key={m.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--royal-red)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: "var(--text-dark)", marginBottom: "5px", cursor: "pointer" }} onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                        {expandedId === m.id ? "▼" : "▶"} mot {m.opponent}
                      </h3>
                      <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "4px" }}>{m.date} kl {m.time}</p>
                      <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "8px" }}>{m.location}</p>
                      {m.admin_comment && <p style={{ color: "var(--text-gray)", fontSize: "13px", fontStyle: "italic", marginBottom: "8px" }}>💬 {m.admin_comment}</p>}
                      <p style={{ color: "var(--text-dark)", fontSize: "13px", fontWeight: "600" }}>
                        ✓ Spelar: <span style={{ color: "var(--royal-blue)" }}>{sparlarCount}</span> | 
                        ✗ Spelar inte: <span style={{ color: "var(--royal-red)" }}>{sparlarIntCount}</span> |
                        ? Svar väntas: <span style={{ color: "var(--text-light)" }}>{teamPlayers.length - sparlarCount - sparlarIntCount}</span>
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button variant="secondary" onClick={() => startEdit(m)} style={{ padding: "8px 12px", fontSize: "12px" }}>Redigera</Button>
                      <Button variant="danger" onClick={() => deleteMatch(m.id)} disabled={loading} style={{ padding: "8px 12px", fontSize: "12px" }}>Ta bort</Button>
                    </div>
                  </div>

                  {expandedId === m.id && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #ddd" }}>
                      <h4 style={{ color: "var(--text-dark)", marginBottom: "12px", fontSize: "14px", fontWeight: "600" }}>Spelare ({teamPlayers.length}):</h4>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {teamPlayers.map((player) => {
                          const status = attendance[`${m.id}_${player.id}`];
                          const bgColor = status === true ? "var(--beige)" : status === false ? "#f0f0f0" : "#fafafa";
                          const borderColor = status === true ? "var(--royal-blue)" : status === false ? "var(--text-light)" : "var(--border-color)";

                          return (
                            <div
                              key={player.id}
                              style={{
                                padding: "10px 12px",
                                background: bgColor,
                                borderRadius: "6px",
                                borderLeft: `4px solid ${borderColor}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ color: "var(--text-dark)", fontSize: "14px", fontWeight: "500" }}>
                                {player.name}
                              </span>
                              <span style={{ 
                                fontSize: "12px", 
                                fontWeight: "600", 
                                color: status === true ? "var(--royal-blue)" : status === false ? "var(--text-light)" : "var(--text-light)",
                                textTransform: "uppercase"
                              }}>
                                {status === true ? "✓ Spelar" : status === false ? "✗ Spelar inte" : "? Väntar"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}