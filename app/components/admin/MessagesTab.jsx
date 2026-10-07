"use client";
import { useState } from "react";
import { Card, Input, Button, Empty, Badge } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesTab({ data, onUpdate }) {
  const messages = data?.messages || [];
  const teams = data?.teams || [];
  const players = data?.players || [];
  const [showAdd, setShowAdd] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  function handleTeamSelect(e) {
    const selectedTeam = teams.find((t) => t.id === e.target.value);
    setTeamId(e.target.value);
    setTeamName(selectedTeam?.name || "");
  }

  async function sendMessage() {
    if (!teamId || !subject.trim() || !content.trim()) {
      alert("Välj lag, ämne och skriv meddelandet");
      return;
    }

    setLoading(true);
    try {
      const teamPlayers = players.filter((p) => p.team_id === teamId);

      if (teamPlayers.length === 0) {
        alert("Ingen spelare i detta lag");
        setLoading(false);
        return;
      }

      // Get all parents
      const parentEmails = new Set();
      teamPlayers.forEach((player) => {
        if (player.mother_email) parentEmails.add(player.mother_email);
        if (player.father_email) parentEmails.add(player.father_email);
      });

      // Create messages for all parents
      const messagesToSend = Array.from(parentEmails).map((email) => ({
        recipient_email: email,
        subject: subject.trim(),
        content: content.trim(),
        team_name: teamName,
        status: "sent",
      }));

      if (messagesToSend.length > 0) {
        const { error } = await supabase.from("messages").insert(messagesToSend);
        if (error) throw error;
      }

      setTeamId("");
      setTeamName("");
      setSubject("");
      setContent("");
      setShowAdd(false);
      onUpdate();
    } catch (err) {
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  async function deleteMessage(id) {
    if (!confirm("Är du säker på att du vill ta bort detta meddelande?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("messages").delete().eq("id", id);
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
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Meddelanden</h2>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ Skicka meddelande</Button>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <Card style={{ maxWidth: "600px", width: "95%" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>Skicka meddelande till lag</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Välj lag</label>
                <select value={teamId} onChange={handleTeamSelect} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", cursor: "pointer" }}>
                  <option value="">Välj lag...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name} ({team.age_group})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Ämne</label>
                <Input placeholder="Meddelandeämne" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Meddelande</label>
                <textarea placeholder="Ditt meddelande..." value={content} onChange={(e) => setContent(e.target.value)} style={{ padding: "12px 16px", borderRadius: "8px", border: "2px solid var(--border-color)", fontSize: "15px", width: "100%", color: "var(--text-dark)", background: "var(--white)", fontFamily: "inherit", minHeight: "120px", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <Button variant="primary" onClick={sendMessage} disabled={loading} style={{ flex: 1 }}>{loading ? "Skickas..." : "Skicka"}</Button>
                <Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Avbryt</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {messages.length === 0 ? (
        <Empty message="Inga meddelanden än" />
      ) : (
        <Card>
          <div style={{ display: "grid", gap: "15px" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ padding: "15px", background: "var(--beige-light)", borderRadius: "8px", borderLeft: "4px solid var(--royal-blue)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <div>
                    <h3 style={{ color: "var(--text-dark)", margin: "0 0 4px 0" }}>{msg.subject}</h3>
                    {msg.team_name && <p style={{ color: "var(--text-light)", fontSize: "12px", marginBottom: "4px" }}>Lag: {msg.team_name}</p>}
                    <p style={{ color: "var(--text-light)", fontSize: "12px", marginBottom: "8px" }}>Till: {msg.recipient_email}</p>
                  </div>
                  <Button 
                    variant="danger" 
                    onClick={() => deleteMessage(msg.id)} 
                    disabled={loading}
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                  >
                    Ta bort
                  </Button>
                </div>
                <p style={{ color: "var(--text-gray)", fontSize: "13px", lineHeight: "1.5" }}>{msg.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}