"use client";
import { useState } from "react";
import { Card, Input, Button, Empty } from "../UI";
import { supabase } from "../../lib/supabaseClient";

export default function TeamsTab({ data, onUpdate }) {
  const teams = data?.teams || [];
  const players = data?.players || [];
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [coachTeam,setCoachTeam]=useState(null),[coachId,setCoachId]=useState(""),[coachError,setCoachError]=useState(""),[coachNotice,setCoachNotice]=useState("");
  async function setCoach(target,team,assigned){
    setLoading(true);setCoachError("");setCoachNotice("");
    try{
      const {error}=await supabase.rpc("club_set_team_coach",{target,team,assigned});
      if(error)throw error;
      await onUpdate();setCoachTeam(null);setCoachId("");
      setCoachNotice(assigned?"Tränaren är kopplad till laget. Logga ut och in för att öppna tränarvyn.":"Tränaren är borttagen från laget. Övriga lag och kontot finns kvar.");
    }catch(e){setCoachError(e.message);}finally{setLoading(false);}
  }

  async function addTeam() {
    if (!name.trim() || !ageGroup.trim()) {
      alert("Fyll i namn och åldersgrupp");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("teams").insert({
      name: name.trim(),
      age_group: ageGroup.trim(),
    });
    if (error) {
      alert("Fel: " + error.message);
    } else {
      setName("");
      setAgeGroup("");
      setShowAdd(false);
      onUpdate();
    }
    setLoading(false);
  }

  async function addPlayerToTeam(playerId, teamId) {
    setLoading(true);
    const { error } = await supabase
      .from("players")
      .update({ team_id: teamId })
      .eq("id", playerId);

    if (error) {
      alert("Fel: " + error.message);
    } else {
      onUpdate();
    }
    setLoading(false);
  }

  async function removePlayerFromTeam(playerId) {
    setLoading(true);
    const { error } = await supabase
      .from("players")
      .update({ team_id: null })
      .eq("id", playerId);

    if (error) {
      alert("Fel: " + error.message);
    } else {
      onUpdate();
    }
    setLoading(false);
  }

  async function deleteTeam(team){
    if(!confirm(`Ta bort laget ${team.name}? Lagets träningar, matcher och tillhörande svar och närvaro tas bort. Spelarna finns kvar utan lag.`))return;
    setLoading(true);
    const result=await supabase.rpc("club_delete_team",{target:team.id});
    if(result.error || !result.data)alert("Fel: " + (result.error?.message || "Laget kunde inte tas bort."));else await onUpdate();
    setLoading(false);
  }
  return (
    <>
      <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-dark)" }}>Lag</h2>
        <Button variant="primary" onClick={() => setShowAdd(true)}>+ Lägg till lag</Button>
      </div>

      {coachError&&<p role="alert" className="error-banner">{coachError}</p>}{coachNotice&&<p role="status">{coachNotice}</p>}
      {showAdd && (
        <Card style={{ marginBottom: "30px", background: "var(--beige-light)", border: "2px solid var(--gold)" }}>
          <h3 style={{ marginBottom: "20px", color: "var(--text-dark)" }}>Nytt lag</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Lagnamn</label>
              <Input placeholder="U19 Elite" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-dark)" }}>Åldersgrupp</label>
              <Input placeholder="U19" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <Button variant="primary" onClick={addTeam} disabled={loading}>{loading ? "Läggs till..." : "Lägg till lag"}</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Avbryt</Button>
            </div>
          </div>
        </Card>
      )}

      {teams.length === 0 ? (
        <Empty message="Inga lag än" />
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {teams.map((team) => {
            const teamPlayers = players.filter((p) => p.team_id === team.id);
            const unassignedPlayers = players.filter((p) => !p.team_id);

            return (
              <Card key={team.id}>
                <div className="button-group"><Button disabled={loading} onClick={()=>{setCoachTeam(team.id);setCoachId("");}}>Välj tränare</Button><Button variant="danger" disabled={loading} onClick={()=>deleteTeam(team)}>Ta bort lag</Button></div>
                <p>Tränare: {(data.coachTeams||[]).filter(c=>c.team_id===team.id).map(c=>data.profiles.find(p=>p.id===c.user_id)?.full_name||data.profiles.find(p=>p.id===c.user_id)?.email||"Tränare").join(", ")||"Ingen tilldelad"}</p>
                {coachTeam===team.id&&<form onSubmit={e=>{e.preventDefault();setCoach(coachId,team.id,true);}}>
                  <h4>Tränare för {team.name}</h4><p>Välj en befintlig medlem eller stödmedlem. Kontot och kopplingarna till barn finns kvar.</p>
                  <label className="field">Medlemmens konto<select required disabled={loading} value={coachId} onChange={e=>setCoachId(e.target.value)}><option value="">Välj medlem</option>{(data.profiles||[]).filter(p=>p.role!=="admin"&&!(data.coachTeams||[]).some(c=>c.team_id===team.id&&c.user_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.full_name||p.email} · {p.email}</option>)}</select></label>
                  <div className="button-group"><Button type="submit" disabled={loading||!coachId}>Spara tränare</Button><Button type="button" variant="secondary" disabled={loading} onClick={()=>setCoachTeam(null)}>Stäng</Button></div>
                  {(data.coachTeams||[]).filter(c=>c.team_id===team.id).map(c=><div className="attendance-row" key={c.user_id}><span>{data.profiles.find(p=>p.id===c.user_id)?.full_name||data.profiles.find(p=>p.id===c.user_id)?.email}</span><Button type="button" variant="danger" disabled={loading} onClick={()=>{if(confirm("Ta bort tränaren från detta lag?"))setCoach(c.user_id,team.id,false);}}>Ta bort från laget</Button></div>)}
                </form>}
                <div
                  onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: expandedTeam === team.id ? "16px" : "0",
                  }}
                >
                  <div>
                    <h3 style={{ color: "var(--text-dark)", marginBottom: "5px" }}>{team.name}</h3>
                    <p style={{ color: "var(--text-light)", fontSize: "14px" }}>
                      Åldersgrupp: {team.age_group} - {teamPlayers.length} spelare
                    </p>
                  </div>
                  <span style={{ fontSize: "20px" }}>{expandedTeam === team.id ? "▼" : "▶"}</span>
                </div>

                {expandedTeam === team.id && (
                  <div style={{ borderTop: "1px solid #ddd", paddingTop: "16px" }}>
                    <h4 style={{ color: "var(--text-dark)", marginBottom: "12px", fontSize: "15px", fontWeight: "600" }}>
                      Spelare i laget ({teamPlayers.length}):
                    </h4>
                    {teamPlayers.length === 0 ? (
                      <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "16px" }}>Inga spelare i laget ännu</p>
                    ) : (
                      <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
                        {teamPlayers.map((player) => (
                          <div
                            key={player.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px",
                              background: "#f5f5f5",
                              borderRadius: "6px",
                            }}
                          >
                            <span style={{ color: "var(--text-dark)" }}>#{player.number} {player.name}</span>
                            <Button
                              variant="danger"
                              onClick={() => removePlayerFromTeam(player.id)}
                              disabled={loading}
                              style={{ padding: "6px 10px", fontSize: "12px" }}
                            >
                              Ta bort
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <h4 style={{ color: "var(--text-dark)", marginBottom: "12px", fontSize: "15px", fontWeight: "600" }}>
                      Lägg till spelare:
                    </h4>
                    {unassignedPlayers.length === 0 ? (
                      <p style={{ color: "var(--text-light)", fontSize: "14px" }}>Alla spelare är redan tilldelade ett lag</p>
                    ) : (
                      <div style={{ display: "grid", gap: "8px" }}>
                        {unassignedPlayers.map((player) => (
                          <div
                            key={player.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px",
                              background: "#f9f9f9",
                              borderRadius: "6px",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <span style={{ color: "var(--text-dark)" }}>#{player.number} {player.name}</span>
                            <Button
                              variant="primary"
                              onClick={() => addPlayerToTeam(player.id, team.id)}
                              disabled={loading}
                              style={{ padding: "6px 10px", fontSize: "12px" }}
                            >
                              Lägg till
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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