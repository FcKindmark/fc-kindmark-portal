"use client";
import { useState, useEffect } from "react";
import { Card, Button, Empty, Badge } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function MatchesView({ data, userEmail, linkedPlayerIds = [], onRefresh }) {
  const players = data?.players || [];
  const matches = data?.matches || [];
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState({});

  // Get user's children
  const myChildren = players.filter((p) => 
    linkedPlayerIds.includes(String(p.id)) || p.mother_email?.toLowerCase() === userEmail?.toLowerCase() || p.father_email?.toLowerCase() === userEmail?.toLowerCase()
  );

  // Get team IDs of user's children
  const myTeamIds = new Set(myChildren.map((c) => c.team_id).filter(Boolean));

  // Filter matches for user's children's teams
  const myMatches = matches.filter((m) => myTeamIds.has(m.team_id));

  // Load attendance data
  useEffect(() => {
    loadAttendance();
  }, [data.matches, data.players, userEmail, linkedPlayerIds.join(",")]);

  async function loadAttendance() {
    try {
      const matchIds = myMatches.map((m) => m.id);
      const playerIds = myChildren.map((c) => c.id);

      if (matchIds.length === 0 || playerIds.length === 0) return;

      const { data: attendanceData, error } = await supabase
        .from("match_attendance")
        .select("*")
        .in("match_id", matchIds)
        .in("player_id", playerIds);

      if (error) {
        console.error("Load attendance error:", error);
        return;
      }

      // Build attendance map
      const map = {};
      attendanceData.forEach((record) => {
        map[`${record.match_id}_${record.player_id}`] = record.played;
      });
      setAttendance(map);
    } catch (err) {
      console.error("Attendance load error:", err);
    }
  }

  async function updateAttendance(matchId, playerId, played) {
    setLoading(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("match_attendance")
        .select("id")
        .eq("match_id", matchId)
        .eq("player_id", playerId)
        .single();

      if (!existing) {
        // Insert if doesn't exist
        const { error: insertError } = await supabase
          .from("match_attendance")
          .insert({ match_id: matchId, player_id: playerId, played });

        if (insertError) throw insertError;
      } else {
        // Update if exists
        const { error: updateError } = await supabase
          .from("match_attendance")
          .update({ played })
          .eq("match_id", matchId)
          .eq("player_id", playerId);

        if (updateError) throw updateError;
      }

      // Update local state
      setAttendance((prev) => ({
        ...prev,
        [`${matchId}_${playerId}`]: played,
      }));

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Attendance error:", err);
      alert("Fel: " + err.message);
    }
    setLoading(false);
  }

  return (
    <>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Matcher</h2>
      </div>

      {myMatches.length === 0 ? (
        <Empty message="Inga matcher för dina barn ännu" />
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {myMatches.map((match) => {
            const childrenInMatch = myChildren.filter((c) => c.team_id === match.team_id);
            
            return (
              <Card key={match.id}>
                <div
                  onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: expandedMatch === match.id ? "16px" : "0",
                  }}
                >
                  <div>
                    <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>mot {match.opponent}</h3>
                    <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "4px" }}>{match.date} · {match.time || "Tid ej angiven"}</p>
                    <p style={{ color: "var(--text-light)", fontSize: "13px", marginBottom: "8px" }}>{match.location}</p>
                    {match.admin_comment && (
                      <p style={{ color: "var(--text-gray)", fontSize: "13px", marginTop: "8px", padding: "8px", background: "var(--beige)", borderRadius: "4px", borderLeft: "3px solid var(--royal-red)" }}>
                        💬 {match.admin_comment}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: "20px" }}>{expandedMatch === match.id ? "▼" : "▶"}</span>
                </div>

                {expandedMatch === match.id && (
                  <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px" }}>
                    <h4 style={{ color: "var(--text-dark)", marginBottom: "12px", fontWeight: "600" }}>Dina barn:</h4>
                    {childrenInMatch.map((child) => {
                      const isPlaying = attendance[`${match.id}_${child.id}`];
                      return (
                        <div key={child.id} style={{ padding: "12px", background: "#f9f9f9", borderRadius: "6px", marginBottom: "12px" }}>
                          <p style={{ color: "var(--text-dark)", fontWeight: "600", marginBottom: "8px" }}>{child.name}</p>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <Button
                              variant={isPlaying === true ? "primary" : "secondary"}
                              onClick={() => updateAttendance(match.id, child.id, true)}
                              disabled={loading}
                              style={{ flex: 1, fontSize: "13px", padding: "8px" }}
                            >
                              ✓ Spelar
                            </Button>
                            <Button
                              variant={isPlaying === false ? "danger" : "secondary"}
                              onClick={() => updateAttendance(match.id, child.id, false)}
                              disabled={loading}
                              style={{ flex: 1, fontSize: "13px", padding: "8px" }}
                            >
                              ✗ Spelar inte
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}