"use client";
import { useState, useEffect } from "react";
import { Card, Button, Empty, Badge } from "../UI";
import {dateLabel,memberEventInfo} from "../../lib/schedule";
import { supabase } from "../../lib/supabaseClient";

export default function TrainingsView({ data, userEmail, linkedPlayerIds = [], onRefresh, self=false }) {
  const players = data?.players || [];
  const trainings = data?.trainings || [];
  const [expandedTraining, setExpandedTraining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [calls,setCalls]=useState([]),[callsReady,setCallsReady]=useState(false),[callError,setCallError]=useState("");
  useEffect(()=>{let active=true;setCallsReady(false);supabase.from("club_training_calls").select("training_id,player_id").then(({data,error})=>{if(!active)return;if(error)setCallError(error.message);else{setCalls(data||[]);setCallError("");}setCallsReady(!error);});return()=>{active=false;};},[data.trainings]);

  // Get user's children
  const myChildren = players.filter((p) => 
    linkedPlayerIds.includes(String(p.id)) || p.mother_email?.toLowerCase() === userEmail?.toLowerCase() || p.father_email?.toLowerCase() === userEmail?.toLowerCase()
  );

  // Get team IDs of user's children
  const myTeamIds = new Set(myChildren.map((c) => c.team_id).filter(Boolean));

  // Filter trainings for user's children's teams
  const myTrainings = trainings.filter((t) => myTeamIds.has(t.team_id));

  // Load attendance data
  useEffect(() => {
    loadAttendance();
  }, [data.trainings, data.players, userEmail, linkedPlayerIds.join(",")]);

  async function loadAttendance() {
    try {
      const trainingIds = myTrainings.map((t) => t.id);
      const playerIds = myChildren.map((c) => c.id);

      if (trainingIds.length === 0 || playerIds.length === 0) return;

      const { data: attendanceData, error } = await supabase
        .from("training_attendance")
        .select("*")
        .in("training_id", trainingIds)
        .in("player_id", playerIds);

      if (error) {
        console.error("Load attendance error:", error);
        return;
      }

      // Build attendance map
      const map = {};
      attendanceData.forEach((record) => {
        map[`${record.training_id}_${record.player_id}`] = record.attended;
      });
      setAttendance(map);
    } catch (err) {
      console.error("Attendance load error:", err);
    }
  }

  async function updateAttendance(trainingId, playerId, attended) {
    setLoading(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("training_attendance")
        .select("id")
        .eq("training_id", trainingId)
        .eq("player_id", playerId)
        .single();

      if (!existing) {
        // Insert if doesn't exist
        const { error: insertError } = await supabase
          .from("training_attendance")
          .insert({ training_id: trainingId, player_id: playerId, attended });

        if (insertError) throw insertError;
      } else {
        // Update if exists
        const { error: updateError } = await supabase
          .from("training_attendance")
          .update({ attended })
          .eq("training_id", trainingId)
          .eq("player_id", playerId);

        if (updateError) throw updateError;
      }

      // Update local state
      setAttendance((prev) => ({
        ...prev,
        [`${trainingId}_${playerId}`]: attended,
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

  async function clearReply(trainingId,playerId){
    if(!confirm("Ta bort ditt svar för denna träning?"))return;
    setLoading(true);
    const r=await supabase.from("training_attendance").delete().eq("training_id",trainingId).eq("player_id",playerId).select("id");
    if(r.error || !r.data?.length)alert(r.error?.message || "Svaret kunde inte tas bort.");else {await loadAttendance();if(onRefresh)await onRefresh();}
    setLoading(false);
  }
  return (
    <>
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Träningar</h2>
      </div>

      {myTrainings.length === 0 ? (
        <Empty message={self?"Inga träningar för dig ännu":"Inga träningar för dina barn ännu"} />
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {myTrainings.map((training) => {
            const information=memberEventInfo(training.admin_comment);
            const childrenInTraining = myChildren.filter((c) => c.team_id === training.team_id && (!training.calls_sent_at||(callsReady&&calls.some(row=>row.training_id===training.id&&row.player_id===c.id))));
            
            return (
              <Card key={training.id}>
                <div
                  onClick={() => setExpandedTraining(expandedTraining === training.id ? null : training.id)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: expandedTraining === training.id ? "16px" : "0",
                  }}
                >
                  <div>
                    <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>{dateLabel(training.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"})} kl {training.time?.slice(0,5)||"Tid ej angiven"}</h3>
                    <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "4px" }}>{training.location}</p>
                    {information && (
                      <p style={{ color: "var(--text-gray)", fontSize: "13px", marginTop: "8px", padding: "8px", background: "var(--beige)", borderRadius: "4px", borderLeft: "3px solid var(--gold)" }}>
                        {information}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: "20px" }}>{expandedTraining === training.id ? "▼" : "▶"}</span>
                </div>

                {expandedTraining === training.id && (
                  <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px" }}>
                    <h4 style={{ color: "var(--text-dark)", marginBottom: "12px", fontWeight: "600" }}>{self?"Din kallelse":"Kallade barn"}</h4>{callError&&<p role="alert" className="error-banner">{callError}</p>}{training.calls_sent_at&&!callsReady&&!callError&&<p>Läser kallelse…</p>}{training.calls_sent_at&&callsReady&&!childrenInTraining.length&&<p>Ingen av dina kopplade spelare är kallad till denna träning.</p>}
                    {childrenInTraining.map((child) => {
                      const isAttending = attendance[`${training.id}_${child.id}`];
                      return (
                        <div key={child.id} style={{ padding: "12px", background: "#f9f9f9", borderRadius: "6px", marginBottom: "12px" }}>
                          <p style={{ color: "var(--text-dark)", fontWeight: "600", marginBottom: "8px" }}>{child.name}</p>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <Button
                              variant={isAttending === true ? "primary" : "secondary"}
                              onClick={() => updateAttendance(training.id, child.id, true)}
                              disabled={loading}
                              style={{ flex: 1, fontSize: "13px", padding: "8px" }}
                            >
                              ✓ Kommer
                            </Button>
                            <Button
                              variant={isAttending === false ? "danger" : "secondary"}
                              onClick={() => updateAttendance(training.id, child.id, false)}
                              disabled={loading}
                              style={{ flex: 1, fontSize: "13px", padding: "8px" }}
                            >
                              ✗ Kommer inte
                            </Button>
                            {isAttending !== undefined && <Button variant="danger" disabled={loading} onClick={()=>clearReply(training.id,child.id)}>Ta bort svar</Button>}
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