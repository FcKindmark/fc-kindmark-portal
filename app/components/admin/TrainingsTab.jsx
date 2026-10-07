"use client";
import { useState, useEffect } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function TrainingsTab({ data, onUpdate }) {
  const trainings = data?.trainings || [];
  const teams = data?.teams || [];
  const players = data?.players || [];
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [teamId, setTeamId] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    loadAttendance();
  }, [trainings]);

  async function loadAttendance() {
    try {
      const trainingIds = trainings.map((t) => t.id);
      if (trainingIds.length === 0) return;

      const { data: attendanceData } = await supabase
        .from("training_attendance")
        .select("*")
        .in("training_id", trainingIds);

      const map = {};
      attendanceData?.forEach((record) => {
        map[`${record.training_id}_${record.player_id}`] = record.attended;
      });
      setAttendance(map);
    } catch (err) {
      console.error("Load attendance error:", err);
    }
  }

  function startEdit(training) {
    setEditingId(training.id);
    setDate(training.date);
    setTime(training.time);
    setLocation(training.location);
    setTeamId(training.team_id);
    setAdminComment(training.admin_comment || "");
    setShowAdd(true);
  }

  function resetForm() {
    setEditingId(null);
    setDate("");
    setTime("");
    setLocation("");
    setTeamId("");
    setAdminComment("");
    setShowAdd(false);
  }

  async function saveTraining() {
    if (!date.trim() || !time.trim() || !location.trim() || !teamId) {
      alert("Fyll i alla fält och välj ett lag");
      return;
    }
    setLoading(true);

    try {
      const teamName = teams.find((t) => t.id === teamId)?.name || "Laget";

      if (editingId) {
        const { error } = await supabase
          .from("trainings")
          .update({ date, time, location, team_id: teamId, admin_comment: adminComment.trim() || null })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { data: trainingData, error: trainingError } = await supabase
          .from("trainings")
          .insert({ date, time, location, team_id: teamId, admin_comment: adminComment.trim() || null })
          .select();

        if (trainingError) throw trainingError;


      }

      resetForm();
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  async function deleteTraining(id) {
    if (!confirm("Är du säker på att du vill ta bort denna träning?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
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
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Träningar</h2>
        <Button variant="primary" onClick={() => { resetForm(); setShowAdd(true); }}>+ Lägg till träning</Button>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <Card style={{ maxWidth: "500px", width: "90%" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>{editingId ? "Redigera träning" : "Lägg till träning"}</h3>
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
                <textarea placeholder="T.ex. Glöm inte vattenflaska..." value={adminComment} onChange={(e) => setAdminComment(e.target.value)} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", fontFamily: "inherit", minHeight: "80px", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Button variant="primary" onClick={saveTraining} disabled={loading} style={{ flex: 1 }}>{loading ? "Sparar..." : editingId ? "Uppdatera" : "Lägg till"}</Button>
                <Button variant="secondary" onClick={resetForm} style={{ flex: 1 }}>Avbryt</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {trainings.length === 0 ? (
        <Empty message="Inga träningar än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {trainings.map((t) => {
              const teamPlayers = players.filter((p) => p.team_id === t.team_id);
              const kommerCount = teamPlayers.filter((p) => attendance[`${t.id}_${p.id}`] === true).length;
              const kommerIntCount = teamPlayers.filter((p) => attendance[`${t.id}_${p.id}`] === false).length;

              return (
                <div key={t.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--gold)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: "var(--text-dark)", marginBottom: "5px", cursor: "pointer" }} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                        {expandedId === t.id ? "▼" : "▶"} {t.date} kl {t.time}
                      </h3>
                      <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "8px" }}>{t.location}</p>
                      {t.admin_comment && <p style={{ color: "var(--text-gray)", fontSize: "13px", fontStyle: "italic", marginBottom: "8px" }}>💬 {t.admin_comment}</p>}
                      <p style={{ color: "var(--text-dark)", fontSize: "13px", fontWeight: "600" }}>
                        ✓ Kommer: <span style={{ color: "var(--royal-blue)" }}>{kommerCount}</span> | 
                        ✗ Kommer inte: <span style={{ color: "var(--royal-red)" }}>{kommerIntCount}</span> |
                        ? Svar väntas: <span style={{ color: "var(--text-light)" }}>{teamPlayers.length - kommerCount - kommerIntCount}</span>
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button variant="secondary" onClick={() => startEdit(t)} style={{ padding: "8px 12px", fontSize: "12px" }}>Redigera</Button>
                      <Button variant="danger" onClick={() => deleteTraining(t.id)} disabled={loading} style={{ padding: "8px 12px", fontSize: "12px" }}>Ta bort</Button>
                    </div>
                  </div>

                  {expandedId === t.id && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #ddd" }}>
                      <h4 style={{ color: "var(--text-dark)", marginBottom: "12px", fontSize: "14px", fontWeight: "600" }}>Deltagare ({teamPlayers.length}):</h4>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {teamPlayers.map((player) => {
                          const status = attendance[`${t.id}_${player.id}`];
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
                                {status === true ? "✓ Kommer" : status === false ? "✗ Kommer inte" : "? Väntar"}
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